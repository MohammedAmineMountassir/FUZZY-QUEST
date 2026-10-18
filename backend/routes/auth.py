"""Inscription, vérification d'adresse e-mail, connexion et réinitialisation."""
import hashlib
import re
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from flask import Blueprint, current_app, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash
from ..db import get_current_user, get_db, log_activity, utc_now
from ..emailer import send_action_email
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()

def password_is_valid(password: str) -> bool:
    return len(password) >= 8 and bool(re.search('[A-Za-z]', password)) and bool(re.search('\\d', password))

def token_is_expired(timestamp: str | None, max_age: timedelta) -> bool:
    if not timestamp:
        return True
    try:
        created = datetime.fromisoformat(timestamp)
    except ValueError:
        return True
    return datetime.now(timezone.utc) - created > max_age

def deliver(recipient: str, subject: str, url: str, intro: str):
    text = f"{intro}\n\n{url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail."
    sent = send_action_email(recipient, subject, text)
    return {'email_sent': sent, 'dev_link': url if current_app.config.get('APP_ENV') == 'development' and (not sent) else None}

@auth_bp.post('/register')
def register():
    data = request.get_json(silent=True) or {}
    first = str(data.get('prenom', '')).strip()
    last = str(data.get('nom', '')).strip()
    phone = str(data.get('telephone', '')).strip()
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))
    if len(first) < 2 or len(last) < 2 or (not phone) or (len(phone) > 40) or (not re.fullmatch('[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}', email)) or (not password_is_valid(password)):
        return (jsonify(error='INVALID_INPUT', message="Vérifiez vos coordonnées et choisissez un mot de passe d'au moins 8 caractères avec une lettre et un chiffre."), 400)
    if get_db().execute('SELECT 1 FROM users WHERE email=?', (email,)).fetchone() or get_db().execute("SELECT 1 FROM account_requests WHERE email=? AND status IN ('pending_email','pending_admin','approved')", (email,)).fetchone():
        return (jsonify(error='EMAIL_USED', message='Une demande ou un compte utilise déjà cette adresse.'), 409)
    get_db().execute("DELETE FROM account_requests WHERE email=? AND status IN ('rejected','expired')", (email,))
    get_db().commit()
    from werkzeug.security import generate_password_hash
    try:
        group_token = str(data.get('group_token', ''))
        group = get_db().execute('SELECT id FROM research_groups WHERE join_token=?', (group_token,)).fetchone() if group_token else None
        if group_token and (not group):
            return (jsonify(error='INVALID_GROUP_LINK', message='Le lien d’inscription au groupe est invalide.'), 400)
        requested_role = 'participant' if group_token else 'researcher'
        cur = get_db().execute("INSERT INTO account_requests(first_name,last_name,phone,email,email_token_hash,password_hash,requested_role,status,created_at) VALUES(?,?,?,?,?,?,?,'pending_admin',?)", (first, last, phone, email, '', generate_password_hash(password), requested_role, utc_now()))
        if group_token:
            get_db().execute('INSERT INTO group_members(group_id,user_id,name,email,created_at) VALUES(?,NULL,?,?,?)', (group['id'], first + ' ' + last, email, utc_now()))
        log_activity('Demande de compte reçue', email, first + ' ' + last)
        get_db().commit()
        get_db().commit()
    except sqlite3.IntegrityError:
        return (jsonify(error='EMAIL_USED', message='Une demande existe déjà pour cette adresse.'), 409)
    return (jsonify(message="Votre demande de compte a été envoyée à l'administrateur."), 201)

@auth_bp.post('/verify-email')
def verify_email():
    token = str((request.get_json(silent=True) or {}).get('token', ''))
    row = get_db().execute('SELECT id,status,created_at FROM account_requests WHERE email_token_hash=?', (token_hash(token),)).fetchone()
    if not row or row['status'] != 'pending_email':
        return (jsonify(error='INVALID_TOKEN', message='Ce lien est invalide ou a déjà été utilisé.'), 400)
    if token_is_expired(row['created_at'], timedelta(hours=24)):
        get_db().execute("UPDATE account_requests SET status='expired',email_token_hash='' WHERE id=?", (row['id'],))
        get_db().commit()
        return (jsonify(error='EXPIRED_TOKEN', message="Ce lien a expiré. Recommencez l'inscription."), 400)
    get_db().execute("UPDATE account_requests SET status='pending_admin',verified_at=? WHERE id=?", (utc_now(), row['id']))
    get_db().commit()
    return jsonify(message="Adresse confirmée. Votre demande attend la validation de l'administrateur.")

