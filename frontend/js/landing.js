(function () {
    'use strict';
    var panel = document.getElementById('loginPanel');
    function showLogin(show) {
        if (!panel) return;
        panel.hidden = !show;
        document.body.classList.toggle('login-open', show);
        if (show) {
            history.replaceState(null, '', '#login');
            setTimeout(function () {
                document.getElementById('identifiant').focus();
            }, 30);
        } else if (location.hash === '#login') history.replaceState(null, '', location.pathname);
    }
    document.querySelectorAll('a[href="#login"]').forEach(function (link) {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            showLogin(true);
        });
    });
    document.getElementById('closeLogin').addEventListener('click', function () {
        showLogin(false);
    });
    panel.addEventListener('click', function (event) {
        if (event.target === panel) showLogin(false);
    });
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') showLogin(false);
    });
    if (location.hash === '#login') showLogin(true);
    document.getElementById('year').textContent = new Date().getFullYear();
    fetch('/api/public/questionnaires').then(function (response) {
        return response.json();
    }).then(function (data) {
        var items = data.questionnaires || [], host = document.getElementById('publicQuizList');
        host.innerHTML = items.length ? items.map(function (quiz) {
            var card = document.createElement('article');
            card.className = 'public-quiz-card';
            var title = document.createElement('h3');
            title.textContent = quiz.title;
            var description = document.createElement('p');
            description.textContent = quiz.description || 'Participez à cette étude publique.';
            var meta = document.createElement('small');
            meta.textContent = quiz.questions.length + ' question(s) · ' + quiz.responses + ' participation(s)';
            var link = document.createElement('a');
            link.className = 'button secondary small';
            link.href = '/questionnaire.html?id=' + quiz.id;
            link.textContent = 'Participer';
            card.append(title, description, meta, link);
            return card.outerHTML;
        }).join(''): '<p class="muted">Aucun questionnaire public pour le moment.</p>';
    }). catch (function () {
        document.getElementById('publicQuizList').innerHTML = '<p class="muted">Les questionnaires publics sont temporairement indisponibles.</p>';
    });
})();
