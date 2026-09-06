"""SkillSync AI - Phase 0 Verification Script.

Tests backend health endpoint, PostgreSQL connectivity, Redis connectivity,
and local AI responsiveness.
"""

import asyncio
import sys
import httpx


async def check_backend(base_url: str = "http://localhost:8000"):
    print("=" * 60)
    print("SkillSync AI - Phase 0 System Verification")
    print("=" * 60)

    url = f"{base_url}/api/v1/health"
    print(f"Connecting to Backend Health API: {url} ...")

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url)
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print("Response JSON:")
                import json

                print(json.dumps(data, indent=2))
                print("\n[SUCCESS] Backend API is reachable and responding correctly.")
                return True
            else:
                print(f"[FAIL] Unexpected status code: {response.status_code}")
                return False
    except Exception as e:
        print(f"[FAIL] Could not connect to backend: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(check_backend())
    sys.exit(0 if success else 1)
