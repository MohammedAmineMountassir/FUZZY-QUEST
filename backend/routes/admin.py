"""Administration des chercheurs, demandes, modèles et journaux."""
import hashlib
import json
import re
import secrets
from flask import Blueprint, current_app, jsonify, request
from werkzeug.security import generate_password_hash
from ..db import get_current_user, get_db, log_activity, role_required, utc_now
from ..emailer import send_action_email
admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

def token_hash(token):
    return hashlib.sha256(token.encode('utf-8')).hexdigest()

@admin_bp.get('/account-requests')
@role_required('admin')
def account_requests():
    rows = get_db().execute("SELECT id,first_name,last_name,phone,email,status,requested_role,created_at,verified_at FROM account_requests WHERE status IN ('pending_admin') ORDER BY created_at").fetchall()
    return jsonify(requests=[dict(row) for row in rows])

@admin_bp.post('/account-requests/<int:request_id>/<action>')
@role_required('admin')
def review_account(request_id, action):
    if action not in {'approve', 'reject'}:
        return (jsonify(error='INVALID_ACTION'), 400)
    db = get_db()
    row = db.execute("SELECT * FROM account_requests WHERE id=? AND status IN ('pending_admin','pending_email')", (request_id,)).fetchone()
    if not row or row['status'] != 'pending_admin':
        return (jsonify(error='NOT_FOUND', message="Cette demande n'attend pas de décision."), 404)
    admin = get_current_user()
    now = utc_now()
    if action == 'reject':
        db.execute("UPDATE account_requests SET status='rejected',reviewed_at=?,reviewer_id=? WHERE id=?", (now, admin['id'], request_id))
        log_activity('Demande refusée', row['email'], 'Demande de création de compte', admin)
        db.commit()
        return jsonify(message='La demande a été refusée.')
    if row['password_hash']:
        role = row['requested_role'] or 'researcher'
        try:
            cursor = db.execute('INSERT INTO users(first_name,last_name,email,phone,password_hash,role,created_at) VALUES(?,?,?,?,?,?,?)', (row['first_name'], row['last_name'], row['email'], row['phone'], row['password_hash'], role, now))
        except Exception:
            return (jsonify(error='EMAIL_USED', message='Un compte existe déjà avec cette adresse.'), 409)
        db.execute("UPDATE account_requests SET status='completed',reviewed_at=?,reviewer_id=? WHERE id=?", (now, admin['id'], request_id))
        db.execute('UPDATE group_members SET user_id=? WHERE email=? AND user_id IS NULL', (cursor.lastrowid, row['email']))
        log_activity('Compte approuvé', row['email'], 'Compte ' + role + ' activé', admin)
        db.commit()
        return jsonify(message='Demande approuvée. Le compte est actif.')
    return (jsonify(error='INVALID_REQUEST', message='Cette demande ancienne doit être renouvelée.'), 409)

@admin_bp.get('/password-requests')
@role_required('admin')
def password_requests():
    rows = get_db().execute("SELECT r.id,r.status,r.created_at,u.first_name,u.last_name,u.email FROM password_change_requests r JOIN users u ON u.id=r.user_id WHERE r.status='pending' ORDER BY r.created_at").fetchall()
    return jsonify(requests=[dict(row) for row in rows])

