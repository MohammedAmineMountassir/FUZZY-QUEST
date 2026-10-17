"""Blueprints HTTP de FUZZY-QUEST."""
from .auth import auth_bp
from .admin import admin_bp
from .groups import groups_bp
from .pages import pages_bp
from .questionnaires import questionnaires_bp


def register_routes(app):
    app.register_blueprint(pages_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(questionnaires_bp)
    app.register_blueprint(groups_bp)
    app.register_blueprint(admin_bp)
