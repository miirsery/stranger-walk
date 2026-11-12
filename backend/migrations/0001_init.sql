-- Первая миграция: проверяет, что конвейер миграций работает, и закладывает
-- таблицу игроков — к ней на следующих этапах привяжется сохранение прогресса.
CREATE TABLE players (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT        NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 40),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
