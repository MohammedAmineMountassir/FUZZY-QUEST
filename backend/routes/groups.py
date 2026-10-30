"""Gestion des groupes de participants et affectation de questionnaires."""
import csv
import io
import secrets
import zipfile
import xml.etree.ElementTree as ET
from flask import Blueprint, jsonify, request, send_file
from ..db import get_current_user, get_db, log_activity, role_required, serialize_questionnaire, utc_now
groups_bp = Blueprint('groups', __name__, url_prefix='/api')

def owned_group(group_id, owner_id):
    return get_db().execute('SELECT g.* FROM research_groups g WHERE g.id=? AND (g.owner_id=? OR EXISTS(SELECT 1 FROM researcher_collaborators c WHERE c.owner_id=g.owner_id AND c.user_id=?))', (group_id, owner_id, owner_id)).fetchone()

@groups_bp.get('/groups')
@role_required('researcher', 'admin')
def list_groups():
    user = get_current_user()
    rows = get_db().execute('SELECT g.*,COUNT(DISTINCT m.id) AS participant_count,COUNT(DISTINCT qg.questionnaire_id) AS distributed_count FROM research_groups g LEFT JOIN group_members m ON m.group_id=g.id LEFT JOIN questionnaire_groups qg ON qg.group_id=g.id WHERE g.owner_id=? OR EXISTS(SELECT 1 FROM researcher_collaborators c WHERE c.owner_id=g.owner_id AND c.user_id=?) GROUP BY g.id ORDER BY g.is_public DESC,g.created_at DESC', (user['id'], user['id'])).fetchall()
    return jsonify(groups=[dict(row) for row in rows])

@groups_bp.post('/groups')
@role_required('researcher', 'admin')
def create_group():
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    name = str(data.get('name', '')).strip()
    if not name:
        return (jsonify(error='INVALID_INPUT', message='Le nom du groupe est requis.'), 400)
    cur = get_db().execute('INSERT INTO research_groups(owner_id,name,is_public,description,created_at) VALUES(?,?,?,?,?)', (user['id'], name, int(bool(data.get('is_public'))), str(data.get('description', '')).strip(), utc_now()))
    log_activity('Groupe créé', name, 'Groupe de participants créé', user)
    get_db().commit()
    row = get_db().execute('SELECT *,0 AS participant_count FROM research_groups WHERE id=?', (cur.lastrowid,)).fetchone()
    return (jsonify(group=dict(row)), 201)

@groups_bp.get('/groups/<int:group_id>')
@role_required('researcher', 'admin')
def group_detail(group_id):
    user = get_current_user()
    group = owned_group(group_id, user['id'])
    if not group:
        return (jsonify(error='NOT_FOUND'), 404)
    members = get_db().execute('SELECT id,user_id,name,email,created_at FROM group_members WHERE group_id=? ORDER BY name', (group_id,)).fetchall()
    item = dict(group)
    item['members'] = [dict(member) for member in members]
    return jsonify(group=item)

@groups_bp.put('/groups/<int:group_id>')
@role_required('researcher', 'admin')
def update_group(group_id):
    user = get_current_user()
    group = owned_group(group_id, user['id'])
    if not group:
        return (jsonify(error='NOT_FOUND'), 404)
    name = str((request.get_json(silent=True) or {}).get('name', '')).strip()
    if not name:
        return (jsonify(error='INVALID_INPUT', message='Le nom du groupe est requis.'), 400)
    get_db().execute('UPDATE research_groups SET name=?,description=? WHERE id=?', (name, str((request.get_json(silent=True) or {}).get('description', group['description'])).strip(), group_id))
    log_activity('Groupe modifié', name, 'Description ou nom mis à jour', user)
    get_db().commit()
    return jsonify(ok=True)

@groups_bp.delete('/groups/<int:group_id>')
@role_required('researcher', 'admin')
def delete_group(group_id):
    user = get_current_user()
    group = owned_group(group_id, user['id'])
    if not group:
        return (jsonify(error='NOT_FOUND'), 404)
    assigned = get_db().execute('SELECT COUNT(*) FROM questionnaire_groups WHERE group_id=?', (group_id,)).fetchone()[0]
    if assigned:
        return (jsonify(error='GROUP_IN_USE', message="Retirez d'abord les questionnaires affectés à ce groupe."), 409)
    get_db().execute('DELETE FROM research_groups WHERE id=?', (group_id,))
    log_activity('Groupe supprimé', group['name'], '', user)
    get_db().commit()
    return jsonify(ok=True)

