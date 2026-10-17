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
  $('eyeBtn').addEventListener('click', function () {
    var visible = $('pwd').type === 'password'; $('pwd').type = visible ? 'text' : 'password';
    this.setAttribute('aria-pressed', String(visible)); $('eyeOn').hidden = visible; $('eyeOff').hidden = !visible;
  });
  $('pwd').addEventListener('input', function () {
    var score = (this.value.length >= 8 ? 1 : 0) + (this.value.length >= 12 ? 1 : 0) + (/[A-Z]/.test(this.value) ? 1 : 0) + (/[0-9]/.test(this.value) && /[^A-Za-z0-9]/.test(this.value) ? 1 : 0);
    $('strFill').style.width = score * 25 + '%';
    $('strTxt').textContent = score >= 3 ? 'Mot de passe robuste.' : '8 caractères minimum, avec une lettre et un chiffre.';
  });
  form.addEventListener('submit', async function (event) {
    event.preventDefault(); $('formAlert').classList.remove('on');
    var fields = { prenom: $('prenom').value.trim(), nom: $('nom').value.trim(), email: $('email').value.trim(), password: $('pwd').value };
    var valid = true;
    [['prenom', 'Prénom'], ['nom', 'Nom']].forEach(function (item) { var ok = fields[item[0]].length >= 2; error(item[0], ok ? '' : 'Saisissez au moins 2 caractères.'); valid = valid && ok; });
    var mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fields.email); error('email', mailOk ? '' : 'Adresse e-mail invalide.'); valid = valid && mailOk;
    var pwdOk = fields.password.length >= 8 && /[A-Za-z]/.test(fields.password) && /[0-9]/.test(fields.password); error('pwd', pwdOk ? '' : '8 caractères minimum, avec une lettre et un chiffre.'); valid = valid && pwdOk;
    if (!valid) return;
    fields.role = $('role').value;
    var button = $('submitBtn'); button.disabled = true; button.textContent = 'Création du compte…';
    try {
      var user = await FQAuth.register(fields); form.hidden = true;
      document.querySelector('.form-card h1').hidden = true; document.querySelector('.form-card .sub').hidden = true;
      $('doneId').textContent = user.email; $('done').hidden = false;
      setTimeout(function () { location.assign(FQAuth.pageFor(user.role)); }, 1200);
    } catch (err) {
      var box = $('formAlert'); box.textContent = err.message; box.classList.add('on');
      if (err.code === 'EMAIL_USED') error('email', err.message);
    } finally { button.disabled = false; button.textContent = 'Créer mon compte'; }
  });
})();
