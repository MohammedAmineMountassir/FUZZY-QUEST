(async function () {
    'use strict';
    var page = location.pathname;
    try {
        var result = await FQAuth.me(), user = result.user;
        if (!user) {
            location.replace('/connexion.html');
            return;
        }
        if (page === '/chercheur.html' && user.role === 'admin') {
            location.replace('/administration.html');
            return;
        }
        if (page === '/chercheur.html' && user.role !== 'researcher') {
            location.replace('/mon-espace.html');
            return;
        }
        if (page === '/mon-espace.html' && user.role === 'admin') {
            location.replace('/administration.html');
            return;
        }
        if (page === '/mon-espace.html' && user.role === 'researcher') {
            location.replace('/chercheur.html');
            return;
        }
        if (page === '/participant.html' && user.role !== 'participant') {
            location.replace('/chercheur.html');
            return;
        }
        var fullName = [user.first_name,
            user.last_name].join(' '), initials = (user.first_name[0] + user.last_name[0]).toUpperCase();
        document.querySelectorAll('.who b,.ddhead b,.phead>b').forEach(function (el) {
            el.textContent = fullName;
        });
        document.querySelectorAll('.account-name').forEach(function (el) {
            el.textContent = fullName;
        });
        document.querySelectorAll('.account-email').forEach(function (el) {
            el.textContent = user.email;
        });
        var profileName = document.getElementById('pName');
        if (profileName) profileName.value = fullName;
        var profileEmail = document.getElementById('pEmail');
        if (profileEmail) profileEmail.value = user.email;
        document.querySelectorAll('.av,.a2,.bigav').forEach(function (el) {
            el.textContent = initials;
        });
        document.querySelectorAll('.who small,#ddRole,#pRole').forEach(function (el) {
            el.textContent = user.role === 'researcher' ? 'Chercheur' : 'Participant';
        });
        document.querySelectorAll('.researcher-only').forEach(function (el) {
            el.hidden = user.role !== 'researcher';
        });
        var spaceRole = document.getElementById('spaceRole');
        if (spaceRole) spaceRole.textContent = user.role === 'researcher' ? 'Chercheur' : 'Participant';
        var firstName = document.getElementById('welcomeFirstName');
        if (firstName) firstName.textContent = user.first_name;
        var dateTime = document.getElementById('currentDateTime');
        if (dateTime) {
            var updateDateTime = function () {
                dateTime.textContent = new Intl.DateTimeFormat('fr-FR', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                    timeZone: 'Africa/Casablanca'
                }).format(new Date());
            };
            updateDateTime();
            window.setInterval(updateDateTime, 60000);
        }
        if (page === '/participant.html') {
            document.querySelectorAll('.qc .btn').forEach(function (button, index) {
                var questionnaireIds = ['satisfaction',
                    'risques',
                    'qualite'];
                button.addEventListener('click', function () {
                    location.assign('/questionnaire.html?id=' + questionnaireIds[index]);
                });
            });
        }
    } catch (_) {
        location.replace('/connexion.html');
    }
})();