@groups_bp.post('/groups/<int:group_id>/members')
@role_required('researcher', 'admin')
def add_member(group_id):
    user = get_current_user()
    if not owned_group(group_id, user['id']):
        return (jsonify(error='NOT_FOUND'), 404)
    data = request.get_json(silent=True) or {}
    name = str(data.get('name', '')).strip()
    email = str(data.get('email', '')).strip().lower()
    if len(name) < 2 or '@' not in email:
        return (jsonify(error='INVALID_INPUT', message='Indiquez le nom et une adresse e-mail valide.'), 400)
    existing_user = get_db().execute('SELECT id,first_name,last_name FROM users WHERE email=?', (email,)).fetchone()
    if existing_user:
        name = f"{existing_user['first_name']} {existing_user['last_name']}"
    try:
        cursor = get_db().execute('INSERT INTO group_members(group_id,user_id,name,email,created_at) VALUES(?,?,?,?,?)', (group_id, existing_user['id'] if existing_user else None, name, email, utc_now()))
        get_db().commit()
    except Exception as exc:
        if 'UNIQUE' in str(exc).upper():
            return (jsonify(error='MEMBER_EXISTS', message='Cette personne est déjà dans le groupe.'), 409)
        raise
    row = get_db().execute('SELECT id,user_id,name,email,created_at FROM group_members WHERE id=?', (cursor.lastrowid,)).fetchone()
    log_activity('Participant ajouté', name, 'Ajouté au groupe ' + str(group_id), user)
    get_db().commit()
    return (jsonify(member=dict(row)), 201)

@groups_bp.post('/groups/<int:group_id>/members/bulk')
@role_required('researcher', 'admin')
def add_members_bulk(group_id):
    user = get_current_user()
    if not owned_group(group_id, user['id']):
        return (jsonify(error='NOT_FOUND'), 404)
    members = (request.get_json(silent=True) or {}).get('members', [])
    if not isinstance(members, list) or len(members) > 1000:
        return (jsonify(error='INVALID_INPUT', message='Fichier invalide ou trop volumineux.'), 400)
    added, skipped = (0, 0)
    for item in members:
        name = str(item.get('name', '')).strip()
        email = str(item.get('email', '')).strip().lower()
        if len(name) < 2 or '@' not in email:
            skipped += 1
            continue
        existing_user = get_db().execute('SELECT id,first_name,last_name FROM users WHERE email=?', (email,)).fetchone()
        if existing_user:
            name = existing_user['first_name'] + ' ' + existing_user['last_name']
        try:
            get_db().execute('INSERT INTO group_members(group_id,user_id,name,email,created_at) VALUES(?,?,?,?,?)', (group_id, existing_user['id'] if existing_user else None, name, email, utc_now()))
            added += 1
        except Exception:
            skipped += 1
    log_activity('Participants importés', str(group_id), f'{added} ajouté(s), {skipped} ignoré(s)', user)
    get_db().commit()
    return jsonify(added=added, skipped=skipped)

