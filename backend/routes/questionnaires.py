"""CRUD des questionnaires et collecte des réponses."""
import json
from backend import n8n
from flask import Blueprint, jsonify, request
from ..db import get_current_user, get_db, login_required, log_activity, serialize_questionnaire, utc_now
from ..emailer import send_action_email

questionnaires_bp = Blueprint('questionnaires', __name__, url_prefix='/api')
VALID_STATUSES = {'open', 'draft', 'closed'}

@questionnaires_bp.get('/questionnaires')
def list_questionnaires():
    user = get_current_user()
    if user and user['role'] == 'researcher':
        rows = get_db().execute('SELECT * FROM questionnaires q WHERE q.owner_id=? OR EXISTS(SELECT 1 FROM researcher_collaborators c WHERE c.owner_id=q.owner_id AND c.user_id=?) ORDER BY q.updated_at DESC', (user['id'], user['id'])).fetchall()
    elif user and user['role'] == 'admin':
        rows = get_db().execute('SELECT * FROM questionnaires ORDER BY updated_at DESC').fetchall()
    else:
        rows = get_db().execute("SELECT DISTINCT q.* FROM questionnaires q WHERE q.status='open' AND (NOT EXISTS (SELECT 1 FROM questionnaire_groups qg WHERE qg.questionnaire_id=q.id) OR EXISTS (SELECT 1 FROM questionnaire_groups qg JOIN research_groups g ON g.id=qg.group_id WHERE qg.questionnaire_id=q.id AND g.is_public=1) OR EXISTS (SELECT 1 FROM questionnaire_groups qg JOIN group_members gm ON gm.group_id=qg.group_id WHERE qg.questionnaire_id=q.id AND gm.user_id=?)) ORDER BY q.created_at DESC", (user['id'] if user else -1,)).fetchall()
    return jsonify(questionnaires=[serialize_questionnaire(row) for row in rows])

@questionnaires_bp.get('/templates')
def questionnaire_templates():
    builtins = [{'id': 'satisfaction', 'title': 'Satisfaction des usagers', 'description': "Évaluez l'expérience et la qualité du service.", 'questions': [{'type': 'scale', 'label': 'Quel est votre niveau de satisfaction globale ?', 'required': True, 'min': 1, 'max': 5, 'step': 1}, {'type': 'single', 'label': 'Recommanderiez-vous ce service ?', 'required': True, 'options': ['Oui', 'Peut-être', 'Non']}]}, {'id': 'risques', 'title': 'Évaluation des risques', 'description': 'Identifiez et priorisez les risques perçus.', 'questions': [{'type': 'multi', 'label': 'Quels risques avez-vous identifiés ?', 'required': True, 'options': ['Technique', 'Humain', 'Financier', 'Juridique']}, {'type': 'scale', 'label': 'Quel est le niveau de risque global ?', 'required': True, 'min': 1, 'max': 5, 'step': 1}]}, {'id': 'besoins', 'title': 'Analyse des besoins', 'description': 'Comprenez les attentes et priorités de votre public.', 'questions': [{'type': 'single', 'label': 'Quel besoin est prioritaire ?', 'required': True, 'options': ['Information', 'Accompagnement', 'Accès au service', 'Autre']}, {'type': 'triangle', 'label': 'Dans quelle mesure le besoin est-il satisfait ?', 'required': True, 'a': 0, 'b': 50, 'c': 100}]}]
    custom = get_db().execute('SELECT id,title,description,questions,structure FROM questionnaire_templates ORDER BY updated_at DESC').fetchall()
    for row in custom:
        item = dict(row)
        item['id'] = 'admin-' + str(item['id'])
        item['questions'] = json.loads(item['questions'])
        item['admin_template'] = True
        builtins.insert(0, item)
    return jsonify(templates=builtins)

