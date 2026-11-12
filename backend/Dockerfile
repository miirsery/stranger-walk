# syntax=docker/dockerfile:1

FROM rust:1-slim-bookworm AS build
WORKDIR /app

# Сначала собираем только зависимости — этот слой кешируется, пока не меняется Cargo.toml/Cargo.lock.
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release --locked && rm -rf src

COPY migrations ./migrations
COPY src ./src
RUN touch src/main.rs && cargo build --release --locked

FROM debian:bookworm-slim AS runtime
RUN useradd --system --uid 10001 --no-create-home app
COPY --from=build /app/target/release/stranger-walk-backend /usr/local/bin/stranger-walk-backend
USER app
EXPOSE 8080
ENTRYPOINT ["stranger-walk-backend"]
