"""CRUD des questionnaires et collecte des réponses."""
import json

from flask import Blueprint, jsonify, request

from ..db import get_current_user, get_db, login_required, serialize_questionnaire, utc_now

questionnaires_bp = Blueprint("questionnaires", __name__, url_prefix="/api")
VALID_STATUSES = {"open", "draft", "closed"}


@questionnaires_bp.get("/questionnaires")
def list_questionnaires():
    user = get_current_user()
    if user and user["role"] == "researcher":
        rows = get_db().execute(
            "SELECT * FROM questionnaires WHERE owner_id=? ORDER BY updated_at DESC", (user["id"],)
        ).fetchall()
    else:
        rows = get_db().execute(
            "SELECT * FROM questionnaires WHERE status='open' ORDER BY created_at DESC"
        ).fetchall()
    return jsonify(questionnaires=[serialize_questionnaire(row) for row in rows])


@questionnaires_bp.post("/questionnaires")
@login_required
def create_questionnaire():
    user = get_current_user()
    if user["role"] != "researcher":
        return jsonify(error="FORBIDDEN"), 403
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    status = data.get("status", "draft")
    questions = data.get("questions", [])
    if not title or status not in VALID_STATUSES or not isinstance(questions, list):
        return jsonify(error="INVALID_INPUT", message="Titre, statut ou questions invalides."), 400
    try:
        target = max(0, int(data.get("target", 0) or 0))
    except (ValueError, TypeError):
        return jsonify(error="INVALID_INPUT", message="L’objectif de réponses doit être un nombre."), 400
    now = utc_now()
    cursor = get_db().execute(
        "INSERT INTO questionnaires(owner_id,title,description,status,target,questions,created_at,updated_at) "
        "VALUES(?,?,?,?,?,?,?,?)",
        (user["id"], title, str(data.get("description", "")).strip(), status, target,
         json.dumps(questions, ensure_ascii=False), now, now),
    )
    get_db().commit()
    row = get_db().execute("SELECT * FROM questionnaires WHERE id=?", (cursor.lastrowid,)).fetchone()
    return jsonify(questionnaire=serialize_questionnaire(row)), 201


@questionnaires_bp.route("/questionnaires/<int:item_id>", methods=["GET", "PUT", "DELETE"])
def questionnaire_detail(item_id):
    row = get_db().execute("SELECT * FROM questionnaires WHERE id=?", (item_id,)).fetchone()
    if not row:
        return jsonify(error="NOT_FOUND"), 404
    user = get_current_user()
    if request.method == "GET":
        if row["status"] != "open" and (not user or user["id"] != row["owner_id"]):
            return jsonify(error="NOT_FOUND"), 404
        return jsonify(questionnaire=serialize_questionnaire(row))
    if not user:
        return jsonify(error="AUTH_REQUIRED"), 401
    if user["role"] != "researcher" or user["id"] != row["owner_id"]:
        return jsonify(error="FORBIDDEN"), 403
    if request.method == "DELETE":
        get_db().execute("DELETE FROM questionnaires WHERE id=?", (item_id,))
        get_db().commit()
        return jsonify(ok=True)
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", row["title"])).strip()
    status = data.get("status", row["status"])
    questions = data.get("questions", serialize_questionnaire(row)["questions"])
    if not title or status not in VALID_STATUSES or not isinstance(questions, list):
        return jsonify(error="INVALID_INPUT", message="Titre, statut ou questions invalides."), 400
    try:
        target = max(0, int(data.get("target", row["target"]) or 0))
    except (ValueError, TypeError):
        return jsonify(error="INVALID_INPUT", message="L’objectif de réponses doit être un nombre."), 400
    get_db().execute(
        "UPDATE questionnaires SET title=?,description=?,status=?,target=?,questions=?,updated_at=? WHERE id=?",
        (title, str(data.get("description", row["description"])), status, target,
         json.dumps(questions, ensure_ascii=False), utc_now(), item_id),
    )
    get_db().commit()
    updated = get_db().execute("SELECT * FROM questionnaires WHERE id=?", (item_id,)).fetchone()
    return jsonify(questionnaire=serialize_questionnaire(updated))


@questionnaires_bp.post("/questionnaires/<int:item_id>/responses")
def submit_response(item_id):
    row = get_db().execute("SELECT status FROM questionnaires WHERE id=?", (item_id,)).fetchone()
    if not row or row["status"] != "open":
        return jsonify(error="NOT_FOUND"), 404
    answers = (request.get_json(silent=True) or {}).get("answers")
    if not isinstance(answers, (dict, list)):
        return jsonify(error="INVALID_INPUT"), 400
    user = get_current_user()
    get_db().execute(
        "INSERT INTO responses(questionnaire_id,user_id,answers,submitted_at) VALUES(?,?,?,?)",
        (item_id, user["id"] if user else None, json.dumps(answers, ensure_ascii=False), utc_now()),
    )
    get_db().commit()
    return jsonify(ok=True), 201
