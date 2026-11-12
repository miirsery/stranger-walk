use sqlx::PgPool;

/// Общее состояние обработчиков. `PgPool` внутри — счётчик ссылок, клонирование дешёвое.
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
}
