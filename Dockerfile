# =============================================================================
# Stage 1: migrate — installs goose for running database migrations
# =============================================================================
FROM golang:1.24-alpine AS migrate
RUN apk add --no-cache netcat-openbsd \
    && go install github.com/pressly/goose/v3/cmd/goose@v3.24.2

# =============================================================================
# Stage 2: dev — hot-reload development image using Air
# =============================================================================
FROM golang:1.24-alpine AS dev
RUN go install github.com/air-verse/air@v1.61.7
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
EXPOSE 8081
CMD ["air", "-c", ".air.toml"]

# =============================================================================
# Stage 3: builder — compiles the optimised production binary
# =============================================================================
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ENV CGO_ENABLED=0
RUN go build -ldflags="-s -w" -o /app/cmd-server ./cmd/server

# =============================================================================
# Stage 4: production — minimal runtime image
# =============================================================================
FROM alpine:latest AS production
RUN apk add --no-cache ca-certificates
COPY --from=builder /app/cmd-server /app/cmd-server
COPY --from=builder /app/internal/templates /app/internal/templates
COPY --from=builder /app/static /app/static
RUN adduser -D app \
    && chown -R app:app /app
USER app
EXPOSE 8081
ENV GIN_MODE=release
ENTRYPOINT ["/app/cmd-server"]
