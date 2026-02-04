// Tauri commands for local database operations
use serde_json::Value;
use sqlx::{SqlitePool, Row};

/// Get database connection pool
async fn get_pool(app: &tauri::AppHandle) -> Result<SqlitePool, String> {
    let db_path = super::get_db_path(app)?;
    let db_url = format!("sqlite:{}", db_path.display());

    SqlitePool::connect(&db_url)
        .await
        .map_err(|e| format!("Database connection error: {}", e))
}

/// Cache employees from API to local SQLite
#[tauri::command]
pub async fn cache_employees(
    app: tauri::AppHandle,
    employees: Vec<Value>,
) -> Result<(), String> {
    let pool = get_pool(&app).await?;

    for emp in employees {
        let server_id = emp.get("id")
            .and_then(|v| v.as_i64())
            .ok_or_else(|| "Employee missing id field".to_string())?;

        let full_name = emp.get("full_name")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "Employee missing full_name field".to_string())?;

        let employment_type = emp.get("employment_type").and_then(|v| v.as_str());
        let department = emp.get("department").and_then(|v| v.as_str());
        let role = emp.get("role").and_then(|v| v.as_str());
        let status = emp.get("status").and_then(|v| v.as_str());
        let data_json = serde_json::to_string(&emp).unwrap_or_default();

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        sqlx::query(
            "INSERT OR REPLACE INTO employees
             (server_id, full_name, employment_type, department, role, status, data_json, synced_at, modified_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(server_id)
        .bind(full_name)
        .bind(employment_type)
        .bind(department)
        .bind(role)
        .bind(status)
        .bind(data_json)
        .bind(now)
        .bind(now)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to cache employee: {}", e))?;
    }

    Ok(())
}

/// Get cached employees from local SQLite
#[tauri::command]
pub async fn get_cached_employees(app: tauri::AppHandle) -> Result<Vec<Value>, String> {
    let pool = get_pool(&app).await?;

    let rows = sqlx::query(
        "SELECT data_json FROM employees ORDER BY modified_at DESC"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to fetch employees: {}", e))?;

    let employees: Vec<Value> = rows
        .iter()
        .filter_map(|row| {
            let json_str: String = row.try_get("data_json").ok()?;
            serde_json::from_str(&json_str).ok()
        })
        .collect();

    Ok(employees)
}

/// Cache rosters from API to local SQLite
#[tauri::command]
pub async fn cache_rosters(
    app: tauri::AppHandle,
    rosters: Vec<Value>,
) -> Result<(), String> {
    let pool = get_pool(&app).await?;

    for roster in rosters {
        let server_id = roster.get("id")
            .and_then(|v| v.as_i64())
            .ok_or_else(|| "Roster missing id field".to_string())?;

        let start_date = roster.get("start_date")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "Roster missing start_date field".to_string())?;

        let end_date = roster.get("end_date")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "Roster missing end_date field".to_string())?;

        let site_id = roster.get("site_id").and_then(|v| v.as_i64());
        let data_json = serde_json::to_string(&roster).unwrap_or_default();

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        sqlx::query(
            "INSERT OR REPLACE INTO rosters
             (server_id, start_date, end_date, site_id, data_json, synced_at, modified_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(server_id)
        .bind(start_date)
        .bind(end_date)
        .bind(site_id)
        .bind(data_json)
        .bind(now)
        .bind(now)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to cache roster: {}", e))?;
    }

    Ok(())
}

/// Get cached rosters from local SQLite within date range
#[tauri::command]
pub async fn get_cached_rosters(
    app: tauri::AppHandle,
    start_date: String,
    end_date: String,
) -> Result<Vec<Value>, String> {
    let pool = get_pool(&app).await?;

    let rows = sqlx::query(
        "SELECT data_json FROM rosters
         WHERE start_date >= ? AND end_date <= ?
         ORDER BY start_date ASC"
    )
    .bind(start_date)
    .bind(end_date)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to fetch rosters: {}", e))?;

    let rosters: Vec<Value> = rows
        .iter()
        .filter_map(|row| {
            let json_str: String = row.try_get("data_json").ok()?;
            serde_json::from_str(&json_str).ok()
        })
        .collect();

    Ok(rosters)
}

/// Cache attendance records from API to local SQLite
#[tauri::command]
pub async fn cache_attendance(
    app: tauri::AppHandle,
    records: Vec<Value>,
) -> Result<(), String> {
    let pool = get_pool(&app).await?;

    for record in records {
        let server_id = record.get("id")
            .and_then(|v| v.as_i64())
            .ok_or_else(|| "Attendance missing id field".to_string())?;

        let employee_id = record.get("employee_id").and_then(|v| v.as_i64());
        let shift_id = record.get("shift_id").and_then(|v| v.as_i64());
        let status = record.get("status").and_then(|v| v.as_str());
        let approved = record.get("approved").and_then(|v| v.as_bool()).unwrap_or(false);
        let data_json = serde_json::to_string(&record).unwrap_or_default();

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        sqlx::query(
            "INSERT OR REPLACE INTO attendance
             (server_id, employee_id, shift_id, status, approved, data_json, synced_at, modified_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(server_id)
        .bind(employee_id)
        .bind(shift_id)
        .bind(status)
        .bind(approved)
        .bind(data_json)
        .bind(now)
        .bind(now)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to cache attendance: {}", e))?;
    }

    Ok(())
}

/// Get cached attendance records from local SQLite
#[tauri::command]
pub async fn get_cached_attendance(
    app: tauri::AppHandle,
    employee_id: Option<i64>,
) -> Result<Vec<Value>, String> {
    let pool = get_pool(&app).await?;

    let rows = if let Some(emp_id) = employee_id {
        sqlx::query(
            "SELECT data_json FROM attendance
             WHERE employee_id = ?
             ORDER BY modified_at DESC"
        )
        .bind(emp_id)
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Failed to fetch attendance: {}", e))?
    } else {
        sqlx::query(
            "SELECT data_json FROM attendance
             ORDER BY modified_at DESC"
        )
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Failed to fetch attendance: {}", e))?
    };

    let records: Vec<Value> = rows
        .iter()
        .filter_map(|row| {
            let json_str: String = row.try_get("data_json").ok()?;
            serde_json::from_str(&json_str).ok()
        })
        .collect();

    Ok(records)
}

/// Queue a mutation for later sync when offline
#[tauri::command]
pub async fn queue_mutation(
    app: tauri::AppHandle,
    action: String,
    table_name: String,
    record_id: Option<i64>,
    payload: String,
) -> Result<i64, String> {
    let pool = get_pool(&app).await?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let result = sqlx::query(
        "INSERT INTO offline_queue (action, table_name, record_id, payload, created_at)
         VALUES (?, ?, ?, ?, ?)"
    )
    .bind(action)
    .bind(table_name)
    .bind(record_id)
    .bind(payload)
    .bind(now)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to queue mutation: {}", e))?;

    Ok(result.last_insert_rowid())
}

/// Get all pending mutations from offline queue
#[tauri::command]
pub async fn get_offline_queue(app: tauri::AppHandle) -> Result<Vec<Value>, String> {
    let pool = get_pool(&app).await?;

    let rows = sqlx::query(
        "SELECT id, action, table_name, record_id, payload, created_at, retry_count, last_error
         FROM offline_queue
         ORDER BY created_at ASC"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to fetch offline queue: {}", e))?;

    let queue: Vec<Value> = rows
        .iter()
        .map(|row| {
            serde_json::json!({
                "id": row.try_get::<i64, _>("id").unwrap_or(0),
                "action": row.try_get::<String, _>("action").unwrap_or_default(),
                "table_name": row.try_get::<String, _>("table_name").unwrap_or_default(),
                "record_id": row.try_get::<Option<i64>, _>("record_id").unwrap_or(None),
                "payload": row.try_get::<String, _>("payload").unwrap_or_default(),
                "created_at": row.try_get::<i64, _>("created_at").unwrap_or(0),
                "retry_count": row.try_get::<i64, _>("retry_count").unwrap_or(0),
                "last_error": row.try_get::<Option<String>, _>("last_error").unwrap_or(None),
            })
        })
        .collect();

    Ok(queue)
}

/// Remove a mutation from offline queue after successful sync
#[tauri::command]
pub async fn remove_from_queue(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    let pool = get_pool(&app).await?;

    sqlx::query("DELETE FROM offline_queue WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to remove from queue: {}", e))?;

    Ok(())
}

/// Increment retry count for a failed mutation
#[tauri::command]
pub async fn increment_retry_count(
    app: tauri::AppHandle,
    id: i64,
    error: Option<String>,
) -> Result<(), String> {
    let pool = get_pool(&app).await?;

    sqlx::query(
        "UPDATE offline_queue
         SET retry_count = retry_count + 1, last_error = ?
         WHERE id = ?"
    )
    .bind(error)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to increment retry count: {}", e))?;

    Ok(())
}
