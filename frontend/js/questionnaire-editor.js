(function () {
    'use strict';
    var $ = function (id) {
        return document.getElementById(id)
    }, qs = [], id = new URLSearchParams(location.search).get('id'), template = new URLSearchParams(location.search).get('template'), groups = [];
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            } [c]
        })
    }
    function render() {
        $('count').textContent = '(' + qs.length + ')';
        $('questions').innerHTML = qs.map(function (q, i) {
            return '<article class="question-editor-card"><div class="question-editor-top"><b>Question ' + (i + 1) + '</b><button class="button danger-text small" data-remove="' + i + '">Supprimer</button></div><label class="question-field">Intitulé<input data-field="label" data-i="' + i + '" value="' + esc(q.label) + '" placeholder="Saisissez la question"></label><div class="two-col"><label class="question-field">Niveau<select data-field="level" data-i="' + i + '"><option value="question" ' + (q.level === 'question' ? 'selected' : '') + '>Question directe</option><option value="section" ' + (q.level === 'section' ? 'selected' : '') + '>Avec section</option><option value="subsection" ' + (q.level === 'subsection' ? 'selected' : '') + '>Avec sous-section</option></select></label><label class="question-field">Type<select data-field="type" data-i="' + i + '"><option value="scale">Échelle</option><option value="single">Choix unique</option><option value="multi">Choix multiple</option><option value="text">Texte libre</option><option value="triangle">Logique floue — Triangle</option><option value="trapeze">Logique floue — Trapèze</option></select></label></div><div class="two-col"><label class="question-field">Section<input data-field="section" data-i="' + i + '" value="' + esc(q.section) + '" placeholder="Nom de section"></label><label class="question-field">Sous-section<input data-field="subsection" data-i="' + i + '" value="' + esc(q.subsection) + '" placeholder="Nom de sous-section"></label></div><label class="question-required"><input type="checkbox" data-field="required" data-i="' + i + '" ' + (q.required !== false ? 'checked' : '') + '> Réponse obligatoire</label></article>'
        }).join('');
        qs.forEach(function (q, i) {
            var t = document.querySelector('[data-field="type"][data-i="' + i + '"]');
            if (t) t.value = q.type || 'scale'
        })
    }
    async function init() {
        try {
            await FQAuth.api('/api/auth/me');
            var groupResult = await FQAuth.api('/api/groups'); groups = groupResult.groups.filter(function(g){return !g.is_public;});
            $('groupChoices').innerHTML = groups.map(function(g){return '<label class="check-row"><input type="checkbox" value="'+g.id+'" data-group-choice><span><b>'+esc(g.name)+'</b><small>'+g.participant_count+' participant(s)</small></span></label>';}).join('') || '<p class="muted">Aucun groupe créé. Vous pouvez publier le questionnaire en accès public.</p>';
            if (id) {
                var r = await FQAuth.api('/api/questionnaires/' + id), q = r.questionnaire;
                $('pageTitle').textContent = 'Modifier le questionnaire';
                $('title').value = q.title;
                $('description').value = q.description || '';
                $('status').value = q.status;
                $('target').value = q.target || 0;
                $('publicAccess').checked = !!q.is_public;
                (q.group_ids || []).forEach(function(groupId){var choice=document.querySelector('[data-group-choice][value="'+groupId+'"]');if(choice)choice.checked=true;});
                qs = q.questions || [];
                if (qs.length) $('structure').value = qs.some(function (x) {
                    return x.level === 'subsection'
                }) ? 'subsection' : (qs.some(function (x) {
                    return x.level === 'section'
                }) ? 'section' : 'question')
            } else if (template) {
                var x = await FQAuth.api('/api/templates'), t = x.templates.find(function (a) {
                    return String(a.id) === template
                });
                if (t) {
                    $('title').value = t.title;
                    $('description').value = t.description || '';
                    qs = JSON.parse(JSON.stringify(t.questions || []));
                    $('structure').value = t.structure === 'subsections' ? 'subsection' : (t.structure === 'sections' ? 'section' : (qs.some(function (x) {
                        return x.level === 'subsection'
                    }) ? 'subsection' : (qs.some(function (x) {
                        return x.level === 'section'
                    }) ? 'section' : 'question')))
                }
            }
            render()
        } catch (e) {
            $('error').textContent = e.message;
            $('error').hidden = false
        }
    }
    $('structure').onchange = function () {
        qs.forEach(function (q) {
            q.level = $('structure').value
        });
        render()
    };
    $('add').onclick = function () {
        qs.push({
            label: '',
            level: $('structure').value,
            section: '',
            subsection: '',
            type: $('type').value,
            required: true
        });
        render()
    };
    $('questions').addEventListener('input', function (e) {
        var i = Number(e.target.dataset.i), k = e.target.dataset.field;
        if (k && qs[i]) qs[i][k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    });
    $('questions').addEventListener('change', function (e) {
        var i = Number(e.target.dataset.i), k = e.target.dataset.field;
        if (k && qs[i]) qs[i][k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    });
    $('questions').addEventListener('click', function (e) {
        var b = e.target.closest('[data-remove]');
        if (b) {
            qs.splice(Number(b.dataset.remove), 1);
            render()
        }
    });
    $('save').onclick = async function () {
        var err = $('error');
        err.hidden = true;
        try {
            if (!$('title').value.trim()) throw Error('Le titre est obligatoire.');
            if (!qs.length) throw Error('Ajoutez au moins une question.');
            for (var i = 0; i < qs.length; i++) {
                if (!qs[i].label.trim()) throw Error('Renseignez le texte de chaque question.');
                if (qs[i].level !== 'question' && !qs[i].section.trim()) throw Error('Renseignez la section de chaque question structurée.');
                if (qs[i].level === 'subsection' && !qs[i].subsection.trim()) throw Error('Renseignez la sous-section.')
            }
            var groupIds = Array.from(document.querySelectorAll('[data-group-choice]:checked')).map(function(el){return Number(el.value);}), isPublic = $('publicAccess').checked;
            if ($('status').value === 'open' && !groupIds.length && !isPublic) throw Error('Pour ouvrir le questionnaire, attribuez-le à un groupe ou cochez « Publier aussi avec un lien public ».');
            var body = {
                title: $('title').value.trim(),
                description: $('description').value.trim(),
                status: $('status').value,
                target: Number($('target').value || 0),
                group_ids: groupIds, public: isPublic,
                questions: qs.map(function (q, i) {
                    return Object.assign({
                    }, q, {
                        id: i + 1
                    })
                })
            };
            await FQAuth.api(id ? '/api/questionnaires/' + id: '/api/questionnaires', {
                method: id ? 'PUT' : 'POST',
                body: JSON.stringify(body)
            });
            location.href = '/chercheur.html'
        } catch (e) {
            err.textContent = e.message;
            err.hidden = false
        }
    };
    document.addEventListener('DOMContentLoaded', init)
})();
