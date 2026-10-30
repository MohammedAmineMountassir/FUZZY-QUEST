# FUZZY-QUEST

Plateforme de questionnaires et d'études avec un backend Flask et une base SQLite.

## Démarrage local

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
py -m backend.app
```

Le site est disponible sur <http://127.0.0.1:5000>. La base de données est créée dans `instance/fuzzy_quest.sqlite3`.

## Compte administrateur

Créer le premier administrateur depuis la racine du projet :

```powershell
py -m backend.cli create-admin admin@exemple.com
```

L'administrateur examine les demandes après confirmation de l'adresse e-mail. Une fois le compte approuvé, un lien permet à la personne de choisir son mot de passe. Les nouveaux comptes deviennent des comptes chercheur.

## E-mails

Les e-mails de confirmation, d'approbation et de changement de mot de passe utilisent SMTP. Définir les variables suivantes dans l'environnement du serveur : `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`, `APP_BASE_URL`. TLS est activé par défaut; définir `SMTP_USE_TLS=0` uniquement si le fournisseur SMTP l'exige.

En développement (`APP_ENV=development`), si SMTP n'est pas configuré, le lien sécurisé apparaît dans les journaux du serveur et dans la réponse de développement. Pour un environnement public, définir `APP_ENV=production`, une valeur aléatoire pour `FUZZY_QUEST_SECRET` et une URL HTTPS pour `APP_BASE_URL`.

## Parcours disponibles

- Les chercheurs créent, modifient, suppriment et dupliquent des questionnaires, puis les affectent à plusieurs groupes ou à l'espace public.
- Les liens de questionnaires ouverts mènent directement à une page de réponse avec le logo et le titre de l'étude. Les participants peuvent répondre anonymement ou indiquer leur nom et leur e-mail.
- La bibliothèque fournit des modèles d'études. Les réponses et les indicateurs de participation sont conservés dans SQLite.
- Les groupes ont une liste de participants modifiable et un tableau de suivi.
- L'administrateur approuve les demandes de compte et de changement de mot de passe.
- Les questionnaires publics s'affichent sur l'accueil.

## Structure

```text
backend/
├── app.py
├── cli.py
├── db.py
├── emailer.py
└── routes/
    ├── auth.py
    ├── admin.py
    ├── groups.py
    ├── pages.py
    └── questionnaires.py
frontend/
├── css/
├── js/
└── pages/
```

Les données locales de `instance/`, le fichier `.env`, l'environnement `.venv/` et les caches Python ne font pas partie du code source versionné. Le déploiement Docker démarre la même application Flask et conserve SQLite dans un volume persistant.
