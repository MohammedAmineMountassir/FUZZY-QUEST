(function () {
    document.addEventListener('DOMContentLoaded', function () {
        var b = document.getElementById('helpSettings');
        if (b) b.addEventListener('click', function (e) {
            e.preventDefault();
            alert('Groupes : participants et diffusion. Co-administrateurs : collaboration avec des chercheurs. Journal : historique des actions de votre compte.')
        })
    })
})();
