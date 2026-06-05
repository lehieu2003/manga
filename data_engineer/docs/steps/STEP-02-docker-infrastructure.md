# STEP-02: Docker Infrastructure

Status: Not Started

Completion date: N/A

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

Record evidence here after implementation.

