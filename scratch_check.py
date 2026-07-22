import sqlite3
import json

conn = sqlite3.connect('backend/soundwave.db')
cursor = conn.cursor()

# Get list of tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [t[0] for t in cursor.fetchall()]
print("Tables:", tables)

for table in tables:
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    count = cursor.fetchone()[0]
    print(f"Table '{table}' has {count} rows")

print("\n--- SAMPLE SONGS ---")
if 'songs' in tables:
    cursor.execute("SELECT * FROM songs LIMIT 5")
    columns = [col[0] for col in cursor.description]
    for row in cursor.fetchall():
        row_dict = dict(zip(columns, row))
        # Parse data if it is stored as JSON string
        print(f"ID: {row_dict.get('id') or row_dict.get('_id')}")
        if 'data' in row_dict:
            try:
                data = json.loads(row_dict['data'])
                print(f"  Title: {data.get('title')}")
                print(f"  Artist: {data.get('artist')}")
                print(f"  Audio URL: {data.get('audio_url')}")
                print(f"  Preview URL: {data.get('preview_url')}")
            except Exception as e:
                print("  Failed to parse data column:", e)
        else:
            for k, v in row_dict.items():
                print(f"  {k}: {v}")
conn.close()
