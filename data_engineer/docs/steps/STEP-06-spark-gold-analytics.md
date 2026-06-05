# STEP-06: Spark Gold Analytics

Status: Done

Completion date: 2026-06-05

## Objective

Build Gold analytics marts from Silver events.

## Plan

Create Gold datasets for:

- Trending manga
- Active users by day and hour
- Reading duration by manga and day
- Genre popularity
- Top search queries
- Completion rate by manga

Use Spark aggregations over Silver events. Gold outputs should be optimized for dashboard consumption and written as Parquet in MinIO.

## Expected Outputs

- Gold Parquet datasets in MinIO.
- Clear metric definitions in documentation.
- Aggregations refresh as new events are processed.

## Acceptance Criteria

- Each Gold dataset exists and has non-empty output after a producer run.
- Trending manga includes views, reads, likes, follows, and completion rate.
- Active user metrics count distinct users correctly.
- Reading duration excludes invalid duration values.
- Genre popularity uses manga genre relationships from events.
- Search analytics includes query counts.

## Verification Evidence

- Added Gold analytics Spark job: `gold_analytics.py`.
- Added Gold inspection helper: `inspect_gold.py`.
- Added README commands for building and inspecting Gold marts.
- Verified Python syntax with `python -m py_compile data_engineer/spark/jobs/gold_analytics.py data_engineer/spark/jobs/inspect_gold.py`.
- Verified Gold job and inspection helper are mounted inside the Spark master container.
- Built Gold analytics with:
  `docker exec manga-de-spark-master /opt/spark/bin/spark-submit --properties-file /opt/manga/conf/spark-defaults.conf --master spark://spark-master:7077 /opt/manga/jobs/gold_analytics.py`.
- Gold build output:
  `trending_manga_count=32`,
  `active_users_count=3`,
  `reading_duration_count=13`,
  `genre_popularity_count=42`,
  `top_search_queries_count=8`,
  `completion_rate_count=13`.
- Verified Gold Parquet objects exist in MinIO under `manga-analytics/gold`.
- Verified each Gold dataset has a `_SUCCESS` marker and Parquet output.
