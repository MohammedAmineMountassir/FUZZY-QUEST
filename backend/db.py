"""Connexion SQLite et fonctions partagées du backend."""
from __future__ import annotations
import json
import os
import sqlite3
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path
from flask import current_app, g, jsonify, session
from werkzeug.security import generate_password_hash

def database_path() -> Path:
    return Path(current_app.config['DATABASE'])

def get_db() -> sqlite3.Connection:
    if 'db' not in g:
        path = database_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        g.db = sqlite3.connect(path)
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA foreign_keys = ON')
    return g.db

def close_db(_error=None) -> None:
    connection = g.pop('db', None)
    if connection is not None:
        connection.close()

def init_db() -> None:
    get_db().executescript("\n      CREATE TABLE IF NOT EXISTS users (\n        id INTEGER PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL,\n        email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL,\n        role TEXT NOT NULL DEFAULT 'participant', created_at TEXT NOT NULL,\n        is_active INTEGER NOT NULL DEFAULT 1, last_login_at TEXT, last_logout_at TEXT\n      );\n      CREATE TABLE IF NOT EXISTS questionnaires (\n        id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n        title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft',\n        target INTEGER NOT NULL DEFAULT 0, questions TEXT NOT NULL DEFAULT '[]',\n        created_at TEXT NOT NULL, updated_at TEXT NOT NULL\n      );\n      CREATE TABLE IF NOT EXISTS responses (\n        id INTEGER PRIMARY KEY, questionnaire_id INTEGER NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,\n        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, answers TEXT NOT NULL,\n        submitted_at TEXT NOT NULL\n      );\n      CREATE TABLE IF NOT EXISTS account_requests (\n        id INTEGER PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL,\n        phone TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,\n        email_token_hash TEXT NOT NULL, setup_token_hash TEXT,\n        status TEXT NOT NULL DEFAULT 'pending_email', created_at TEXT NOT NULL,\n        verified_at TEXT, reviewed_at TEXT, reviewer_id INTEGER REFERENCES users(id)\n      );\n      CREATE TABLE IF NOT EXISTS password_change_requests (\n        id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n        status TEXT NOT NULL DEFAULT 'pending', token_hash TEXT,\n        created_at TEXT NOT NULL, reviewed_at TEXT, reviewer_id INTEGER REFERENCES users(id)\n      );\n      CREATE TABLE IF NOT EXISTS research_groups (\n        id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n        name TEXT NOT NULL, is_public INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,\n        description TEXT NOT NULL DEFAULT '', join_token TEXT\n      );\n      CREATE TABLE IF NOT EXISTS group_members (\n        id INTEGER PRIMARY KEY, group_id INTEGER NOT NULL REFERENCES research_groups(id) ON DELETE CASCADE,\n        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,\n        name TEXT NOT NULL, email TEXT NOT NULL COLLATE NOCASE, created_at TEXT NOT NULL,\n        UNIQUE(group_id, email)\n      );\n      CREATE TABLE IF NOT EXISTS questionnaire_groups (\n        questionnaire_id INTEGER NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,\n        group_id INTEGER NOT NULL REFERENCES research_groups(id) ON DELETE CASCADE,\n        PRIMARY KEY(questionnaire_id, group_id)\n      );\n      CREATE TABLE IF NOT EXISTS activity_logs (\n        id INTEGER PRIMARY KEY, actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,\n        actor_name TEXT NOT NULL, actor_role TEXT NOT NULL, action TEXT NOT NULL,\n        subject TEXT NOT NULL DEFAULT '', details TEXT NOT NULL DEFAULT '', ip_address TEXT NOT NULL DEFAULT '',\n        created_at TEXT NOT NULL\n      );\n      CREATE TABLE IF NOT EXISTS questionnaire_templates (\n        id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',\n        questions TEXT NOT NULL DEFAULT '[]', structure TEXT NOT NULL DEFAULT 'direct', created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,\n        created_at TEXT NOT NULL, updated_at TEXT NOT NULL\n      );\n      CREATE TABLE IF NOT EXISTS group_collaborators (\n        group_id INTEGER NOT NULL REFERENCES research_groups(id) ON DELETE CASCADE,\n        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n        created_at TEXT NOT NULL, PRIMARY KEY(group_id,user_id)\n      );\n      CREATE TABLE IF NOT EXISTS researcher_collaborators (\n        owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n        created_at TEXT NOT NULL, PRIMARY KEY(owner_id,user_id)\n      );\n    ")
    columns = {row[1] for row in get_db().execute('PRAGMA table_info(users)')}
    if 'phone' not in columns:
        get_db().execute("ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT ''")
    for column, declaration in (('is_active', 'INTEGER NOT NULL DEFAULT 1'), ('last_login_at', 'TEXT'), ('last_logout_at', 'TEXT')):
        if column not in columns:
            get_db().execute(f'ALTER TABLE users ADD COLUMN {column} {declaration}')
    request_columns = {row[1] for row in get_db().execute('PRAGMA table_info(account_requests)')}
    if 'password_hash' not in request_columns:
        get_db().execute('ALTER TABLE account_requests ADD COLUMN password_hash TEXT')
    if 'requested_role' not in request_columns:
        get_db().execute("ALTER TABLE account_requests ADD COLUMN requested_role TEXT NOT NULL DEFAULT 'researcher'")
    group_columns = {row[1] for row in get_db().execute('PRAGMA table_info(research_groups)')}
    for column, declaration in (('description', "TEXT NOT NULL DEFAULT ''"), ('join_token', 'TEXT')):
        if column not in group_columns:
            get_db().execute(f'ALTER TABLE research_groups ADD COLUMN {column} {declaration}')
    template_columns = {row[1] for row in get_db().execute('PRAGMA table_info(questionnaire_templates)')}
    if 'structure' not in template_columns:
        get_db().execute("ALTER TABLE questionnaire_templates ADD COLUMN structure TEXT NOT NULL DEFAULT 'direct'")
    response_columns = {row[1] for row in get_db().execute('PRAGMA table_info(responses)')}
    for column in ('respondent_name', 'respondent_email'):
        if column not in response_columns:
            get_db().execute(f"ALTER TABLE responses ADD COLUMN {column} TEXT NOT NULL DEFAULT ''")
    admin_email = os.environ.get('FUZZY_QUEST_ADMIN_EMAIL', '').strip().lower()
    admin_password = os.environ.get('FUZZY_QUEST_ADMIN_PASSWORD', '')
    if admin_email and admin_password:
        existing = get_db().execute('SELECT id FROM users WHERE email=?', (admin_email,)).fetchone()
        if not existing:
            get_db().execute('INSERT INTO users(first_name,last_name,email,phone,password_hash,role,created_at) VALUES(?,?,?,?,?,?,?)', ('Administrateur', 'FUZZY-QUEST', admin_email, '', generate_password_hash(admin_password), 'admin', utc_now()))
    get_db().commit()

