(function () {
    'use strict';
    var $ = function (id) {
        return document.getElementById(id);
    }, items = [], answered = new Set();
    function esc(v) {
        return String(v || '').replace(/[&<>"']/g, function (c) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            } [c];
        });
    }
    function filtered() {
        var text = $('spaceSearch').value.trim().toLocaleLowerCase('fr'), filter = $('spaceFilter').value;
        return items.filter(function (q) {
            var done = answered.has(q.id);
            return (filter === 'all' || (filter === 'done') === done) && (q.title + ' ' + q.description).toLocaleLowerCase('fr').includes(text);
        });
    }
    function render() {
        var list = filtered();
        $('spaceQuizGrid').innerHTML = list.length ? list.map(function (q) {
            var done = answered.has(q.id);
            return '<article class="quiz-card"><div class="quiz-card-top"><span class="status-badge ' + (done ? 'status-closed' : 'status-open') + '">' + (done ? 'Déjà traité' : 'À remplir') + '</span></div><h3>' + esc(q.title) + '</h3><p class="quiz-description">' + esc(q.description || 'Aucune description') + '</p><div class="quiz-metrics"><span>' + q.questions.length + ' question(s)</span><span>Publié le ' + esc(new Intl.DateTimeFormat('fr-FR', {
                dateStyle: 'medium'
            }).format(new Date(q.updated_at))) + '</span></div><div class="card-actions"><a class="button ' + (done ? 'secondary' : 'primary') + ' small" href="/questionnaire.html?id=' + q.id + '">' + (done ? 'Consulter' : 'Répondre') + '</a></div></article>';
        }).join(''): '<div class="empty-state"><span>▣</span><h3>Aucun questionnaire trouvé</h3><p>Les nouveaux questionnaires diffusés à votre groupe apparaîtront ici.</p></div>';
    }
    document.addEventListener('DOMContentLoaded', async function () {
        try {
            var r = await FQAuth.api('/api/my-space');
            items = r.questionnaires;
            answered = new Set(r.answered);
            $('availableCount').textContent = items.filter(function (q) {
                return !answered.has(q.id);
            }).length;
            $('answeredCount').textContent = answered.size;
            $('spaceSearch').oninput = render;
            $('spaceFilter').onchange = render;
            render();
        } catch (e) {
            $('spaceQuizGrid').innerHTML = '<div class="empty-state"><h3>Impossible de charger vos questionnaires</h3><p>' + esc(e.message) + '</p></div>';
        }
        $('spaceHelp').onclick = function (e) {
            e.preventDefault();
            alert('Recherchez un questionnaire puis choisissez Répondre. Les questionnaires déjà envoyés apparaissent dans le filtre « Déjà traités ».');
        };
    });
})();
