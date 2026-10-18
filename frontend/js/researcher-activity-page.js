(function () {
    document.addEventListener('DOMContentLoaded', async function () {
        var root = document.getElementById('rows'), esc = function (s) {
            return String(s || '').replace(/[&<>"']/g, '')
        };
        try {
            var r = await FQAuth.api('/api/researcher/activity');
            root.innerHTML = r.events.length ? r.events.map(function (e) {
                return '<tr><td>' + new Intl.DateTimeFormat('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                }).format(new Date(e.created_at)) + '</td><td>' + esc(e.actor_name) + '</td><td>' + esc(e.action) + '</td><td>' + esc(e.subject) + '</td><td>' + esc(e.details) + '</td></tr>'
            }).join(''): '<tr><td colspan="5">Aucune activité enregistrée.</td></tr>'
        } catch (e) {
            root.innerHTML = '<tr><td colspan="5">' + e.message + '</td></tr>'
        }
    })
})();
