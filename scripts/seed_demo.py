#!/usr/bin/env python3
"""
SkillSync AI — Demo Database Seeder
Convenience entry-point script from the repository root.

Usage:
    python scripts/seed_demo.py
    python scripts/seed_demo.py --reset   # Drops all data before seeding
"""
import asyncio
import argparse
import sys
import subprocess
from pathlib import Path

BACKEND_DIR = Path(__file__).parent.parent / "backend"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed the SkillSync AI database with deterministic SIH demo data.",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Drop all existing application data before seeding (DESTRUCTIVE).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.reset:
        confirm = input(
            "\n⚠️  WARNING: This will permanently DELETE all existing data and re-seed. "
            "Type 'yes' to confirm: "
        )
        if confirm.strip().lower() != "yes":
            print("Aborted.")
            sys.exit(0)

    print("🌱 Running SkillSync AI demo seeder...")
    result = subprocess.run(
        ["uv", "run", "python", "-m", "app.db.seed"],
        cwd=BACKEND_DIR,
        check=False,
    )
    if result.returncode != 0:
        print("❌ Seeding failed. Check the output above for details.")
        sys.exit(result.returncode)

    print("✅ Demo database seeded successfully.")


if __name__ == "__main__":
    main()
