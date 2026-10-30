(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', async function () {
        var profileForm = document.getElementById('profileForm');
        var profileStatus = document.getElementById('profileStatus');
        var passwordForm = document.getElementById('passwordForm');
        var passwordStatus = document.getElementById('passwordStatus');

        try {
            var result = await FQAuth.me();
            var user = result.user;
            if (!user) return;
            document.getElementById('profileFirstName').value = user.first_name || '';
            document.getElementById('profileLastName').value = user.last_name || '';
            document.getElementById('settingsEmail').textContent = user.email || '—';
            document.getElementById('settingsRole').textContent = user.role === 'admin' ? 'Administrateur' : user.role === 'researcher' ? 'Chercheur' : 'Participant';
        } catch (_) {
            profileStatus.textContent = 'Les informations du compte sont indisponibles.';
        }

        profileForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            var submit = profileForm.querySelector('[type="submit"]');
            submit.disabled = true;
            profileStatus.textContent = 'Enregistrement…';
            try {
                var updated = await FQAuth.api('/api/auth/profile', {
                    method: 'PATCH',
                    body: JSON.stringify({
                        first_name: document.getElementById('profileFirstName').value.trim(),
                        last_name: document.getElementById('profileLastName').value.trim()
                    })
                });
                profileStatus.textContent = updated.message || 'Informations enregistrées.';
                document.querySelectorAll('.account-name').forEach(function (element) {
                    element.textContent = [updated.user.first_name, updated.user.last_name].filter(Boolean).join(' ');
                });
                document.querySelectorAll('.av').forEach(function (element) {
                    element.textContent = [updated.user.first_name, updated.user.last_name].map(function (part) { return part[0] || ''; }).join('').toUpperCase();
                });
            } catch (error) {
                profileStatus.textContent = error.message || 'Les informations n’ont pas pu être enregistrées.';
            } finally {
                submit.disabled = false;
            }
        });

        passwordForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            var submit = passwordForm.querySelector('[type="submit"]');
            var newPassword = document.getElementById('newPassword').value;
            if (newPassword !== document.getElementById('confirmPassword').value) {
                passwordStatus.textContent = 'Les deux nouveaux mots de passe ne correspondent pas.';
                return;
            }
            submit.disabled = true;
            passwordStatus.textContent = 'Modification…';
            try {
                var response = await FQAuth.api('/api/auth/change-password', {
                    method: 'POST',
                    body: JSON.stringify({
                        current_password: document.getElementById('currentPassword').value,
                        new_password: newPassword
                    })
                });
                passwordStatus.textContent = response.message || 'Votre mot de passe a été modifié.';
                passwordForm.reset();
            } catch (error) {
                passwordStatus.textContent = error.message || 'Le mot de passe n’a pas pu être modifié.';
            } finally {
                submit.disabled = false;
            }
        });
    });
})();
