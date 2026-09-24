from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Use SQLite for local dev, PostgreSQL for production
SQLALCHEMY_DATABASE_URL = "sqlite:///./interview_app.db" 
# SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/interview_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()