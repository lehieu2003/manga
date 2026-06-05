# Manga Analytics Data Engineering

This folder contains the Data Engineering plan and implementation artifacts for the manga reading analytics pipeline.

The project is intentionally isolated from the main application code. All Data Engineering tasks, scripts, Docker services, Spark jobs, and dashboard assets should stay under this folder.

## Current Status

Planning docs have been created. Step 01 project scaffold and config is complete. The runnable pipeline implementation has not started yet.

Start here:

- [Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md)

## Local Config

Copy `.env.example` to `.env` when running the Data Engineering stack locally. The example uses local demo credentials only and should not be reused for production systems.

## Local Infrastructure Ports

The Data Engineering Compose stack uses separate host ports from the main application stack:

- PostgreSQL source DB: `localhost:15432`
- Kafka external listener: `localhost:29092`
- Kafka UI: `http://localhost:18082`
- Spark master UI: `http://localhost:18080`
- Spark worker UI: `http://localhost:18081`
- MinIO API: `http://localhost:19000`
- MinIO console: `http://localhost:19001`

## Infrastructure Commands

Run these commands from the repository root:

```powershell
docker compose -f data_engineer/docker-compose.yml --env-file data_engineer/.env.example up -d
docker compose -f data_engineer/docker-compose.yml --env-file data_engineer/.env.example ps
docker compose -f data_engineer/docker-compose.yml --env-file data_engineer/.env.example down
```

The Compose stack creates Kafka topic `manga.user_events` and MinIO bucket `manga-analytics` through one-shot init services.

## Source Database Commands

Initialize the source schema:

```powershell
python data_engineer/producer/init_source_db.py
```

Load real MangaDex catalog data and synthetic users:

```powershell
python data_engineer/producer/seed_source_db.py
```

For a smaller smoke-test load:

```powershell
python data_engineer/producer/seed_source_db.py --manga-target 50 --chapters-per-manga 5 --users 200
```

The loader is rerunnable. Manga, chapters, genres, and users are inserted with stable conflict handling so repeated runs do not create uncontrolled duplicates.

## Event Producer Commands

Publish synthetic behavior events to Kafka from the PostgreSQL source data:

```powershell
python data_engineer/producer/synthetic_event_producer.py
```

For a small smoke-test run:

```powershell
python data_engineer/producer/synthetic_event_producer.py --events 100 --events-per-second 500 --invalid-event-rate 0.02
```

Inspect Kafka messages:

```powershell
docker exec manga-de-kafka /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic manga.user_events --from-beginning --max-messages 5 --timeout-ms 10000
```

Or open Kafka UI:

```txt
http://localhost:18082
```

## Spark Bronze/Silver Commands

Run the Kafka to Bronze/Silver streaming job in available-now mode:

```powershell
docker exec manga-de-spark-master /opt/spark/bin/spark-submit --properties-file /opt/manga/conf/spark-defaults.conf --master spark://spark-master:7077 /opt/manga/jobs/stream_events.py
```

Inspect MinIO outputs:

```powershell
docker run --rm --network manga_de --entrypoint /bin/sh minio/mc:RELEASE.2025-04-16T18-13-26Z -c "mc alias set local http://minio:9000 minioadmin minioadmin >/dev/null && mc ls --recursive local/manga-analytics"
```

Count Bronze/Silver rows and basic Silver quality checks:

```powershell
docker exec manga-de-spark-master /opt/spark/bin/spark-submit --properties-file /opt/manga/conf/spark-defaults.conf --master spark://spark-master:7077 /opt/manga/jobs/inspect_lake.py
```

## Spark Gold Analytics Commands

Build Gold analytics marts from Silver events:

```powershell
docker exec manga-de-spark-master /opt/spark/bin/spark-submit --properties-file /opt/manga/conf/spark-defaults.conf --master spark://spark-master:7077 /opt/manga/jobs/gold_analytics.py
```

Inspect Gold mart row counts:

```powershell
docker exec manga-de-spark-master /opt/spark/bin/spark-submit --properties-file /opt/manga/conf/spark-defaults.conf --master spark://spark-master:7077 /opt/manga/jobs/inspect_gold.py
```

## Dashboard Data Export Commands

Export Gold marts from MinIO Parquet into browser-readable JSON files:

```powershell
docker exec manga-de-spark-master /opt/spark/bin/spark-submit --properties-file /opt/manga/conf/spark-defaults.conf --master spark://spark-master:7077 /opt/manga/jobs/export_gold_to_dashboard.py
```

The export writes dashboard data to:

```text
data_engineer/dashboard/data/gold/
```

Generated files:

- `summary_kpis.json`
- `trending_manga.json`
- `active_users.json`
- `reading_duration.json`
- `genre_popularity.json`
- `top_search_queries.json`

## Dashboard Commands

Serve the static dashboard from the dashboard folder:

```powershell
cd data_engineer/dashboard
python -m http.server 18083 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:18083
```

The dashboard uses plain HTML, CSS, and JavaScript. It reads the exported JSON files from `data/gold`.

## Architecture Summary

The planned pipeline is:

```txt
PostgreSQL source database with real MangaDex catalog and synthetic users
  -> Synthetic behavior producer
  -> Kafka user event topic
  -> Spark Structured Streaming
  -> MinIO Bronze, Silver, Gold layers
  -> Gold JSON export
  -> Static HTML/CSS/JS dashboard
```

PostgreSQL is the operational source database for real manga catalog data and synthetic users. MinIO is the analytical data lake and warehouse layer for this demo.