@auth_bp.post('/set-password')
def set_password():
    data = request.get_json(silent=True) or {}
    token, password = (str(data.get('token', '')), str(data.get('password', '')))
    if not password_is_valid(password):
        return (jsonify(error='WEAK_PASSWORD', message='Choisissez au moins 8 caractères avec une lettre et un chiffre.'), 400)
    row = get_db().execute("SELECT * FROM account_requests WHERE setup_token_hash=? AND status='approved'", (token_hash(token),)).fetchone()
    if not row:
        return (jsonify(error='INVALID_TOKEN', message="Ce lien est invalide ou votre compte n'a pas encore été approuvé."), 400)
    if token_is_expired(row['reviewed_at'], timedelta(hours=48)):
        get_db().execute("UPDATE account_requests SET status='expired',setup_token_hash=NULL WHERE id=?", (row['id'],))
        get_db().commit()
        return (jsonify(error='EXPIRED_TOKEN', message="Ce lien a expiré. Contactez l'administrateur."), 400)
    try:
        cursor = get_db().execute("INSERT INTO users(first_name,last_name,email,phone,password_hash,role,created_at) VALUES(?,?,?,?,?,'researcher',?)", (row['first_name'], row['last_name'], row['email'], row['phone'], generate_password_hash(password), utc_now()))
    except sqlite3.IntegrityError:
        return (jsonify(error='EMAIL_USED', message='Un compte existe déjà avec cette adresse.'), 409)
    get_db().execute('UPDATE group_members SET user_id=? WHERE email=? AND user_id IS NULL', (cursor.lastrowid, row['email']))
    get_db().execute("UPDATE account_requests SET status='completed',setup_token_hash=NULL WHERE id=?", (row['id'],))
    get_db().commit()
    session.clear()
    session['user_id'] = cursor.lastrowid
    return (jsonify(message='Votre compte est activé.', user=get_current_user()), 201)

@auth_bp.post('/login')
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))
    row = get_db().execute('SELECT id,password_hash,is_active FROM users WHERE email=?', (email,)).fetchone()
    if not row or not row['is_active'] or (not check_password_hash(row['password_hash'], password)):
        return (jsonify(error='INVALID_CREDENTIALS', message='Adresse e-mail ou mot de passe incorrect.'), 401)
    session.clear()
    session['user_id'] = row['id']
    get_db().execute('UPDATE users SET last_login_at=? WHERE id=?', (utc_now(), row['id']))
    get_db().commit()
    log_activity('Connexion', 'Session', 'Connexion à la plateforme')
    get_db().commit()
    return jsonify(user=get_current_user())

@auth_bp.post('/logout')
def logout():
    user = get_current_user()
    if user:
        get_db().execute('UPDATE users SET last_logout_at=? WHERE id=?', (utc_now(), user['id']))
        log_activity('Déconnexion', 'Session', 'Déconnexion de la plateforme', user)
        get_db().commit()
    session.clear()
    return jsonify(ok=True)

@auth_bp.get('/me')
def me():
    return jsonify(user=get_current_user())

@auth_bp.get('/admin-setup-status')
def admin_setup_status():
    if current_app.config.get('APP_ENV') != 'development':
        return jsonify(available=False)
    available = not get_db().execute("SELECT 1 FROM users WHERE role='admin' LIMIT 1").fetchone()
    return jsonify(available=available)

