"""Revue des comptes et des demandes de changement de mot de passe."""
import hashlib
import secrets

from flask import Blueprint, current_app, jsonify

from ..db import get_current_user, get_db, role_required, utc_now
from ..emailer import send_action_email


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.get("/account-requests")
@role_required("admin")
def account_requests():
    rows = get_db().execute(
        "SELECT id,first_name,last_name,phone,email,status,created_at,verified_at "
        "FROM account_requests WHERE status IN ('pending_email','pending_admin') ORDER BY created_at"
    ).fetchall()
    return jsonify(requests=[dict(row) for row in rows])


@admin_bp.post("/account-requests/<int:request_id>/<action>")
@role_required("admin")
def review_account(request_id, action):
    if action not in {"approve", "reject"}:
        return jsonify(error="INVALID_ACTION"), 400
    row = get_db().execute("SELECT * FROM account_requests WHERE id=?", (request_id,)).fetchone()
    if not row or row["status"] != "pending_admin":
        return jsonify(error="NOT_FOUND", message="Cette demande n'attend pas de décision."), 404
    admin = get_current_user()
    if action == "reject":
        get_db().execute("UPDATE account_requests SET status='rejected',reviewed_at=?,reviewer_id=? WHERE id=?", (utc_now(), admin["id"], request_id))
        get_db().commit()
        send_action_email(row["email"], "Demande de compte FUZZY-QUEST", "Votre demande de création de compte n'a pas été approuvée.")
        return jsonify(message="La demande a été refusée.")
    token = secrets.token_urlsafe(32)
    get_db().execute("UPDATE account_requests SET status='approved',setup_token_hash=?,reviewed_at=?,reviewer_id=? WHERE id=?",
                     (token_hash(token), utc_now(), admin["id"], request_id))
    get_db().commit()
    link = f"{current_app.config['APP_BASE_URL']}/mot-de-passe.html?token={token}"
    sent = send_action_email(row["email"], "Votre compte FUZZY-QUEST est approuvé", f"Créez votre mot de passe pour activer votre compte :\n\n{link}")
    if not sent and current_app.config.get("APP_ENV") == "production":
        get_db().execute("UPDATE account_requests SET status='pending_admin',setup_token_hash=NULL,reviewed_at=NULL,reviewer_id=NULL WHERE id=?", (request_id,))
        get_db().commit()
        return jsonify(error="EMAIL_UNAVAILABLE", message="L'e-mail n'a pas pu être envoyé. Vous pourrez réessayer l'approbation."), 503
    result = {"message": "Compte approuvé. Le lien de création du mot de passe a été envoyé.", "email_sent": sent}
    if current_app.config.get("APP_ENV") == "development" and not sent:
        result["dev_link"] = link
    return jsonify(result)


@admin_bp.get("/password-requests")
@role_required("admin")
def password_requests():
    rows = get_db().execute(
        "SELECT r.id,r.status,r.created_at,u.first_name,u.last_name,u.email "
        "FROM password_change_requests r JOIN users u ON u.id=r.user_id "
        "WHERE r.status='pending' ORDER BY r.created_at"
    ).fetchall()
    return jsonify(requests=[dict(row) for row in rows])


@admin_bp.post("/password-requests/<int:request_id>/<action>")
@role_required("admin")
def review_password_request(request_id, action):
    if action not in {"approve", "reject"}:
        return jsonify(error="INVALID_ACTION"), 400
    row = get_db().execute(
        "SELECT r.id,r.user_id,r.status,u.email FROM password_change_requests r "
        "JOIN users u ON u.id=r.user_id WHERE r.id=?", (request_id,)
    ).fetchone()
    if not row or row["status"] != "pending":
        return jsonify(error="NOT_FOUND"), 404
    reviewer = get_current_user()["id"]
    if action == "reject":
        get_db().execute("UPDATE password_change_requests SET status='rejected',reviewed_at=?,reviewer_id=? WHERE id=?", (utc_now(), reviewer, request_id))
        get_db().commit()
        send_action_email(row["email"], "Demande de mot de passe FUZZY-QUEST", "Votre demande de changement de mot de passe a été refusée.")
        return jsonify(message="La demande a été refusée.")
    token = secrets.token_urlsafe(32)
    get_db().execute("UPDATE password_change_requests SET status='approved',token_hash=?,reviewed_at=?,reviewer_id=? WHERE id=?",
                     (token_hash(token), utc_now(), reviewer, request_id))
    get_db().commit()
    link = f"{current_app.config['APP_BASE_URL']}/mot-de-passe.html?token={token}&type=reset"
    sent = send_action_email(row["email"], "Changez votre mot de passe FUZZY-QUEST", f"Votre demande est approuvée. Choisissez un nouveau mot de passe :\n\n{link}")
    if not sent and current_app.config.get("APP_ENV") == "production":
        get_db().execute("UPDATE password_change_requests SET status='pending',token_hash=NULL,reviewed_at=NULL,reviewer_id=NULL WHERE id=?", (request_id,))
        get_db().commit()
        return jsonify(error="EMAIL_UNAVAILABLE", message="L'e-mail n'a pas pu être envoyé. Vous pourrez réessayer l'approbation."), 503
    result = {"message": "Demande approuvée. Le lien a été envoyé.", "email_sent": sent}
    if current_app.config.get("APP_ENV") == "development" and not sent:
        result["dev_link"] = link
    return jsonify(result)


@admin_bp.get("/researchers")
@role_required("admin")
def researchers():
    rows = get_db().execute("SELECT id,first_name,last_name,email,phone,created_at FROM users WHERE role='researcher' ORDER BY created_at DESC").fetchall()
    return jsonify(users=[dict(row) for row in rows])
