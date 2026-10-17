import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

load_dotenv()
logger = logging.getLogger("connecthub.database")

DATABASE_URL = os.getenv("DATABASE_URL")

# Resolve serverless writable path (AWS Lambda / Vercel has read-only root, writable /tmp)
if os.path.exists("/tmp") and os.access("/tmp", os.W_OK):
    FALLBACK_DB = "sqlite:////tmp/connecthub.db"
else:
    FALLBACK_DB = "sqlite:///./connecthub.db"

target_url = DATABASE_URL or FALLBACK_DB

# Normalise postgres:// to postgresql:// for SQLAlchemy compatibility
if target_url.startswith("postgres://"):
    target_url = target_url.replace("postgres://", "postgresql://", 1)

try:
    connect_args = {"check_same_thread": False} if target_url.startswith("sqlite") else {}
    engine = create_engine(
        target_url,
        pool_pre_ping=True,
        connect_args=connect_args,
    )
except Exception as e:
    logger.warning(f"Database engine init with primary URL failed: {e}. Falling back to SQLite.")
    engine = create_engine(
        FALLBACK_DB,
        pool_pre_ping=True,
        connect_args={"check_same_thread": False},
    )

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)

class Base(DeclarativeBase):
    pass

def test_database_connection():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        return result.scalar_one()