# STEP-07: Gold Export And Dashboard Data

Status: Not Started

Completion date: N/A

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

## Acceptance Criteria

- Export script runs after Gold data exists.
- JSON files are valid and readable by browser JavaScript.
- JSON files contain stable field names.
- Empty Gold datasets produce valid empty JSON arrays or zero-value KPI objects.

## Verification Evidence

Record evidence here after implementation.

