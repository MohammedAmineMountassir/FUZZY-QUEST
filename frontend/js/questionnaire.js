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
		if (e.target === ovl) ovl.classList.remove('on');
	});

	var QUAL = ['Très mauvaise', 'Mauvaise', 'Moyenne', 'Bonne', 'Très bonne'];
	var ACCORD = ['Pas du tout d\'accord', 'Plutôt pas d\'accord', 'Neutre', 'Plutôt d\'accord', 'Tout à fait d\'accord'];
	var RISK = ['Négligeable', 'Faible', 'Modéré', 'Élevé', 'Critique'];

	var R = function (t, o) { return { t: t, o: o, r: true }; };
	var T = function (t, req) { return { t: t, o: null, r: !!req }; };

	var DATA = {
		satisfaction: {
			t: 'Satisfaction usagers',
			d: 'Donnez votre avis sur la qualité du service.',
			min: 8,
			q: [
				R('Comment évaluez-vous globalement la qualité du service ?', QUAL),
				R('Comment évaluez-vous la qualité de l\'accueil ?', QUAL),
				R('Comment évaluez-vous la rapidité de la prise en charge ?', QUAL),
				R('Comment évaluez-vous la clarté des informations reçues ?', QUAL),
				R('Comment évaluez-vous la compétence des interlocuteurs ?', QUAL),
				R('Comment évaluez-vous la facilité d\'accès au service ?', QUAL),
				R('Recommanderiez-vous ce service à un proche ?', ['Certainement', 'Probablement', 'Peu probablement', 'Non']),
				R('À quelle fréquence utilisez-vous ce service ?', ['Première fois', 'Occasionnellement', 'Régulièrement', 'Quotidiennement']),
				R('Votre demande a-t-elle été résolue ?', ['Oui', 'Partiellement', 'Non']),
				R('Quel a été votre temps d\'attente ?', ['Moins de 5 min', '5 à 15 min', '15 à 30 min', 'Plus de 30 min']),
				T('Quel aspect du service faudrait-il améliorer en priorité ?'),
				T('Souhaitez-vous ajouter un commentaire libre ?')
			]
		},
		risques: {
			t: 'Évaluation des risques',
			d: 'Estimez le niveau de risque de chaque situation.',
			min: 10,
			q: [
				'Un accès non autorisé aux locaux',
				'La perte d\'un document confidentiel',
				'Une panne prolongée du système informatique',
				'Un retard de livraison d\'un fournisseur clé',
				'Une erreur de saisie dans un dossier sensible',
				'L\'absence imprévue d\'un expert indispensable',
				'Une coupure d\'électricité',
				'Un incident de sécurité des données',
				'Une non-conformité réglementaire',
				'Un incendie dans les locaux',
				'Une fuite d\'informations vers l\'extérieur',
				'Une défaillance d\'un équipement critique',
				'Un conflit avec un partenaire majeur',
				'Une interruption de la connexion internet'
			].map(function (s) {
				return R('Quel niveau de risque représente : ' + s + ' ?', RISK);
			}).concat([
				T('Y a-t-il une situation à risque que nous n\'avons pas citée ?')
			])
		},
		qualite: {
			t: 'Qualité de service',
			d: 'Évaluez les différents aspects de la qualité de service.',
			min: 5,
			q: [
				'Le service répond à mes attentes',
				'Les délais annoncés sont respectés',
				'Le personnel est à l\'écoute',
				'Les informations fournies sont fiables',
				'Les procédures sont simples à suivre',
				'Les locaux sont propres et accueillants',
				'Mes demandes sont traitées de façon cohérente',
				'Je sais à qui m\'adresser en cas de problème',
				'Je me sens respecté(e) en tant qu\'usager'
			].map(function (s) {
				return R(s, ACCORD);
			}).concat([
				T('Que changeriez-vous pour améliorer la qualité de service ?')
			])
		}
	};

	var id = new URLSearchParams(location.search).get('id');
	if (!DATA[id]) id = 'satisfaction';

	var Q = DATA[id],
		N = Q.q.length,
		KD = 'fq_draft_' + id,
		KS = 'fq_sent_' + id;

	function get(k) {
		try { return localStorage.getItem(k); } catch (e) { return null; }
	}

	function set(k, v) {
		try { localStorage.setItem(k, v); } catch (e) {}
	}

	function del(k) {
		try { localStorage.removeItem(k); } catch (e) {}
	}

	var $ = function (x) {
		return document.getElementById(x);
	};

	var esc = function (s) {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
	};

	document.title = 'Fuzzy-Quest – ' + Q.t;
	$('qTitle').textContent = Q.t;
	$('qDesc').textContent = Q.d;
	$('qMeta').innerHTML = '<span class="pill nu">' + N + ' questions</span><span class="pill nu">≈ ' + Q.min + ' min</span><span class="pill nu">Réponses confidentielles</span>';

	$('qlist').innerHTML = Q.q.map(function (q, i) {
		var body = q.o
			? '<div class="opts" role="radiogroup" aria-label="Question ' + (i + 1) + '">' + q.o.map(function (o) {
				return '<label class="opt"><input type="radio" name="q' + i + '" value="' + esc(o) + '"><span>' + o + '</span></label>';
			}).join('') + '</div>'
			: '<textarea name="q' + i + '" placeholder="Écrivez votre réponse ici…" aria-label="Question ' + (i + 1) + '"></textarea>';
		return '<section class="card qc2" id="qc' + i + '"><div class="qh"><span class="qn">Question ' + (i + 1) + '</span>' +
			'<span class="pill ' + (q.r ? 'dn' : 'nu') + '">' + (q.r ? 'Obligatoire' : 'Facultative') + '</span></div>' +
			'<h3>' + q.t + '</h3>' + body + '<p class="errmsg">Cette question est obligatoire.</p></section>';
	}).join('');

	function val(i) {
		var q = Q.q[i];
		if (q.o) {
			var c = document.querySelector('input[name="q' + i + '"]:checked');
			return c ? c.value : '';
		}
		return document.querySelector('textarea[name="q' + i + '"]').value.trim();
	}

	function all() {
		var a = {};
		for (var i = 0; i < N; i++) {
			var v = val(i);
			if (v) a[i] = v;
		}
		return a;
	}

	function update(save) {
		var a = all(),
			done = Object.keys(a).length,
			pct = Math.round(done / N * 100);
		$('pTxt').textContent = done + ' / ' + N + ' questions';
		$('pPct').textContent = pct + ' %';
		$('pFill').style.width = pct + '%';
		$('pBar').setAttribute('aria-valuenow', pct);
		var miss = 0;
		Q.q.forEach(function (q, i) {
			var c = $('qc' + i),
				ok = !!a[i];
			c.classList.toggle('done', ok);
			if (ok) c.classList.remove('err');
			if (q.r && !ok) miss++;
		});
		var st = $('sSt');
		if (miss) {
			st.className = 'st warn';
			st.innerHTML = miss + ' question' + (miss > 1 ? 's' : '') + ' obligatoire' + (miss > 1 ? 's' : '') + ' restante' + (miss > 1 ? 's' : '') + '<small>Brouillon enregistré automatiquement</small>';
		} else {
			st.className = 'st';
			st.innerHTML = 'Tout est complété, vous pouvez envoyer<small>Brouillon enregistré automatiquement</small>';
			$('alertBox').classList.remove('on');
		}
		if (save) {
			done ? set(KD, JSON.stringify(a)) : del(KD);
		}
		return miss;
	}

	try {
		var d = JSON.parse(get(KD) || 'null') || {};
		Object.keys(d).forEach(function (i) {
			if (Q.q[i].o) {
				var r = document.querySelectorAll('input[name="q' + i + '"]');
				for (var k = 0; k < r.length; k++) {
					if (r[k].value === d[i]) r[k].checked = true;
				}
			} else {
				document.querySelector('textarea[name="q' + i + '"]').value = d[i];
			}
		});
	} catch (e) {}

	update(false);

	$('qlist').addEventListener('change', function () {
		update(true);
	});

	$('qlist').addEventListener('input', function (e) {
		if (e.target.tagName === 'TEXTAREA') update(true);
	});

	$('sendBtn').addEventListener('click', function () {
		var a = all(),
			missing = [];
		Q.q.forEach(function (q, i) {
			if (q.r && !a[i]) missing.push(i);
		});
		if (missing.length) {
			missing.forEach(function (i) {
				$('qc' + i).classList.add('err');
			});
			var box = $('alertBox');
			box.textContent = 'Il reste ' + missing.length + ' question' + (missing.length > 1 ? 's' : '') + ' obligatoire' + (missing.length > 1 ? 's' : '') +
				' à compléter (n° ' + missing.map(function (i) { return i + 1; }).join(', ') + ').';
			box.classList.add('on');
			$('qc' + missing[0]).scrollIntoView({ behavior: 'smooth', block: 'center' });
			return;
		}
		set(KS, new Date().toISOString());
		del(KD);
		$('view').innerHTML = '<div class="card ok"><div class="big"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg></div>' +
			'<h2>Merci, vos réponses ont bien été envoyées</h2><p>« ' + Q.t + ' » : ' + Object.keys(a).length + ' réponse' + (Object.keys(a).length > 1 ? 's' : '') + ' transmise' + (Object.keys(a).length > 1 ? 's' : '') + ' à l\'équipe d\'analyse.</p>' +
			'<a class="btn p" href="participant.html">Retour aux questionnaires</a></div>';
		window.scrollTo({ top: 0, behavior: 'smooth' });
	});

	var left = Object.keys(DATA).filter(function (k) {
		return !get('fq_sent_' + k);
	}).length;

	$('navBadge').textContent = left;
	$('navBadge').style.display = left ? '' : 'none';
})();