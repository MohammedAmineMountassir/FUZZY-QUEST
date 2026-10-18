(function () {
    'use strict';
    async function api(path, options) {
        var response = await fetch(path, Object.assign({
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            }
        }, options || {
        }));
        var body = await response.json(). catch (function () {
            return {
            };
        });
        if (!response.ok) {
            var error = new Error(body.message || 'Une erreur est survenue.');
            error.code = body.error;
            throw error;
        }
        return body;
    }
    window.FQAuth = {
        api: api,
        emailTaken: function () {
            return false;
        },
        register: function (user) {
            return api('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(user)
            }).then(function (r) {
                return r.user;
            });
        },
        login: function (email, password) {
            return api('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }).then(function (r) {
                return r.user;
            });
        },
        setSession: function () {
        },
        pageFor: function (role) {
            return role === 'admin' ? '/administration.html' : role === 'researcher' ? '/chercheur.html' : '/mon-espace.html';
        },
        logout: function () {
            return api('/api/auth/logout', {
                method: 'POST'
            });
        },
        me: function () {
            return api('/api/auth/me');
        }
    };
    document.querySelectorAll('.account-trigger, .av, .who').forEach(function (trigger) {
        trigger.addEventListener('click', function (event) {
            if (trigger.classList.contains('av') && trigger.closest('.account-trigger')) return;
            event.stopPropagation();
            var menu = document.getElementById('pDD');
            if (menu) menu.classList.toggle('on');
        });
    });
    document.addEventListener('click', function (event) {
        var menu = document.getElementById('pDD');
        if (menu && !event.target.closest('#pDD, .account-trigger, .av, .who')) menu.classList.remove('on');
    });
    document.querySelectorAll('.out').forEach(function (button) {
        button.addEventListener('click', async function () {
            try {
                await window.FQAuth.logout();
            } finally {
                location.assign('/connexion.html');
            }
        });
    });
    document.querySelectorAll('.account-menu').forEach(function (menu) {
        if (menu.querySelector('.out') && !menu.querySelector('.help-link')) {
            var help = document.createElement('button');
            help.type = 'button';
            help.className = 'help-link';
            help.textContent = 'Aide & support';
            menu.insertBefore(help, menu.querySelector('.out'));
        }
    });
    document.querySelectorAll('.help-link').forEach(function (button) {
        button.addEventListener('click', function () {
            alert('Besoin d’aide ? Utilisez la navigation latérale pour accéder aux questionnaires, aux groupes ou aux paramètres.');
        });
    });
})();
