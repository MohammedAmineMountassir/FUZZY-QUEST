(function () {
    'use strict';
    var path = location.pathname;
    var admin = path === '/administration.html' || path === '/creer-modele.html';
    var section = new URLSearchParams(location.search).get('section') || 'researchers';
    var titleMap = {
        '/chercheur.html': 'Dashboard', '/creer-questionnaire.html': 'Nouveau questionnaire',
        '/groupes.html': 'Groupes', '/nouveau-groupe.html': 'Nouveau groupe',
        '/groupe.html': 'Groupe', '/bibliotheque.html': 'Bibliothèque de modèles',
        '/parametres.html': 'Paramètres', '/mon-espace.html': 'Mon espace',
        '/journal-chercheur.html': 'Journal d’activité', '/coadministrateurs.html': 'Coadministrateurs',
        '/creer-modele.html': 'Nouveau modèle'
    };
    var icons = {
        home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
        space: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h5"/>',
        settings: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
        users: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6"/>',
        mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
        file: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
    };
    function icon(name) { return '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">' + icons[name] + '</svg>'; }
    function link(href, label, glyph, active) { return '<a class="side-link' + (active ? ' active' : '') + '" href="' + href + '"><span>' + icon(glyph) + '</span>' + label + '</a>'; }
    function render() {
        var aside = document.querySelector('.sidebar');
        var topbar = document.querySelector('.workspace-topbar');
        if (!aside || !topbar) return;
        var nav;
        if (admin) {
            var current = path === '/creer-modele.html' ? 'templates' : section;
            nav = link('/administration.html?section=researchers', 'Chercheurs', 'users', current === 'researchers') +
                link('/administration.html?section=requests', 'Demandes de compte', 'mail', current === 'requests') +
                link('/administration.html?section=templates', 'Modèles', 'file', current === 'templates') +
                link('/administration.html?section=activity', 'Journal d’activité', 'clock', current === 'activity');
        } else {
            var active = path === '/mon-espace.html' ? 'space' : path === '/parametres.html' ? 'settings' : 'home';
            nav = link('/chercheur.html', 'Dashboard', 'home', active === 'home') +
                link('/mon-espace.html', 'Mon espace', 'space', active === 'space') +
                link('/parametres.html', 'Paramètres', 'settings', active === 'settings');
        }
        aside.innerHTML = '<a class="workspace-brand" href="' + (admin ? '/administration.html' : '/chercheur.html') + '"><img src="/LOGO_FQ.png" alt=""><span><b>FUZZY-QUEST</b><small>Quest For Truth</small></span></a><nav aria-label="Navigation principale">' + nav + '</nav>' +
            '<div class="sidebar-bottom"><button class="side-link help-link" type="button"><span>' + icon('clock') + '</span>Aide &amp; support</button></div>';
        var title = titleMap[path] || 'FUZZY-QUEST';
        if (path === '/groupe.html') title = document.getElementById('pageContext')?.textContent || 'Groupe';
        var context = topbar.querySelector('.workspace-context');
        if (context) context.innerHTML = '<span class="page-context-title">' + title + '</span>';
        var area = topbar.querySelector('.account-area');
        if (area) area.innerHTML = '<button class="account-trigger" type="button" aria-label="Ouvrir le menu du compte"><span class="avatar av">--</span><span class="account-copy"><b class="account-name"></b><small>' + (admin ? 'Administrateur' : 'Chercheur') + '</small></span><span class="account-chevron" aria-hidden="true">⌄</span></button><div class="account-menu" id="pDD"><div class="account-menu-head"><b class="account-name"></b><small class="account-email"></small></div><button type="button" class="help-link">Aide &amp; support</button><button type="button" class="out">Se déconnecter</button></div>';
    }
    render();
    window.addEventListener('group-name-updated', function (event) {
        var label = event.detail && event.detail.name;
        if (label) { var context = document.querySelector('.workspace-context'); if (context) context.innerHTML = '<span class="page-context-title">' + label + '</span>'; }
    });
})();
