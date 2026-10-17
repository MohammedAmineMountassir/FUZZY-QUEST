"""Gestion des groupes de participants et affectation de questionnaires."""
from flask import Blueprint, jsonify, request

from ..db import get_current_user, get_db, role_required, serialize_questionnaire, utc_now

groups_bp = Blueprint("groups", __name__, url_prefix="/api")


def owned_group(group_id, owner_id):
    return get_db().execute("SELECT * FROM research_groups WHERE id=? AND owner_id=?", (group_id, owner_id)).fetchone()


@groups_bp.get("/groups")
@role_required("researcher", "admin")
def list_groups():
    user = get_current_user()
    rows = get_db().execute(
        "SELECT g.*,COUNT(m.id) AS participant_count FROM research_groups g "
        "LEFT JOIN group_members m ON m.group_id=g.id WHERE g.owner_id=? "
        "GROUP BY g.id ORDER BY g.is_public DESC,g.created_at DESC", (user["id"],)
    ).fetchall()
    return jsonify(groups=[dict(row) for row in rows])


@groups_bp.post("/groups")
@role_required("researcher", "admin")
def create_group():
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    if not name:
        return jsonify(error="INVALID_INPUT", message="Le nom du groupe est requis."), 400
    cur = get_db().execute("INSERT INTO research_groups(owner_id,name,is_public,created_at) VALUES(?,?,?,?)",
                           (user["id"], name, int(bool(data.get("is_public"))), utc_now()))
    get_db().commit()
    row = get_db().execute("SELECT *,0 AS participant_count FROM research_groups WHERE id=?", (cur.lastrowid,)).fetchone()
    return jsonify(group=dict(row)), 201


@groups_bp.get("/groups/<int:group_id>")
@role_required("researcher", "admin")
def group_detail(group_id):
    user = get_current_user()
    group = owned_group(group_id, user["id"])
    if not group:
        return jsonify(error="NOT_FOUND"), 404
    members = get_db().execute("SELECT id,user_id,name,email,created_at FROM group_members WHERE group_id=? ORDER BY name", (group_id,)).fetchall()
    item = dict(group)
    item["members"] = [dict(member) for member in members]
    return jsonify(group=item)


@groups_bp.put("/groups/<int:group_id>")
@role_required("researcher", "admin")
def update_group(group_id):
    user = get_current_user()
    group = owned_group(group_id, user["id"])
    if not group:
        return jsonify(error="NOT_FOUND"), 404
    name = str((request.get_json(silent=True) or {}).get("name", "")).strip()
    if not name:
        return jsonify(error="INVALID_INPUT", message="Le nom du groupe est requis."), 400
    get_db().execute("UPDATE research_groups SET name=? WHERE id=?", (name, group_id))
    get_db().commit()
    return jsonify(ok=True)


@groups_bp.delete("/groups/<int:group_id>")
@role_required("researcher", "admin")
def delete_group(group_id):
    user = get_current_user()
    group = owned_group(group_id, user["id"])
    if not group:
        return jsonify(error="NOT_FOUND"), 404
    assigned = get_db().execute(
        "SELECT COUNT(*) FROM questionnaire_groups WHERE group_id=?", (group_id,)
    ).fetchone()[0]
    if assigned:
        return jsonify(error="GROUP_IN_USE", message="Retirez d'abord les questionnaires affectés à ce groupe."), 409
    get_db().execute("DELETE FROM research_groups WHERE id=?", (group_id,))
    get_db().commit()
    return jsonify(ok=True)


@groups_bp.post("/groups/<int:group_id>/members")
@role_required("researcher", "admin")
def add_member(group_id):
    user = get_current_user()
    if not owned_group(group_id, user["id"]):
        return jsonify(error="NOT_FOUND"), 404
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    if len(name) < 2 or "@" not in email:
        return jsonify(error="INVALID_INPUT", message="Indiquez le nom et une adresse e-mail valide."), 400
    existing_user = get_db().execute("SELECT id,first_name,last_name FROM users WHERE email=?", (email,)).fetchone()
    if existing_user:
        name = f"{existing_user['first_name']} {existing_user['last_name']}"
    try:
        cursor = get_db().execute("INSERT INTO group_members(group_id,user_id,name,email,created_at) VALUES(?,?,?,?,?)",
                                  (group_id, existing_user["id"] if existing_user else None, name, email, utc_now()))
        get_db().commit()
    except Exception as exc:
        if "UNIQUE" in str(exc).upper():
            return jsonify(error="MEMBER_EXISTS", message="Cette personne est déjà dans le groupe."), 409
        raise
    row = get_db().execute("SELECT id,user_id,name,email,created_at FROM group_members WHERE id=?", (cursor.lastrowid,)).fetchone()
    return jsonify(member=dict(row)), 201


