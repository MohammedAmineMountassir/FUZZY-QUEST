document.querySelectorAll('.av,.who').forEach(function (el) {
	el.addEventListener('click', function (e) {
		e.stopPropagation();
		document.getElementById('pDD').classList.toggle('on');
	});
});

document.addEventListener('click', function () {
	document.getElementById('pDD').classList.remove('on');
});

document.getElementById('pOvl').addEventListener('click', function (e) {
	if (e.target === this) this.classList.remove('on');
});