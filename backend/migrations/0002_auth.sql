-- Регистрация и вход: у игрока появляется имя для входа и хэш пароля,
-- сессии живут отдельной таблицей. Токен хранится как SHA-256 — утечка
-- дампа базы не даёт угнать активные сессии напрямую.
ALTER TABLE players
    ADD COLUMN username      TEXT NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,20}$'),
    ADD COLUMN password_hash TEXT NOT NULL;

CREATE TABLE sessions (
    token_hash BYTEA PRIMARY KEY,
    player_id  UUID NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX sessions_player_id_idx ON sessions (player_id);
