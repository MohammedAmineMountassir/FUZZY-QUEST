import os
from pathlib import Path

from flask import Flask

from .db import close_db, init_db
from .routes import register_routes

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY=os.environ.get("FUZZY_QUEST_SECRET", "change-me-before-deployment"),
        DATABASE=os.environ.get("FUZZY_QUEST_DB", PROJECT_ROOT / "instance" / "fuzzy_quest.sqlite3"),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.environ.get("APP_ENV") == "production",
        SMTP_HOST=os.environ.get("SMTP_HOST", ""),
        SMTP_PORT=int(os.environ.get("SMTP_PORT", "587")),
        SMTP_USER=os.environ.get("SMTP_USER", ""),
        SMTP_PASSWORD=os.environ.get("SMTP_PASSWORD", ""),
        SMTP_USE_TLS=os.environ.get("SMTP_USE_TLS", "1") == "1",
        MAIL_FROM=os.environ.get("MAIL_FROM", os.environ.get("SMTP_USER", "noreply@fuzzy-quest.local")),
        APP_BASE_URL=os.environ.get("APP_BASE_URL", "http://127.0.0.1:5000"),
        APP_ENV=os.environ.get("APP_ENV", "development"),
    )
    if test_config:
        app.config.update(test_config)
    app.teardown_appcontext(close_db)
    app.before_request(init_db)
    register_routes(app)
    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5000")), debug=os.environ.get("FLASK_DEBUG") == "1")
