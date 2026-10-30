(function () {
    'use strict';
    var $ = function (id) {
        return document.getElementById(id);
    }, groups = [], active = null;
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
    function date(v) {
        var d = new Date(v);
        return isNaN(d) ? '—' : new Intl.DateTimeFormat('fr-FR', {
            dateStyle: 'medium'
        }).format(d);
    }
    function api(path, opts) {
        return FQAuth.api(path, opts);
    }
    async function load() {
        var r = await api('/api/groups');
        groups = r.groups;
        $('groupRows').innerHTML = groups.length ? groups.map(function (g) {
            return '<tr><td><b>' + esc(g.name) + '</b><small class="table-subline">Créé le ' + date(g.created_at) + '</small></td><td>' + esc(g.description || '—') + '</td><td>' + g.participant_count + '</td><td>' + g.distributed_count + '</td><td><div class="row-actions"><a class="button secondary small" href="/groupe.html?id=' + g.id + '">Ouvrir</a><button class="button danger small" type="button" data-delete-group="' + g.id + '">Supprimer</button></div></td></tr>';
        }).join(''): '<tr><td colspan="5">Aucun groupe. Créez votre premier groupe.</td></tr>';
    }
    async function openGroup(id) {
        var r = await api('/api/groups/' + id);
        active = r.group;
        $('groupTitle').textContent = active.name;
        $('groupName').value = active.name;
        $('groupDescription').value = active.description || '';
        $('memberCount').textContent = active.members.length + ' participant(s)';
        $('groupError').hidden = true;
        $('memberRows').innerHTML = active.members.length ? active.members.map(function (m) {
            return '<div class="member-row"><span class="avatar small-avatar">' + esc((m.name[0] || '?').toUpperCase()) + '</span><span><b>' + esc(m.name) + '</b><small>' + esc(m.email) + (m.user_id ? ' · Compte lié' : ' · Invitation en attente') + '</small></span><button class="button danger-text small" data-remove-member="' + m.id + '">Retirer</button></div>';
        }).join(''): '<p class="muted">Aucun participant dans ce groupe.</p>';
        $('groupDialog').showModal();
    }
    function parseCsv(text) {
        var lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(function (x) {
            return x.trim();
        });
        if (!lines.length) return [];
        var delimiter = lines[0].includes(';') ? ';' : ',';
        var first = lines[0].split(delimiter).map(function (s) {
            return s.trim().toLowerCase();
        });
        var hasHeader = first.some(function (s) {
            return /nom|email|mail/.test(s);
        });
        var ni = hasHeader ? Math.max(0, first.findIndex(function (s) {
            return s.includes('nom');
        })): 0, ei = hasHeader ? Math.max(0, first.findIndex(function (s) {
            return s.includes('email') || s.includes('mail');
        })): 1;
        return lines.slice(hasHeader ? 1: 0).map(function (line) {
            var cells = line.split(delimiter).map(function (s) {
                return s.trim().replace(/^"|"$/g, '');
            });
            return {
                name: cells[ni] || '',
                email: cells[ei] || ''
            };
        }).filter(function (x) {
            return x.name && x.email;
        });
    }
    document.addEventListener('DOMContentLoaded', async function () {
        try {
            await load();
            $('groupRows').addEventListener('click', function (e) {
                var b = e.target.closest('[data-delete-group]');
                if (b) deleteGroup(Number(b.dataset.deleteGroup), b);
            });
            $('saveGroupName').onclick = async function () {
                if (!active) return;
                try {
                    await api('/api/groups/' + active.id, {
                        method: 'PUT',
                        body: JSON.stringify({
                            name: $('groupName').value.trim(),
                            description: $('groupDescription').value.trim()
                        })
                    });
                    await load();
                    await openGroup(active.id);
                } catch (e) {
                    alert(e.message);
                }
            };
            $('addMember').onclick = async function () {
                if (!active) return;
                try {
                    await api('/api/groups/' + active.id + '/members', {
                        method: 'POST',
                        body: JSON.stringify({
                            name: $('memberName').value.trim(),
                            email: $('memberEmail').value.trim()
                        })
                    });
                    $('memberName').value = '';
                    $('memberEmail').value = '';
                    await load();
                    await openGroup(active.id);
                } catch (e) {
                    $('groupError').textContent = e.message;
                    $('groupError').hidden = false;
                }
            };
            $('memberFile').onchange = async function () {
                var file = this.files[0];
                if (!file || !active) return;
                try {
                    var result;
                    if (file.name.toLowerCase().endsWith('.xlsx')) {
                        var form = new FormData();
                        form.append('file', file);
                        var response = await fetch('/api/groups/' + active.id + '/members/import', {
                            method: 'POST',
                            credentials: 'same-origin',
                            body: form
                        });
                        result = await response.json();
                        if (!response.ok) throw new Error(result.message || 'Import impossible.');
                    } else {
                        var members = parseCsv(await file.text());
                        if (!members.length) throw new Error('Aucune ligne valide. Vérifiez les colonnes Nom et Email.');
                        result = await api('/api/groups/' + active.id + '/members/bulk', {
                            method: 'POST',
                            body: JSON.stringify({
                                members: members
                            })
                        });
                    }
                    alert(result.added + ' participant(s) ajouté(s), ' + result.skipped + ' ignoré(s).');
                    await load();
                    await openGroup(active.id);
                } catch (e) {
                    alert(e.message);
                } finally {
                    this.value = '';
                }
            };
            $('inviteLink').onclick = async function () {
                if (!active) return;
                try {
                    var r = await api('/api/groups/' + active.id + '/invitation', {
                        method: 'POST'
                    }), url = new URL(r.url, location.origin).href;
                    try {
                        await navigator.clipboard.writeText(url);
                        alert('Lien d’inscription copié :\n' + url);
                    } catch (_) {
                        prompt('Copiez le lien d’inscription :', url);
                    }
                } catch (e) {
                    alert(e.message);
                }
            };
            $('memberRows').addEventListener('click', async function (e) {
                var b = e.target.closest('[data-remove-member]');
                if (!b || !active) return;
                try {
                    await api('/api/groups/' + active.id + '/members/' + b.dataset.removeMember, {
                        method: 'DELETE'
                    });
                    await load();
                    await openGroup(active.id);
                } catch (err) {
                    alert(err.message);
                }
            });
            $('deleteGroup').onclick = async function () {
                if (active && confirm('Supprimer ce groupe ?')) {
                    try {
                        await api('/api/groups/' + active.id, {
                            method: 'DELETE'
                        });
                        $('groupDialog').close();
                        await load();
                    } catch (e) {
                        alert(e.message);
                    }
                }
            };
            document.querySelectorAll('[data-close]').forEach(function (b) {
                b.onclick = function () {
                    $(b.dataset.close).close();
                };
            });
        } catch (e) {
            $('groupRows').innerHTML = '<tr><td colspan="5">' + esc(e.message) + '</td></tr>';
        }
    });
    async function deleteGroup(id, button) {
        if (!confirm('Supprimer ce groupe ? Cette action est définitive.')) return;
        button.disabled = true;
        try { await api('/api/groups/' + id, {method:'DELETE'}); await load(); }
        catch (e) { alert(e.message); button.disabled = false; }
    }
})();
