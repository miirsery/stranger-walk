use std::{env, net::SocketAddr};

use anyhow::Context;

/// Настройки сервиса из переменных окружения.
pub struct Config {
    pub database_url: String,
    pub listen_addr: SocketAddr,
    pub db_max_connections: u32,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let database_url = env::var("DATABASE_URL").context("не задана переменная DATABASE_URL")?;
        let listen_addr = env::var("LISTEN_ADDR")
            .unwrap_or_else(|_| "0.0.0.0:8080".to_owned())
            .parse()
            .context("LISTEN_ADDR должен иметь вид host:port")?;
        let db_max_connections = match env::var("DB_MAX_CONNECTIONS") {
            Ok(value) => value.parse().context("DB_MAX_CONNECTIONS должен быть числом")?,
            Err(_) => 5,
        };
        Ok(Self { database_url, listen_addr, db_max_connections })
    }
}