@groups_bp.delete("/groups/<int:group_id>/members/<int:member_id>")
@role_required("researcher", "admin")
def remove_member(group_id, member_id):
    user = get_current_user()
    if not owned_group(group_id, user["id"]):
        return jsonify(error="NOT_FOUND"), 404
    cur = get_db().execute("DELETE FROM group_members WHERE id=? AND group_id=?", (member_id, group_id))
    get_db().commit()
    if cur.rowcount == 0:
        return jsonify(error="NOT_FOUND"), 404
    return jsonify(ok=True)


@groups_bp.post("/questionnaires/<int:questionnaire_id>/duplicate")
@role_required("researcher")
def duplicate_questionnaire(questionnaire_id):
    user = get_current_user()
    source = get_db().execute("SELECT * FROM questionnaires WHERE id=? AND owner_id=?", (questionnaire_id, user["id"])).fetchone()
    if not source:
        return jsonify(error="NOT_FOUND"), 404
    now = utc_now()
    cursor = get_db().execute(
        "INSERT INTO questionnaires(owner_id,title,description,status,target,questions,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
        (user["id"], source["title"] + " (copie)", source["description"], "draft", source["target"], source["questions"], now, now),
    )
    get_db().commit()
    duplicate = get_db().execute("SELECT * FROM questionnaires WHERE id=?", (cursor.lastrowid,)).fetchone()
    return jsonify(questionnaire=serialize_questionnaire(duplicate)), 201


@groups_bp.put("/questionnaires/<int:questionnaire_id>/groups")
@role_required("researcher")
def assign_groups(questionnaire_id):
    user = get_current_user()
    questionnaire = get_db().execute("SELECT id FROM questionnaires WHERE id=? AND owner_id=?", (questionnaire_id, user["id"])).fetchone()
    if not questionnaire:
        return jsonify(error="NOT_FOUND"), 404
    data = request.get_json(silent=True) or {}
    group_ids = data.get("group_ids", [])
    if not isinstance(group_ids, list):
        return jsonify(error="INVALID_INPUT"), 400
    for group_id in group_ids:
        if not isinstance(group_id, int) or not owned_group(group_id, user["id"]):
            return jsonify(error="INVALID_GROUP", message="Un groupe sélectionné n'existe pas."), 400
    if data.get("public"):
        public = get_db().execute("SELECT id FROM research_groups WHERE owner_id=? AND is_public=1 LIMIT 1", (user["id"],)).fetchone()
        if not public:
            cur = get_db().execute("INSERT INTO research_groups(owner_id,name,is_public,created_at) VALUES(?,?,1,?)", (user["id"], "Public", utc_now()))
            public_id = cur.lastrowid
        else:
            public_id = public["id"]
        if public_id not in group_ids:
            group_ids.append(public_id)
    get_db().execute("DELETE FROM questionnaire_groups WHERE questionnaire_id=?", (questionnaire_id,))
    get_db().executemany("INSERT INTO questionnaire_groups(questionnaire_id,group_id) VALUES(?,?)", [(questionnaire_id, group_id) for group_id in set(group_ids)])
    get_db().commit()
    return jsonify(group_ids=group_ids)


@groups_bp.get("/public/questionnaires")
def public_questionnaires():
    rows = get_db().execute(
        "SELECT DISTINCT q.* FROM questionnaires q JOIN questionnaire_groups qg ON qg.questionnaire_id=q.id "
        "JOIN research_groups g ON g.id=qg.group_id WHERE q.status='open' AND g.is_public=1 ORDER BY q.updated_at DESC"
    ).fetchall()
    return jsonify(questionnaires=[serialize_questionnaire(row) for row in rows])


@groups_bp.get("/analytics")
@role_required("researcher", "admin")
def analytics():
    user = get_current_user()
    rows = get_db().execute(
        "SELECT q.id,q.title,q.status,q.target,COUNT(r.id) AS response_count,q.created_at,q.updated_at "
        "FROM questionnaires q LEFT JOIN responses r ON r.questionnaire_id=q.id "
        "WHERE q.owner_id=? GROUP BY q.id ORDER BY q.updated_at DESC", (user["id"],)
    ).fetchall()
    return jsonify(questionnaires=[dict(row) for row in rows], totals={
        "questionnaires": len(rows), "responses": sum(row["response_count"] for row in rows)
    })
