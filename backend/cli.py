"""Commandes d'administration initiale."""
import argparse
import getpass

from werkzeug.security import generate_password_hash

from .app import create_app
from .db import get_db, init_db, utc_now


def main():
    parser = argparse.ArgumentParser(description="Administration de FUZZY-QUEST")
    parser.add_argument("command", choices=["create-admin"])
    parser.add_argument("email")
    args = parser.parse_args()
    app = create_app()
    with app.app_context():
        init_db()
        email = args.email.strip().lower()
        existing = get_db().execute("SELECT id,role FROM users WHERE email=?", (email,)).fetchone()
        if existing:
            raise SystemExit("Cette adresse est déjà associée à un compte.")
        first = input("Prénom de l'administrateur : ").strip() or "Administrateur"
        last = input("Nom de l'administrateur : ").strip() or "FUZZY-QUEST"
        password = getpass.getpass("Mot de passe (8 caractères minimum, lettre et chiffre) : ")
        if len(password) < 8 or not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
            raise SystemExit("Mot de passe trop faible.")
        get_db().execute(
            "INSERT INTO users(first_name,last_name,email,phone,password_hash,role,created_at) VALUES(?,?,?,'',?,'admin',?)",
            (first, last, email, generate_password_hash(password), utc_now()),
        )
        get_db().commit()
        print(f"Administrateur créé : {email}")


if __name__ == "__main__":
    main()
