(function () {
    'use strict';
    var form = document.getElementById('signupForm');
    if (!form) return;
    var $ = function (id) {
        return document.getElementById(id);
    };
    function err(field, message) {
        var box = $('f-' + field), msg = $('m-' + field);
        if (box) box.classList.toggle('bad', !!message);
        if (msg && field !== 'password') msg.textContent = message || '';
        return !message;
    }
    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        $('formAlert').classList.remove('on');
        var body = {
            prenom: $('prenom').value.trim(),
            nom: $('nom').value.trim(),
            email: $('email').value.trim(),
            telephone: $('countryCode').value + ' ' + $('telephone').value.trim().replace(/^0+/, ''),
            password: $('password').value,
            group_token: new URLSearchParams(location.search).get('g') || ''
        };
        var valid = true;
        [['prenom',
                body.prenom],
            ['nom',
                body.nom]].forEach(function (x) {
            var ok = x[1].length >= 2;
            err(x[0], ok ? '' : 'Saisissez au moins 2 caractères.');
            valid = valid && ok;
        });
        var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email);
        err('email', emailOk ? '' : 'Adresse e-mail invalide.');
        valid = valid && emailOk;
        var phoneOk = body.telephone.replace(/[\s()+.-]/g, '').length >= 8;
        err('telephone', phoneOk ? '' : 'Saisissez un numéro de téléphone valide.');
        valid = valid && phoneOk;
        var passOk = body.password.length >= 8 && /[A-Za-z]/.test(body.password) && /\d/.test(body.password);
        err('password', passOk ? '' : 'Choisissez 8 caractères minimum avec une lettre et un chiffre.');
        valid = valid && passOk;
        var confirmOk = $('confirmPassword').value === body.password && $('confirmPassword').value.length > 0;
        err('confirm', confirmOk ? '' : 'Les mots de passe ne correspondent pas.');
        valid = valid && confirmOk;
        if (!valid) return;
        var button = $('submitBtn');
        button.disabled = true;
        button.textContent = 'Envoi de la demande…';
        try {
            await FQAuth.api('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            form.hidden = true;
            document.querySelector('.form-card h1').hidden = true;
            document.querySelector('.form-card .sub').hidden = true;
            $('doneId').textContent = body.email;
            $('mailStatus').textContent = 'Votre mot de passe est conservé de façon sécurisée. L’administrateur examinera la demande.';
            $('done').hidden = false;
        } catch (error) {
            var alert = $('formAlert');
            alert.textContent = error.message;
            alert.classList.add('on');
            if (error.code === 'EMAIL_USED') err('email', error.message);
        } finally {
            button.disabled = false;
            button.textContent = 'Envoyer la demande';
        }
    });
})();
