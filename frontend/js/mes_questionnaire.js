(function () {
	var KEY = 'fq_questionnaires';
	var $ = function (id) { return document.getElementById(id); };
	var TYPES = {
		scale: 'Échelle de valeurs',
		single: 'Choix unique',
		multi: 'Choix multiple',
		text: 'Texte libre',
		triangle: 'Logique floue - Triangle',
		trapeze: 'Logique floue - Trapèze'
	};
	var STATUS = {
		open: ['Ouvert', 'up'],
		draft: ['Brouillon', 'dn'],
		closed: ['Clos', 'nu']
	};

	function seed() {
		return [
			{
				id: 1,
				title: 'Satisfaction usagers',
				description: 'Mesure de la satisfaction globale des usagers.',
				status: 'open',
				target: 200,
				responses: 164,
				date: '2026-09-12',
				questions: [
					{ id: 1, type: 'scale', label: 'Quel est votre niveau de satisfaction ?', required: true, min: 1, max: 5, step: 1, minLabel: 'Pas satisfait', maxLabel: 'Très satisfait' },
					{ id: 2, type: 'triangle', label: 'Quel délai d’attente jugez-vous « acceptable » ?', required: true, unit: 'min', a: 5, b: 15, c: 30 }
				]
			},
			{
				id: 2,
				title: 'Évaluation des risques',
				description: 'Perception des risques par les équipes terrain.',
				status: 'open',
				target: 150,
				responses: 85,
				date: '2026-09-18',
				questions: [
					{ id: 1, type: 'multi', label: 'Quels risques identifiez-vous ?', required: true, options: ['Technique', 'Humain', 'Financier', 'Juridique'] },
					{ id: 2, type: 'trapeze', label: 'Quel niveau de risque est « élevé » ?', required: false, unit: '%', a: 40, b: 60, c: 80, d: 95 }
				]
			},
			{
				id: 3,
				title: 'Qualité de service',
				description: 'Brouillon en cours de rédaction.',
				status: 'draft',
				target: 100,
				responses: 12,
				date: '2026-09-25',
				questions: [
					{ id: 1, type: 'single', label: 'Recommanderiez-vous le service ?', required: true, options: ['Oui', 'Plutôt oui', 'Plutôt non', 'Non'] },
					{ id: 2, type: 'text', label: 'Vos remarques', required: false, placeholder: 'Votre avis…', maxLength: 500, multiline: true }
				]
			}
		];
	}

	var data;
	try {
		data = JSON.parse(localStorage.getItem(KEY));
	} catch (e) {
		data = null;
	}

	if (!Array.isArray(data)) {
		data = seed();
		save();
	}

	function save() {
		try {
			localStorage.setItem(KEY, JSON.stringify(data));
		} catch (e) {}
	}

	function esc(s) {
		return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}

	function fdate(d) {
		var p = d.split('-');
		return p[2] + '/' + p[1] + '/' + p[0];
	}

	function defaults(type, label) {
		var q = { type: type, label: label || '', required: true };
		if (type === 'scale') {
			q.min = 1;
			q.max = 5;
			q.step = 1;
			q.minLabel = '';
			q.maxLabel = '';
		}
		if (type === 'single' || type === 'multi') q.options = ['', ''];
		if (type === 'text') {
			q.placeholder = '';
			q.maxLength = 500;
			q.multiline = true;
		}
		if (type === 'triangle') {
			q.unit = '';
			q.a = 0;
			q.b = 50;
			q.c = 100;
		}
		if (type === 'trapeze') {
			q.unit = '';
			q.a = 0;
			q.b = 30;
			q.c = 70;
			q.d = 100;
		}
		return q;
	}

	var filter = 'all';

	function renderList() {
		var s = $('fSearch').value.trim().toLowerCase();
		var items = data.filter(function (q) {
			return (filter === 'all' || q.status === filter) && q.title.toLowerCase().indexOf(s) > -1;
		});
		$('subline').textContent = data.length + ' questionnaire' + (data.length > 1 ? 's' : '') + ' créé' + (data.length > 1 ? 's' : '') + ' · gérez-les depuis cette page';
		if (!items.length) {
			$('list').innerHTML = '<div class="card empty" style="grid-column:1/-1">Aucun questionnaire à afficher.</div>';
			return;
		}
		$('list').innerHTML = items.map(function (q) {
			var pct = q.target ? Math.min(100, Math.round(q.responses / q.target * 100)) : 0;
			var st = STATUS[q.status];
			return '<div class="card qc"><div class="h"><b>' + esc(q.title) + '</b><span class="pill ' + st[1] + '">' + st[0] + '</span></div>' +
				'<p>' + esc(q.description) + '</p>' +
				'<div><div class="bar"><i style="width:' + pct + '%;background:' + (q.status === 'open' ? 'var(--ok)' : q.status === 'draft' ? 'var(--warn)' : 'var(--brand)') + '"></i></div><small>' + q.responses + ' / ' + q.target + ' réponses</small></div>' +
				'<div class="meta"><span>' + q.questions.length + ' question' + (q.questions.length > 1 ? 's' : '') + '</span><span>Créé le ' + fdate(q.date) + '</span></div>' +
				'<div class="acts"><button class="btn" data-a="view" data-id="' + q.id + '">Consulter</button><button class="btn" data-a="edit" data-id="' + q.id + '">Modifier</button><button class="btn d" data-a="del" data-id="' + q.id + '">Supprimer</button></div></div>';
		}).join('');
	}

	$('list').addEventListener('click', function (e) {
		var b = e.target.closest('button[data-a]');
		if (!b) return;
		var id = +b.dataset.id;
		if (b.dataset.a === 'view') openView(id);
		if (b.dataset.a === 'edit') openEdit(id);
		if (b.dataset.a === 'del') askDelete(id);
	});

	$('fSearch').addEventListener('input', renderList);

	$('chips').addEventListener('click', function (e) {
		var c = e.target.closest('.chip');
		if (!c) return;
		filter = c.dataset.s;
		document.querySelectorAll('#chips .chip').forEach(function (x) {
			x.classList.toggle('on', x === c);
		});
		renderList();
	});

	function fuzzySVG(q) {
		var pts = q.type === 'triangle' ? [q.a, q.b, q.c] : [q.a, q.b, q.c, q.d];
		pts = pts.map(Number);
		var lo = pts[0], hi = pts[pts.length - 1];
		if (!isFinite(lo) || !isFinite(hi) || hi <= lo) {
			return '<svg viewBox="0 0 300 100" width="100%"><text x="150" y="55" text-anchor="middle" font-size="12" fill="#6b6584">Paramètres invalides</text></svg>';
		}
		var W = 300, H = 100, L = 24, R = 12, T = 12, B = 24;
		var X = function (v) { return L + (v - lo) / (hi - lo) * (W - L - R); };
		var Y0 = H - B, Y1 = T;
		var d = q.type === 'triangle' ? [[pts[0], 0], [pts[1], 1], [pts[2], 0]] : [[pts[0], 0], [pts[1], 1], [pts[2], 1], [pts[3], 0]];
		var poly = d.map(function (p) {
			return X(p[0]).toFixed(1) + ',' + (p[1] ? Y1 : Y0);
		}).join(' ');
		var ticks = pts.map(function (v) {
			return '<text x="' + X(v).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="#6b6584">' + esc(v) + '</text>';
		}).join('');
		return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Fonction d’appartenance">' +
			'<path d="M' + L + ' ' + Y0 + 'H' + (W - R) + 'M' + L + ' ' + T + 'V' + Y0 + '" stroke="#e9e5f5" fill="none"/>' +
			'<text x="' + (L - 6) + '" y="' + (Y1 + 4) + '" text-anchor="end" font-size="10" fill="#6b6584">1</text><text x="' + (L - 6) + '" y="' + (Y0 + 3) + '" text-anchor="end" font-size="10" fill="#6b6584">0</text>' +
			'<polygon points="' + poly + '" fill="#5b3fd0" opacity=".14"/><polyline points="' + poly + '" fill="none" stroke="#5b3fd0" stroke-width="2.5" stroke-linejoin="round"/>' + ticks + '</svg>';
	}

	function num(label, i, f, v, extra) {
		return '<div class="pfield"><label>' + label + '</label><input type="number" step="any" data-q="' + i + '" data-f="' + f + '" data-n="1" value="' + esc(v) + '"' + (extra || '') + '></div>';
	}

	function txt(label, i, f, v, ph) {
		return '<div class="pfield"><label>' + label + '</label><input type="text" data-q="' + i + '" data-f="' + f + '" value="' + esc(v) + '" placeholder="' + esc(ph || '') + '"></div>';
	}

	function paramsHTML(q, i) {
		if (q.type === 'scale') {
			return '<div class="row3">' + num('Valeur min', i, 'min', q.min) + num('Valeur max', i, 'max', q.max) + num('Pas', i, 'step', q.step, ' min="0.1"') + '</div>' +
				'<div class="row2">' + txt('Libellé min (optionnel)', i, 'minLabel', q.minLabel, 'Ex : Pas du tout') + txt('Libellé max (optionnel)', i, 'maxLabel', q.maxLabel, 'Ex : Tout à fait') + '</div>';
		}
		if (q.type === 'single' || q.type === 'multi') {
			var mk = q.type === 'single' ? 'r' : 's';
			return '<label style="font-size:11.5px;color:var(--mut);font-weight:700;text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:8px">Propositions de réponse</label>' +
				q.options.map(function (o, k) {
					return '<div class="opt"><span class="mk ' + mk + '"></span><input type="text" data-q="' + i + '" data-o="' + k + '" value="' + esc(o) + '" placeholder="Proposition ' + (k + 1) + '"><button class="ib d" data-act="delopt" data-q="' + i + '" data-o="' + k + '" title="Retirer">✕</button></div>';
				}).join('') + '<button class="btn" data-act="addopt" data-q="' + i + '" style="padding:7px 12px;font-size:13px">+ Ajouter une proposition</button>';
		}
		if (q.type === 'text') {
			return '<div class="row2">' + txt('Texte indicatif (placeholder)', i, 'placeholder', q.placeholder, 'Ex : Saisissez votre réponse…') + num('Longueur maximale (caractères)', i, 'maxLength', q.maxLength, ' min="1"') + '</div>' +
				'<label class="chk"><input type="checkbox" data-q="' + i + '" data-f="multiline"' + (q.multiline ? ' checked' : '') + '> Zone de texte multiligne</label>';
		}
		var tri = q.type === 'triangle';
		return '<div class="fz"><div class="pfield" style="margin-bottom:10px">' + '<label>Unité (optionnel)</label><input type="text" data-q="' + i + '" data-f="unit" value="' + esc(q.unit) + '" placeholder="Ex : min, %, °C" style="max-width:220px"></div>' +
			(tri
				? '<div class="row3">' + num('a – début (μ=0)', i, 'a', q.a) + num('b – sommet (μ=1)', i, 'b', q.b) + num('c – fin (μ=0)', i, 'c', q.c) + '</div><small style="color:var(--mut)">Condition : a ≤ b ≤ c et a &lt; c</small>'
				: '<div class="row4">' + num('a – début (μ=0)', i, 'a', q.a) + num('b – début plateau (μ=1)', i, 'b', q.b) + num('c – fin plateau (μ=1)', i, 'c', q.c) + num('d – fin (μ=0)', i, 'd', q.d) + '</div><small style="color:var(--mut)">Condition : a ≤ b ≤ c ≤ d et a &lt; d</small>') +
			'<div class="fp" id="prev' + i + '">' + fuzzySVG(q) + '</div></div>';
	}

	function questionHTML(q, i, n) {
		var opts = Object.keys(TYPES).map(function (t) {
			return '<option value="' + t + '"' + (q.type === t ? ' selected' : '') + '>' + TYPES[t] + '</option>';
		}).join('');
		return '<div class="qb"><div class="qt"><span class="num">' + (i + 1) + '</span><select data-q="' + i + '" data-f="type">' + opts + '</select>' +
			'<button class="ib" data-act="up" data-q="' + i + '" title="Monter"' + (i === 0 ? ' disabled' : '') + '>↑</button><button class="ib" data-act="down" data-q="' + i + '" title="Descendre"' + (i === n - 1 ? ' disabled' : '') + '>↓</button><button class="ib d" data-act="delq" data-q="' + i + '" title="Supprimer la question">🗑</button></div>' +
			'<div class="pfield"><label>Intitulé de la question</label><input type="text" data-q="' + i + '" data-f="label" value="' + esc(q.label) + '" placeholder="Saisissez la question…"></div>' + paramsHTML(q, i) +
			'<label class="chk" style="margin-top:12px"><input type="checkbox" data-q="' + i + '" data-f="required"' + (q.required ? ' checked' : '') + '> Réponse obligatoire</label></div>';
	}

	var cur = null;

	function openEdit(id) {
		var q = id ? data.filter(function (x) { return x.id === id; })[0] : null;
		cur = q
			? JSON.parse(JSON.stringify(q))
			: { id: 0, title: '', description: '', status: 'draft', target: 100, responses: 0, date: new Date().toISOString().slice(0, 10), questions: [] };
		$('eTitle').textContent = q ? 'Modifier le questionnaire' : 'Nouveau questionnaire';
		renderEditor();
		$('vOvl').classList.remove('on');
		$('eOvl').classList.add('on');
	}

	function renderEditor() {
		var typeOpts = Object.keys(TYPES).map(function (t) {
			return '<option value="' + t + '">' + TYPES[t] + '</option>';
		}).join('');
		$('eBody').innerHTML = '<div class="err" id="err"></div>' +
			'<div class="row2"><div class="pfield"><label>Titre du questionnaire</label><input type="text" id="mTitle" value="' + esc(cur.title) + '" placeholder="Ex : Satisfaction usagers"></div>' +
			'<div class="row2"><div class="pfield"><label>Statut</label><select id="mStatus"><option value="draft">Brouillon</option><option value="open">Ouvert</option><option value="closed">Clos</option></select></div>' +
			'<div class="pfield"><label>Objectif de réponses</label><input type="number" id="mTarget" min="1" value="' + esc(cur.target) + '"></div></div></div>' +
			'<div class="pfield"><label>Description</label><textarea id="mDesc" placeholder="Objectif du questionnaire…">' + esc(cur.description) + '</textarea></div>' +
			'<div class="pdiv"></div><div class="qhead"><h3>Questions (' + cur.questions.length + ')</h3></div>' +
			(cur.questions.length
				? cur.questions.map(function (q, i) { return questionHTML(q, i, cur.questions.length); }).join('')
				: '<div class="empty">Aucune question. Choisissez un type ci-dessous pour commencer.</div>') +
			'<div class="addbar"><select id="newType">' + typeOpts + '</select><button class="btn p" id="addQ">+ Ajouter une question</button></div>';
		$('mStatus').value = cur.status;
	}

	function syncHead() {
		cur.title = $('mTitle').value;
		cur.description = $('mDesc').value;
		cur.status = $('mStatus').value;
		cur.target = +$('mTarget').value || 1;
	}

	$('eBody').addEventListener('input', function (e) {
		var t = e.target, i = t.dataset.q;
		if (i === undefined) return;
		var q = cur.questions[+i];
		if (t.dataset.o !== undefined) {
			q.options[+t.dataset.o] = t.value;
			return;
		}
		var f = t.dataset.f;
		if (!f || f === 'type') return;
		q[f] = t.type === 'checkbox' ? t.checked : (t.dataset.n ? (t.value === '' ? '' : +t.value) : t.value);
		if ((q.type === 'triangle' || q.type === 'trapeze') && ['a', 'b', 'c', 'd'].indexOf(f) > -1) {
			$('prev' + i).innerHTML = fuzzySVG(q);
		}
	});

	$('eBody').addEventListener('change', function (e) {
		var t = e.target;
		if (t.dataset.f === 'type') {
			syncHead();
			var q = cur.questions[+t.dataset.q];
			cur.questions[+t.dataset.q] = defaults(t.value, q.label);
			cur.questions[+t.dataset.q].required = q.required;
			renderEditor();
		}
	});

	$('eBody').addEventListener('click', function (e) {
		var b = e.target.closest('button');
		if (!b) return;
		if (b.id === 'addQ') {
			syncHead();
			cur.questions.push(defaults($('newType').value));
			renderEditor();
			var qs = document.querySelectorAll('.qb');
			qs[qs.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
			return;
		}
		var a = b.dataset.act;
		if (!a) return;
		syncHead();
		var i = +b.dataset.q, qs = cur.questions;
		if (a === 'delq') qs.splice(i, 1);
		if (a === 'up' && i > 0) qs.splice(i - 1, 0, qs.splice(i, 1)[0]);
		if (a === 'down' && i < qs.length - 1) qs.splice(i + 1, 0, qs.splice(i, 1)[0]);
		if (a === 'addopt') qs[i].options.push('');
		if (a === 'delopt') {
			if (qs[i].options.length > 2) qs[i].options.splice(+b.dataset.o, 1);
		}
		renderEditor();
	});

	function validate() {
		if (!cur.title.trim()) return 'Le titre du questionnaire est obligatoire.';
		if (!cur.questions.length) return 'Ajoutez au moins une question.';
		for (var i = 0; i < cur.questions.length; i++) {
			var q = cur.questions[i], n = 'Question ' + (i + 1) + ' : ';
			if (!String(q.label).trim()) return n + 'l’intitulé est obligatoire.';
			if (q.type === 'scale') {
				if (q.min === '' || q.max === '' || q.step === '') return n + 'renseignez min, max et pas.';
				if (!(q.min < q.max)) return n + 'la valeur min doit être inférieure à la valeur max.';
				if (!(q.step > 0)) return n + 'le pas doit être positif.';
			}
			if (q.type === 'single' || q.type === 'multi') {
				var f = q.options.map(function (o) { return o.trim(); }).filter(Boolean);
				if (f.length < 2) return n + 'indiquez au moins 2 propositions non vides.';
				q.options = f;
			}
			if (q.type === 'text' && !(q.maxLength >= 1)) return n + 'la longueur maximale doit être ≥ 1.';
			if (q.type === 'triangle') {
				if ([q.a, q.b, q.c].some(function (v) { return v === '' || isNaN(v); })) return n + 'renseignez a, b et c.';
				if (!(q.a <= q.b && q.b <= q.c && q.a < q.c)) return n + 'le triangle exige a ≤ b ≤ c et a < c.';
			}
			if (q.type === 'trapeze') {
				if ([q.a, q.b, q.c, q.d].some(function (v) { return v === '' || isNaN(v); })) return n + 'renseignez a, b, c et d.';
				if (!(q.a <= q.b && q.b <= q.c && q.c <= q.d && q.a < q.d)) return n + 'le trapèze exige a ≤ b ≤ c ≤ d et a < d.';
			}
		}
		return '';
	}

	$('eSave').addEventListener('click', function () {
		syncHead();
		var m = validate();
		if (m) {
			var er = $('err');
			er.textContent = m;
			er.classList.add('on');
			$('eBody').scrollTop = 0;
			return;
		}
		cur.questions.forEach(function (q, i) { q.id = i + 1; });
		if (cur.id) {
			data = data.map(function (x) { return x.id === cur.id ? cur : x; });
		} else {
			cur.id = data.reduce(function (m, x) { return Math.max(m, x.id); }, 0) + 1;
			data.unshift(cur);
		}
		save();
		renderList();
		$('eOvl').classList.remove('on');
	});

	$('btnNew').addEventListener('click', function () { openEdit(0); });

	['eClose', 'eCancel'].forEach(function (id) {
		$(id).addEventListener('click', function () {
			$('eOvl').classList.remove('on');
		});
	});

	var viewId = 0;

	function describe(q) {
		if (q.type === 'scale') {
			return 'De ' + q.min + ' à ' + q.max + ' (pas ' + q.step + ')' + (q.minLabel || q.maxLabel ? ' · ' + esc(q.minLabel) + ' → ' + esc(q.maxLabel) : '');
		}
		if (q.type === 'single' || q.type === 'multi') {
			return '<ul>' + q.options.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul>';
		}
		if (q.type === 'text') {
			return (q.multiline ? 'Multiligne' : 'Une ligne') + ' · max ' + q.maxLength + ' caractères';
		}
		return '<div class="fp" style="max-width:340px;border:1px solid var(--line);border-radius:10px;padding:6px;margin-top:6px">' + fuzzySVG(q) + '</div>' + (q.unit ? '<small>Unité : ' + esc(q.unit) + '</small>' : '');
	}

	function openView(id) {
		var q = data.filter(function (x) { return x.id === id; })[0];
		if (!q) return;
		viewId = id;
		$('vTitle').textContent = q.title;
		$('vSub').textContent = STATUS[q.status][0] + ' · ' + q.questions.length + ' question(s) · créé le ' + fdate(q.date);
		$('vBody').innerHTML = (q.description ? '<p style="color:var(--mut);margin-bottom:10px">' + esc(q.description) + '</p>' : '') +
			q.questions.map(function (x, i) {
				return '<div class="view-q"><b>' + (i + 1) + '. ' + esc(x.label) + '</b><span class="tag">' + TYPES[x.type] + '</span>' + (x.required ? '<span class="tag" style="background:var(--vio-s);color:var(--vio)">Obligatoire</span>' : '') + '<div style="margin-top:6px;color:var(--mut)">' + describe(x) + '</div></div>';
			}).join('');
		$('vOvl').classList.add('on');
	}

	['vClose', 'vOk'].forEach(function (id) {
		$(id).addEventListener('click', function () {
			$('vOvl').classList.remove('on');
		});
	});

	$('vEdit').addEventListener('click', function () { openEdit(viewId); });

	var delId = 0;

	function askDelete(id) {
		var q = data.filter(function (x) { return x.id === id; })[0];
		delId = id;
		$('dName').textContent = q.title;
		$('dOvl').classList.add('on');
	}

	$('dNo').addEventListener('click', function () {
		$('dOvl').classList.remove('on');
	});

	$('dYes').addEventListener('click', function () {
		data = data.filter(function (x) { return x.id !== delId; });
		save();
		renderList();
		$('dOvl').classList.remove('on');
	});

	['pOvl', 'eOvl', 'vOvl', 'dOvl'].forEach(function (id) {
		$(id).addEventListener('click', function (e) {
			if (e.target === this) this.classList.remove('on');
		});
	});

	document.querySelectorAll('.av,.who').forEach(function (el) {
		el.addEventListener('click', function (e) {
			e.stopPropagation();
			$('pDD').classList.toggle('on');
		});
	});

	document.addEventListener('click', function () {
		$('pDD').classList.remove('on');
	});

	$('ddProfile').addEventListener('click', function () {
		$('pDD').classList.remove('on');
		$('pOvl').classList.add('on');
	});

	$('ddHelp').addEventListener('click', function () {
		$('pDD').classList.remove('on');
	});

	$('ddOut').addEventListener('click', function () {
		alert('Déconnexion (démo)');
		$('pDD').classList.remove('on');
	});

	['pClose', 'pSave', 'pCancel'].forEach(function (id) {
		$(id).addEventListener('click', function () {
			$('pOvl').classList.remove('on');
		});
	});

	$('pEdit').addEventListener('click', function () {
		var d = [$('pEmail'), $('pPhone')];
		d.forEach(function (i) { i.disabled = !i.disabled; });
		this.textContent = d[0].disabled ? '✎ Modifier mes coordonnées' : 'Verrouiller les champs';
	});

	renderList();
})();