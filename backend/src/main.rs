//! Каркас бэкенда Stranger Walk.
//!
//! На этапе MVP сервис только поднимается, применяет миграции и отвечает на
//! health-запросы. Сохранение прогресса появится на следующих шагах — новые
//! маршруты добавляются в `routes`, новые таблицы — файлами в `migrations/`.

mod config;
mod routes;
mod state;

use anyhow::Context;
use sqlx::postgres::PgPoolOptions;
use tokio::net::TcpListener;
use tracing_subscriber::EnvFilter;

use crate::{config::Config, state::AppState};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info,tower_http=info".into()))
        .init();

    let config = Config::from_env()?;

    let pool = PgPoolOptions::new()
        .max_connections(config.db_max_connections)
        .connect(&config.database_url)
        .await
        .context("не удалось подключиться к PostgreSQL")?;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .context("не удалось применить миграции")?;

    let app = routes::router(AppState { pool });
    let listener = TcpListener::bind(config.listen_addr)
        .await
        .with_context(|| format!("не удалось занять адрес {}", config.listen_addr))?;
    tracing::info!("бэкенд слушает {}", config.listen_addr);

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .context("сервер завершился с ошибкой")
}

/// Ждёт Ctrl+C или SIGTERM (его шлёт `docker stop`), чтобы корректно закрыть соединения.
async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };

    #[cfg(unix)]
    let terminate = async {
        use tokio::signal::unix::{SignalKind, signal};
        match signal(SignalKind::terminate()) {
            Ok(mut stream) => {
                stream.recv().await;
            }
            Err(_) => std::future::pending::<()>().await,
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        () = ctrl_c => {},
        () = terminate => {},
    }
}
