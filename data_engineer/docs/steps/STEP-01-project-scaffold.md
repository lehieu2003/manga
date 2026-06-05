# STEP-01: Project Scaffold And Config

Status: Not Started

Completion date: N/A

## Objective

Create the base project structure and shared configuration files for the Data Engineering pipeline.

## Plan

Create the folder structure for:

- Docker infrastructure
- SQL initialization
- Python producer scripts
- Spark jobs
- JSON schema files
- Dashboard files
- Documentation

Add base configuration files:

- `.env.example` with service names, ports, bucket name, topic name, source DB credentials, and MinIO credentials.
- `requirements.txt` for Python producer and helper scripts.
- Root Data Engineering README that links to the roadmap.

Do not implement producer logic, Spark logic, or dashboard logic in this step.

## Expected Outputs

- A stable folder layout under `data_engineer`.
- A readable `.env.example`.
- Python dependencies listed for producer and utility scripts.
- README and roadmap discoverable from `data_engineer`.

## Acceptance Criteria

- All planned folders exist.
- `.env.example` contains no real secrets.
- `requirements.txt` includes dependencies for Kafka, PostgreSQL access, data generation, and JSON schema validation.
- No files outside `data_engineer` are changed unless explicitly needed for discoverability.

## Verification Evidence

Record evidence here after implementation.

