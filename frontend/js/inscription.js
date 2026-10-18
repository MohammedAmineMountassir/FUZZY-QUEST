(function () {
    var $ = function (x) {
        return document.getElementById(x);
    };
    var MIN_PWD = 8;
    var form = $('signupForm'), alertBox = $('formAlert'), btn = $('submitBtn');

    function setErr(name, text) {
        $('f-' + name).classList.toggle('bad', !!text);
        $('m-' + name).textContent = text || '';
        return !text;
    }
    function showAlert(text) {
        alertBox.textContent = text;
        alertBox.classList.add('on');
    }
    function hideAlert() {
        alertBox.classList.remove('on');
    }
    function val(id) {
        return $(id).value.trim();
    }

    function checkName(id, label) {
        var v = val(id);
        if (!v) return setErr(id, 'Saisissez votre ' + label + '.');
        if (v.length < 2) return setErr(id, 'Au moins 2 caractères.');
        return setErr(id, '');
    }
    function checkEmail() {
        var v = val('email');
        if (!v) return setErr('email', 'Saisissez votre adresse e-mail.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return setErr('email', 'Cette adresse e-mail n\'est pas valide.');
        if (FQAuth.emailTaken(v)) return setErr('email', 'Un compte existe déjà avec cette adresse. Connectez-vous.');
        return setErr('email', '');
    }
    function checkPwd() {
        var p = $('pwd').value;
        if (!p) return setErr('pwd', 'Choisissez un mot de passe.');
        if (p.length < MIN_PWD) return setErr('pwd', 'Au moins ' + MIN_PWD + ' caractères.');
        if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return setErr('pwd', 'Ajoutez au moins une lettre et un chiffre.');
        return setErr('pwd', '');
    }
    function strength(p) {
        var s = 0;
        if (p.length >= MIN_PWD) s++;
        if (p.length >= 12) s++;
        if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
        if (/[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
        return s;
    }
    var CHECKS = {
        prenom: function () {
            return checkName('prenom', 'prénom');
        },
        nom: function () {
            return checkName('nom', 'nom');
        },
        email: checkEmail,
        pwd: checkPwd
    };
    Object.keys(CHECKS).forEach(function (id) {
        $(id).addEventListener('blur', CHECKS[id]);
        $(id).addEventListener('input', function () {
            hideAlert();
            if ($('f-' + id).classList.contains('bad')) CHECKS[id]();
        });
    });

    $('eyeBtn').addEventListener('click', function () {
        var show = $('pwd').type === 'password';
        $('pwd').type = show ? 'text' : 'password';
        this.setAttribute('aria-pressed', show);
        this.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
        $('eyeOn').hidden = show;
        $('eyeOff').hidden = !show;
        $('pwd').focus();
    });
    $('pwd').addEventListener('input', function () {
        var p = this.value, s = p ? strength(p): 0, fill = $('strFill');
        fill.style.width = (s * 25) + '%';
        fill.className = s >= 3 ? 'strong' : s === 2 ? 'mid' : '';
        $('strTxt').textContent = !p ? '8 caractères minimum, avec une lettre et un chiffre.' : s >= 3 ? 'Mot de passe robuste.' : s === 2 ? 'Mot de passe correct, ajoutez des majuscules ou des symboles.' : 'Mot de passe faible.';
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        hideAlert();
        var ok = Object.keys(CHECKS).map(function (id) {
            return CHECKS[id]();
        }).every(Boolean);
        if (!ok) {
            var bad = document.querySelector('.fld.bad input');
            if (bad) bad.focus();
            return;
        }
        btn.disabled = true;
        btn.textContent = 'Création du compte…';
        FQAuth.register({
            prenom: val('prenom'),
            nom: val('nom'),
            email: val('email'),
            password: $('pwd').value
        }).then(function (user) {
            FQAuth.setSession(user);
            form.hidden = true;
            document.querySelector('.form-card h1').hidden = true;
            document.querySelector('.form-card .sub').hidden = true;
            $('doneId').textContent = user.username;
            $('done').hidden = false;
            setTimeout(function () {
                location.href = FQAuth.pageFor(user.role);
            }, 2500);
        }). catch (function (err) {
            btn.disabled = false;
            btn.textContent = 'Créer mon compte';
            if (err && err.message === 'EMAIL_USED') {
                setErr('email', 'Un compte existe déjà avec cette adresse. Connectez-vous.');
                $('email').focus();
            } else {
                showAlert('Une erreur est survenue. Veuillez réessayer.');
            }
        });
    });
})();
