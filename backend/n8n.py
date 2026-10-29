import json
import logging
import os
import threading
import urllib.request

log = logging.getLogger(__name__)


def _post(url, payload):
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=10)
    except Exception:
        log.exception("Appel n8n échoué")


def send_invitations(title, link, recipients):
    """recipients = [{"email": "...", "name": "..."}]"""
    url = os.environ.get("N8N_WEBHOOK_URL")
    if not url or not recipients:
        return
    payload = {
        "questionnaire_title": title,
        "link": link,
        "recipients": recipients,
    }
    # En arrière-plan : le chercheur n'attend pas n8n,
    # et une panne n8n ne casse pas l'appli
    threading.Thread(target=_post, args=(url, payload), daemon=True).start()


def notify_open(db, questionnaire_id, title):
    rows = db.execute(
        "SELECT DISTINCT gm.name, gm.email FROM group_members gm "
        "JOIN questionnaire_groups qg ON qg.group_id = gm.group_id "
        "WHERE qg.questionnaire_id = ?",
        (questionnaire_id,),
    ).fetchall()
    recipients = [{"name": r["name"], "email": r["email"]} for r in rows]
    base = os.environ.get("APP_BASE_URL", "http://localhost:5000").rstrip("/")
    link = f"{base}/api/questionnaires/{questionnaire_id}"
    send_invitations(title, link, recipients)