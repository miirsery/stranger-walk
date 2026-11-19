//! Регистрация, вход и сессии. Токен сессии живёт в HTTP-only cookie; в базе
//! хранится только его SHA-256 — дамп базы не даёт угнать активные сессии.

use argon2::{Argon2, password_hash::{PasswordHasher, PasswordVerifier, phc::PasswordHash}};
use axum::{Json, extract::State};
use axum_extra::extract::{CookieJar, cookie::{Cookie, SameSite}};
use rand::RngExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::{error::AppError, state::AppState};

const SESSION_COOKIE: &str = "sw_session";
const SESSION_DAYS: i64 = 30;

#[derive(Deserialize)]
pub struct RegisterRequest {
    username: String,
    password: String,
    display_name: String,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Serialize)]
pub struct PlayerResponse {
    id: String,
    username: String,
    display_name: String,
}

fn hash_password(password: &str) -> Result<String, AppError> {
    Argon2::default()
        .hash_password(password.as_bytes())
        .map(|hash| hash.to_string())
        .map_err(|error| AppError::Internal(anyhow::anyhow!("не удалось хэшировать пароль: {error}")))
}

fn verify_password(password: &str, hash: &str) -> bool {
    let Ok(parsed) = PasswordHash::new(hash) else {
        return false;
    };
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok()
}

/// Случайный токен сессии (уходит в cookie как есть) и его SHA-256 (хранится в базе).
fn new_session_token() -> (String, Vec<u8>) {
    let mut bytes = [0u8; 32];
    rand::rng().fill(&mut bytes);
    let token: String = bytes.iter().map(|byte| format!("{byte:02x}")).collect();
    let hash = Sha256::digest(token.as_bytes()).to_vec();
    (token, hash)
}

fn validate_username(username: &str) -> Result<(), AppError> {
    let valid = (3..=20).contains(&username.len())
        && username
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'_');
    if valid {
        Ok(())
    } else {
        Err(AppError::BadRequest(
            "имя для входа: 3–20 символов, только строчные латинские буквы, цифры и «_»".to_owned(),
        ))
    }
}

fn validate_password(password: &str) -> Result<(), AppError> {
    if password.len() < 8 {
        return Err(AppError::BadRequest("пароль должен быть не короче 8 символов".to_owned()));
    }
    Ok(())
}

fn validate_display_name(display_name: &str) -> Result<(), AppError> {
    if (1..=40).contains(&display_name.chars().count()) {
        Ok(())
    } else {
        Err(AppError::BadRequest("отображаемое имя: от 1 до 40 символов".to_owned()))
    }
}

/// Исполнитель — пул или открытая транзакция: регистрация заводит игрока и сессию одной операцией.
async fn create_session<'e>(
    executor: impl sqlx::PgExecutor<'e>,
    cookie_secure: bool,
    player_id: &str,
    jar: CookieJar,
) -> Result<CookieJar, AppError> {
    let (token, token_hash) = new_session_token();
    sqlx::query(
        "INSERT INTO sessions (token_hash, player_id, expires_at)
         VALUES ($1, $2::uuid, now() + make_interval(days => $3::int))",
    )
    .bind(token_hash)
    .bind(player_id)
    .bind(SESSION_DAYS)
    .execute(executor)
    .await?;

    let cookie = Cookie::build((SESSION_COOKIE, token))
        .http_only(true)
        .same_site(SameSite::Lax)
        .secure(cookie_secure)
        .path("/")
        .max_age(time::Duration::days(SESSION_DAYS))
        .build();
    Ok(jar.add(cookie))
}

pub async fn register(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(body): Json<RegisterRequest>,
) -> Result<(CookieJar, Json<PlayerResponse>), AppError> {
    validate_username(&body.username)?;
    validate_password(&body.password)?;
    validate_display_name(&body.display_name)?;

    let password_hash = hash_password(&body.password)?;

    // Одна транзакция: если сессию завести не удастся, игрок тоже не должен остаться в базе.
    let mut tx = state.pool.begin().await?;
    let row: Option<(String,)> = sqlx::query_as(
        "INSERT INTO players (username, display_name, password_hash)
         VALUES ($1, $2, $3)
         ON CONFLICT (username) DO NOTHING
         RETURNING id::text",
    )
    .bind(&body.username)
    .bind(&body.display_name)
    .bind(&password_hash)
    .fetch_optional(&mut *tx)
    .await?;

    let Some((id,)) = row else {
        return Err(AppError::Conflict("это имя для входа уже занято".to_owned()));
    };

    let jar = create_session(&mut *tx, state.cookie_secure, &id, jar).await?;
    tx.commit().await?;
    Ok((jar, Json(PlayerResponse { id, username: body.username, display_name: body.display_name })))
}

pub async fn login(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(body): Json<LoginRequest>,
) -> Result<(CookieJar, Json<PlayerResponse>), AppError> {
    let row: Option<(String, String, String)> =
        sqlx::query_as("SELECT id::text, display_name, password_hash FROM players WHERE username = $1")
            .bind(&body.username)
            .fetch_optional(&state.pool)
            .await?;

    let Some((id, display_name, password_hash)) = row else {
        return Err(AppError::Unauthorized);
    };
    if !verify_password(&body.password, &password_hash) {
        return Err(AppError::Unauthorized);
    }

    let jar = create_session(&state.pool, state.cookie_secure, &id, jar).await?;
    Ok((jar, Json(PlayerResponse { id, username: body.username, display_name })))
}

pub async fn logout(State(state): State<AppState>, jar: CookieJar) -> Result<CookieJar, AppError> {
    if let Some(cookie) = jar.get(SESSION_COOKIE) {
        let hash = Sha256::digest(cookie.value().as_bytes()).to_vec();
        sqlx::query("DELETE FROM sessions WHERE token_hash = $1")
            .bind(hash)
            .execute(&state.pool)
            .await?;
    }
    Ok(jar.remove(Cookie::from(SESSION_COOKIE)))
}

pub async fn me(State(state): State<AppState>, jar: CookieJar) -> Result<Json<PlayerResponse>, AppError> {
    let token = jar.get(SESSION_COOKIE).ok_or(AppError::Unauthorized)?;
    let hash = Sha256::digest(token.value().as_bytes()).to_vec();

    let row: Option<(String, String, String)> = sqlx::query_as(
        "SELECT players.id::text, players.username, players.display_name
         FROM sessions
         JOIN players ON players.id = sessions.player_id
         WHERE sessions.token_hash = $1 AND sessions.expires_at > now()",
    )
    .bind(hash)
    .fetch_optional(&state.pool)
    .await?;

    let (id, username, display_name) = row.ok_or(AppError::Unauthorized)?;
    Ok(Json(PlayerResponse { id, username, display_name }))
}
