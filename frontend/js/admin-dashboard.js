(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function esc(value) { return String(value || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function date(value) { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value)); }
  async function api(path, options) { return FQAuth.api(path, options); }
  async function load() {
    var results = await Promise.all([api('/api/admin/account-requests'), api('/api/admin/password-requests'), api('/api/admin/researchers')]);
    var accounts = results[0].requests, passwords = results[1].requests, researchers = results[2].users;
    $('pendingAccounts').textContent = accounts.filter(function (r) { return r.status === 'pending_admin'; }).length;
    $('pendingPasswords').textContent = passwords.length;
    $('accountRequestRows').innerHTML = accounts.length ? accounts.map(function (r) {
      var canReview = r.status === 'pending_admin';
      return '<tr><td><b>' + esc(r.first_name + ' ' + r.last_name) + '</b></td><td>' + esc(r.email) + '</td><td>' + esc(r.phone) + '</td><td>' + date(r.created_at) + '</td><td><span class="status-badge ' + (canReview ? 'status-open' : 'status-draft') + '">' + (canReview ? 'E-mail confirmé' : 'Confirmation e-mail requise') + '</span></td><td>' + (canReview ? '<button class="button primary small" data-account="approve" data-id="' + r.id + '">Approuver</button> <button class="button danger-text small" data-account="reject" data-id="' + r.id + '">Refuser</button>' : 'En attente') + '</td></tr>';
    }).join('') : '<tr><td colspan="6">Aucune demande de compte en attente.</td></tr>';
    $('passwordRequestRows').innerHTML = passwords.length ? passwords.map(function (r) {
      return '<tr><td><b>' + esc(r.first_name + ' ' + r.last_name) + '</b></td><td>' + esc(r.email) + '</td><td>' + date(r.created_at) + '</td><td><button class="button primary small" data-password="approve" data-id="' + r.id + '">Approuver</button> <button class="button danger-text small" data-password="reject" data-id="' + r.id + '">Refuser</button></td></tr>';
    }).join('') : '<tr><td colspan="4">Aucune demande de changement en attente.</td></tr>';
    $('researcherRows').innerHTML = researchers.length ? researchers.map(function (r) {
      return '<tr><td><b>' + esc(r.first_name + ' ' + r.last_name) + '</b></td><td>' + esc(r.email) + '</td><td>' + esc(r.phone) + '</td><td>' + date(r.created_at) + '</td></tr>';
    }).join('') : '<tr><td colspan="4">Aucun chercheur actif.</td></tr>';
  }
  document.addEventListener('DOMContentLoaded', async function () {
    try {
      var me = await api('/api/auth/me');
      if (!me.user) { location.replace('/connexion.html'); return; }
      if (me.user.role !== 'admin') { location.replace(FQAuth.pageFor(me.user.role)); return; }
      var name = me.user.first_name + ' ' + me.user.last_name;
      document.querySelectorAll('.account-name').forEach(function (el) { el.textContent = name; });
      document.querySelectorAll('.account-email').forEach(function (el) { el.textContent = me.user.email; });
      document.querySelectorAll('.av').forEach(function (el) { el.textContent = (me.user.first_name[0] + me.user.last_name[0]).toUpperCase(); });
      await load();
      document.addEventListener('click', async function (event) {
        var account = event.target.closest('[data-account]'), password = event.target.closest('[data-password]');
        if (!account && !password) return;
        var target = account || password, type = account ? 'account' : 'password', action = target.dataset[type], id = target.dataset.id;
        if (action === 'reject' && !confirm('Refuser cette demande ?')) return;
        try {
          var result = await api('/api/admin/' + (type === 'account' ? 'account-requests/' : 'password-requests/') + id + '/' + action, { method: 'POST' });
          alert(result.message + (result.dev_link ? '\n\nLien de test (SMTP non configuré) : ' + result.dev_link : ''));
          await load();
        } catch (error) { alert(error.message); }
      });
    } catch (error) { alert(error.message); location.replace('/connexion.html'); }
  });
})();
