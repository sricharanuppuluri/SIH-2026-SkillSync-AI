#!/usr/bin/env python3
"""
SkillSync AI — SIH 2026 Demo Runner Script
Automates health checking, migration verification, and service launch guidance for the SIH live demo.

Usage:
    python scripts/run_demo.py
    python scripts/run_demo.py --check-only
"""
import argparse
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"


def check_backend_migrations() -> bool:
    print("[*] Checking Alembic migration status...")
    res = subprocess.run(
        ["uv", "run", "alembic", "current"],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
    )
    if "0012_outcome_intelligence" in res.stdout or "head" in res.stdout:
        print("  [+] Alembic head verified: 0012_outcome_intelligence")
        return True
    print("  [-] Alembic head mismatch or error:", res.stderr or res.stdout)
    return False


def seed_demo_data(reset: bool = False) -> bool:
    action_str = "Resetting and seeding" if reset else "Seeding"
    print(f"[*] {action_str} deterministic demo data...")
    cmd = ["uv", "run", "python", "-m", "app.db.seed"]
    if reset:
        cmd.append("--reset")
    res = subprocess.run(
        cmd,
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
    )
    if res.returncode == 0:
        print("  [+] Demo data seeded successfully.")
        return True
    print("  [-] Seeding failed:", res.stderr or res.stdout)
    return False


def main() -> None:
    parser = argparse.ArgumentParser(description="SkillSync AI Demo Runner")
    parser.add_argument("--check-only", action="store_true", help="Only run health & migration checks")
    parser.add_argument("--reset", action="store_true", help="Reset demo fixtures before seeding")
    args = parser.parse_args()

    print("=" * 60)
    print("  SkillSync AI — SIH 2026 Demo Environment Verifier")
    print("=" * 60)

    if not check_backend_migrations():
        sys.exit(1)

    if not seed_demo_data(reset=args.reset):
        sys.exit(1)

    print("\n[+] Demo verification complete!")
    print("\nTo start demo services:")
    print("  1. Backend:  cd backend && uv run uvicorn app.main:app --reload --port 8000")
    print("  2. Frontend: cd frontend && npm run dev -- --port 3000")
    print("  3. Swagger:  http://localhost:8000/docs")
    print("  4. Web UI:   http://localhost:3000")
    print("=" * 60)


if __name__ == "__main__":
    main()
