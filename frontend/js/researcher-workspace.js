(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var questionnaires = [], groups = [], selectedQuiz = null, editId = null, templates = [], editorQuestions = [];
  var statusLabels = { open: 'Ouvert', draft: 'Brouillon', closed: 'Clos' };
  var questionTypes = { scale: 'Échelle de valeurs', single: 'Choix unique', multi: 'Choix multiple', triangle: 'Logique floue — Triangle', trapeze: 'Logique floue — Trapèze' };
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function defaultQuestion(type) {
    var q = { type: type, label: '', required: true };
    if (type === 'scale') Object.assign(q, { min: 1, max: 5, step: 1, minLabel: '', maxLabel: '' });
    if (type === 'single' || type === 'multi') q.options = ['', ''];
    if (type === 'triangle') Object.assign(q, { unit: '', a: 0, b: 50, c: 100 });
    if (type === 'trapeze') Object.assign(q, { unit: '', a: 0, b: 30, c: 70, d: 100 });
    return q;
  }
  function field(label, i, key, value, numeric) {
    return '<label class="question-field">' + label + '<input data-q-index="' + i + '" data-q-field="' + key + '" ' + (numeric ? 'type="number" step="any"' : 'type="text"') + ' value="' + esc(value) + '"></label>';
  }
  function fuzzyPreview(q) {
    var values = q.type === 'triangle' ? [Number(q.a), Number(q.b), Number(q.c)] : [Number(q.a), Number(q.b), Number(q.c), Number(q.d)];
    var low = values[0], high = values[values.length - 1];
    if (!values.every(Number.isFinite) || high <= low) return '';
    var x = function (value) { return 12 + (value - low) / (high - low) * 256; };
    var points = values.map(function (value, index) { return x(value).toFixed(1) + ',' + ([0, values.length - 1].includes(index) ? 76 : 14); }).join(' ');
    return '<svg viewBox="0 0 280 92" role="img" aria-label="Aperçu de la fonction floue"><path d="M12 76H268M12 14V76" fill="none" stroke="#e3e8f0"/><text x="5" y="18" font-size="10" fill="#647084">1</text><text x="5" y="79" font-size="10" fill="#647084">0</text><polygon points="' + points + ' 268,76 12,76" fill="#5145cd" opacity=".12"/><polyline points="' + points + '" fill="none" stroke="#5145cd" stroke-width="2.5" stroke-linejoin="round"/>' + values.map(function (value, index) { return '<text x="' + x(value).toFixed(1) + '" y="89" text-anchor="middle" font-size="9" fill="#647084">' + esc(value) + '</text>'; }).join('') + '</svg>';
  }
  function renderQuestionBuilder() {
    $('questionCount').textContent = '(' + editorQuestions.length + ')';
    if (!editorQuestions.length) { $('questionList').innerHTML = '<div class="question-empty">Aucune question pour le moment. Choisissez un type ci-dessous pour commencer.</div>'; return; }
    $('questionList').innerHTML = editorQuestions.map(function (q, i) {
      var controls = '';
      if (q.type === 'scale') controls = '<div class="two-col">' + field('Valeur minimale', i, 'min', q.min, true) + field('Valeur maximale', i, 'max', q.max, true) + '</div><div class="two-col">' + field('Pas', i, 'step', q.step, true) + field('Libellé min (optionnel)', i, 'minLabel', q.minLabel) + '</div>' + field('Libellé max (optionnel)', i, 'maxLabel', q.maxLabel);
      if (q.type === 'single' || q.type === 'multi') controls = '<div class="question-options"><b>Propositions de réponse</b>' + (q.options || []).map(function (option, oi) { return '<div class="question-option"><span class="option-mark ' + (q.type === 'single' ? 'radio-mark' : '') + '"></span><input type="text" data-q-index="' + i + '" data-q-option="' + oi + '" value="' + esc(option) + '" placeholder="Proposition ' + (oi + 1) + '"><button type="button" class="button text small" data-q-action="remove-option" data-q-index="' + i + '" data-q-option="' + oi + '" aria-label="Retirer cette proposition">Retirer</button></div>'; }).join('') + '<button type="button" class="button secondary small" data-q-action="add-option" data-q-index="' + i + '">＋ Ajouter une proposition</button></div>';
      if (q.type === 'triangle' || q.type === 'trapeze') {
        var pointFields = q.type === 'triangle' ? [['a – début (μ=0)', 'a'], ['b – sommet (μ=1)', 'b'], ['c – fin (μ=0)', 'c']] : [['a – début (μ=0)', 'a'], ['b – début du plateau (μ=1)', 'b'], ['c – fin du plateau (μ=1)', 'c'], ['d – fin (μ=0)', 'd']];
        controls = field('Unité (optionnel)', i, 'unit', q.unit) + '<div class="' + (q.type === 'triangle' ? 'two-col' : 'question-points') + '">' + pointFields.map(function (point) { return field(point[0], i, point[1], q[point[1]], true); }).join('') + '</div><small class="question-hint">' + (q.type === 'triangle' ? 'Condition : a ≤ b ≤ c et a &lt; c.' : 'Condition : a ≤ b ≤ c ≤ d et a &lt; d.') + '</small><div class="fuzzy-preview" id="fuzzyPreview' + i + '">' + fuzzyPreview(q) + '</div>';
      }
      return '<article class="question-editor-card"><div class="question-editor-top"><span class="question-number">' + (i + 1) + '</span><select data-q-index="' + i + '" data-q-type aria-label="Type de la question">' + Object.keys(questionTypes).map(function (type) { return '<option value="' + type + '"' + (q.type === type ? ' selected' : '') + '>' + questionTypes[type] + '</option>'; }).join('') + '</select><button type="button" class="button text small" data-q-action="up" data-q-index="' + i + '" ' + (!i ? 'disabled' : '') + '>Monter</button><button type="button" class="button text small" data-q-action="down" data-q-index="' + i + '" ' + (i === editorQuestions.length - 1 ? 'disabled' : '') + '>Descendre</button><button type="button" class="button danger-text small" data-q-action="delete" data-q-index="' + i + '">Supprimer</button></div><label class="question-field">Intitulé de la question<input type="text" data-q-index="' + i + '" data-q-field="label" value="' + esc(q.label) + '" placeholder="Saisissez la question…"></label>' + controls + '<label class="question-required"><input type="checkbox" data-q-index="' + i + '" data-q-field="required"' + (q.required ? ' checked' : '') + '> Réponse obligatoire</label></article>';
    }).join('');
  }
  function validateQuestions() {
    if (!editorQuestions.length) return 'Ajoutez au moins une question.';
    for (var i = 0; i < editorQuestions.length; i++) {
      var q = editorQuestions[i], prefix = 'Question ' + (i + 1) + ' : ';
      if (!String(q.label || '').trim()) return prefix + 'l’intitulé est obligatoire.';
      if (q.type === 'scale' && (q.min === '' || q.max === '' || q.step === '' || !(Number(q.min) < Number(q.max)) || !(Number(q.step) > 0))) return prefix + 'renseignez min, max et pas ; le min doit être inférieur au max et le pas positif.';
      if ((q.type === 'single' || q.type === 'multi') && (q.options || []).filter(function (v) { return String(v).trim(); }).length < 2) return prefix + 'indiquez au moins deux propositions non vides.';
      if (q.type === 'triangle' && (['a', 'b', 'c'].some(function (key) { return q[key] === ''; }) || !(Number(q.a) <= Number(q.b) && Number(q.b) <= Number(q.c) && Number(q.a) < Number(q.c)))) return prefix + 'renseignez a, b et c dans l’ordre a ≤ b ≤ c, avec a < c.';
      if (q.type === 'trapeze' && (['a', 'b', 'c', 'd'].some(function (key) { return q[key] === ''; }) || !(Number(q.a) <= Number(q.b) && Number(q.b) <= Number(q.c) && Number(q.c) <= Number(q.d) && Number(q.a) < Number(q.d)))) return prefix + 'renseignez a, b, c et d dans l’ordre a ≤ b ≤ c ≤ d, avec a < d.';
    }
    return '';
  }
  async function api(path, options) { return FQAuth.api(path, options); }
  async function load() {
    var results = await Promise.all([api('/api/questionnaires'), api('/api/groups'), api('/api/analytics')]);
    questionnaires = results[0].questionnaires; groups = results[1].groups;
    $('statQuizzes').textContent = results[2].totals.questionnaires;
    $('statResponses').textContent = results[2].totals.responses;
    render(); renderAnalytics(results[2].questionnaires);
  }
  function filtered() {
    var query = $('searchQuiz').value.trim().toLocaleLowerCase('fr'), status = $('filterStatus').value;
    return questionnaires.filter(function (q) { return (status === 'all' || q.status === status) && (q.title + ' ' + q.description).toLocaleLowerCase('fr').includes(query); });
  }
  function render() {
    var list = filtered(); $('quizCount').textContent = list.length + ' questionnaire' + (list.length > 1 ? 's' : '');
    if (!list.length) { $('quizGrid').innerHTML = '<div class="empty-state"><span><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg></span><h3>Aucun questionnaire ici</h3><p>Créez un questionnaire ou choisissez un modèle dans la bibliothèque.</p><button class="button primary" data-action="new"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg> Nouveau questionnaire</button></div>'; return; }
    $('quizGrid').innerHTML = list.map(function (q) {
      var percent = q.target ? Math.min(100, Math.round(q.responses / q.target * 100)) : 0;
      var assigned = groups.filter(function (group) { return q.group_ids.indexOf(group.id) !== -1 && !group.is_public; }).map(function (group) { return group.name; });
      var chips = assigned.map(function (name) { return '<span class="tag">' + esc(name) + '</span>'; }).join('');
      if (q.is_public) chips += '<span class="tag public-tag">Public</span>';
      if (!chips) chips = '<span class="tag muted-tag">Aucun groupe</span>';
      return '<article class="quiz-card"><div class="quiz-card-top"><span class="status-badge status-' + q.status + '">' + statusLabels[q.status] + '</span><button class="more-button" data-action="menu" data-id="' + q.id + '" aria-label="Actions">•••</button></div>' +
        '<h3>' + esc(q.title) + '</h3><p class="quiz-description">' + esc(q.description || 'Aucune description') + '</p>' +
        '<div class="quiz-metrics"><span>' + q.questions.length + ' question' + (q.questions.length > 1 ? 's' : '') + '</span><span>' + q.responses + ' réponse' + (q.responses > 1 ? 's' : '') + '</span></div>' +
        '<div class="progress-track"><i style="width:' + percent + '%"></i></div><small class="progress-caption">' + (q.target ? q.responses + ' sur ' + q.target + ' réponses visées' : 'Aucun objectif défini') + '</small>' +
        '<div class="group-tags">' + chips + '</div><div class="card-actions"><a class="button primary small" href="/questionnaire.html?id=' + q.id + '">Ouvrir le quiz</a><button class="button text small" data-action="edit" data-id="' + q.id + '">Modifier</button><button class="button text small" data-action="duplicate" data-id="' + q.id + '">Dupliquer</button><button class="button text small" data-action="assign" data-id="' + q.id + '">Affecter</button><button class="button danger-text small" data-action="delete" data-id="' + q.id + '">Supprimer</button></div></article>';
    }).join('');
  }
  function renderAnalytics(rows) {
    $('analyticsRows').innerHTML = rows.length ? rows.map(function (q) {
      var percent = q.target ? Math.min(100, Math.round(q.response_count / q.target * 100)) : 0;
      return '<tr><td><b>' + esc(q.title) + '</b></td><td><span class="status-badge status-' + q.status + '">' + statusLabels[q.status] + '</span></td><td>' + q.response_count + '</td><td>' + (q.target || '—') + '</td><td><div class="table-progress"><i style="width:' + percent + '%"></i></div>' + percent + '%</td></tr>';
    }).join('') : '<tr><td colspan="5">Les résultats apparaîtront après les premières réponses.</td></tr>';
  }
  function openEditor(item) {
    editId = item ? item.id : null;
    $('quizDialogTitle').textContent = item ? 'Modifier le questionnaire' : 'Nouveau questionnaire';
    $('quizTitle').value = item ? item.title : '';
    $('quizDescription').value = item ? item.description : '';
    $('quizStatus').value = item ? item.status : 'draft';
    $('quizTarget').value = item ? item.target : 100;
    editorQuestions = item ? JSON.parse(JSON.stringify(item.questions || [])) : [];
    $('questionError').hidden = true;
    renderQuestionBuilder();
    $('quizDialog').showModal();
  }
  function openAssignment(id) {
    selectedQuiz = questionnaires.find(function (q) { return q.id === id; });
    if (!selectedQuiz) return;
    $('assignGroups').innerHTML = groups.filter(function (g) { return !g.is_public; }).map(function (g) {
      return '<label class="check-row"><input type="checkbox" value="' + g.id + '" ' + (selectedQuiz.group_ids.indexOf(g.id) >= 0 ? 'checked' : '') + '><span><b>' + esc(g.name) + '</b><small>' + g.participant_count + ' participant(s)</small></span></label>';
    }).join('') || '<p class="muted">Aucun groupe créé. <a href="/groupes.html">Créer un groupe</a></p>';
    $('assignPublic').checked = selectedQuiz.is_public;
    $('assignDialog').showModal();
  }
  async function openLibrary() {
    var result = await api('/api/templates'); templates = result.templates;
    $('templateList').innerHTML = templates.map(function (template) {
      return '<article class="template-card"><span class="template-icon">▤</span><div><h3>' + esc(template.title) + '</h3><p>' + esc(template.description) + '</p><small>' + template.questions.length + ' questions de départ</small></div><button class="button secondary small" data-template="' + esc(template.id) + '">Utiliser ce modèle</button></article>';
    }).join('');
    $('libraryDialog').showModal();
  }
  async function handleAction(event) {
    var button = event.target.closest('[data-action]'); if (!button) return;
    var id = Number(button.dataset.id), item = questionnaires.find(function (q) { return q.id === id; });
    if (button.dataset.action === 'new') openEditor(null);
    if (button.dataset.action === 'edit') openEditor(item);
    if (button.dataset.action === 'assign') openAssignment(id);
    if (button.dataset.action === 'duplicate' && confirm('Créer une copie brouillon de ce questionnaire ?')) { await api('/api/questionnaires/' + id + '/duplicate', { method: 'POST' }); await load(); }
    if (button.dataset.action === 'delete' && confirm('Supprimer définitivement ce questionnaire et ses réponses ?')) { await api('/api/questionnaires/' + id, { method: 'DELETE' }); await load(); }
    if (button.dataset.action === 'menu') button.closest('.quiz-card').classList.toggle('actions-open');
  }
  document.addEventListener('DOMContentLoaded', async function () {
    try {
      await load();
      $('newQuiz').onclick = function () { openEditor(null); };
      $('openLibrary').onclick = openLibrary;
      $('searchQuiz').oninput = render; $('filterStatus').onchange = render;
      $('quizGrid').addEventListener('click', handleAction);
      $('addQuestion').onclick = function () { editorQuestions.push(defaultQuestion($('newQuestionType').value)); renderQuestionBuilder(); $('questionList').lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
      $('questionList').addEventListener('input', function (event) {
        var target = event.target, i = Number(target.dataset.qIndex);
        if (!Number.isInteger(i) || !editorQuestions[i]) return;
        if (target.dataset.qOption !== undefined) editorQuestions[i].options[Number(target.dataset.qOption)] = target.value;
        else if (target.dataset.qField) editorQuestions[i][target.dataset.qField] = target.type === 'checkbox' ? target.checked : (target.type === 'number' ? (target.value === '' ? '' : Number(target.value)) : target.value);
        var preview = $('fuzzyPreview' + i);
        if (preview && (target.dataset.qField === 'a' || target.dataset.qField === 'b' || target.dataset.qField === 'c' || target.dataset.qField === 'd')) preview.innerHTML = fuzzyPreview(editorQuestions[i]);
        $('questionError').hidden = true;
      });
      $('questionList').addEventListener('change', function (event) {
        var target = event.target;
        if (!target.hasAttribute('data-q-type')) return;
        var i = Number(target.dataset.qIndex), previous = editorQuestions[i];
        editorQuestions[i] = defaultQuestion(target.value);
        editorQuestions[i].label = previous.label;
        editorQuestions[i].required = previous.required;
        renderQuestionBuilder();
      });
      $('questionList').addEventListener('click', function (event) {
        var button = event.target.closest('[data-q-action]'); if (!button) return;
        var i = Number(button.dataset.qIndex), action = button.dataset.qAction, q = editorQuestions[i];
        if (!q) return;
        if (action === 'delete') editorQuestions.splice(i, 1);
        if (action === 'up' && i > 0) editorQuestions.splice(i - 1, 0, editorQuestions.splice(i, 1)[0]);
        if (action === 'down' && i < editorQuestions.length - 1) editorQuestions.splice(i + 1, 0, editorQuestions.splice(i, 1)[0]);
        if (action === 'add-option') q.options.push('');
        if (action === 'remove-option' && q.options.length > 2) q.options.splice(Number(button.dataset.qOption), 1);
        renderQuestionBuilder();
      });
      $('quizForm').addEventListener('submit', async function (event) {
        if (event.submitter && event.submitter.value === 'cancel') return;
        event.preventDefault();
        try {
          var title = $('quizTitle').value.trim();
          if (!title) throw new Error('Le titre du questionnaire est obligatoire.');
          var validation = validateQuestions();
          if (validation) throw new Error(validation);
          var questions = editorQuestions.map(function (question, index) { var copy = Object.assign({}, question, { id: index + 1 }); if (copy.options) copy.options = copy.options.map(function (option) { return option.trim(); }).filter(Boolean); return copy; });
          var body = { title: title, description: $('quizDescription').value.trim(), status: $('quizStatus').value, target: Number($('quizTarget').value || 0), questions: questions };
          await api(editId ? '/api/questionnaires/' + editId : '/api/questionnaires', { method: editId ? 'PUT' : 'POST', body: JSON.stringify(body) });
          $('quizDialog').close(); await load();
        } catch (error) { $('questionError').textContent = error.message; $('questionError').hidden = false; }
      });
      $('templateList').addEventListener('click', function (event) {
        var button = event.target.closest('[data-template]'); if (!button) return;
        var template = templates.find(function (item) { return item.id === button.dataset.template; });
        $('libraryDialog').close(); openEditor({ title: template.title, description: template.description, questions: template.questions, target: 0, status: 'draft' });
      });
      $('saveAssignment').onclick = async function () {
        var groupIds = Array.from($('assignGroups').querySelectorAll('input:checked')).map(function (input) { return Number(input.value); });
        await api('/api/questionnaires/' + selectedQuiz.id + '/groups', { method: 'PUT', body: JSON.stringify({ group_ids: groupIds, public: $('assignPublic').checked }) });
        $('assignDialog').close(); await load();
      };
      document.querySelectorAll('[data-close]').forEach(function (button) { button.onclick = function () { $(button.dataset.close).close(); }; });
    } catch (error) { $('quizGrid').innerHTML = '<div class="empty-state">' + esc(error.message) + '</div>'; }
  });
})();
