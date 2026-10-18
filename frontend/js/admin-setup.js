(function () {
    'use strict';
    document.addEventListener('DOMContentLoaded', async function () {
        var form = document.getElementById('adminSetupForm');
        var error = document.getElementById('setupError');
        var submit = document.getElementById('setupSubmit');
        try {
            var status = await FQAuth.api('/api/auth/admin-setup-status');
            if (!status.available) {
                location.replace('/connexion.html');
                return;
            }
        } catch (requestError) {
            error.textContent = requestError.message;
            error.hidden = false;
            return;
        }
        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            error.hidden = true;
            var password = document.getElementById('password').value;
            var confirmation = document.getElementById('confirmPassword').value;
            if (password !== confirmation) {
                error.textContent = 'Les mots de passe ne correspondent pas.';
                error.hidden = false;
                return;
            }
            submit.disabled = true;
            try {
                await FQAuth.api('/api/auth/bootstrap-admin', {
                    method: 'POST',
                    body: JSON.stringify({
                        first_name: document.getElementById('firstName').value.trim(),
                        last_name: document.getElementById('lastName').value.trim(),
                        email: document.getElementById('email').value.trim(),
                        password: password
                    })
                });
                location.assign('/administration.html');
            } catch (requestError) {
                error.textContent = requestError.message;
                error.hidden = false;
                submit.disabled = false;
            }
        });
    });
})();
