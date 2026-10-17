"""Pages HTML et fichiers frontend statiques."""
from pathlib import Path

from flask import Blueprint, redirect, send_from_directory

from ..db import get_current_user

pages_bp = Blueprint("pages", __name__)
FRONTEND = Path(__file__).resolve().parents[2] / "frontend"


@pages_bp.get("/")
@pages_bp.get("/index.html")
def home():
    user = get_current_user()
    if user and user["role"] == "researcher":
        return redirect("/chercheur.html")
    return redirect("/participant.html" if user else "/connexion.html")


@pages_bp.get("/<page>.html")
def page(page):
    if page in {"login", "quizz"}:
        return redirect("/connexion.html" if page == "login" else "/questionnaire.html")
    if page not in {"connexion", "inscription", "chercheur", "participant", "mes_questionnaires", "questionnaire"}:
        return "Page introuvable", 404
    return send_from_directory(FRONTEND / "pages", page + ".html")


@pages_bp.get("/css/<path:name>")
def css(name):
    return send_from_directory(FRONTEND / "css", name)


@pages_bp.get("/js/<path:name>")
def javascript(name):
    return send_from_directory(FRONTEND / "js", name)


@pages_bp.get("/<asset>")
def asset(asset):
    if asset in {"logo.jpeg", "icons.svg"}:
        return send_from_directory(FRONTEND, asset)
    return "Ressource introuvable", 404