def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    row = get_db().execute('SELECT id, first_name, last_name, email, phone, role FROM users WHERE id=? AND is_active=1', (user_id,)).fetchone()
    return dict(row) if row else None

def login_required(view):

    @wraps(view)
    def wrapped(*args, **kwargs):
        if not get_current_user():
            return (jsonify(error='AUTH_REQUIRED', message='Connectez-vous pour continuer.'), 401)
        return view(*args, **kwargs)
    return wrapped

def role_required(*roles):

    def decorate(view):

        @wraps(view)
        def wrapped(*args, **kwargs):
            user = get_current_user()
            if not user:
                return (jsonify(error='AUTH_REQUIRED'), 401)
            if user['role'] not in roles:
                return (jsonify(error='FORBIDDEN'), 403)
            return view(*args, **kwargs)
        return wrapped
    return decorate

def serialize_questionnaire(row):
    item = dict(row)
    item.pop('owner_id', None)
    item['questions'] = json.loads(item.pop('questions'))
    item['responses'] = get_db().execute('SELECT COUNT(*) FROM responses WHERE questionnaire_id=?', (item['id'],)).fetchone()[0]
    item['group_ids'] = [row[0] for row in get_db().execute('SELECT group_id FROM questionnaire_groups WHERE questionnaire_id=?', (item['id'],)).fetchall()]
    item['is_public'] = bool(get_db().execute('SELECT 1 FROM questionnaire_groups qg JOIN research_groups g ON g.id=qg.group_id WHERE qg.questionnaire_id=? AND g.is_public=1 LIMIT 1', (item['id'],)).fetchone())
    return item

def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()

def log_activity(action: str, subject: str='', details: str='', actor=None) -> None:
    from flask import request
    actor = actor or get_current_user()
    name = 'Système' if not actor else (actor.get('first_name', '') + ' ' + actor.get('last_name', '')).strip()
    role = 'system' if not actor else actor.get('role', '')
    get_db().execute('INSERT INTO activity_logs(actor_id,actor_name,actor_role,action,subject,details,ip_address,created_at) VALUES(?,?,?,?,?,?,?,?)', (actor.get('id') if actor else None, name, role, action, subject, details, request.remote_addr or '', utc_now()))
