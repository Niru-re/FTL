import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./healthnet.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

HOSPITAL_MIGRATION_COLUMNS = {
    "city": "VARCHAR(100) DEFAULT 'Nagpur'",
    "zone": "VARCHAR(100) DEFAULT 'Central'",
    "service_area": "VARCHAR(200) DEFAULT 'City Network'",
    "hospital_type": "VARCHAR(100) DEFAULT 'Multi-Specialty'",
    "services": "TEXT DEFAULT '[]'",
    "contact_person": "VARCHAR(255) DEFAULT 'Network Administrator'",
    "email": "VARCHAR(255) DEFAULT 'contact@hospital.in'",
    "total_staff": "INTEGER DEFAULT 0",
    "doctors_count": "INTEGER DEFAULT 0",
    "nurses_count": "INTEGER DEFAULT 0",
    "ambulance_count": "INTEGER DEFAULT 0",
    "ambulances_available": "INTEGER DEFAULT 0",
    "bed_occupancy_rate": "FLOAT DEFAULT 0.0",
}


def ensure_hospital_schema():
    inspector = inspect(engine)
    if "hospitals" not in inspector.get_table_names():
        return

    existing_columns = {col["name"] for col in inspector.get_columns("hospitals")}

    with engine.begin() as conn:
        for column_name, column_sql in HOSPITAL_MIGRATION_COLUMNS.items():
            if column_name not in existing_columns:
                conn.execute(text(f"ALTER TABLE hospitals ADD COLUMN {column_name} {column_sql}"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
