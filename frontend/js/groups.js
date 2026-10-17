(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); }, groups = [], active = null;
  function esc(value) { return String(value || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function api(path, options) { return FQAuth.api(path, options); }
  function formatDate(value) { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value)); }
  async function load() {
    var result = await api('/api/groups'); groups = result.groups;
    $('groupRows').innerHTML = groups.length ? groups.map(function (group) {
      return '<tr tabindex="0" data-group="' + group.id + '"><td><b>' + esc(group.name) + '</b></td><td>' + formatDate(group.created_at) + '</td><td>' + group.participant_count + '</td><td><span class="tag ' + (group.is_public ? 'public-tag' : '') + '">' + (group.is_public ? 'Public' : 'Privé') + '</span></td></tr>';
    }).join('') : '<tr><td colspan="4">Aucun groupe. Créez un groupe pour affecter vos études.</td></tr>';
  }
  async function openGroup(id) {
    var result = await api('/api/groups/' + id); active = result.group;
    $('groupTitle').textContent = active.name; $('groupName').value = active.name;
    $('memberCount').textContent = active.members.length + ' participant(s)';
    $('memberRows').innerHTML = active.members.length ? active.members.map(function (member) {
      return '<div class="member-row"><span class="avatar small-avatar">' + esc((member.name[0] || '?').toUpperCase()) + '</span><span><b>' + esc(member.name) + '</b><small>' + esc(member.email) + '</small></span><button class="danger-text" data-remove-member="' + member.id + '">Retirer</button></div>';
    }).join('') : '<p class="muted">Aucun participant dans ce groupe.</p>';
    $('groupDialog').showModal();
  }
  document.addEventListener('DOMContentLoaded', async function () {
    try {
      await load();
      $('newGroup').onclick = function () { $('newGroupName').value = ''; $('newGroupPublic').checked = false; $('createGroupDialog').showModal(); };
      $('groupRows').addEventListener('click', function (event) { var row = event.target.closest('[data-group]'); if (row) openGroup(Number(row.dataset.group)); });
      $('groupRows').addEventListener('keydown', function (event) { if (event.key === 'Enter' && event.target.matches('[data-group]')) openGroup(Number(event.target.dataset.group)); });
      $('createGroup').onclick = async function () {
        await api('/api/groups', { method: 'POST', body: JSON.stringify({ name: $('newGroupName').value.trim(), is_public: $('newGroupPublic').checked }) });
        $('createGroupDialog').close(); await load();
      };
      $('saveGroupName').onclick = async function () {
        if (!active) return;
        await api('/api/groups/' + active.id, { method: 'PUT', body: JSON.stringify({ name: $('groupName').value.trim() }) });
        await load(); await openGroup(active.id);
      };
      $('addMember').onclick = async function () {
        if (!active) return;
        await api('/api/groups/' + active.id + '/members', { method: 'POST', body: JSON.stringify({ name: $('memberName').value.trim(), email: $('memberEmail').value.trim() }) });
        $('memberName').value = ''; $('memberEmail').value = ''; await load(); await openGroup(active.id);
      };
      $('memberRows').addEventListener('click', async function (event) {
        var button = event.target.closest('[data-remove-member]'); if (!button || !active) return;
        await api('/api/groups/' + active.id + '/members/' + button.dataset.removeMember, { method: 'DELETE' });
        await load(); await openGroup(active.id);
      });
      $('deleteGroup').onclick = async function () {
        if (active && confirm('Supprimer ce groupe ?')) {
          try { await api('/api/groups/' + active.id, { method: 'DELETE' }); $('groupDialog').close(); await load(); }
          catch (error) { alert(error.message); }
        }
      };
      document.querySelectorAll('[data-close]').forEach(function (button) { button.onclick = function () { $(button.dataset.close).close(); }; });
    } catch (error) { $('groupRows').innerHTML = '<tr><td colspan="4">' + esc(error.message) + '</td></tr>'; }
  });
})();
