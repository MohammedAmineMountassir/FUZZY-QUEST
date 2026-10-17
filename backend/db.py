"""Connexion SQLite et fonctions partagées du backend."""
from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

from flask import current_app, g, jsonify, session


def database_path() -> Path:
    return Path(current_app.config["DATABASE"])


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        path = database_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        g.db = sqlite3.connect(path)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(_error=None) -> None:
    connection = g.pop("db", None)
    if connection is not None:
        connection.close()


def init_db() -> None:
    get_db().executescript("""
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'participant', created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS questionnaires (
        id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft',
        target INTEGER NOT NULL DEFAULT 0, questions TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS responses (
        id INTEGER PRIMARY KEY, questionnaire_id INTEGER NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, answers TEXT NOT NULL,
        submitted_at TEXT NOT NULL
      );
    """)
    get_db().commit()


def get_current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    row = get_db().execute(
        "SELECT id, first_name, last_name, email, role FROM users WHERE id=?", (user_id,)
    ).fetchone()
    return dict(row) if row else None


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not get_current_user():
            return jsonify(error="AUTH_REQUIRED", message="Connectez-vous pour continuer."), 401
        return view(*args, **kwargs)
    return wrapped


def serialize_questionnaire(row):
    item = dict(row)
    item["questions"] = json.loads(item.pop("questions"))
    item["responses"] = get_db().execute(
        "SELECT COUNT(*) FROM responses WHERE questionnaire_id=?", (item["id"],)
    ).fetchone()[0]
    return item


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()
