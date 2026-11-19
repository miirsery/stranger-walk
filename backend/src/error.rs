use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::Serialize;

/// Единая ошибка обработчиков: конвертируется в JSON-ответ с нужным статусом.
pub enum AppError {
    BadRequest(String),
    Unauthorized,
    Conflict(String),
    Internal(anyhow::Error),
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match self {
            Self::BadRequest(message) => (StatusCode::BAD_REQUEST, message),
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, "нужно войти в аккаунт".to_owned()),
            Self::Conflict(message) => (StatusCode::CONFLICT, message),
            Self::Internal(error) => {
                tracing::error!(?error, "внутренняя ошибка обработчика");
                (StatusCode::INTERNAL_SERVER_ERROR, "внутренняя ошибка сервера".to_owned())
            }
        };
        (status, Json(ErrorBody { error: message })).into_response()
    }
}

impl From<anyhow::Error> for AppError {
    fn from(error: anyhow::Error) -> Self {
        Self::Internal(error)
    }
}

impl From<sqlx::Error> for AppError {
    fn from(error: sqlx::Error) -> Self {
        Self::Internal(error.into())
    }
}
