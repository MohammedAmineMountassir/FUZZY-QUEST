(function () {
  'use strict';
  var form = document.getElementById('loginForm');
  if (!form) return;
  var alertBox = document.getElementById('formAlert');
  document.getElementById('eyeBtn').addEventListener('click', function () {
    var input = document.getElementById('motdepasse'), visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    this.setAttribute('aria-pressed', String(visible));
    this.setAttribute('aria-label', visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
    document.getElementById('eyeOn').hidden = visible; document.getElementById('eyeOff').hidden = !visible;
  });
  form.addEventListener('submit', async function (event) {
    event.preventDefault(); alertBox.textContent = ''; alertBox.classList.remove('on');
    var button = document.getElementById('loginBtn'); button.disabled = true; button.textContent = 'Connexion…';
    try {
      var user = await FQAuth.login(document.getElementById('identifiant').value.trim(), document.getElementById('motdepasse').value);
      location.assign(FQAuth.pageFor(user.role));
    } catch (error) { alertBox.textContent = error.message; alertBox.classList.add('on'); }
    finally { button.disabled = false; button.textContent = 'Se connecter'; }
  });
})();