@auth_bp.post('/bootstrap-admin')
def bootstrap_admin():
    if current_app.config.get('APP_ENV') != 'development':
        return (jsonify(error='SETUP_CLOSED', message='La configuration initiale est désactivée.'), 404)
    data = request.get_json(silent=True) or {}
    first = str(data.get('first_name', '')).strip()
    last = str(data.get('last_name', '')).strip()
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))
    if len(first) < 2 or len(last) < 2 or (not re.fullmatch('[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}', email)):
        return (jsonify(error='INVALID_INPUT', message='Vérifiez le nom et l’adresse e-mail.'), 400)
    if not password_is_valid(password):
        return (jsonify(error='WEAK_PASSWORD', message='Choisissez au moins 8 caractères avec une lettre et un chiffre.'), 400)
    db = get_db()
    try:
        db.execute('BEGIN IMMEDIATE')
        if db.execute("SELECT 1 FROM users WHERE role='admin' LIMIT 1").fetchone():
            db.rollback()
            return (jsonify(error='SETUP_CLOSED', message='Un administrateur existe déjà.'), 409)
        cursor = db.execute("INSERT INTO users(first_name,last_name,email,phone,password_hash,role,created_at) VALUES(?,?,?,'',?,'admin',?)", (first, last, email, generate_password_hash(password), utc_now()))
        db.commit()
    except sqlite3.IntegrityError:
        db.rollback()
        return (jsonify(error='EMAIL_USED', message='Cette adresse e-mail est déjà utilisée.'), 409)
    session.clear()
    session['user_id'] = cursor.lastrowid
    return (jsonify(message='Le premier compte administrateur est créé.', user=get_current_user()), 201)

@auth_bp.post('/password-reset-request')
def password_reset_request():
    email = str((request.get_json(silent=True) or {}).get('email', '')).strip().lower()
    user = get_db().execute('SELECT id,email FROM users WHERE email=? AND is_active=1', (email,)).fetchone()
    if user:
        pending = get_db().execute("SELECT 1 FROM password_change_requests WHERE user_id=? AND status='pending'", (user['id'],)).fetchone()
        if not pending:
            get_db().execute("INSERT INTO password_change_requests(user_id,status,created_at) VALUES(?,'pending',?)", (user['id'], utc_now()))
            log_activity('Réinitialisation demandée', user['email'], 'Demande reçue par l’administrateur', user)
            get_db().commit()
    return (jsonify(message="Si le compte existe, la demande sera examinée par l'administrateur."), 202)

@auth_bp.post('/change-password-request')
def change_password_request():
    user = get_current_user()
    if not user:
        return (jsonify(error='AUTH_REQUIRED'), 401)
    pending = get_db().execute("SELECT 1 FROM password_change_requests WHERE user_id=? AND status='pending'", (user['id'],)).fetchone()
    if not pending:
        get_db().execute("INSERT INTO password_change_requests(user_id,status,created_at) VALUES(?,'pending',?)", (user['id'], utc_now()))
        log_activity('Réinitialisation demandée', user['email'], 'Demande reçue par l’administrateur', user)
        get_db().commit()
    return (jsonify(message="Demande envoyée à l'administrateur."), 202)

@auth_bp.post('/reset-password')
def reset_password():
    data = request.get_json(silent=True) or {}
    token, password = (str(data.get('token', '')), str(data.get('password', '')))
    if not password_is_valid(password):
        return (jsonify(error='WEAK_PASSWORD', message='Choisissez au moins 8 caractères avec une lettre et un chiffre.'), 400)
    row = get_db().execute("SELECT id,user_id,reviewed_at FROM password_change_requests WHERE token_hash=? AND status='approved'", (token_hash(token),)).fetchone()
    if not row:
        return (jsonify(error='INVALID_TOKEN', message='Ce lien de changement de mot de passe est invalide.'), 400)
    if token_is_expired(row['reviewed_at'], timedelta(hours=1)):
        get_db().execute("UPDATE password_change_requests SET status='expired',token_hash=NULL WHERE id=?", (row['id'],))
        get_db().commit()
        return (jsonify(error='EXPIRED_TOKEN', message='Ce lien a expiré. Recommencez votre demande.'), 400)
    get_db().execute('UPDATE users SET password_hash=? WHERE id=?', (generate_password_hash(password), row['user_id']))
    get_db().execute("UPDATE password_change_requests SET status='completed',token_hash=NULL WHERE id=?", (row['id'],))
    get_db().commit()
    return jsonify(message='Mot de passe mis à jour. Vous pouvez vous connecter.')
