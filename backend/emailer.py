"""Envoi des e-mails transactionnels; SMTP se configure par variables d’environnement."""
import smtplib
from email.message import EmailMessage

from flask import current_app


def send_action_email(recipient: str, subject: str, text: str, html: str | None = None) -> bool:
    host = current_app.config.get("SMTP_HOST")
    if not host:
        current_app.logger.warning("E-mail non envoyé (SMTP non configuré): destinataire=%s, sujet=%s", recipient, subject)
        return False
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = current_app.config["MAIL_FROM"]
    message["To"] = recipient
    message.set_content(text)
    if html:
        message.add_alternative(html, subtype="html")
    try:
        with smtplib.SMTP(host, current_app.config["SMTP_PORT"], timeout=20) as smtp:
            if current_app.config["SMTP_USE_TLS"]:
                smtp.starttls()
            user = current_app.config.get("SMTP_USER")
            if user:
                smtp.login(user, current_app.config.get("SMTP_PASSWORD", ""))
            smtp.send_message(message)
        return True
    except (OSError, smtplib.SMTPException):
        current_app.logger.exception("Impossible d'envoyer l'e-mail à %s", recipient)
        return False
