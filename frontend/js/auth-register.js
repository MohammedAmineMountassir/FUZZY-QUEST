(function () {
  'use strict';
  var form = document.getElementById('signupForm');
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  function error(field, message) {
    var box = $('f-' + field), msg = $('m-' + field);
    if (box) box.classList.toggle('bad', !!message);
    if (msg) msg.textContent = message || '';
  }
  form.addEventListener('submit', async function (event) {
    event.preventDefault(); $('formAlert').classList.remove('on');
    var body = { prenom: $('prenom').value.trim(), nom: $('nom').value.trim(), email: $('email').value.trim(), telephone: $('countryCode').value + ' ' + $('telephone').value.trim().replace(/^0+/, '') };
    var valid = true;
    [['prenom', body.prenom, 'Prénom'], ['nom', body.nom, 'Nom']].forEach(function (item) {
      var ok = item[1].length >= 2; error(item[0], ok ? '' : 'Saisissez au moins 2 caractères.'); valid = valid && ok;
    });
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email); error('email', emailOk ? '' : 'Adresse e-mail invalide.'); valid = valid && emailOk;
    var phoneOk = body.telephone.replace(/[\s()+.-]/g, '').length >= 8; error('telephone', phoneOk ? '' : 'Saisissez un numéro de téléphone valide.'); valid = valid && phoneOk;
    if (!valid) return;
    var button = $('submitBtn'); button.disabled = true; button.textContent = 'Envoi de la demande…';
    try {
      var result = await FQAuth.api('/api/auth/register', { method: 'POST', body: JSON.stringify(body) });
      form.hidden = true; document.querySelector('.form-card h1').hidden = true; document.querySelector('.form-card .sub').hidden = true;
      $('doneId').textContent = body.email;
      $('mailStatus').textContent = result.email_sent ? 'Consultez votre boîte de réception pour confirmer votre adresse.' : 'Votre demande est enregistrée. L’envoi du courriel sera disponible lorsque le serveur de messagerie sera configuré.';
      if (result.dev_link) { $('devLink').href = result.dev_link; $('devLinkWrap').hidden = false; }
      $('done').hidden = false;
    } catch (err) {
      var alertBox = $('formAlert'); alertBox.textContent = err.message; alertBox.classList.add('on');
      if (err.code === 'EMAIL_USED') error('email', err.message);
    } finally { button.disabled = false; button.textContent = 'Envoyer le lien de confirmation'; }
  });
})();
