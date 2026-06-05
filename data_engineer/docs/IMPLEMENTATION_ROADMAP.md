# Manga Analytics Pipeline Implementation Roadmap

## Purpose

This roadmap breaks the Data Engineering project into implementation steps that can be completed one at a time. Each step has its own detail document with status, objective, planned work, expected outputs, and acceptance criteria.

Reader: an engineer or agent implementing the project from scratch.

Post-read action: pick the first `Not Started` step, implement only that step, verify it, then update the status in this roadmap and in the step document.

## Status Rules

Use these statuses consistently:

- `Not Started`: no implementation work has been done.
- `In Progress`: implementation has started but acceptance criteria are not fully met.
- `Blocked`: implementation cannot continue without a decision, dependency, or fix.
- `Done`: acceptance criteria are met and verification evidence is recorded.

When a step is completed:

1. Change its roadmap status to `Done`.
2. Change the status in that step document to `Done`.
3. Add the completion date.
4. Add concise verification evidence, such as command output summary, generated files, or screenshots.

## Source And Warehouse Decision

Original source:

- Real manga catalog source data loaded from MangaDex into PostgreSQL: manga, chapters, genres.
- Synthetic relational source data in PostgreSQL: users.
- Synthetic real-time behavior events generated from that source data.

Streaming layer:

- Kafka topic `manga.user_events`.

Warehouse:

- MinIO object storage with Bronze, Silver, and Gold layers.
- Bronze, Silver, and Gold data use Parquet.
- Gold JSON exports feed the static dashboard.

No Airflow is used in v1. Spark streaming runs as the main processing job. Batch-style helper scripts are run manually through documented commands.

## Step Status

| Step | Status | Detail Doc | Output |
| --- | --- | --- | --- |
| 01. Project scaffold and config | Done | [STEP-01](steps/STEP-01-project-scaffold.md) | Folder structure, env config, base docs |
| 02. Docker infrastructure | Done | [STEP-02](steps/STEP-02-docker-infrastructure.md) | PostgreSQL, Kafka, Spark, MinIO stack |
| 03. Source database with real manga catalog | Done | [STEP-03](steps/STEP-03-synthetic-source-db.md) | Real manga catalog plus synthetic users |
| 04. Event schema and producer | Done | [STEP-04](steps/STEP-04-event-schema-producer.md) | JSON event schema and Kafka producer |
| 05. Spark Bronze and Silver | Done | [STEP-05](steps/STEP-05-spark-bronze-silver.md) | Raw and cleaned Parquet layers |
| 06. Spark Gold analytics | Not Started | [STEP-06](steps/STEP-06-spark-gold-analytics.md) | Aggregated analytics marts |
| 07. Gold export and dashboard data | Not Started | [STEP-07](steps/STEP-07-gold-export-dashboard-data.md) | Dashboard-ready JSON files |
| 08. HTML/CSS/JS dashboard | Not Started | [STEP-08](steps/STEP-08-dashboard.md) | Static report dashboard |
| 09. End-to-end runbook and polish | Not Started | [STEP-09](steps/STEP-09-runbook-polish.md) | Complete demo runbook and verification |

## Implementation Order

Implement the steps in order. Do not start a later step until the previous step is `Done`, unless the step document explicitly says it can be worked in parallel.

The recommended first implementation target is Step 01.
