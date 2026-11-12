use axum::{Json, Router, extract::State, http::StatusCode, routing::get};
use serde::Serialize;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

use crate::state::AppState;

pub fn router(state: AppState) -> Router {
    let api = Router::new().route("/health", get(health));

    Router::new()
        .nest("/api/v1", api)
        .layer(TraceLayer::new_for_http())
        // Для локальной разработки. Перед публикацией ограничить список источников.
        .layer(CorsLayer::permissive())
        .with_state(state)
}

#[derive(Serialize)]
struct Health {
    status: &'static str,
    database: &'static str,
    version: &'static str,
}

/// Проверка живости: сервис отвечает и база доступна.
async fn health(State(state): State<AppState>) -> (StatusCode, Json<Health>) {
    let database_ok = sqlx::query("SELECT 1").execute(&state.pool).await.is_ok();
    let (code, status, database) = if database_ok {
        (StatusCode::OK, "ok", "up")
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, "degraded", "down")
    };
    (code, Json(Health { status, database, version: env!("CARGO_PKG_VERSION") }))
}
