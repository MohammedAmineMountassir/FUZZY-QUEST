(function () {
    'use strict';

    var questionnaireId = new URLSearchParams(window.location.search).get('id');
    var form = document.getElementById('responseForm');
    var questionList = document.getElementById('questionList');
    var anonymousMode = document.getElementById('anonymousMode');
    var identityFields = document.getElementById('identityFields');
    var loading = document.getElementById('loading');
    var errorBox = document.getElementById('loadError');
    var answerError = document.getElementById('answerError');
    var submitButton = document.getElementById('sendBtn');
    var questionnaire = null;

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
            return {
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            }[character];
        });
    }

    function renderQuestion(question, index) {
        var label = escapeHtml(question.label);
        var requiredMark = question.required ? ' <strong>*</strong>' : '';
        var control = '';

        if (question.type === 'single' || question.type === 'multi') {
            control = '<div class="answer-options">' + (question.options || []).map(function (option, optionIndex) {
                var type = question.type === 'multi' ? 'checkbox' : 'radio';
                return '<label class="answer-option"><input type="' + type + '" name="answer-' + index + '" value="' + escapeHtml(option) + '"><span>' + escapeHtml(option) + '</span></label>';
            }).join('') + '</div>';
        } else if (question.type === 'scale') {
            var minimum = Number(question.min == null ? 1 : question.min);
            var maximum = Number(question.max == null ? 5 : question.max);
            var step = Number(question.step == null ? 1 : question.step);
            control = '<input id="answer-' + index + '" type="range" min="' + minimum + '" max="' + maximum + '" step="' + step + '" value="' + minimum + '"><div class="scale-labels"><span>' + escapeHtml(question.minLabel || minimum) + '</span><output id="scale-value-' + index + '">' + minimum + '</output><span>' + escapeHtml(question.maxLabel || maximum) + '</span></div>';
        } else if (question.type === 'triangle' || question.type === 'trapeze') {
            var points = question.type === 'triangle' ? ['a', 'b', 'c'] : ['a', 'b', 'c', 'd'];
            control = '<div class="fuzzy-fields">' + points.map(function (point) {
                return '<label>' + point.toUpperCase() + '<input type="number" step="any" id="answer-' + index + '-' + point + '" placeholder="Valeur"></label>';
            }).join('') + '</div>';
        } else if (question.type === 'text') {
            control = '<textarea id="answer-' + index + '" rows="3" placeholder="Votre réponse"></textarea>';
        } else {
            control = '<input id="answer-' + index + '" type="text">';
        }

        var headings = '';
        if (question.level === 'section' && question.section) {
            headings += '<h2 class="answer-section">' + escapeHtml(question.section) + '</h2>';
        }
        if (question.level === 'subsection') {
            if (question.section) headings += '<h2 class="answer-section">' + escapeHtml(question.section) + '</h2>';
            if (question.subsection) headings += '<h3 class="answer-subsection">' + escapeHtml(question.subsection) + '</h3>';
        }
        return headings + '<section class="answer-question"><h2>' + (index + 1) + '. ' + label + requiredMark + '</h2>' + control + '</section>';
    }

    function readAnswers() {
        var answers = {};
        questionnaire.questions.forEach(function (question, index) {
            var selected = document.querySelectorAll('[name="answer-' + index + '"]:checked');
            var value;
            if (selected.length) {
                value = question.type === 'multi' ? Array.from(selected).map(function (input) { return input.value; }) : selected[0].value;
            } else if (question.type === 'triangle' || question.type === 'trapeze') {
                value = (question.type === 'triangle' ? ['a', 'b', 'c'] : ['a', 'b', 'c', 'd']).map(function (point) {
                    return document.getElementById('answer-' + index + '-' + point).value;
                });
            } else {
                var input = document.getElementById('answer-' + index);
                value = input ? input.value.trim() : '';
            }
            answers[String(question.id || index + 1)] = value;
        });
        return answers;
    }

    function showError(message) {
        answerError.textContent = message;
        answerError.hidden = false;
        answerError.classList.remove('success');
        answerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    anonymousMode.addEventListener('change', function () {
        identityFields.hidden = anonymousMode.checked;
    });

    questionList.addEventListener('input', function (event) {
        if (event.target.type === 'range') {
            var output = document.getElementById('scale-value-' + event.target.id.replace('answer-', ''));
            if (output) output.value = event.target.value;
        }
    });

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        answerError.hidden = true;
        var answers = readAnswers();
        for (var index = 0; index < questionnaire.questions.length; index += 1) {
            var question = questionnaire.questions[index];
            var value = answers[String(question.id || index + 1)];
            var empty = Array.isArray(value)
                ? (question.type === 'multi' ? value.length === 0 : value.some(function (part) { return part === ''; }))
                : value === '';
            if (question.required && empty) {
                showError('Répondez à la question ' + (index + 1) + ' avant de continuer.');
                return;
            }
        }
        var respondentName = anonymousMode.checked ? '' : document.getElementById('respondentName').value.trim();
        var respondentEmail = anonymousMode.checked ? '' : document.getElementById('respondentEmail').value.trim();
        if (!anonymousMode.checked && (!respondentName || !respondentEmail)) {
            showError('Renseignez votre nom et votre adresse e-mail, ou choisissez la réponse anonyme.');
            return;
        }
        submitButton.disabled = true;
        submitButton.textContent = 'Envoi en cours…';
        try {
            await FQAuth.api('/api/questionnaires/' + encodeURIComponent(questionnaireId) + '/responses', {
                method: 'POST',
                body: JSON.stringify({ answers: answers, respondent_name: respondentName, respondent_email: respondentEmail })
            });
            answerError.textContent = 'Merci. Votre réponse a bien été envoyée.';
            answerError.classList.add('success');
            answerError.hidden = false;
            submitButton.textContent = 'Réponse envoyée';
        } catch (error) {
            showError(error.message || 'Impossible d’envoyer votre réponse. Réessayez.');
            submitButton.disabled = false;
            submitButton.textContent = 'Envoyer mes réponses';
        }
    });

    async function loadQuestionnaire() {
        if (!questionnaireId || !/^\d+$/.test(questionnaireId)) {
            throw new Error('Ce lien de questionnaire est invalide.');
        }
        var result = await FQAuth.api('/api/questionnaires/' + encodeURIComponent(questionnaireId));
        questionnaire = result.questionnaire;
        if (questionnaire.status !== 'open') throw new Error('Ce questionnaire n’est pas ouvert aux réponses.');
        document.title = questionnaire.title + ' · FUZZY-QUEST';
        document.getElementById('qTitle').textContent = questionnaire.title;
        document.getElementById('qDescription').textContent = questionnaire.description || 'Merci de prendre quelques minutes pour répondre.';
        questionList.innerHTML = questionnaire.questions.map(renderQuestion).join('');
        form.hidden = false;
        loading.hidden = true;
        FQAuth.me().then(function (session) {
            if (!session.user) return;
            document.getElementById('respondentName').value = [session.user.first_name, session.user.last_name].filter(Boolean).join(' ');
            document.getElementById('respondentEmail').value = session.user.email || '';
            anonymousMode.checked = false;
            identityFields.hidden = false;
        }).catch(function () {});
    }

    loadQuestionnaire().catch(function (error) {
        loading.hidden = true;
        errorBox.textContent = error.message || 'Le questionnaire est indisponible.';
        errorBox.hidden = false;
    });
})();
