"""Pages HTML et fichiers frontend statiques."""
from pathlib import Path
from flask import Blueprint, current_app, redirect, send_from_directory
from ..db import get_current_user, get_db
pages_bp = Blueprint('pages', __name__)
FRONTEND = Path(__file__).resolve().parents[2] / 'frontend'

@pages_bp.get('/')
@pages_bp.get('/index.html')
def home():
    user = get_current_user()
    if user and user['role'] == 'admin':
        return redirect('/administration.html')
    if user and user['role'] == 'researcher':
        return redirect('/chercheur.html')
    return redirect('/mon-espace.html' if user and user['role'] == 'participant' else '/connexion.html')

@pages_bp.get('/<page>.html')
def page(page):
    if page in {'login', 'quizz'}:
        return redirect('/connexion.html' if page == 'login' else '/questionnaire.html')
    if page == 'participant':
        return redirect('/mon-espace.html')
    if page == 'administration' and current_app.config.get('APP_ENV') == 'development':
        admin_exists = get_db().execute("SELECT 1 FROM users WHERE role='admin' LIMIT 1").fetchone()
        if not admin_exists:
            return redirect('/administration-initiale.html')
    if page not in {'connexion', 'inscription', 'chercheur', 'participant', 'mon-espace', 'parametres', 'mes_questionnaires', 'questionnaire', 'administration', 'groupes', 'activation', 'mot-de-passe', 'creer-questionnaire', 'bibliotheque', 'coadministrateurs', 'journal-chercheur', 'administration-initiale'}:
        return ('Page introuvable', 404)
    return send_from_directory(FRONTEND / 'pages', page + '.html')

@pages_bp.get('/css/<path:name>')
def css(name):
    return send_from_directory(FRONTEND / 'css', name)

@pages_bp.get('/js/<path:name>')
def javascript(name):
    return send_from_directory(FRONTEND / 'js', name)

@pages_bp.get('/<asset>')
def asset(asset):
    if asset in {'logo.jpeg', 'LOGO_FQ.png', 'LOGO_FQ_dark.png', 'icons.svg'}:
        return send_from_directory(FRONTEND, 'LOGO_FQ.png' if asset == 'logo.jpeg' else asset)
    return ('Ressource introuvable', 404)
