const toggleBtn = document.getElementById('toggle-pw');
const pwInput = document.getElementById('password');

toggleBtn.addEventListener('click', () => {
const show = pwInput.type === 'password';

pwInput.type = show ? 'text' : 'password';
toggleBtn.textContent = show ? 'Masquer' : 'Afficher';
});

const form = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');

form.addEventListener('submit', (e) => {
e.preventDefault();

const email = document.getElementById('email').value.trim();
const password = pwInput.value;

if (!email || !password) {
errorMsg.textContent = "Merci de remplir tous les champs.";
return;
}

if (!email.includes('@')) {
errorMsg.textContent = "Adresse e-mail invalide.";
return;
}

errorMsg.textContent = "";
errorMsg.style.color = 'var(--accent-2)';
errorMsg.textContent = "Connexion réussie (démo — pas de backend relié).";
});
