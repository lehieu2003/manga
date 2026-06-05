from __future__ import annotations

from pathlib import Path

from db import execute_sql_file
from de_config import PROJECT_DIR, get_source_db_config


def main() -> None:
    config = get_source_db_config(host_port=True)
    sql_path = PROJECT_DIR / "sql" / "init_source_db.sql"
    execute_sql_file(config, sql_path)
    print(f"initialized source database schema from {sql_path}")


if __name__ == "__main__":
    main()

