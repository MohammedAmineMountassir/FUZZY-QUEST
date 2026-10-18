(function () {
    'use strict';
    var token = new URLSearchParams(location.search).get('token'), message = document.getElementById('flowMessage'), link = document.getElementById('flowLink');
    if (!token) {
        message.textContent = 'Le lien de confirmation est incomplet.';
        link.hidden = false;
        return;
    }
    FQAuth.api('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({
            token: token
        })
    }).then(function (result) {
        message.textContent = result.message;
        link.textContent = 'Retour à l’accueil';
        link.hidden = false;
    }). catch (function (error) {
        message.textContent = error.message;
        link.hidden = false;
    });
})();