@questionnaires_bp.get('/questionnaires/<int:item_id>/recipients')
def get_questionnaire_recipients(item_id):
    """Endpoint dédié à n8n : récupère la liste des e-mails des participants concernés par un questionnaire ouvert."""
    row = get_db().execute('SELECT id, title, status FROM questionnaires WHERE id=?', (item_id,)).fetchone()
    if not row:
        return jsonify(error='NOT_FOUND'), 404
        
    # Vérifie si le questionnaire a des groupes spécifiques assignés
    assigned = get_db().execute('SELECT 1 FROM questionnaire_groups WHERE questionnaire_id=?', (item_id,)).fetchone()
    
    if not assigned:
        # Aucun groupe assigné = public, on prend tous les utilisateurs ayant un e-mail
        rows = get_db().execute('SELECT email FROM users WHERE email IS NOT NULL').fetchall()
    else:
        # Groupes assignés : on récupère les membres de ces groupes ou des groupes publics liés
        query = """
            SELECT DISTINCT u.email 
            FROM users u
            JOIN group_members gm ON u.id = gm.user_id
            JOIN questionnaire_groups qg ON gm.group_id = qg.group_id
            WHERE qg.questionnaire_id = ? AND u.email IS NOT NULL
            UNION
            SELECT DISTINCT u.email
            FROM users u
            JOIN research_groups g ON g.is_public = 1
            JOIN questionnaire_groups qg ON g.id = qg.group_id
            WHERE qg.questionnaire_id = ? AND u.email IS NOT NULL
        """
        rows = get_db().execute(query, (item_id, item_id)).fetchall()
        
    emails = [r['email'] for r in rows]
    
    return jsonify(
        questionnaire_id=row['id'],
        title=row['title'],
        recipients=emails
    )

@questionnaires_bp.post('/questionnaires')
@login_required
def create_questionnaire():
    user = get_current_user()
    if user['role'] != 'researcher':
        return (jsonify(error='FORBIDDEN'), 403)
    data = request.get_json(silent=True) or {}
    title = str(data.get('title', '')).strip()
    status = data.get('status', 'draft')
    questions = data.get('questions', [])
    if not title or status not in VALID_STATUSES or (not isinstance(questions, list)):
        return (jsonify(error='INVALID_INPUT', message='Titre, statut ou questions invalides.'), 400)
    try:
        target = max(0, int(data.get('target', 0) or 0))
    except (ValueError, TypeError):
        return (jsonify(error='INVALID_INPUT', message='L’objectif de réponses doit être un nombre.'), 400)
    group_ids = data.get('group_ids', [])
    public = bool(data.get('public'))
    if not isinstance(group_ids, list) or any(not isinstance(gid, int) for gid in group_ids):
        return jsonify(error='INVALID_GROUP', message='La sélection des groupes est invalide.'), 400
    valid = {r['id'] for r in get_db().execute('SELECT id FROM research_groups WHERE owner_id=? AND is_public=0', (user['id'],)).fetchall()}
    if any(gid not in valid for gid in group_ids):
        return jsonify(error='INVALID_GROUP', message='Un groupe sélectionné est introuvable.'), 400
    if status == 'open' and not group_ids and not public:
        return jsonify(error='DISTRIBUTION_REQUIRED', message='Un questionnaire ouvert doit être attribué à un groupe ou publié en accès public.'), 400
    now = utc_now()
    cursor = get_db().execute('INSERT INTO questionnaires(owner_id,title,description,status,target,questions,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)', (user['id'], title, str(data.get('description', '')).strip(), status, target, json.dumps(questions, ensure_ascii=False), now, now))
    group_ids = list(group_ids)
    if public:
        public_group = get_db().execute('SELECT id FROM research_groups WHERE owner_id=? AND is_public=1 LIMIT 1', (user['id'],)).fetchone()
        public_id = public_group['id'] if public_group else get_db().execute('INSERT INTO research_groups(owner_id,name,is_public,created_at) VALUES(?,?,1,?)', (user['id'], 'Public', now)).lastrowid
        group_ids.append(public_id)
    get_db().executemany('INSERT INTO questionnaire_groups(questionnaire_id,group_id) VALUES(?,?)', [(cursor.lastrowid, gid) for gid in set(group_ids)])
    log_activity('Questionnaire publié' if status == 'open' else 'Questionnaire créé', title, 'Publication initiale' if status == 'open' else 'Brouillon créé', user)
    get_db().commit()
    
    # n8n : notifie si le questionnaire est créé directement en mode "open"
    if status == 'open':
        n8n.notify_open(get_db(), cursor.lastrowid, title)
        
    row = get_db().execute('SELECT * FROM questionnaires WHERE id=?', (cursor.lastrowid,)).fetchone()
    return (jsonify(questionnaire=serialize_questionnaire(row)), 201)

