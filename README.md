# FUZZY-QUEST

Application web de questionnaires avec interface en français, API Flask et base SQLite.

## Démarrer en local

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
py -m backend.app
```

Ouvrir ensuite <http://127.0.0.1:5000>. Les comptes, questionnaires et réponses sont stockés dans `instance/fuzzy_quest.sqlite3`.

À l’inscription, choisissez Participant ou Chercheur. Les chercheurs créent et gèrent les questionnaires depuis leur espace; les participants répondent aux questionnaires ouverts. Les pages sont servies par Flask et les échanges passent par `/api`.

Pour un déploiement, définissez `FUZZY_QUEST_SECRET` avec une clé aléatoire propre à l’environnement et utilisez un serveur WSGI. `PORT` peut définir le port local. Le mode debug est désactivé par défaut.

## Organisation du backend

```text
backend/
├── app.py                 # création et démarrage de Flask
├── db.py                  # SQLite, session utilisateur et helpers
└── routes/
    ├── pages.py           # pages HTML et ressources frontend
    ├── auth.py            # inscription, connexion, déconnexion
    └── questionnaires.py  # questionnaires et réponses
```

`py app.py` reste disponible comme raccourci compatible; le code applicatif est maintenu dans `backend/`.
