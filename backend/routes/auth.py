"""Inscription, connexion et session utilisateur."""
import re
import sqlite3

from flask import Blueprint, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from ..db import get_current_user, get_db, utc_now

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    first = str(data.get("prenom", "")).strip()
    last = str(data.get("nom", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    role = data.get("role", "participant")
    if len(first) < 2 or len(last) < 2 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]{2,}", email):
        return jsonify(error="INVALID_INPUT", message="Vérifiez les informations saisies."), 400
    if role not in {"participant", "researcher"}:
        return jsonify(error="INVALID_INPUT", message="Type de compte invalide."), 400
    if len(password) < 8 or not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return jsonify(error="WEAK_PASSWORD", message="Le mot de passe doit contenir 8 caractères, une lettre et un chiffre."), 400
    try:
        cursor = get_db().execute(
            "INSERT INTO users(first_name,last_name,email,password_hash,role,created_at) VALUES(?,?,?,?,?,?)",
            (first, last, email, generate_password_hash(password), role, utc_now()),
        )
        get_db().commit()
    except sqlite3.IntegrityError:
        return jsonify(error="EMAIL_USED", message="Cette adresse e-mail est déjà utilisée."), 409
    session.clear()
    session["user_id"] = cursor.lastrowid
    return jsonify(user=get_current_user()), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    row = get_db().execute("SELECT id,password_hash FROM users WHERE email=?", (email,)).fetchone()
    if not row or not check_password_hash(row["password_hash"], password):
        return jsonify(error="INVALID_CREDENTIALS", message="Adresse e-mail ou mot de passe incorrect."), 401
    session.clear()
    session["user_id"] = row["id"]
    return jsonify(user=get_current_user())


@auth_bp.post("/logout")
def logout():
    session.clear()
    return jsonify(ok=True)


@auth_bp.get("/me")
def me():
    return jsonify(user=get_current_user())