@questionnaires_bp.route('/questionnaires/<int:item_id>', methods=['GET', 'PUT', 'DELETE'])
def questionnaire_detail(item_id):
    row = get_db().execute('SELECT * FROM questionnaires WHERE id=?', (item_id,)).fetchone()
    if not row:
        return (jsonify(error='NOT_FOUND'), 404)
    user = get_current_user()
    collaborator = bool(user and get_db().execute('SELECT 1 FROM researcher_collaborators WHERE owner_id=? AND user_id=?', (row['owner_id'], user['id'])).fetchone())
    if request.method == 'GET':
        if row['status'] != 'open' and (not user or (user['id'] != row['owner_id'] and (not collaborator))):
            return (jsonify(error='NOT_FOUND'), 404)
        if row['status'] == 'open' and (not user or (user['id'] != row['owner_id'] and (not collaborator))):
            allowed = get_db().execute('SELECT 1 FROM questionnaire_groups qg JOIN research_groups g ON g.id=qg.group_id LEFT JOIN group_members gm ON gm.group_id=g.id AND (gm.user_id=? OR lower(gm.email)=lower(?)) WHERE qg.questionnaire_id=? GROUP BY qg.questionnaire_id HAVING SUM(CASE WHEN g.is_public=1 OR gm.id IS NOT NULL THEN 1 ELSE 0 END)>0', (user['id'] if user else -1, user['email'] if user else '', item_id)).fetchone()
            assigned = get_db().execute('SELECT 1 FROM questionnaire_groups WHERE questionnaire_id=?', (item_id,)).fetchone()
            if assigned and (not allowed):
                if not user:
                    return jsonify(error='AUTH_REQUIRED', message='Connectez-vous avec le compte associé à ce groupe pour répondre.'), 401
                return jsonify(error='FORBIDDEN', message='Ce questionnaire est réservé aux participants des groupes sélectionnés.'), 403
        return jsonify(questionnaire=serialize_questionnaire(row))
    if not user:
        return (jsonify(error='AUTH_REQUIRED'), 401)
    if user['role'] != 'researcher' or (user['id'] != row['owner_id'] and (not collaborator)):
        return (jsonify(error='FORBIDDEN'), 403)
    if request.method == 'DELETE':
        get_db().execute('DELETE FROM questionnaires WHERE id=?', (item_id,))
        log_activity('Questionnaire supprimé', row['title'], 'Questionnaire supprimé', user)
        get_db().commit()
        return jsonify(ok=True)
    data = request.get_json(silent=True) or {}
    title = str(data.get('title', row['title'])).strip()
    status = data.get('status', row['status'])
    questions = data.get('questions', serialize_questionnaire(row)['questions'])
    if not title or status not in VALID_STATUSES or (not isinstance(questions, list)):
        return (jsonify(error='INVALID_INPUT', message='Titre, statut ou questions invalides.'), 400)
    try:
        target = max(0, int(data.get('target', row['target']) or 0))
    except (ValueError, TypeError):
        return (jsonify(error='INVALID_INPUT', message='L’objectif de réponses doit être un nombre.'), 400)
    if 'group_ids' in data or 'public' in data:
        group_ids = data.get('group_ids', serialize_questionnaire(row)['group_ids'])
        public = bool(data.get('public', serialize_questionnaire(row)['is_public']))
        if not isinstance(group_ids, list) or any(not isinstance(gid, int) for gid in group_ids):
            return jsonify(error='INVALID_GROUP', message='La sélection des groupes est invalide.'), 400
        allowed_groups = {r['id'] for r in get_db().execute('SELECT id FROM research_groups WHERE owner_id=? AND is_public=0', (row['owner_id'],)).fetchall()}
        if any(gid not in allowed_groups for gid in group_ids):
            return jsonify(error='INVALID_GROUP', message='Un groupe sélectionné est introuvable.'), 400
        if status == 'open' and not group_ids and not public:
            return jsonify(error='DISTRIBUTION_REQUIRED', message='Un questionnaire ouvert doit être attribué à un groupe ou publié en accès public.'), 400
        group_ids = list(group_ids)
        if public:
            public_group = get_db().execute('SELECT id FROM research_groups WHERE owner_id=? AND is_public=1 LIMIT 1', (row['owner_id'],)).fetchone()
            public_id = public_group['id'] if public_group else get_db().execute('INSERT INTO research_groups(owner_id,name,is_public,created_at) VALUES(?,?,1,?)', (row['owner_id'], 'Public', utc_now())).lastrowid
            group_ids.append(public_id)
        get_db().execute('DELETE FROM questionnaire_groups WHERE questionnaire_id=?', (item_id,))
        get_db().executemany('INSERT INTO questionnaire_groups(questionnaire_id,group_id) VALUES(?,?)', [(item_id, gid) for gid in set(group_ids)])
    get_db().execute('UPDATE questionnaires SET title=?,description=?,status=?,target=?,questions=?,updated_at=? WHERE id=?', (title, str(data.get('description', row['description'])), status, target, json.dumps(questions, ensure_ascii=False), utc_now(), item_id))
    action = 'Questionnaire publié' if status == 'open' and row['status'] != 'open' else 'Questionnaire modifié'
    log_activity(action, title, 'Questionnaire mis à jour', user)
    get_db().commit()
    
    # n8n : déclenché uniquement au passage de brouillon (ou fermé) vers "open"
    if status == 'open' and row['status'] != 'open':
        n8n.notify_open(get_db(), item_id, title)
        
    updated = get_db().execute('SELECT * FROM questionnaires WHERE id=?', (item_id,)).fetchone()
    return jsonify(questionnaire=serialize_questionnaire(updated))

