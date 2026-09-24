import sqlite3
import json
import os
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), 'sahyadri_nav.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    cur.execute('''
    CREATE TABLE IF NOT EXISTS issues (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        node_ids TEXT NOT NULL,
        edge_ids TEXT NOT NULL,
        floor INTEGER NOT NULL,
        status TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT,
        reported_at TEXT NOT NULL
    )
    ''')

    # Seed issues if table is empty
    cur.execute('SELECT COUNT(*) FROM issues')
    count = cur.fetchone()[0]
    if count == 0:
        issues_json_path = os.path.join(os.path.dirname(__file__), 'data', 'issues.json')
        if os.path.exists(issues_json_path):
            with open(issues_json_path, 'r', encoding='utf-8') as f:
                initial_issues = json.load(f)
                for issue in initial_issues:
                    cur.execute('''
                    INSERT INTO issues (id, title, type, node_ids, edge_ids, floor, status, severity, description, reported_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        issue['id'],
                        issue['title'],
                        issue['type'],
                        json.dumps(issue.get('node_ids', [])),
                        json.dumps(issue.get('edge_ids', [])),
                        issue['floor'],
                        issue['status'],
                        issue['severity'],
                        issue.get('description', ''),
                        issue['reported_at']
                    ))
    conn.commit()
    conn.close()

def get_all_issues() -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute('SELECT * FROM issues ORDER BY reported_at DESC')
    rows = cur.fetchall()
    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "title": r["title"],
            "type": r["type"],
            "node_ids": json.loads(r["node_ids"]),
            "edge_ids": json.loads(r["edge_ids"]),
            "floor": r["floor"],
            "status": r["status"],
            "severity": r["severity"],
            "description": r["description"],
            "reported_at": r["reported_at"]
        })
    conn.close()
    return results

def add_issue(issue_dict: Dict[str, Any]) -> Dict[str, Any]:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('''
    INSERT OR REPLACE INTO issues (id, title, type, node_ids, edge_ids, floor, status, severity, description, reported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        issue_dict['id'],
        issue_dict['title'],
        issue_dict['type'],
        json.dumps(issue_dict.get('node_ids', [])),
        json.dumps(issue_dict.get('edge_ids', [])),
        issue_dict['floor'],
        issue_dict['status'],
        issue_dict['severity'],
        issue_dict.get('description', ''),
        issue_dict['reported_at']
    ))
    conn.commit()
    conn.close()
    return issue_dict

def update_issue_status(issue_id: str, new_status: str) -> bool:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('UPDATE issues SET status = ? WHERE id = ?', (new_status, issue_id))
    rows_affected = cur.rowcount
    conn.commit()
    conn.close()
    return rows_affected > 0

def delete_issue(issue_id: str) -> bool:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('DELETE FROM issues WHERE id = ?', (issue_id,))
    rows_affected = cur.rowcount
    conn.commit()
    conn.close()
    return rows_affected > 0
