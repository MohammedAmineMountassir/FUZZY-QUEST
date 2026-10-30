(async function () {
    'use strict';
    var $ = function (id) {
        return document.getElementById(id);
    }, id = new URLSearchParams(location.search).get('id');
    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            } [c];
        });
    }
    try {
        if (!id) throw new Error('Questionnaire introuvable.');
        var result = await FQAuth.api('/api/questionnaires/' + encodeURIComponent(id)), q = result.questionnaire;
        $('qTitle').textContent = q.title;
        $('qDesc').textContent = q.description;
        $('qMeta').textContent = q.questions.length + ' question(s)';
        var previousSection = '', previousSubsection = '';
        $('qlist').innerHTML = q.questions.map(function (question, i) {
            var label = '<label for="answer-' + i + '">' + esc(question.label) + (question.required ? ' <strong>*</strong>' : '') + '</label>', control;
            var headings = '';
            if (question.level === 'section' && question.section && question.section !== previousSection) {
                headings += '<h2 class="question-section-heading">' + esc(question.section) + '</h2>';
                previousSection = question.section;
                previousSubsection = '';
            }
            if (question.level === 'subsection' && question.section && question.section !== previousSection) {
                headings += '<h2 class="question-section-heading">' + esc(question.section) + '</h2>';
                previousSection = question.section;
                previousSubsection = '';
            }
            if (question.level === 'subsection' && question.subsection && question.subsection !== previousSubsection) {
                headings += '<h3 class="question-subsection-heading">' + esc(question.subsection) + '</h3>';
                previousSubsection = question.subsection;
            }
            if (question.type === 'single' || question.type === 'multi') control = (question.options || []).map(function (option, j) {
                return '<label class="answer-option"><input type="' + (question.type === 'multi' ? 'checkbox' : 'radio') + '" name="answer-' + i + '" value="' + esc(option) + '"> ' + esc(option) + '</label>';
            }).join('');
            else if (question.type === 'scale') control = '<input id="answer-' + i + '" type="range" min="' + Number(question.min || 1) + '" max="' + Number(question.max || 5) + '" step="' + Number(question.step || 1) + '"><span>' + esc(question.minLabel) + ' — ' + esc(question.maxLabel) + '</span>';
            else control = '<div class="fuzzy-inputs"><label>Minimum <input id="answer-' + i + '-a" type="number"></label><label>Maximum <input id="answer-' + i + '-b" type="number"></label></div>';
            return headings + '<section class="card question" data-index="' + i + '"><h2>' + (i + 1) + '. ' + esc(question.label) + '</h2>' + (question.type === 'single' || question.type === 'multi' ? control : label + control) + '</section>';
        }).join('');
        $('pTxt').textContent = q.questions.length + ' questions';
        $('pPct').textContent = q.questions.length ? '0 %' : '100 %';
        $('sendBtn').onclick = async function () {
            var answers = {
            }, valid = true;
            q.questions.forEach(function (question, i) {
                var selected = document.querySelectorAll('[name="answer-' + i + '"]:checked'), value;
                if (selected.length) value = question.type === 'multi' ? Array.from(selected).map(function (el) {
                    return el.value;
                }): selected[0].value;
                else if (question.type === 'triangle' || question.type === 'trapeze') value = [$('answer-' + i + '-a')?. value,
                    $('answer-' + i + '-b')?. value];
                else value = $('answer-' + i)?. value || '';
                if (question.required && (!value || Array.isArray(value) && value.some(function (v) {
                    return !v;
                }))) valid = false;
                answers[String(question.id || i + 1)] = value;
            });
            if (!valid) {
                $('alertBox').textContent = 'Répondez à toutes les questions obligatoires.';
                $('alertBox').classList.add('on');
                return;
            }
            this.disabled = true;
            try {
                await FQAuth.api('/api/questionnaires/' + encodeURIComponent(id) + '/responses', {
                    method: 'POST',
                    body: JSON.stringify({
                        answers: answers
                    })
                });
                $('alertBox').textContent = 'Merci, vos réponses ont été envoyées.';
                $('alertBox').classList.add('on');
                this.textContent = 'Réponses envoyées';
            } catch (error) {
                $('alertBox').textContent = error.message;
                $('alertBox').classList.add('on');
                this.disabled = false;
            }
        };
    } catch (error) {
        if (error.code === 'AUTH_REQUIRED') {
            location.assign('/connexion.html?next=' + encodeURIComponent(location.pathname + location.search));
            return;
        }
        $('qTitle').textContent = error.message;
        $('sendBtn').disabled = true;
    }
})();
