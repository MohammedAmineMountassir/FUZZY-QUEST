(function () {
  'use strict';
  var form = document.getElementById('passwordForm'), query = new URLSearchParams(location.search), token = query.get('token'), reset = query.get('type') === 'reset';
  document.getElementById('passwordTitle').textContent = reset ? 'Changer votre mot de passe' : 'Créer votre mot de passe';
  document.getElementById('passwordIntro').textContent = reset ? 'La demande a été approuvée. Choisissez votre nouveau mot de passe.' : 'Votre compte a été approuvé. Choisissez un mot de passe pour l’activer.';
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    var alert = document.getElementById('passwordAlert'), password = document.getElementById('newPassword').value;
    alert.classList.remove('on');
    if (password !== document.getElementById('confirmPassword').value) { alert.textContent = 'Les mots de passe ne correspondent pas.'; alert.classList.add('on'); return; }
    try {
      var path = reset ? '/api/auth/reset-password' : '/api/auth/set-password';
      var result = await FQAuth.api(path, { method: 'POST', body: JSON.stringify({ token: token, password: password }) });
      alert.textContent = result.message; alert.classList.add('on'); form.querySelector('button').hidden = true;
      setTimeout(function () { location.assign(reset ? '/connexion.html#login' : FQAuth.pageFor(result.user.role)); }, 1200);
    } catch (error) { alert.textContent = error.message; alert.classList.add('on'); }
  });
})();
