from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Use SQLite for local development (no MySQL server needed)
# To switch to MySQL in production, set DATABASE_URL env var:
# DATABASE_URL=mysql+mysqlconnector://root:password@localhost/dataclone_ai
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./dataclone_ai.db"
)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
