#!/usr/bin/env python3
"""
SkillSync AI — PostgreSQL Database Restore Tool
Restores from a pg_dump backup with mandatory confirmation safeguard.

Usage:
    python scripts/restore_db.py backups/skillsync_20260907_120000.dump
    python scripts/restore_db.py backups/skillsync_20260907_120000.sql --format plain

Environment:
    DATABASE_URL or individual POSTGRES_* vars must be set.

⚠️  WARNING: This will DROP AND RECREATE the target database schema.
"""
import argparse
import os
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse


def get_db_config() -> dict:
    """Extract connection params from DATABASE_URL or individual env vars."""
    database_url = os.getenv("DATABASE_URL") or os.getenv("ASYNC_DATABASE_URL", "")
    if database_url:
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
    parser = argparse.ArgumentParser(
        description="Restore SkillSync AI PostgreSQL database from a backup file.",
    )
    parser.add_argument("backup_file", help="Path to the pg_dump backup file to restore.")
    parser.add_argument(
        "--format",
        choices=["custom", "plain"],
        default="custom",
        help="pg_dump format of the backup: 'custom' or 'plain' (default: custom).",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip interactive confirmation (for scripted/CI use).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    cfg = get_db_config()

    backup_path = Path(args.backup_file)
    if not backup_path.exists():
        print(f"❌ Backup file not found: {backup_path}")
        sys.exit(1)

    if not args.yes:
        print(
            f"\n⚠️  WARNING: This will RESTORE '{cfg['dbname']}' @ {cfg['host']}:{cfg['port']}"
            f" from:\n   {backup_path}\n"
            "  ALL EXISTING DATA IN THE TARGET DATABASE WILL BE OVERWRITTEN.\n"
        )
        confirm = input("Type 'yes' to confirm restore: ")
        if confirm.strip().lower() != "yes":
            print("Aborted.")
            sys.exit(0)

    env = os.environ.copy()
    if cfg["password"]:
        env["PGPASSWORD"] = cfg["password"]

    print(f"🔄 Restoring '{cfg['dbname']}' from {backup_path} ...")

    if args.format == "custom":
        cmd = [
            "pg_restore",
            "-h", cfg["host"],
            "-p", cfg["port"],
            "-U", cfg["user"],
            "-d", cfg["dbname"],
            "--no-password",
            "--clean",
            "--if-exists",
            "--verbose",
            str(backup_path),
        ]
    else:
        # Plain SQL — use psql
        cmd = [
            "psql",
            "-h", cfg["host"],
            "-p", cfg["port"],
            "-U", cfg["user"],
            "-d", cfg["dbname"],
            "--no-password",
            "-f", str(backup_path),
        ]

    result = subprocess.run(cmd, env=env, check=False)
    if result.returncode != 0:
        print(f"❌ Restore failed (exit code {result.returncode}).")
        sys.exit(result.returncode)

    print("✅ Database restored successfully.")


if __name__ == "__main__":
    main()
