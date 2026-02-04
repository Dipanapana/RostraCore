// SQLite migrations for offline data caching
use tauri_plugin_sql::{Migration, MigrationKind};

/// Get all database migrations
pub fn get_migrations() -> Vec<Migration> {
    vec![
        // Migration 1: Core tables for offline caching
        Migration {
            version: 1,
            description: "create_core_tables",
            sql: "
                -- Enable WAL mode for concurrent reads
                PRAGMA journal_mode=WAL;

                CREATE TABLE IF NOT EXISTS employees (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    server_id INTEGER UNIQUE,
                    full_name TEXT NOT NULL,
                    employment_type TEXT,
                    department TEXT,
                    role TEXT,
                    status TEXT DEFAULT 'active',
                    data_json TEXT,
                    synced_at INTEGER,
                    modified_at INTEGER DEFAULT (strftime('%s', 'now'))
                );

                CREATE TABLE IF NOT EXISTS rosters (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    server_id INTEGER UNIQUE,
                    start_date TEXT NOT NULL,
                    end_date TEXT NOT NULL,
                    site_id INTEGER,
                    data_json TEXT,
                    synced_at INTEGER,
                    modified_at INTEGER DEFAULT (strftime('%s', 'now'))
                );

                CREATE TABLE IF NOT EXISTS attendance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    server_id INTEGER UNIQUE,
                    employee_id INTEGER,
                    shift_id INTEGER,
                    status TEXT,
                    approved BOOLEAN DEFAULT 0,
                    data_json TEXT,
                    synced_at INTEGER,
                    modified_at INTEGER DEFAULT (strftime('%s', 'now'))
                );

                CREATE INDEX idx_employee_server_id ON employees(server_id);
                CREATE INDEX idx_roster_dates ON rosters(start_date, end_date);
                CREATE INDEX idx_attendance_employee ON attendance(employee_id);
            ",
            kind: MigrationKind::Up,
        },

        // Migration 2: Offline queue for pending mutations
        Migration {
            version: 2,
            description: "create_offline_queue",
            sql: "
                CREATE TABLE IF NOT EXISTS offline_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    action TEXT NOT NULL,
                    table_name TEXT NOT NULL,
                    record_id INTEGER,
                    payload TEXT NOT NULL,
                    created_at INTEGER DEFAULT (strftime('%s', 'now')),
                    retry_count INTEGER DEFAULT 0,
                    last_error TEXT
                );

                CREATE INDEX idx_queue_created ON offline_queue(created_at);
            ",
            kind: MigrationKind::Up,
        },
    ]
}
