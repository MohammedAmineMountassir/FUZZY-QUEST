(function () {
    document.addEventListener('DOMContentLoaded', async function () {
        var root = document.getElementById('templates');
        try {
            var r = await FQAuth.api('/api/templates');
            root.innerHTML = r.templates.length ? r.templates.map(function (t) {
                return '<article class="template-card"><span class="settings-icon">▤</span><div><h3>' + String(t.title).replace(/[&<>]/g, '') + '</h3><p>' + String(t.description || '').replace(/[&<>]/g, '') + '</p><small>' + t.questions.length + ' questions · ' + (t.structure || 'direct') + '</small></div><a class="button primary small" href="/creer-questionnaire.html?template=' + encodeURIComponent(t.id) + '">Utiliser</a></article>'
            }).join(''): '<p class="muted">Aucun modèle publié pour le moment.</p>'
        } catch (e) {
            root.textContent = e.message
        }
    })
})();
