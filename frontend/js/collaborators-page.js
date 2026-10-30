(function () {
    var $ = function (id) {
        return document.getElementById(id)
    }, esc = function (s) {
        return String(s || '').replace(/[&<>"']/g, '')
    }, dt = function (v) {
        return v ? new Intl.DateTimeFormat('fr-FR', {
            dateStyle: 'medium'
        }).format(new Date(v)): '—'
    };
    async function load() {
        var r = await FQAuth.api('/api/collaborators');
        $('rows').innerHTML = r.collaborators.length ? r.collaborators.map(function (c) {
            return '<tr><td>' + esc(c.first_name + ' ' + c.last_name) + '</td><td>' + esc(c.email) + '</td><td>' + dt(c.created_at) + '</td><td><button class="button danger-text small" data-id="' + c.id + '">Retirer</button></td></tr>'
        }).join(''): '<tr><td colspan="4">Aucun co-chercheur pour le moment.</td></tr>'
    }
    document.addEventListener('DOMContentLoaded', function () {
        load(). catch (function (e) {
            alert(e.message)
        });
        $('add').onclick = async function () {
            try {
                await FQAuth.api('/api/collaborators', {
                    method: 'POST',
                    body: JSON.stringify({
                        email: $('email').value.trim()
                    })
                });
                $('email').value = '';
                await load()
            } catch (e) {
                alert(e.message)
            }
        };
        document.addEventListener('click', async function (e) {
            var b = e.target.closest('[data-id]');
            if (b && confirm('Retirer ce co-chercheur ?')) {
                await FQAuth.api('/api/collaborators/' + b.dataset.id, {
                    method: 'DELETE'
                });
                load()
            }
        })
    })
})();
