import sqlite3

conn = sqlite3.connect('healthnet.db')
c = conn.cursor()

c.execute('PRAGMA table_info(emergency_cases)')
existing_cols = {r[1] for r in c.fetchall()}

new_cols = [
    ('emergency_type', 'TEXT DEFAULT "CARDIAC"'),
    ('required_department', 'TEXT DEFAULT "ICU"'),
    ('required_resources', 'TEXT DEFAULT "[]"'),
    ('vitals_heart_rate', 'INTEGER DEFAULT 120'),
    ('vitals_systolic_bp', 'INTEGER DEFAULT 90'),
    ('vitals_diastolic_bp', 'INTEGER DEFAULT 60'),
    ('vitals_spo2', 'REAL DEFAULT 91.0'),
    ('vitals_respiratory_rate', 'INTEGER DEFAULT 26'),
    ('vitals_temperature', 'REAL DEFAULT 37.2'),
    ('pickup_address', 'TEXT DEFAULT "City Medical Incident Location"'),
    ('assigned_patient_id', 'INTEGER'),
    ('suitability_score', 'REAL DEFAULT 0.0'),
    ('completed_at', 'TIMESTAMP')
]

for col_name, col_def in new_cols:
    if col_name not in existing_cols:
        print(f"Adding column {col_name}...")
        c.execute(f"ALTER TABLE emergency_cases ADD COLUMN {col_name} {col_def}")

conn.commit()
conn.close()
print("Migration successfully applied!")
