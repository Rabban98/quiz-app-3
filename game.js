let currentQuestionIndex = 0;
let questions = [];
let timer;
let playerScore = 0;

// Ladda frågor från questions.json
function loadQuestions() {
    fetch('/questions.json')
        .then(response => response.json())
        .then(data => {
            questions = data;
            loadQuestion(); // Ladda första frågan när data hämtats
        })
        .catch(error => console.error('Kunde inte ladda frågor:', error));
}

// Ladda en fråga
function loadQuestion() {
    const question = questions[currentQuestionIndex];
    document.getElementById('question-text').textContent = question.text;
    
    // Visa svarsalternativ
    for (let i = 0; i < 4; i++) {
        document.getElementsByClassName('answer-btn')[i].textContent = question.answers[i];
    }

    // Starta timer
    startTimer(30);
}

function startTimer(seconds) {
    let timeLeft = seconds;
    document.getElementById('timer').textContent = `Tid kvar: ${timeLeft}s`;

    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').textContent = `Tid kvar: ${timeLeft}s`;

        if (timeLeft === 0) {
            clearInterval(timer);
            showCorrectAnswer();
        }
    }, 1000);
}

function answer(selected) {
    clearInterval(timer);
    const question = questions[currentQuestionIndex];
    
    if (selected === question.correctAnswer) {
        document.getElementsByClassName('answer-btn')[selected].style.backgroundColor = 'green';
        playerScore += 100; // Exempelpoäng
    } else {
        document.getElementsByClassName('answer-btn')[selected].style.backgroundColor = 'red';
    }
    
    showCorrectAnswer();
}

function showCorrectAnswer() {
    const question = questions[currentQuestionIndex];
    document.getElementsByClassName('answer-btn')[question.correctAnswer].style.backgroundColor = 'green';

    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
            loadQuestion();
        } else {
            showLeaderboard();
        }
    }, 2000);
}

function showLeaderboard() {
    document.getElementById('game-screen').style.display = 'none';
    // Visa poäng eller avsluta spelet
}
