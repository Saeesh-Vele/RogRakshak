import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from sqlalchemy import text
from app.database import engine, DATABASE_URL


def smoke_test():
    masked_url = DATABASE_URL
    if "@" in masked_url:
        prefix, host_part = masked_url.split("@", 1)
        masked_url = f"{prefix.split(':')[0]}://***:***@{host_part}"

    print(f"Connecting to database at: {masked_url}...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).scalar()
            print(f"Database connection successful! SELECT 1 returned: {result}")
            return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False


if __name__ == "__main__":
    success = smoke_test()
    sys.exit(0 if success else 1)
