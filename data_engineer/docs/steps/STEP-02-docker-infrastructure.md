# STEP-02: Docker Infrastructure

Status: Done

Completion date: 2026-06-05

## Objective

Create a local Docker Compose stack for the Data Engineering demo.

## Plan

Add a Compose file that runs:

- PostgreSQL source database
- Kafka in local single-node mode
- Spark master
- Spark worker
- MinIO
- MinIO bucket initialization

Use stable service names so scripts can connect through Docker networking. Configure:

- Kafka topic: `manga.user_events`
- MinIO bucket: `manga-analytics`
- PostgreSQL database: `manga_source`

Keep this Compose file separate from the main application Compose files.

## Expected Outputs

- A local infrastructure stack that can start from inside `data_engineer`.
- PostgreSQL, Kafka, Spark, and MinIO reachable by service name from containers.
- MinIO bucket exists after startup.

## Acceptance Criteria

- `docker compose up -d` starts all infrastructure services.
- PostgreSQL health check passes.
- Kafka accepts topic creation or auto-creates the configured topic.
- MinIO web console is reachable locally.
- Spark master UI is reachable locally.

## Verification Evidence

- Added a dedicated Docker Compose stack under `data_engineer`.
- Added PostgreSQL source DB, Kafka, Kafka topic initialization, Spark master/worker, MinIO, and MinIO bucket initialization services.
- Configured host ports that do not collide with the main application stack.
- Verified Compose syntax with `docker compose -f data_engineer/docker-compose.yml --env-file data_engineer/.env.example config`.
- Verified all services start with `docker compose -f data_engineer/docker-compose.yml --env-file data_engineer/.env.example up -d`.
- Verified service health/status with `docker compose -f data_engineer/docker-compose.yml --env-file data_engineer/.env.example ps`.
- Verified PostgreSQL readiness: `/var/run/postgresql:5432 - accepting connections`.
- Verified Kafka topic exists: `manga.user_events`.
- Verified MinIO bucket exists: `manga-analytics/`.
- Verified Spark master UI returns HTTP 200 at `http://localhost:18080`.
- Verified MinIO console returns HTTP 200 at `http://localhost:19001`.
