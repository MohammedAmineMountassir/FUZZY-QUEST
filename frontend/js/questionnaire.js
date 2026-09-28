const questions = [
    {
        text: "Dans quelle mesure êtes-vous satisfait de cette situation ?",
        type: "scale",
        answers: [
            "Très faible",
            "Faible",
            "Moyen",
            "Élevé",
            "Très élevé"
        ]
    },
    {
        text: "Quel est votre niveau de confiance dans cette situation ?",
        type: "scale",
        answers: [
            "Très faible",
            "Faible",
            "Moyen",
            "Élevé",
            "Très élevé"
        ]
    },
    {
        text: "Comment évaluez-vous l'importance de ce facteur ?",
        type: "scale",
        answers: [
            "Très faible",
            "Faible",
            "Moyenne",
            "Élevée",
            "Très élevée"
        ]
    },
    {
        text: "À quelle fréquence rencontrez-vous cette situation ?",
        type: "scale",
        answers: [
            "Jamais",
            "Rarement",
            "Parfois",
            "Souvent",
            "Toujours"
        ]
    },
    {
        text: "Quel niveau de risque associez-vous à cette situation ?",
        type: "scale",
        answers: [
            "Très faible",
            "Faible",
            "Moyen",
            "Élevé",
            "Très élevé"
        ]
    },
    {
        text: "Quel est votre niveau de confiance dans la gestion de cette situation ?",
        type: "scale",
        answers: [
            "Très faible",
            "Faible",
            "Moyen",
            "Élevé",
            "Très élevé"
        ]
    },
    {
        text: "Comment évaluez-vous la gravité de cette situation ?",
        type: "scale",
        answers: [
            "Très faible",
            "Faible",
            "Moyenne",
            "Élevée",
            "Très élevée"
        ]
    },
    {
        text: "Dans quelle mesure cette situation vous semble-t-elle importante ?",
        type: "scale",
        answers: [
            "Très faible",
            "Faible",
            "Moyenne",
            "Élevée",
            "Très élevée"
        ]
    },
    {
        text: "Comment évaluez-vous la probabilité que cette situation se produise ?",
        type: "scale",
        answers: [
            "Très faible",
            "Faible",
            "Moyenne",
            "Élevée",
            "Très élevée"
        ]
    },
    {
        text: "Quel est votre niveau de satisfaction global ?",
        type: "scale",
        answers: [
            "Très faible",
            "Faible",
            "Moyen",
            "Élevé",
            "Très élevé"
        ]
    },
    {
        text: "Comment évaluez-vous l'efficacité de la solution actuelle ?",
        type: "scale",
        answers: [
            "Très faible",
            "Faible",
            "Moyenne",
            "Élevée",
            "Très élevée"
        ]
    },
    {
        text: "Quel niveau d'amélioration serait nécessaire selon vous ?",
        type: "scale",
        answers: [
            "Très faible",
            "Faible",
            "Moyen",
            "Élevé",
            "Très élevé"
        ]
    }
];

let currentQuestion = 0;
const answers = new Array(questions.length).fill(null);

const welcomePage = document.getElementById("welcomePage");
const questionPage = document.getElementById("questionPage");
const finishPage = document.getElementById("finishPage");
const startButton = document.getElementById("startButton");
const previousButton = document.getElementById("previousButton");
const nextButton = document.getElementById("nextButton");
const restartButton = document.getElementById("restartButton");
const questionTitle = document.getElementById("questionTitle");
const questionTag = document.getElementById("questionTag");
const answersContainer = document.getElementById("answersContainer");
const questionNumber = document.getElementById("questionNumber");
const progressPercentage = document.getElementById("progressPercentage");
const progressFill = document.getElementById("progressFill");
const questionCount = document.getElementById("questionCount");

questionCount.textContent = `${questions.length} questions`;

startButton.addEventListener("click", () => {
    welcomePage.classList.add("hidden");
    questionPage.classList.remove("hidden");
    currentQuestion = 0;
    displayQuestion();
});

function displayQuestion() {
    const question = questions[currentQuestion];
    const total = questions.length;
    const number = currentQuestion + 1;
    questionTag.textContent = `Question ${number}`;
    questionTitle.textContent = question.text;
    const percentage = Math.round((number / total) * 100);
    questionNumber.textContent = `${number} / ${total}`;
    progressPercentage.textContent = `${percentage} %`;
    progressFill.style.width = `${percentage}%`;
    answersContainer.innerHTML = "";
    question.answers.forEach((answer, index) => {
        const option = document.createElement("div");
        option.classList.add("answer-option");
        if (answers[currentQuestion] === index) {
            option.classList.add("selected");
        }
        option.innerHTML = `
            <div class="answer-circle">
                ${answers[currentQuestion] === index ? "●" : "○"}
            </div>
            <span class="answer-label">
                ${answer}
            </span>
            <span class="answer-number">
                ${index + 1}
            </span>
        `;
        option.addEventListener("click", () => {
            selectAnswer(index);
        });
        answersContainer.appendChild(option);
    });
    previousButton.disabled = currentQuestion === 0;
    nextButton.disabled = answers[currentQuestion] === null;
    if (currentQuestion === total - 1) {
        nextButton.innerHTML = `Terminer ✓`;
    } else {
        nextButton.innerHTML = `Question suivante →`;
    }
}

function selectAnswer(index) {
    answers[currentQuestion] = index;
    displayQuestion();
}

nextButton.addEventListener("click", () => {
    if (answers[currentQuestion] === null) {
        return;
    }
    if (currentQuestion === questions.length - 1) {
        finishQuestionnaire();
        return;
    }
    currentQuestion++;
    displayQuestion();
});

previousButton.addEventListener("click", () => {
    if (currentQuestion > 0) {
        currentQuestion--;
        displayQuestion();
    }
});

function finishQuestionnaire() {
    questionPage.classList.add("hidden");
    finishPage.classList.remove("hidden");
    console.log("Réponses du participant :", answers);
}

restartButton.addEventListener("click", () => {
    answers.fill(null);
    currentQuestion = 0;
    finishPage.classList.add("hidden");
    welcomePage.classList.remove("hidden");
});