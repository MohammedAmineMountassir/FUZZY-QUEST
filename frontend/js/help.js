(function () {
	'use strict';
	var SUPPORT_EMAIL = '';
	var path = location.pathname;
	var PAGE_GUIDES = {
		'/chercheur.html': {
			title: 'Tableau de bord',
			tips: [
				'Recherchez un questionnaire par son titre avec la barre de recherche.',
				'Les cartes « Tous / Ouverts / Brouillons / Terminés » filtrent la liste.',
				'Le tableau « Analyse des résultats » compare les réponses reçues à votre objectif.',
				'« Bibliothèque » propose des modèles prêts à l’emploi pour démarrer plus vite.'
			]
		},
		'/creer-questionnaire.html': {
			title: 'Nouveau questionnaire',
			tips: [
				'Un questionnaire en « Brouillon » n’est visible que de vous et de vos co-chercheurs.',
				'Pour passer en « Ouvert », attribuez-le à un groupe ou publiez-le avec un lien public.',
				'« Structure » définit si les questions sont directes ou rangées en sections et sous-sections.',
				'Les types « Triangle » et « Trapèze » servent à recueillir des réponses en logique floue.'
			]
		},
		'/groupes.html': {
			title: 'Groupes',
			tips: [
				'Un groupe rassemble des participants auxquels vous diffusez vos questionnaires.',
				'Ouvrez un groupe pour ajouter des participants un par un ou par import Excel/CSV.',
				'Un groupe affecté à un questionnaire ne peut pas être supprimé : retirez d’abord l’affectation.'
			]
		},
		'/nouveau-groupe.html': {
			title: 'Nouveau groupe',
			tips: [
				'Donnez au groupe un nom clair et une description : ils sont visibles dans vos listes.',
				'Vous ajouterez les participants juste après la création.'
			]
		},
		'/groupe.html': {
			title: 'Détail d’un groupe',
			tips: [
				'Ajoutez des participants avec leur nom et leur adresse e-mail.',
				'Importez un fichier Excel ou CSV avec les colonnes « Nom » et « Email » (modèle téléchargeable).',
				'Le lien d’invitation permet aux participants de s’inscrire eux-mêmes dans ce groupe.'
			]
		},
		'/bibliotheque.html': {
			title: 'Bibliothèque de modèles',
			tips: [
				'Choisissez un modèle pour créer un questionnaire pré-rempli, puis adaptez-le.',
				'Les modèles publiés par l’administrateur apparaissent en premier.'
			]
		},
		'/coadministrateurs.html': {
			title: 'Co-chercheurs',
			tips: [
				'Ajoutez un chercheur actif par son adresse e-mail pour partager vos questionnaires et vos groupes.',
				'Un co-chercheur peut modifier vos questionnaires ; retirez son accès à tout moment.'
			]
		},
		'/journal-chercheur.html': {
			title: 'Journal',
			tips: ['Le journal liste vos dernières actions : créations, modifications, publications et imports.']
		},
		'/parametres.html': {
			title: 'Paramètres',
			tips: [
				'Modifiez votre prénom et votre nom.',
				'Changez votre mot de passe : 8 caractères minimum, avec au moins une lettre et un chiffre.'
			]
		},
		'/administration.html': {
			title: 'Administration',
			tips: [
				'« Chercheurs » : consulter les comptes et désactiver ou réactiver un accès.',
				'« Demandes de compte » : approuver ou refuser les nouvelles inscriptions.',
				'« Modèles » : publier des modèles de questionnaires pour tous les chercheurs.',
				'« Journal d’activité » : consulter les 500 derniers événements de la plateforme.'
			]
		},
		'/creer-modele.html': {
			title: 'Nouveau modèle',
			tips: [
				'Un modèle doit avoir un titre, une structure et au moins une question.',
				'Une fois publié, il apparaît dans la bibliothèque de tous les chercheurs.'
			]
		},
		'/mon-espace.html': {
			title: 'Mon espace',
			tips: [
				'Recherchez un questionnaire puis choisissez « Répondre ».',
				'Le filtre « Déjà traités » retrouve les questionnaires auxquels vous avez déjà répondu.'
			]
		}
	};
	var FAQ = [
		{
			q: 'Comment créer et publier un questionnaire ?',
			a: '<ol><li>Cliquez sur <b>Nouveau questionnaire</b> (ou partez d’un modèle de la <b>Bibliothèque</b>).</li><li>Saisissez le titre, ajoutez vos questions et choisissez leur type.</li><li>Sélectionnez un groupe ou le lien public, puis passez le statut à <b>Ouvert</b>.</li></ol>'
		},
		{
			q: 'Que signifient Brouillon, Ouvert et Terminé ?',
			a: '<p><b>Brouillon</b> : en préparation, non accessible aux participants. <b>Ouvert</b> : les participants peuvent répondre. <b>Terminé</b> : la collecte est fermée, les réponses sont conservées.</p>'
		},
		{
			q: 'À quoi servent les questions « Triangle » et « Trapèze » ?',
			a: '<p>Elles recueillent une réponse <b>incertaine</b> sous forme de nombre flou.</p><ul><li><b>Triangle (a, b, c)</b> : a = valeur minimale plausible, b = valeur la plus probable, c = valeur maximale plausible.</li><li><b>Trapèze (a, b, c, d)</b> : comme le triangle, mais avec un intervalle de valeurs jugées parfaitement plausibles entre b et c.</li></ul><p>Les valeurs doivent respecter l’ordre croissant.</p>'
		},
		{
			q: 'Comment diffuser un questionnaire à mes participants ?',
			a: '<p>Affectez-le à un ou plusieurs <b>groupes</b>, ou activez <b>Publier aussi avec un lien public</b>. Pour inviter des personnes, ajoutez-les à un groupe (manuellement, par import Excel/CSV ou via le lien d’invitation du groupe).</p>'
		},
		{
			q: 'Les participants peuvent-ils répondre anonymement ?',
			a: '<p>Oui. Sur la page de réponse, le participant peut rester anonyme ou indiquer son nom et son e-mail. Les deux champs vont ensemble : tous les deux, ou aucun.</p>'
		},
		{
			q: 'Comment changer mon mot de passe ?',
			a: '<p>Ouvrez <b>Paramètres</b>, saisissez votre mot de passe actuel puis le nouveau (8 caractères minimum, une lettre et un chiffre). En cas de problème d’accès, contactez l’administrateur de votre espace.</p>'
		}
	];

	function esc(value) {
		return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}

	function loadStyles() {
		var link = document.querySelector('link[data-fq-help]');
		if (link) return link;
		link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = '/css/help.css';
		link.setAttribute('data-fq-help', '');
		document.head.appendChild(link);
		return link;
	}

	var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
	var root = null;
	var panel = null;
	var lastTrigger = null;

	function buildContent() {
		var guide = PAGE_GUIDES[path];
		var html = '';
		if (guide) {
			html += '<section class="fq-help-section"><h3>Sur cette page — ' + esc(guide.title) + '</h3><ul class="fq-help-tips">' +
				guide.tips.map(function (tip) { return '<li>' + esc(tip) + '</li>'; }).join('') + '</ul></section>';
		}
		html += '<section class="fq-help-section"><h3>Questions fréquentes</h3><div id="fqHelpFaq">' +
			FAQ.map(function (item) {
				return '<details class="fq-help-item"><summary>' + esc(item.q) + '</summary><div class="fq-help-answer">' + item.a + '</div></details>';
			}).join('') + '</div><p class="fq-help-empty" id="fqHelpEmpty" hidden>Aucun résultat. Essayez un autre mot-clé.</p></section>';
		html += '<section class="fq-help-section fq-help-contact"><h3>Besoin d’un coup de main ?</h3><p>Si vous ne trouvez pas la réponse, contactez l’administrateur de votre espace' +
			(SUPPORT_EMAIL ? ' ou écrivez au support.' : '.') + '</p>' +
			(SUPPORT_EMAIL ? '<a class="fq-help-button" href="mailto:' + esc(SUPPORT_EMAIL) + '?subject=' + encodeURIComponent('Aide FUZZY-QUEST') + '">Écrire au support</a>' : '') +
			'</section>';
		return html;
	}

	function build() {
		root = document.createElement('div');
		root.className = 'fq-help-root';
		root.hidden = true;
		root.innerHTML =
			'<div class="fq-help-overlay" data-fq-close></div>' +
			'<aside class="fq-help-panel" role="dialog" aria-modal="true" aria-labelledby="fqHelpTitle" tabindex="-1">' +
			'<header class="fq-help-head"><div><p class="fq-help-eyebrow">Aide &amp; support</p><h2 id="fqHelpTitle">Comment pouvons-nous vous aider ?</h2></div>' +
			'<button type="button" class="fq-help-close" data-fq-close aria-label="Fermer l’aide">&times;</button></header>' +
			'<div class="fq-help-search"><input id="fqHelpSearch" type="search" placeholder="Rechercher dans l’aide…" aria-label="Rechercher dans l’aide" autocomplete="off"></div>' +
			'<div class="fq-help-body">' + buildContent() + '</div></aside>';
		document.body.appendChild(root);
		panel = root.querySelector('.fq-help-panel');
		root.addEventListener('click', function (event) {
			if (event.target.closest('[data-fq-close]')) close();
		});
		root.querySelector('#fqHelpSearch').addEventListener('input', function (event) {
			var needle = event.target.value.trim().toLowerCase();
			var visible = 0;
			root.querySelectorAll('.fq-help-item').forEach(function (item) {
				var match = !needle || item.textContent.toLowerCase().indexOf(needle) !== -1;
				item.hidden = !match;
				if (match) visible += 1;
				if (needle && match) item.open = true;
				if (!needle) item.open = false;
			});
			root.querySelector('#fqHelpEmpty').hidden = visible > 0;
		});
	}

	function open(trigger) {
		loadStyles();
		hidePopover();
		if (!root) build();
		lastTrigger = trigger || document.activeElement;
		root.hidden = false;
		document.body.classList.add('fq-help-open');
		requestAnimationFrame(function () {
			root.classList.add('is-open');
			panel.focus();
		});
	}

	function close() {
		if (!root || root.hidden) return;
		root.classList.remove('is-open');
		document.body.classList.remove('fq-help-open');
		setTimeout(function () { root.hidden = true; }, 180);
		if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
	}

	function trapFocus(event) {
		if (event.key !== 'Tab' || !root || root.hidden) return;
		var items = Array.prototype.filter.call(panel.querySelectorAll(FOCUSABLE), function (el) {
			return !el.closest('[hidden]') && el.offsetParent !== null;
		});
		if (!items.length) return;
		var first = items[0];
		var last = items[items.length - 1];
		if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	var HELP_SELECTOR = '.help-dot, [data-help]';
	var pop = null;
	var popOwner = null;
	var sticky = false;
	var popId = 0;

	function helpText(el) {
		var text = el.getAttribute('data-help');
		if (!text) {
			text = el.getAttribute('title') || '';
			if (text) {
				el.setAttribute('data-help', text);
				el.removeAttribute('title');
			}
		}
		return text;
	}

	function preparePopoverTarget(el) {
		if (el.tagName === 'BUTTON' && !el.getAttribute('type')) el.setAttribute('type', 'button');
		if (!el.getAttribute('aria-label') && !el.textContent.trim().replace('?', '')) el.setAttribute('aria-label', 'Aide');
		el.setAttribute('aria-expanded', 'false');
	}

	function placePopover(el) {
		var rect = el.getBoundingClientRect();
		var margin = 10;
		pop.style.left = '0px';
		pop.style.top = '0px';
		var width = pop.offsetWidth;
		var height = pop.offsetHeight;
		var left = rect.left + rect.width / 2 - width / 2;
		left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
		var below = rect.bottom + 10;
		var above = rect.top - height - 10;
		var top = below + height > window.innerHeight - margin && above > margin ? above : below;
		pop.dataset.side = top === above ? 'top' : 'bottom';
		pop.style.left = Math.round(left) + 'px';
		pop.style.top = Math.round(top) + 'px';
		pop.style.setProperty('--arrow-x', Math.round(rect.left + rect.width / 2 - left) + 'px');
	}

	function showPopover(el) {
		var text = helpText(el);
		if (!text) return;
		var sheet = loadStyles();
		if (!pop) {
			pop = document.createElement('div');
			pop.className = 'fq-pop';
			pop.setAttribute('role', 'tooltip');
			pop.id = 'fq-pop-' + (++popId);
			document.body.appendChild(pop);
		}
		if (popOwner && popOwner !== el) popOwner.setAttribute('aria-expanded', 'false');
		preparePopoverTarget(el);
		popOwner = el;
		pop.textContent = text;
		pop.classList.add('is-visible');
		el.setAttribute('aria-expanded', 'true');
		el.setAttribute('aria-describedby', pop.id);
		placePopover(el);
		if (!sheet.sheet) {
			sheet.addEventListener('load', function () { if (popOwner === el) placePopover(el); }, { once: true });
		}
	}

	function hidePopover() {
		sticky = false;
		if (pop) pop.classList.remove('is-visible');
		if (popOwner) popOwner.setAttribute('aria-expanded', 'false');
		popOwner = null;
	}

	document.addEventListener('click', function (event) {
		var trigger = event.target.closest('.help-link, #adminHelp, #spaceHelp, #helpSettings, [data-open-help]');
		if (trigger) {
			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
			var menu = document.getElementById('pDD');
			if (menu) menu.classList.remove('on');
			open(trigger);
		}
	}, true);

	document.addEventListener('click', function (event) {
		var dot = event.target.closest(HELP_SELECTOR);
		if (dot) {
			event.preventDefault();
			event.stopPropagation();
			if (popOwner === dot && sticky) {
				hidePopover();
			} else {
				showPopover(dot);
				sticky = true;
			}
			return;
		}
		if (pop && !event.target.closest('.fq-pop')) hidePopover();
	});

	document.addEventListener('mouseover', function (event) {
		if (sticky) return;
		var dot = event.target.closest(HELP_SELECTOR);
		if (dot) showPopover(dot);
	});

	document.addEventListener('mouseout', function (event) {
		if (sticky) return;
		if (event.target.closest(HELP_SELECTOR)) hidePopover();
	});

	document.addEventListener('focusin', function (event) {
		var dot = event.target.closest && event.target.closest(HELP_SELECTOR);
		if (dot && !sticky) showPopover(dot);
	});

	document.addEventListener('focusout', function (event) {
		if (!sticky && event.target.closest && event.target.closest(HELP_SELECTOR)) hidePopover();
	});

	document.addEventListener('keydown', function (event) {
		if (event.key === 'Escape') {
			if (root && !root.hidden) close();
			else hidePopover();
		}
		trapFocus(event);
	});

	window.addEventListener('resize', function () { if (popOwner) placePopover(popOwner); });
	window.addEventListener('scroll', function () { if (popOwner) placePopover(popOwner); }, true);

	loadStyles();

	window.FQHelp = { open: open, close: close };
})();