@groups_bp.get('/groups/import-template.xlsx')
@role_required('researcher', 'admin')
def member_template():
    files = {'[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>', '_rels/.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>', 'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Participants" sheetId="1" r:id="rId1"/></sheets></workbook>', 'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>', 'xl/worksheets/sheet1.xml': '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Nom</t></is></c><c r="B1" t="inlineStr"><is><t>Email</t></is></c></row></sheetData></worksheet>'}
    content = io.BytesIO()
    with zipfile.ZipFile(content, 'w', zipfile.ZIP_DEFLATED) as workbook:
        for name, value in files.items():
            workbook.writestr(name, value)
    content.seek(0)
    return send_file(content, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', as_attachment=True, download_name='modele-participants.xlsx')

@groups_bp.post('/groups/<int:group_id>/members/import')
@role_required('researcher', 'admin')
def import_members_file(group_id):
    user = get_current_user()
    if not owned_group(group_id, user['id']):
        return (jsonify(error='NOT_FOUND'), 404)
    upload = request.files.get('file')
    if not upload or not upload.filename:
        return (jsonify(error='INVALID_INPUT', message='Sélectionnez un fichier Excel ou CSV.'), 400)
    members = []
    try:
        if upload.filename.lower().endswith('.xlsx'):
            with zipfile.ZipFile(upload.stream) as workbook:
                ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                shared = []
                if 'xl/sharedStrings.xml' in workbook.namelist():
                    root = ET.fromstring(workbook.read('xl/sharedStrings.xml'))
                    shared = [''.join((t.text or '' for t in item.findall('.//m:t', ns))) for item in root.findall('m:si', ns)]
                sheet_name = next((n for n in workbook.namelist() if n.startswith('xl/worksheets/sheet') and n.endswith('.xml')), None)
                if not sheet_name:
                    raise ValueError('Feuille introuvable')
                sheet = ET.fromstring(workbook.read(sheet_name))
                rows = []
                for row in sheet.findall('.//m:sheetData/m:row', ns):
                    values = {}
                    for cell in row.findall('m:c', ns):
                        ref = cell.attrib.get('r', '')
                        col = ''.join((ch for ch in ref if ch.isalpha()))
                        kind = cell.attrib.get('t')
                        val = cell.find('m:v', ns)
                        if kind == 'inlineStr':
                            text = ''.join((t.text or '' for t in cell.findall('.//m:t', ns)))
                        elif val is None:
                            text = ''
                        elif kind == 's':
                            text = shared[int(val.text)]
                        else:
                            text = val.text or ''
                        values[col] = text
                    rows.append([values.get('A', ''), values.get('B', '')])
        else:
            text = upload.stream.read().decode('utf-8-sig')
            dialect = csv.Sniffer().sniff(text[:2048], delimiters=';,\t,') if text.strip() else csv.excel
            rows = list(csv.reader(io.StringIO(text), dialect))
        if rows and any(('nom' in str(v).lower() for v in rows[0])) and any(('mail' in str(v).lower() for v in rows[0])):
            rows = rows[1:]
        members = [{'name': row[0], 'email': row[1]} for row in rows if len(row) >= 2 and row[0].strip() and row[1].strip()]
    except Exception:
        return (jsonify(error='INVALID_FILE', message='Le fichier est illisible. Utilisez le modèle Excel fourni avec les colonnes Nom et Email.'), 400)
    if not members:
        return (jsonify(error='EMPTY_FILE', message='Aucun participant valide n’a été trouvé.'), 400)
    added = skipped = 0
    for item in members:
        name, email = (str(item['name']).strip(), str(item['email']).strip().lower())
        if len(name) < 2 or '@' not in email:
            skipped += 1
            continue
        found = get_db().execute('SELECT id,first_name,last_name FROM users WHERE email=?', (email,)).fetchone()
        if found:
            name = found['first_name'] + ' ' + found['last_name']
        try:
            get_db().execute('INSERT INTO group_members(group_id,user_id,name,email,created_at) VALUES(?,?,?,?,?)', (group_id, found['id'] if found else None, name, email, utc_now()))
            added += 1
        except Exception:
            skipped += 1
    log_activity('Participants importés', str(group_id), f'{added} ajouté(s), {skipped} ignoré(s)', user)
    get_db().commit()
    return jsonify(added=added, skipped=skipped)

@groups_bp.delete('/groups/<int:group_id>/members/<int:member_id>')
@role_required('researcher', 'admin')
def remove_member(group_id, member_id):
    user = get_current_user()
    if not owned_group(group_id, user['id']):
        return (jsonify(error='NOT_FOUND'), 404)
    cur = get_db().execute('DELETE FROM group_members WHERE id=? AND group_id=?', (member_id, group_id))
    log_activity('Participant retiré', str(member_id), 'Retiré du groupe ' + str(group_id), user)
    get_db().commit()
    if cur.rowcount == 0:
        return (jsonify(error='NOT_FOUND'), 404)
    return jsonify(ok=True)

@groups_bp.post('/groups/<int:group_id>/invitation')
@role_required('researcher')
def create_group_invitation(group_id):
    user = get_current_user()
    group = owned_group(group_id, user['id'])
    if not group:
        return (jsonify(error='NOT_FOUND'), 404)
    token = group['join_token'] or secrets.token_urlsafe(24)
    get_db().execute('UPDATE research_groups SET join_token=? WHERE id=?', (token, group_id))
    get_db().commit()
    return jsonify(url=f'/inscription.html?g={token}')

@groups_bp.post('/groups/join/<token>')
def register_group_join(token):
    data = request.get_json(silent=True) or {}
    group = get_db().execute('SELECT id FROM research_groups WHERE join_token=?', (token,)).fetchone()
    if not group:
        return (jsonify(error='INVALID_LINK', message='Ce lien d’inscription n’est plus valide.'), 404)
    name = (str(data.get('first_name', '')).strip() + ' ' + str(data.get('last_name', '')).strip()).strip()
    email = str(data.get('email', '')).strip().lower()
    if len(name) < 3 or '@' not in email:
        return (jsonify(error='INVALID_INPUT', message='Nom ou adresse e-mail invalide.'), 400)
    try:
        get_db().execute('INSERT INTO group_members(group_id,user_id,name,email,created_at) VALUES(?,NULL,?,?,?)', (group['id'], name, email, utc_now()))
        get_db().commit()
    except Exception:
        return (jsonify(error='MEMBER_EXISTS', message='Cette adresse est déjà inscrite dans le groupe.'), 409)
    return (jsonify(ok=True), 201)

@groups_bp.get('/collaborators')
@role_required('researcher')
def list_collaborators():
    user = get_current_user()
    rows = get_db().execute('SELECT u.id,u.first_name,u.last_name,u.email,c.created_at FROM researcher_collaborators c JOIN users u ON u.id=c.user_id WHERE c.owner_id=? ORDER BY u.last_name,u.first_name', (user['id'],)).fetchall()
    return jsonify(collaborators=[dict(row) for row in rows])

@groups_bp.post('/collaborators')
@role_required('researcher')
def add_collaborator():
    user = get_current_user()
    email = str((request.get_json(silent=True) or {}).get('email', '')).strip().lower()
    target = get_db().execute('SELECT id,role FROM users WHERE email=? AND is_active=1', (email,)).fetchone()
    if not target or target['role'] != 'researcher':
        return (jsonify(error='NOT_FOUND', message='Aucun compte chercheur actif ne correspond à cette adresse.'), 404)
    if target['id'] == user['id']:
        return (jsonify(error='INVALID_INPUT', message='Vous ne pouvez pas vous ajouter vous-même.'), 400)
    try:
        get_db().execute('INSERT INTO researcher_collaborators(owner_id,user_id,created_at) VALUES(?,?,?)', (user['id'], target['id'], utc_now()))
    except Exception:
        return (jsonify(error='ALREADY_ADDED', message='Ce chercheur est déjà co-chercheur.'), 409)
    log_activity('Co-chercheur ajouté', email, 'Accès de collaboration accordé', user)
    get_db().commit()
    return (jsonify(ok=True), 201)

@groups_bp.delete('/collaborators/<int:user_id>')
@role_required('researcher')
def remove_collaborator(user_id):
    user = get_current_user()
    cur = get_db().execute('DELETE FROM researcher_collaborators WHERE owner_id=? AND user_id=?', (user['id'], user_id))
    if not cur.rowcount:
        return (jsonify(error='NOT_FOUND'), 404)
    log_activity('Co-chercheur retiré', str(user_id), 'Accès de collaboration retiré', user)
    get_db().commit()
    return jsonify(ok=True)

@groups_bp.get('/researcher/activity')
@role_required('researcher')
def researcher_activity():
    user = get_current_user()
    rows = get_db().execute('SELECT created_at,actor_name,action,subject,details FROM activity_logs WHERE actor_id=? ORDER BY id DESC LIMIT 300', (user['id'],)).fetchall()
    return jsonify(events=[dict(row) for row in rows])

@groups_bp.get('/my-space')
@role_required('participant', 'researcher')
def my_space():
    user = get_current_user()
    rows = get_db().execute("SELECT DISTINCT q.* FROM questionnaires q LEFT JOIN questionnaire_groups qg ON qg.questionnaire_id=q.id LEFT JOIN research_groups g ON g.id=qg.group_id LEFT JOIN group_members gm ON gm.group_id=g.id WHERE q.status='open' AND (q.owner_id=? OR qg.questionnaire_id IS NULL OR g.is_public=1 OR gm.user_id=? OR lower(gm.email)=lower(?)) ORDER BY q.updated_at DESC", (user['id'], user['id'], user['email'])).fetchall()
    quizzes = [serialize_questionnaire(row) for row in rows]
    answered = {row[0] for row in get_db().execute('SELECT DISTINCT questionnaire_id FROM responses WHERE user_id=?', (user['id'],)).fetchall()}
    return jsonify(questionnaires=quizzes, answered=sorted(answered))

@groups_bp.post('/questionnaires/<int:questionnaire_id>/duplicate')
@role_required('researcher')
def duplicate_questionnaire(questionnaire_id):
    user = get_current_user()
    source = get_db().execute('SELECT * FROM questionnaires WHERE id=? AND (owner_id=? OR EXISTS(SELECT 1 FROM researcher_collaborators c WHERE c.owner_id=questionnaires.owner_id AND c.user_id=?))', (questionnaire_id, user['id'], user['id'])).fetchone()
    if not source:
        return (jsonify(error='NOT_FOUND'), 404)
    now = utc_now()
    cursor = get_db().execute('INSERT INTO questionnaires(owner_id,title,description,status,target,questions,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)', (user['id'], source['title'] + ' (copie)', source['description'], 'draft', source['target'], source['questions'], now, now))
    get_db().commit()
    duplicate = get_db().execute('SELECT * FROM questionnaires WHERE id=?', (cursor.lastrowid,)).fetchone()
    return (jsonify(questionnaire=serialize_questionnaire(duplicate)), 201)

@groups_bp.put('/questionnaires/<int:questionnaire_id>/groups')
@role_required('researcher')
def assign_groups(questionnaire_id):
    user = get_current_user()
    questionnaire = get_db().execute('SELECT id FROM questionnaires WHERE id=? AND owner_id=?', (questionnaire_id, user['id'])).fetchone()
    if not questionnaire:
        questionnaire = get_db().execute('SELECT id FROM questionnaires WHERE id=? AND EXISTS(SELECT 1 FROM researcher_collaborators c WHERE c.owner_id=questionnaires.owner_id AND c.user_id=?)', (questionnaire_id, user['id'])).fetchone()
    if not questionnaire:
        return (jsonify(error='NOT_FOUND'), 404)
    data = request.get_json(silent=True) or {}
    group_ids = data.get('group_ids', [])
    if not isinstance(group_ids, list):
        return (jsonify(error='INVALID_INPUT'), 400)
    for group_id in group_ids:
        if not isinstance(group_id, int) or not owned_group(group_id, user['id']):
            return (jsonify(error='INVALID_GROUP', message="Un groupe sélectionné n'existe pas."), 400)
    if data.get('public'):
        public = get_db().execute('SELECT id FROM research_groups WHERE owner_id=? AND is_public=1 LIMIT 1', (user['id'],)).fetchone()
        if not public:
            cur = get_db().execute('INSERT INTO research_groups(owner_id,name,is_public,created_at) VALUES(?,?,1,?)', (user['id'], 'Public', utc_now()))
            public_id = cur.lastrowid
        else:
            public_id = public['id']
        if public_id not in group_ids:
            group_ids.append(public_id)
    get_db().execute('DELETE FROM questionnaire_groups WHERE questionnaire_id=?', (questionnaire_id,))
    get_db().executemany('INSERT INTO questionnaire_groups(questionnaire_id,group_id) VALUES(?,?)', [(questionnaire_id, group_id) for group_id in set(group_ids)])
    log_activity('Diffusion modifiée', str(questionnaire_id), 'Groupes et visibilité publique modifiés', user)
    get_db().commit()
    return jsonify(group_ids=group_ids)

@groups_bp.get('/public/questionnaires')
def public_questionnaires():
    rows = get_db().execute("SELECT DISTINCT q.* FROM questionnaires q JOIN questionnaire_groups qg ON qg.questionnaire_id=q.id JOIN research_groups g ON g.id=qg.group_id WHERE q.status='open' AND g.is_public=1 ORDER BY q.updated_at DESC").fetchall()
    return jsonify(questionnaires=[serialize_questionnaire(row) for row in rows])

@groups_bp.get('/analytics')
@role_required('researcher', 'admin')
def analytics():
    user = get_current_user()
    rows = get_db().execute('SELECT q.id,q.title,q.status,q.target,COUNT(r.id) AS response_count,q.created_at,q.updated_at FROM questionnaires q LEFT JOIN responses r ON r.questionnaire_id=q.id WHERE q.owner_id=? OR EXISTS(SELECT 1 FROM researcher_collaborators c WHERE c.owner_id=q.owner_id AND c.user_id=?) GROUP BY q.id ORDER BY q.updated_at DESC', (user['id'], user['id'])).fetchall()
    return jsonify(questionnaires=[dict(row) for row in rows], totals={'questionnaires': len(rows), 'responses': sum((row['response_count'] for row in rows))})
