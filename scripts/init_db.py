import asyncio
import asyncpg


async def ensure_database():
    try:
        conn = await asyncpg.connect("postgresql://postgres:postgres@localhost:5432/postgres")
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = 'skillsync_ai'"
        )
        if not exists:
            await conn.execute("CREATE DATABASE skillsync_ai")
            print("[SUCCESS] Created database 'skillsync_ai'")
        else:
            print("[INFO] Database 'skillsync_ai' already exists")
        await conn.close()

        # Connect to skillsync_ai database and check/enable pgvector
        app_conn = await asyncpg.connect(
            "postgresql://postgres:postgres@localhost:5432/skillsync_ai"
        )
        try:
            await app_conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            print("[SUCCESS] Enabled pgvector extension on 'skillsync_ai'")
        except Exception as e:
            print(f"[INFO] Note on pgvector: {e}")
        await app_conn.close()
    except Exception as e:
        print(f"[ERROR] Database initialization error: {e}")


if __name__ == "__main__":
    asyncio.run(ensure_database())
