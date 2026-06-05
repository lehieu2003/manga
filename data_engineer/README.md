# Manga Analytics Data Engineering

This folder contains the Data Engineering plan and implementation artifacts for the manga reading analytics pipeline.

The project is intentionally isolated from the main application code. All Data Engineering tasks, scripts, Docker services, Spark jobs, and dashboard assets should stay under this folder.

## Current Status

Planning docs have been created. Implementation has not started yet.

Start here:

- [Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md)

## Architecture Summary

The planned pipeline is:

```txt
PostgreSQL synthetic source database
  -> Synthetic behavior producer
  -> Kafka user event topic
  -> Spark Structured Streaming
  -> MinIO Bronze, Silver, Gold layers
  -> Gold JSON export
  -> Static HTML/CSS/JS dashboard
```

PostgreSQL is the synthetic operational source database. MinIO is the analytical data lake and warehouse layer for this demo.

