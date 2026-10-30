"""Pages HTML et fichiers statiques du frontend."""

from pathlib import Path

from flask import Blueprint, current_app, redirect, send_from_directory

from ..db import get_current_user, get_db

pages_bp = Blueprint('pages', __name__)
FRONTEND = Path(__file__).resolve().parents[2] / 'frontend'

PAGES = {
    'connexion', 'inscription', 'chercheur', 'participant', 'mon-espace',
    'parametres', 'questionnaire', 'administration', 'groupes', 'activation',
    'mot-de-passe', 'creer-questionnaire', 'bibliotheque', 'coadministrateurs',
    'journal-chercheur', 'administration-initiale', 'nouveau-groupe', 'groupe',
    'creer-modele',
}
PUBLIC_ASSETS = {'LOGO_FQ.png', 'icons.svg'}


@pages_bp.get('/')
@pages_bp.get('/index.html')
def home():
    """Send each signed-in role to its landing page."""
    user = get_current_user()
    if user and user['role'] == 'admin':
        return redirect('/administration.html')
    if user and user['role'] == 'researcher':
        return redirect('/chercheur.html')
    if user and user['role'] == 'participant':
        return redirect('/mon-espace.html')
    return redirect('/connexion.html')


@pages_bp.get('/<page>.html')
def page(page):
    """Serve an approved page or redirect legacy aliases."""
    if page == 'login':
        return redirect('/connexion.html')
    if page == 'quizz':
        return redirect('/questionnaire.html')
    if page == 'participant':
        return redirect('/mon-espace.html')
    if page == 'administration' and current_app.config.get('APP_ENV') == 'development':
        admin_exists = get_db().execute("SELECT 1 FROM users WHERE role='admin' LIMIT 1").fetchone()
        if not admin_exists:
            return redirect('/administration-initiale.html')
    if page not in PAGES:
        return 'Page introuvable', 404
    return send_from_directory(FRONTEND / 'pages', page + '.html')


@pages_bp.get('/css/<path:name>')
def css(name):
    return send_from_directory(FRONTEND / 'css', name)


@pages_bp.get('/js/<path:name>')
def javascript(name):
    return send_from_directory(FRONTEND / 'js', name)


@pages_bp.get('/<asset>')
def asset(asset):
    if asset in PUBLIC_ASSETS:
        return send_from_directory(FRONTEND, asset)
    return 'Ressource introuvable', 404
