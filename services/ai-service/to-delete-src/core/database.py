from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite database URL. This will create a file named 'sql_app.db'
# in your project's root directory.
DATABASE_URL = "sqlite:///./sql_app.db"

# create_engine is the starting point for your SQLAlchemy application.
# For SQLite, 'check_same_thread': False is needed if you're using it
# with a multi-threaded application (like FastAPI/Uvicorn).
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

# Each instance of the SessionLocal class will be a database session.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class which your ORM models will inherit from.
Base = declarative_base()

# Dependency to get a DB session. This function is used in your
# FastAPI route dependencies (Depends(get_db)).
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
