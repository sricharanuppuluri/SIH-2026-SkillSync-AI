#!/usr/bin/env python3
"""
SkillSync AI — PostgreSQL Database Backup Tool
Creates a timestamped pg_dump of the SkillSync database.

Usage:
    python scripts/backup_db.py
    python scripts/backup_db.py --output-dir backups/

Environment:
    DATABASE_URL or individual POSTGRES_* vars must be set.
"""
import argparse
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse


def get_db_config() -> dict:
    """Extract connection params from DATABASE_URL or individual env vars."""
    database_url = os.getenv("DATABASE_URL") or os.getenv("ASYNC_DATABASE_URL", "")
    if database_url:
        # Strip async driver prefix
        database_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
        parsed = urlparse(database_url)
        return {
            "host": parsed.hostname or "localhost",
            "port": str(parsed.port or 5432),
            "user": parsed.username or "skillsync",
            "password": parsed.password or "",
            "dbname": (parsed.path or "/skillsync").lstrip("/"),
        }

    return {
        "host": os.getenv("POSTGRES_HOST", "localhost"),
        "port": os.getenv("POSTGRES_PORT", "5432"),
        "user": os.getenv("POSTGRES_USER", "skillsync"),
        "password": os.getenv("POSTGRES_PASSWORD", ""),
        "dbname": os.getenv("POSTGRES_DB", "skillsync"),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backup SkillSync AI PostgreSQL database.")
    parser.add_argument(
        "--output-dir",
        default="backups",
        help="Directory to write backup files into (default: backups/).",
    )
    parser.add_argument(
        "--format",
        choices=["custom", "plain"],
        default="custom",
        help="pg_dump format: 'custom' (binary, recommended) or 'plain' (SQL).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    cfg = get_db_config()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    extension = "dump" if args.format == "custom" else "sql"
    backup_file = output_dir / f"skillsync_{timestamp}.{extension}"

    print(f"🗄️  Backing up '{cfg['dbname']}' @ {cfg['host']}:{cfg['port']} ...")

    env = os.environ.copy()
    if cfg["password"]:
        env["PGPASSWORD"] = cfg["password"]

    cmd = [
        "pg_dump",
        "-h", cfg["host"],
        "-p", cfg["port"],
        "-U", cfg["user"],
        "-d", cfg["dbname"],
        f"--format={args.format}",
        "-f", str(backup_file),
        "--no-password",
        "--verbose",
    ]

    result = subprocess.run(cmd, env=env, check=False)
    if result.returncode != 0:
        print(f"❌ Backup failed (exit code {result.returncode}).")
        sys.exit(result.returncode)

    size_kb = backup_file.stat().st_size // 1024
    print(f"✅ Backup saved: {backup_file}  ({size_kb} KB)")


if __name__ == "__main__":
    main()
