(function () {
	var dd = document.getElementById('pDD'),
		ovl = document.getElementById('pOvl');

	document.querySelectorAll('.av,.who').forEach(function (el) {
		el.addEventListener('click', function (e) {
			e.stopPropagation();
			dd.classList.toggle('on');
		});
	});

	document.addEventListener('click', function () {
		dd.classList.remove('on');
	});

	ovl.addEventListener('click', function (e) {
		if (e.target === ovl) {
			ovl.classList.remove('on');
		}
	});

	var LIST = [
		{ id: 'satisfaction', t: 'Satisfaction usagers', d: 'Donnez votre avis sur la qualité du service.', n: 12, min: 8, end: '30/09', soon: true },
		{ id: 'risques', t: 'Évaluation des risques', d: 'Estimez le niveau de risque de chaque situation.', n: 15, min: 10, end: '01/10', soon: true },
		{ id: 'qualite', t: 'Qualité de service', d: 'Évaluez les différents aspects de la qualité de service.', n: 10, min: 5, end: '15/10', soon: false }
	];

	var ICON = '<svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>';

	var grid = document.getElementById('qgrid'),
		filtersEl = document.getElementById('filters'),
		filter = 'all';

	function store(k) {
		try {
			return localStorage.getItem(k);
		} catch (e) {
			return null;
		}
	}

	function state(q) {
		var sent = !!store('fq_sent_' + q.id),
			done = 0;
		try {
			var d = JSON.parse(store('fq_draft_' + q.id) || 'null');
			if (d) {
				done = Object.keys(d).filter(function (k) {
					return String(d[k]).trim() !== '';
				}).length;
			}
		} catch (e) {}
		return {
			sent: sent,
			done: done,
			st: sent ? 'sent' : done > 0 ? 'cours' : 'dispo'
		};
	}

	var FILTERS = [
		['all', 'Tous', function () { return true; }],
		['dispo', 'Disponibles', function (q, s) { return s.st === 'dispo'; }],
		['cours', 'En cours', function (q, s) { return s.st === 'cours'; }],
		['soon', 'Bientôt clos', function (q, s) { return q.soon && !s.sent; }]
	];

	function render() {
		var rows = LIST.map(function (q) {
			return { q: q, s: state(q) };
		});

		filtersEl.innerHTML = FILTERS.map(function (f) {
			var c = rows.filter(function (r) {
				return f[2](r.q, r.s);
			}).length;
			return '<button class="chip' + (filter === f[0] ? ' on' : '') + '" data-f="' + f[0] + '">' + f[1] + '<small>' + c + '</small></button>';
		}).join('');

		var fn = FILTERS.filter(function (f) {
			return f[0] === filter;
		})[0][2];

		var shown = rows.filter(function (r) {
			return fn(r.q, r.s);
		});

		grid.innerHTML = shown.length
			? shown.map(function (r) {
				var q = r.q,
					s = r.s;
				var pill = s.sent
					? '<span class="pill up">Envoyé</span>'
					: s.st === 'cours'
						? '<span class="pill dn">En cours</span>'
						: '<span class="pill up">Disponible</span>';
				var end = q.soon && !s.sent
					? '<span class="pill dn">Clôture le ' + q.end + '</span>'
					: '<span class="pill nu">Ouvert jusqu\'au ' + q.end + '</span>';
				var pct = Math.round(s.done / q.n * 100);
				var prog = s.st === 'cours'
					? '<div class="pg"><div class="bar"><i style="width:' + pct + '%;background:linear-gradient(90deg,#5b3fd0,#d6479a)"></i></div><small>Brouillon : ' + s.done + ' / ' + q.n + ' questions</small></div>'
					: '';
				var btn = s.sent
					? '<a class="btn" aria-disabled="true">Déjà envoyé</a>'
					: s.st === 'cours'
						? '<a class="btn" href="questionnaire.html?id=' + q.id + '">Reprendre</a>'
						: '<a class="btn p" href="questionnaire.html?id=' + q.id + '">Répondre</a>';
				return '<div class="card qcard"><div class="hd"><div class="ic">' + ICON + '</div><div><b>' + q.t + '</b><span>' + q.d + '</span></div></div>' +
					'<div class="meta">' + pill + end + '</div>' +
					'<div class="meta"><span class="pill nu">' + q.n + ' questions</span><span class="pill nu">≈ ' + q.min + ' min</span></div>' +
					prog + btn + '</div>';
			}).join('')
			: '<p class="empty">Aucun questionnaire dans cette catégorie.</p>';

		var todo = rows.filter(function (r) {
			return !r.s.sent;
		}).length;

		document.getElementById('navBadge').textContent = todo;
		document.getElementById('navBadge').style.display = todo ? '' : 'none';
		document.getElementById('topSub').textContent = todo + ' questionnaire' + (todo > 1 ? 's' : '') + ' à remplir pour le moment.';
	}

	filtersEl.addEventListener('click', function (e) {
		var b = e.target.closest('.chip');
		if (!b) return;
		filter = b.dataset.f;
		render();
	});

	render();
})();