@admin_bp.post('/password-requests/<int:request_id>/<action>')
@role_required('admin')
def review_password_request(request_id, action):
    if action not in {'approve', 'reject'}:
        return (jsonify(error='INVALID_ACTION'), 400)
    db = get_db()
    row = db.execute('SELECT r.id,r.user_id,r.status,u.email FROM password_change_requests r JOIN users u ON u.id=r.user_id WHERE r.id=?', (request_id,)).fetchone()
    if not row or row['status'] != 'pending':
        return (jsonify(error='NOT_FOUND'), 404)
    reviewer = get_current_user()['id']
    if action == 'reject':
        db.execute("UPDATE password_change_requests SET status='rejected',reviewed_at=?,reviewer_id=? WHERE id=?", (utc_now(), reviewer, request_id))
        log_activity('Demande de mot de passe refusée', row['email'], '', get_current_user())
        db.commit()
        return jsonify(message='La demande a été refusée.')
    token = secrets.token_urlsafe(32)
    db.execute("UPDATE password_change_requests SET status='approved',token_hash=?,reviewed_at=?,reviewer_id=? WHERE id=?", (token_hash(token), utc_now(), reviewer, request_id))
    link = f"{current_app.config['APP_BASE_URL']}/mot-de-passe.html?token={token}&type=reset"
    sent = send_action_email(row['email'], 'Changez votre mot de passe FUZZY-QUEST', f'Choisissez un nouveau mot de passe :\n\n{link}')
    if not sent and current_app.config.get('APP_ENV') == 'production':
        db.execute("UPDATE password_change_requests SET status='pending',token_hash=NULL,reviewed_at=NULL,reviewer_id=NULL WHERE id=?", (request_id,))
        db.commit()
        return (jsonify(error='EMAIL_UNAVAILABLE', message="L'e-mail n'a pas pu être envoyé."), 503)
    log_activity('Réinitialisation du mot de passe', row['email'], 'Lien sécurisé généré', get_current_user())
    db.commit()
    result = {'message': 'Lien de réinitialisation généré.', 'email_sent': sent}
    if not sent and current_app.config.get('APP_ENV') == 'development':
        result['dev_link'] = link
    return jsonify(result)

@admin_bp.get('/researchers')
@role_required('admin')
def researchers():
    rows = get_db().execute("SELECT u.id,u.first_name,u.last_name,u.email,u.phone,u.created_at,u.is_active,u.last_login_at,u.last_logout_at,COUNT(DISTINCT q.id) AS questionnaire_count,COUNT(DISTINCT CASE WHEN qg.group_id IS NOT NULL THEN q.id END) AS distributed_count FROM users u LEFT JOIN questionnaires q ON q.owner_id=u.id LEFT JOIN questionnaire_groups qg ON qg.questionnaire_id=q.id WHERE u.role='researcher' GROUP BY u.id ORDER BY u.created_at DESC").fetchall()
    return jsonify(users=[dict(row) for row in rows])

@admin_bp.post('/researchers')
@role_required('admin')
def create_researcher():
    data = request.get_json(silent=True) or {}
    first, last, email, password = (str(data.get(key, '')).strip() for key in ('first_name', 'last_name', 'email', 'password'))
    if len(first) < 2 or len(last) < 2 or (not re.fullmatch('[^\\s@]+@[^\\s@]+\\.[^\\s@]+', email)) or (len(password) < 8) or (not re.search('[A-Za-z]', password)) or (not re.search('\\d', password)):
        return (jsonify(error='INVALID_INPUT', message='Nom, e-mail ou mot de passe invalide (8 caractères, lettre et chiffre).'), 400)
    try:
        get_db().execute("INSERT INTO users(first_name,last_name,email,phone,password_hash,role,created_at) VALUES(?,?,?,'',?,'researcher',?)", (first, last, email.lower(), generate_password_hash(password), utc_now()))
    except Exception:
        return (jsonify(error='EMAIL_USED', message='Cette adresse e-mail est déjà utilisée.'), 409)
    log_activity('Chercheur créé', email, "Compte créé par l'administrateur", get_current_user())
    get_db().commit()
    return (jsonify(message='Compte chercheur créé.'), 201)

