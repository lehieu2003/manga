# STEP-06: Spark Gold Analytics

Status: Not Started

Completion date: N/A

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

Record evidence here after implementation.

