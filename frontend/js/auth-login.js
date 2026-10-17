(function () {
  'use strict';
  var form = document.getElementById('loginForm');
  if (!form) return;
  var alertBox = document.getElementById('formAlert');
  form.addEventListener('submit', async function (event) {
    event.preventDefault(); alertBox.textContent = ''; alertBox.classList.remove('on');
    var button = document.getElementById('loginBtn'); button.disabled = true; button.textContent = 'Connexion…';
    try {
      var user = await FQAuth.login(document.getElementById('identifiant').value.trim(), document.getElementById('motdepasse').value);
      location.assign(FQAuth.pageFor(user.role));
    } catch (error) { alertBox.textContent = error.message; alertBox.classList.add('on'); }
    finally { button.disabled = false; button.textContent = 'Se connecter'; }
  });
  var forgot = document.getElementById('forgotPassword');
  if (forgot) forgot.addEventListener('click', async function (event) {
    event.preventDefault();
    var email = document.getElementById('identifiant').value.trim() || prompt('Adresse e-mail de votre compte :');
    if (!email) return;
    try {
      var result = await FQAuth.api('/api/auth/password-reset-request', { method: 'POST', body: JSON.stringify({ email: email }) });
      alertBox.textContent = result.message; alertBox.classList.add('on');
    } catch (error) { alertBox.textContent = error.message; alertBox.classList.add('on'); }
  });
})();
