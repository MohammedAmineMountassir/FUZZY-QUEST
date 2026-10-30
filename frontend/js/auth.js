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
    window.FQAuth.me().then(function (result) {
        var user = result && result.user;
        if (!user) return;
        var fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
        var role = user.role === 'admin' ? 'Administrateur' : user.role === 'researcher' ? 'Chercheur' : 'Participant';
        document.querySelectorAll('.account-name').forEach(function (el) { el.textContent = fullName; });
        document.querySelectorAll('.account-email').forEach(function (el) { el.textContent = user.email || ''; });
        document.querySelectorAll('.account-copy small').forEach(function (el) { el.textContent = role; });
        document.querySelectorAll('.av').forEach(function (el) { el.textContent = [user.first_name, user.last_name].filter(Boolean).map(function (s) { return s[0]; }).join('').toUpperCase(); });
    }).catch(function () {});
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
            alert('Aide & support\n\nDashboard : retrouvez vos questionnaires et leurs résultats.\nNouveau questionnaire : créez une étude et ajoutez ses questions.\nGroupes : organisez vos participants et gérez leurs invitations.\nBibliothèque : démarrez à partir d’un modèle prêt à l’emploi.\nParamètres : gérez votre profil et vos accès.\n\nPour obtenir de l’aide, contactez l’administrateur de votre espace.');
        });
    });
})();
