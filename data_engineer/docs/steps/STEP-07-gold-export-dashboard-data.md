# STEP-07: Gold Export And Dashboard Data

Status: Done

Completion date: 2026-06-05

## Objective

Export Gold analytics outputs into dashboard-ready JSON files.

## Plan

Create an export script that reads Gold Parquet data and writes JSON files for the static dashboard.

Expected dashboard JSON files:

- `summary_kpis.json`
- `trending_manga.json`
- `active_users.json`
- `reading_duration.json`
- `genre_popularity.json`
- `top_search_queries.json`

The dashboard should not query MinIO directly. It should read local JSON files from the dashboard data folder.

## Expected Outputs

- Export script.
- Dashboard data folder populated with Gold JSON.
- JSON shapes documented for dashboard implementation.

## JSON Shapes

`summary_kpis.json` is an object:

- `generated_at`
- `total_events`
- `active_users`
- `manga_with_events`
- `chapter_reads`
- `search_events`
- `total_reading_seconds`
- `top_manga`
- `top_genre`
- `top_search_query`

The remaining files are arrays of objects:

- `trending_manga.json`: `manga_id`, `manga_title`, `event_count`, `view_count`, `read_count`, `like_count`, `follow_count`, `completed_read_count`, `total_reading_seconds`, `unique_users`, `completion_rate`, `trending_score`
- `active_users.json`: `event_date`, `event_hour`, `event_count`, `active_users`, `read_event_count`, `search_event_count`
- `reading_duration.json`: `event_date`, `manga_id`, `manga_title`, `total_reading_seconds`, `avg_reading_seconds`, `read_count`, `reader_count`
- `genre_popularity.json`: `event_date`, `genre`, `event_count`, `view_count`, `read_count`, `like_count`, `follow_count`, `unique_users`, `popularity_score`
- `top_search_queries.json`: `event_date`, `query`, `search_count`, `unique_users`

## Acceptance Criteria

- Export script runs after Gold data exists.
- JSON files are valid and readable by browser JavaScript.
- JSON files contain stable field names.
- Empty Gold datasets produce valid empty JSON arrays or zero-value KPI objects.

## Verification Evidence

- Added Spark export job: `export_gold_to_dashboard.py`.
- Added Spark container mount from `./dashboard/data/gold` to `/opt/manga/dashboard/data/gold`.
- Recreated Spark services with:
  `docker compose --env-file .env -f docker-compose.yml up -d spark-master spark-worker`.
- Verified Python syntax with:
  `python -m py_compile data_engineer/spark/jobs/export_gold_to_dashboard.py`.
- Exported dashboard JSON with:
  `docker exec manga-de-spark-master /opt/spark/bin/spark-submit --properties-file /opt/manga/conf/spark-defaults.conf --master spark://spark-master:7077 /opt/manga/jobs/export_gold_to_dashboard.py`.
- Export output:
  `summary_kpis_count=1`,
  `trending_manga_exported=32`,
  `active_users_exported=3`,
  `reading_duration_exported=13`,
  `genre_popularity_exported=42`,
  `top_search_queries_exported=8`.
- Parsed all generated JSON files successfully with PowerShell `ConvertFrom-Json`.