@admin_bp.post('/researchers/<int:user_id>/<action>')
@role_required('admin')
def researcher_action(user_id, action):
    if action not in {'disable', 'enable', 'reset-password'}:
        return (jsonify(error='INVALID_ACTION'), 400)
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE id=? AND role='researcher'", (user_id,)).fetchone()
    if not user:
        return (jsonify(error='NOT_FOUND'), 404)
    admin = get_current_user()
    if action in {'disable', 'enable'}:
        db.execute('UPDATE users SET is_active=? WHERE id=?', (int(action == 'enable'), user_id))
        log_activity('Chercheur ' + ('désactivé' if action == 'disable' else 'réactivé'), user['email'], 'État du compte modifié', admin)
        db.commit()
        return jsonify(message='Compte ' + ('désactivé' if action == 'disable' else 'réactivé') + '.')
    token = secrets.token_urlsafe(32)
    db.execute("INSERT INTO password_change_requests(user_id,status,token_hash,created_at,reviewed_at,reviewer_id) VALUES(?,'approved',?,?,?,?)", (user_id, token_hash(token), utc_now(), utc_now(), admin['id']))
    link = f"{current_app.config['APP_BASE_URL']}/mot-de-passe.html?token={token}&type=reset"
    sent = send_action_email(user['email'], 'Réinitialisation FUZZY-QUEST', f'Votre administrateur a demandé une réinitialisation. Choisissez un nouveau mot de passe :\n\n{link}')
    if not sent and current_app.config.get('APP_ENV') == 'production':
        db.execute('DELETE FROM password_change_requests WHERE token_hash=?', (token_hash(token),))
        db.commit()
        return (jsonify(error='EMAIL_UNAVAILABLE', message="Le courriel de réinitialisation n'a pas pu être envoyé."), 503)
    log_activity('Réinitialisation demandée', user['email'], "Lien sécurisé généré par l'administrateur", admin)
    db.commit()
    result = {'message': 'Lien de réinitialisation envoyé.' if sent else 'Lien de réinitialisation généré.', 'email_sent': sent}
    if not sent and current_app.config.get('APP_ENV') == 'development':
        result['dev_link'] = link
    return jsonify(result)

@admin_bp.get('/templates')
@role_required('admin')
def templates():
    rows = get_db().execute('SELECT id,title,description,questions,structure,created_at,updated_at FROM questionnaire_templates ORDER BY updated_at DESC').fetchall()
    return jsonify(templates=[dict(row, questions=json.loads(row['questions'])) for row in rows])

@admin_bp.post('/templates')
@role_required('admin')
def create_template():
    data = request.get_json(silent=True) or {}
    title = str(data.get('title', '')).strip()
    questions = data.get('questions', [])
    structure = data.get('structure', 'direct')
    if not title or not isinstance(questions, list) or (not questions) or (structure not in {'direct', 'sections', 'subsections'}):
        return (jsonify(error='INVALID_INPUT', message='Un titre, une structure et au moins une question sont requis.'), 400)
    now = utc_now()
    cur = get_db().execute('INSERT INTO questionnaire_templates(title,description,questions,structure,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?)', (title, str(data.get('description', '')), json.dumps(questions, ensure_ascii=False), structure, get_current_user()['id'], now, now))
    log_activity('Modèle créé', title, 'Modèle ajouté à la bibliothèque', get_current_user())
    get_db().commit()
    return (jsonify(id=cur.lastrowid), 201)

@admin_bp.put('/templates/<int:template_id>')
@role_required('admin')
def update_template(template_id):
    data = request.get_json(silent=True) or {}
    title = str(data.get('title', '')).strip()
    questions = data.get('questions', [])
    structure = data.get('structure', 'direct')
    if not title or not isinstance(questions, list) or (not questions) or (structure not in {'direct', 'sections', 'subsections'}):
        return (jsonify(error='INVALID_INPUT', message='Titre, structure et questions requis.'), 400)
    cur = get_db().execute('UPDATE questionnaire_templates SET title=?,description=?,questions=?,structure=?,updated_at=? WHERE id=?', (title, str(data.get('description', '')), json.dumps(questions, ensure_ascii=False), structure, utc_now(), template_id))
    if not cur.rowcount:
        return (jsonify(error='NOT_FOUND'), 404)
    log_activity('Modèle modifié', title, 'Modèle mis à jour', get_current_user())
    get_db().commit()
    return jsonify(ok=True)

@admin_bp.delete('/templates/<int:template_id>')
@role_required('admin')
def delete_template(template_id):
    row = get_db().execute('SELECT title FROM questionnaire_templates WHERE id=?', (template_id,)).fetchone()
    if not row:
        return (jsonify(error='NOT_FOUND'), 404)
    get_db().execute('DELETE FROM questionnaire_templates WHERE id=?', (template_id,))
    log_activity('Modèle supprimé', row['title'], '', get_current_user())
    get_db().commit()
    return jsonify(ok=True)

@admin_bp.get('/activity')
@role_required('admin')
def activity():
    rows = get_db().execute('SELECT created_at,actor_name,actor_role,action,subject,details,ip_address FROM activity_logs ORDER BY id DESC LIMIT 500').fetchall()
    return jsonify(events=[dict(row) for row in rows])
