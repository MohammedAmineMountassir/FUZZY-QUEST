(function () {
    'use strict';

    var groupId = new URLSearchParams(window.location.search).get('id');
    var group = null;
    var $ = function (id) { return document.getElementById(id); };

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    function showMessage(message, isError) {
        var box = $('error');
        box.textContent = message;
        box.hidden = false;
        box.classList.toggle('success', !isError);
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function renderMembers() {
        $('memberCount').textContent = '(' + group.members.length + ')';
        $('memberRows').innerHTML = group.members.length
            ? group.members.map(function (member) {
                var initial = (member.name || '?').trim().charAt(0).toUpperCase() || '?';
                var status = member.user_id ? 'Compte lié' : 'Invitation en attente';
                return '<div class="member-row">' +
                    '<span class="avatar small-avatar">' + escapeHtml(initial) + '</span>' +
                    '<span><b>' + escapeHtml(member.name) + '</b><small>' + escapeHtml(member.email) + ' · ' + status + '</small></span>' +
                    '<button class="button danger-text small" type="button" data-remove-member="' + member.id + '">Retirer</button>' +
                    '</div>';
            }).join('')
            : '<p class="muted">Aucun participant dans ce groupe. Ajoutez une personne ou importez une liste.</p>';
    }

    async function loadGroup() {
        var result = await FQAuth.api('/api/groups/' + encodeURIComponent(groupId));
        if (!result.group) throw new Error('Les informations de ce groupe sont introuvables.');
        group = result.group;

        document.title = group.name + ' · FUZZY-QUEST';
        $('groupTitle').textContent = group.name;
        $('groupName').value = group.name;
        $('groupDescription').value = group.description || '';
        renderMembers();
        window.dispatchEvent(new CustomEvent('group-name-updated', { detail: { name: group.name } }));
        $('error').hidden = true;
    }

    async function saveGroup() {
        var name = $('groupName').value.trim();
        if (!name) return showMessage('Le nom du groupe est obligatoire.', true);
        try {
            await FQAuth.api('/api/groups/' + encodeURIComponent(groupId), {
                method: 'PUT',
                body: JSON.stringify({ name: name, description: $('groupDescription').value.trim() })
            });
            await loadGroup();
            showMessage('Les informations du groupe ont été enregistrées.', false);
        } catch (error) {
            showMessage(error.message, true);
        }
    }

    async function addMember() {
        var name = $('memberName').value.trim();
        var email = $('memberEmail').value.trim();
        var button = $('addMember');
        if (name.length < 2) return showMessage('Saisissez le nom et le prénom du participant.', true);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showMessage('Saisissez une adresse e-mail valide.', true);

        button.disabled = true;
        button.textContent = 'Ajout en cours…';
        $('error').hidden = true;
        try {
            await FQAuth.api('/api/groups/' + encodeURIComponent(groupId) + '/members', {
                method: 'POST',
                body: JSON.stringify({ name: name, email: email })
            });
            $('memberName').value = '';
            $('memberEmail').value = '';
            await loadGroup();
            showMessage('Le participant a été ajouté au groupe.', false);
        } catch (error) {
            showMessage(error.message || 'Impossible d’ajouter le participant.', true);
        } finally {
            button.disabled = false;
            button.textContent = '＋ Ajouter le participant';
        }
    }

    async function removeMember(memberId) {
        if (!window.confirm('Retirer ce participant du groupe ?')) return;
        try {
            await FQAuth.api('/api/groups/' + encodeURIComponent(groupId) + '/members/' + encodeURIComponent(memberId), { method: 'DELETE' });
            await loadGroup();
            showMessage('Le participant a été retiré du groupe.', false);
        } catch (error) {
            showMessage(error.message, true);
        }
    }

    async function createInvitationLink() {
        try {
            var result = await FQAuth.api('/api/groups/' + encodeURIComponent(groupId) + '/invitation', { method: 'POST' });
            var link = new URL(result.url, window.location.origin).href;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    await navigator.clipboard.writeText(link);
                    showMessage('Le lien d’inscription a été copié.', false);
                    return;
                } catch (_) {}
            }
            window.prompt('Copiez le lien d’inscription :', link);
        } catch (error) {
            showMessage(error.message, true);
        }
    }

    async function importMembers(fileInput) {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        var formData = new FormData();
        formData.append('file', file);
        try {
            var response = await fetch('/api/groups/' + encodeURIComponent(groupId) + '/members/import', {
                method: 'POST',
                credentials: 'same-origin',
                body: formData
            });
            var result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Impossible d’importer ce fichier.');
            await loadGroup();
            showMessage(result.added + ' participant(s) ajouté(s), ' + result.skipped + ' ignoré(s).', false);
        } catch (error) {
            showMessage(error.message, true);
        } finally {
            fileInput.value = '';
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (!groupId || !/^\d+$/.test(groupId)) {
            window.location.replace('/groupes.html');
            return;
        }

        $('saveGroup').addEventListener('click', saveGroup);
        $('addMember').addEventListener('click', addMember);
        $('inviteLink').addEventListener('click', createInvitationLink);
        $('memberFile').addEventListener('change', function () { importMembers(this); });
        $('memberRows').addEventListener('click', function (event) {
            var button = event.target.closest('[data-remove-member]');
            if (button) removeMember(button.dataset.removeMember);
        });

        loadGroup().catch(function (error) {
            $('groupTitle').textContent = 'Groupe indisponible';
            $('memberRows').innerHTML = '';
            showMessage(error.message || 'Impossible de charger les informations du groupe.', true);
        });
    });
})();