@questionnaires_bp.post('/questionnaires/<int:item_id>/send-link')
@login_required
def send_questionnaire_link(item_id):
    user = get_current_user()
    row = get_db().execute('SELECT id,title,status,owner_id FROM questionnaires WHERE id=?', (item_id,)).fetchone()
    if not row or row['owner_id'] != user['id'] or user['role'] != 'researcher':
        return jsonify(error='NOT_FOUND', message='Questionnaire introuvable.'), 404
    if row['status'] != 'open':
        return jsonify(error='INVALID_STATUS', message='Ouvrez le questionnaire avant de partager son lien.'), 400
    assigned = get_db().execute('SELECT g.id,g.is_public FROM questionnaire_groups qg JOIN research_groups g ON g.id=qg.group_id WHERE qg.questionnaire_id=?', (item_id,)).fetchall()
    group_ids = [g['id'] for g in assigned if not g['is_public']]
    if not group_ids:
        return jsonify(error='NO_RECIPIENTS', message='Aucun groupe de participants n’est associé à ce questionnaire.'), 400
    marks = ','.join('?' for _ in group_ids)
    recipients = get_db().execute('SELECT DISTINCT email FROM group_members WHERE group_id IN (' + marks + ') AND email IS NOT NULL AND email<>""', group_ids).fetchall()
    from flask import current_app
    link = current_app.config.get('APP_BASE_URL', request.url_root.rstrip('/')).rstrip('/') + '/questionnaire.html?id=' + str(item_id)
    sent = 0
    for recipient in recipients:
        if send_action_email(recipient['email'], 'Questionnaire à compléter : ' + row['title'], 'Bonjour,\n\nVous êtes invité(e) à répondre au questionnaire « ' + row['title'] + ' ».\n\nAccéder au questionnaire : ' + link + '\n'):
            sent += 1
    return jsonify(sent=sent, total=len(recipients), message=('Invitation envoyée à ' + str(sent) + ' participant(s).') if sent else 'Aucun e-mail envoyé. Vérifiez la configuration SMTP et les participants des groupes sélectionnés.')

@questionnaires_bp.post('/questionnaires/<int:item_id>/responses')
def submit_response(item_id):
    row = get_db().execute('SELECT status,title FROM questionnaires WHERE id=?', (item_id,)).fetchone()
    if not row or row['status'] != 'open':
        return (jsonify(error='NOT_FOUND'), 404)
    user = get_current_user()
    assigned = get_db().execute('SELECT 1 FROM questionnaire_groups WHERE questionnaire_id=?', (item_id,)).fetchone()
    if assigned and (not get_db().execute('SELECT 1 FROM questionnaire_groups qg JOIN research_groups g ON g.id=qg.group_id LEFT JOIN group_members gm ON gm.group_id=g.id AND (gm.user_id=? OR lower(gm.email)=lower(?)) WHERE qg.questionnaire_id=? AND (g.is_public=1 OR gm.id IS NOT NULL) LIMIT 1', (user['id'] if user else -1, user['email'] if user else '', item_id)).fetchone()):
        return (jsonify(error='FORBIDDEN', message="Ce questionnaire n'est pas accessible à votre compte."), 403)
    if user and get_db().execute('SELECT 1 FROM responses WHERE questionnaire_id=? AND user_id=? LIMIT 1', (item_id, user['id'])).fetchone():
        return (jsonify(error='ALREADY_RESPONDED', message='Vous avez déjà répondu à ce questionnaire.'), 409)
    answers = (request.get_json(silent=True) or {}).get('answers')
    if not isinstance(answers, (dict, list)):
        return (jsonify(error='INVALID_INPUT'), 400)
    get_db().execute('INSERT INTO responses(questionnaire_id,user_id,answers,submitted_at) VALUES(?,?,?,?)', (item_id, user['id'] if user else None, json.dumps(answers, ensure_ascii=False), utc_now()))
    log_activity('Réponse reçue', row['title'], 'Un participant a envoyé ses réponses', user)
    get_db().commit()
    return (jsonify(ok=True), 201)
