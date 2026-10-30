(function () {
    'use strict';
    var $ = function (id) {
        return document.getElementById(id);
    }, researchers = [], templateId = null;
    var titles = {
        researchers: ['Chercheurs',
            'Gérez les comptes chercheurs et leurs accès.'],
        requests: ['Demandes de compte',
            'Examinez les demandes de création de compte et de réinitialisation.'],
        templates: ['Modèles',
            'Créez les questionnaires disponibles dans la bibliothèque des chercheurs.'],
        activity: ['Journal d’activité',
            'Consultez les événements enregistrés sur la plateforme.']
    };
    function esc(v) {
        return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            } [c];
        });
    }
    function date(v, withTime) {
        if (!v) return 'Jamais';
        var d = new Date(v);
        return isNaN(d) ? '—' : new Intl.DateTimeFormat('fr-FR', withTime ? {
            dateStyle: 'short',
            timeStyle: 'short'
        }: {
            dateStyle: 'medium'
        }).format(d);
    }
    function api(path, opts) {
        return FQAuth.api(path, opts);
    }
    function nav(key) {
        document.querySelectorAll('[data-admin-nav]').forEach(function (a) {
            a.classList.toggle('active', a.dataset.adminNav === key);
        });
        document.querySelectorAll('.admin-pane').forEach(function (p) {
            p.hidden = p.id !== 'pane-' + key;
        });
        $('adminTitle').textContent = titles[key][0];
        var context = $('adminContext');
        if (context) context.textContent = titles[key][0];
        $('adminIntro').textContent = titles[key][1];
        $('sectionAction').hidden = key !== 'researchers';
    }
    async function loadResearchers() {
        var result = await api('/api/admin/researchers');
        researchers = result.users;
        $('researcherRows').innerHTML = researchers.length ? researchers.map(function (u) {
            return '<tr data-user-row="' + u.id + '"><td><b>' + esc(u.first_name + ' ' + u.last_name) + '</b></td><td>' + esc(u.email) + '</td><td>' + u.questionnaire_count + '</td><td>' + u.distributed_count + '</td><td><span class="status-badge ' + (u.is_active ? 'status-open' : 'status-closed') + '">' + (u.is_active ? 'Actif' : 'Désactivé') + '</span></td><td>' + date(u.last_logout_at, true) + '</td><td><button class="button text small" data-researcher-action="' + (u.is_active ? 'disable' : 'enable') + '" data-id="' + u.id + '">' + (u.is_active ? 'Désactiver' : 'Réactiver') + '</button></td></tr>';
        }).join(''): '<tr><td colspan="7">Aucun compte chercheur.</td></tr>';
        filterResearchers();
    }
    function filterResearchers() {
        if (!$('researcherSearch')) return;
        var q = $('researcherSearch').value.toLocaleLowerCase('fr'), status = $('researcherFilter').value;
        document.querySelectorAll('[data-user-row]').forEach(function (row) {
            var user = researchers.find(function (u) {
                return String(u.id) === row.dataset.userRow;
            });
            row.hidden = !((user.first_name + ' ' + user.last_name + ' ' + user.email).toLocaleLowerCase('fr').includes(q) && (status === 'all' || (status === 'active') === !!user.is_active));
        });
    }
    async function loadRequests() {
        var result = await api('/api/admin/account-requests');
        var accounts = result.requests;
        var badge = $('requestBadge');
        if (badge) badge.textContent = accounts.length;
        $('accountRequestRows').innerHTML = accounts.length ? accounts.map(function (r) {
            return '<tr><td><b>' + esc(r.first_name + ' ' + r.last_name) + '</b></td><td>' + esc(r.email) + '</td><td>' + esc(r.phone) + '</td><td>' + (r.requested_role === 'participant' ? 'Participant' : 'Chercheur') + '</td><td>' + date(r.created_at, true) + '</td><td><button class="button primary small" data-account="approve" data-id="' + r.id + '">Accepter</button> <button class="button danger-text small" data-account="reject" data-id="' + r.id + '">Refuser</button></td></tr>';
        }).join(''): '<tr><td colspan="6">Aucune demande en attente.</td></tr>';
    }
    async function loadTemplates() {
        var result = await api('/api/admin/templates');
        $('templateRows').innerHTML = result.templates.length ? result.templates.map(function (t) {
            return '<article class="template-card"><span class="template-icon">▤</span><div><h3>' + esc(t.title) + '</h3><p>' + esc(t.description) + '</p><small>' + t.questions.length + ' questions · ' + esc(t.structure || 'direct') + '</small></div><button class="button text small" data-template-edit="' + t.id + '">Modifier</button><button class="button danger-text small" data-template-delete="' + t.id + '">Supprimer</button></article>';
        }).join(''): '<div class="empty-state"><h3>La bibliothèque est vide</h3><p>Créez le premier modèle à proposer aux chercheurs.</p></div>';
    }
    async function loadActivity() {
        var result = await api('/api/admin/activity');
        $('activityRows').innerHTML = result.events.length ? result.events.map(function (e) {
            return '<tr><td>' + date(e.created_at, true) + '</td><td>' + esc(e.actor_name) + '<small class="table-subline">' + esc(e.actor_role) + '</small></td><td>' + esc(e.action) + '</td><td>' + esc(e.subject) + '</td><td>' + esc(e.details) + '</td><td>' + esc(e.ip_address || '—') + '</td></tr>';
        }).join(''): '<tr><td colspan="6">Aucun événement enregistré.</td></tr>';
    }
    function addQuestion(q) {
        q = q || {
        };
        var row = document.createElement('article');
        row.className = 'question-editor-card template-question';
        row.innerHTML = '<div class="two-col"><label>Intitulé<input class="tq-label" value="' + esc(q.label || '') + '" placeholder="Saisissez la question"></label><label>Type<select class="tq-type"><option value="scale">Échelle</option><option value="single">Choix unique</option><option value="multi">Choix multiple</option><option value="text">Texte libre</option></select></label></div><div class="two-col"><label>Niveau<select class="tq-level"><option value="question">Question directe</option><option value="section">Question avec section</option><option value="subsection">Question avec sous-section</option></select></label><label>Nom de la section<input class="tq-section" value="' + esc(q.section || '') + '" placeholder="Ex. Profil"></label></div><label>Sous-section (si besoin)<input class="tq-subsection" value="' + esc(q.subsection || '') + '" placeholder="Ex. Informations générales"></label><button type="button" class="button danger-text small remove-template-question">Retirer la question</button>';
        row.querySelector('.tq-type').value = q.type || 'scale';
        row.querySelector('.tq-level').value = q.level || 'question';
        $('templateQuestionRows').appendChild(row);
    }
    function openTemplate(t) {
        templateId = t ? t.id : null;
        $('templateDialogTitle').textContent = t ? 'Modifier le modèle' : 'Créer un modèle';
        $('templateTitle').value = t ? t.title : '';
        $('templateDescription').value = t ? t.description : '';
        $('templateStructure').value = t ? (t.structure || 'direct'): 'direct';
        $('templateQuestionRows').innerHTML = '';
        (t ? t.questions : [ {
        }]).forEach(addQuestion);
        $('templateError').hidden = true;
        $('templateDialog').showModal();
    }
    document.addEventListener('DOMContentLoaded', async function () {
        try {
            var me = await api('/api/auth/me');
            if (!me.user) {
                location.replace('/connexion.html');
                return;
            }
            if (me.user.role !== 'admin') {
                location.replace(FQAuth.pageFor(me.user.role));
                return;
            }
            var name = me.user.first_name + ' ' + me.user.last_name;
            document.querySelectorAll('.account-name').forEach(function (e) {
                e.textContent = name;
            });
            document.querySelectorAll('.account-email').forEach(function (e) {
                e.textContent = me.user.email;
            });
            document.querySelectorAll('.av').forEach(function (e) {
                e.textContent = me.user.first_name[0] + me.user.last_name[0];
            });
            await Promise.all([loadResearchers(),
                loadRequests(),
                loadTemplates(),
                loadActivity()]);
            document.querySelectorAll('[data-admin-nav]').forEach(function (a) {
                a.classList.toggle('active', a.dataset.adminNav === (new URLSearchParams(location.search).get('section') || 'researchers'));
            });
            $('newResearcher').onclick = function () {
                $('researcherDialog').showModal();
            };
            $('addTemplateQuestion').onclick = function () {
                addQuestion();
            };
            $('refreshActivity').onclick = loadActivity;
            $('researcherSearch').oninput = filterResearchers;
            $('researcherFilter').onchange = filterResearchers;
            document.addEventListener('click', async function (e) {
                var close = e.target.closest('[data-close]');
                if (close) $(close.dataset.close).close();
                var remove = e.target.closest('.remove-template-question');
                if (remove) remove.closest('.template-question').remove();
                var action = e.target.closest('[data-researcher-action]');
                if (action) {
                    if (action.dataset.researcherAction === 'disable' && !confirm('Désactiver ce compte chercheur ?')) return;
                    try {
                        var out = await api('/api/admin/researchers/' + action.dataset.id + '/' + action.dataset.researcherAction, {
                            method: 'POST'
                        });
                        if (out.dev_link) alert(out.message + '\n\nLien de test : ' + out.dev_link);
                        else alert(out.message);
                        await loadResearchers();
                    } catch (err) {
                        alert(err.message);
                    }
                }
                var account = e.target.closest('[data-account]');
                if (account) {
                    var target = account;
                    var kind = 'account-requests';
                    if (target.dataset.account === 'reject' && !confirm('Refuser cette demande ?')) return;
                    try {
                        var out2 = await api('/api/admin/' + kind + '/' + target.dataset.id + '/' + target.dataset.account, {
                            method: 'POST'
                        });
                        if (out2.dev_link) alert(out2.message + '\n\nLien de test : ' + out2.dev_link);
                        await loadRequests();
                        await loadResearchers();
                        await loadActivity();
                    } catch (err2) {
                        alert(err2.message);
                    }
                }
                var del = e.target.closest('[data-template-delete]');
                if (del && confirm('Supprimer ce modèle de la bibliothèque ?')) {
                    try {
                        await api('/api/admin/templates/' + del.dataset.templateDelete, {
                            method: 'DELETE'
                        });
                        await loadTemplates();
                    } catch (err3) {
                        alert(err3.message);
                    }
                }
                var edit = e.target.closest('[data-template-edit]');
                if (edit) {
                    var all = await api('/api/admin/templates');
                    openTemplate(all.templates.find(function (t) {
                        return String(t.id) === edit.dataset.templateEdit;
                    }));
                }
            });
            $('saveResearcher').onclick = async function () {
                $('researcherError').hidden = true;
                try {
                    await api('/api/admin/researchers', {
                        method: 'POST',
                        body: JSON.stringify({
                            first_name: $('newFirst').value.trim(),
                            last_name: $('newLast').value.trim(),
                            email: $('newEmail').value.trim(),
                            password: $('newPassword').value
                        })
                    });
                    $('researcherDialog').close();
                    ['newFirst',
                        'newLast',
                        'newEmail',
                        'newPassword'].forEach(function (id) {
                        $(id).value = '';
                    });
                    await loadResearchers();
                    await loadActivity();
                } catch (err) {
                    $('researcherError').textContent = err.message;
                    $('researcherError').hidden = false;
                }
            };
            $('saveTemplate').onclick = async function () {
                var questions = Array.from(document.querySelectorAll('.template-question')).map(function (row) {
                    return {
                        label: row.querySelector('.tq-label').value.trim(),
                        type: row.querySelector('.tq-type').value,
                        level: row.querySelector('.tq-level').value,
                        section: row.querySelector('.tq-section').value.trim(),
                        subsection: row.querySelector('.tq-subsection').value.trim(),
                        required: true
                    };
                });
                var invalid = questions.some(function (q) {
                    return !q.label || (q.level !== 'question' && !q.section) || (q.level === 'subsection' && !q.subsection);
                });
                if (!$('templateTitle').value.trim() || !questions.length || invalid) {
                    $('templateError').textContent = 'Complétez le titre et chaque question. Ajoutez une section ou sous-section selon le niveau choisi.';
                    $('templateError').hidden = false;
                    return;
                }
                try {
                    var body = JSON.stringify({
                        title: $('templateTitle').value.trim(),
                        description: $('templateDescription').value.trim(),
                        structure: $('templateStructure').value,
                        questions: questions
                    });
                    await api(templateId ? '/api/admin/templates/' + templateId: '/api/admin/templates', {
                        method: templateId ? 'PUT' : 'POST',
                        body: body
                    });
                    $('templateDialog').close();
                    await loadTemplates();
                    await loadActivity();
                } catch (err) {
                    $('templateError').textContent = err.message;
                    $('templateError').hidden = false;
                }
            };
            $('adminHelp').onclick = function (e) {
                e.preventDefault();
                alert('Utilisez la navigation pour gérer les chercheurs, examiner les demandes, publier des modèles et consulter le journal d’activité.');
            };
            var initial = new URLSearchParams(location.search).get('section') || 'researchers';
            if (titles[initial]) nav(initial);
        } catch (error) {
            alert(error.message);
            location.replace('/connexion.html');
        }
    });
})();
