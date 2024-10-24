let username = "";
let lobbyCode = "";
let socket;
let players = [];
let isCreator = false;
let currentQuestionIndex = 0;
let selectedQuestions = [];
let timer;
let timeLeft;
let playerScore = 0;
let hasAnswered = false;
const maxQuestions = 25;

function createWebSocket() {
    if (!socket) {
        // Använd rätt wss-länk
        socket = new WebSocket('wss://quiz-app-e608.onrender.com');

        socket.onopen = () => {
            console.log("WebSocket connection established");
        };

        socket.onmessage = (message) => {
            const data = JSON.parse(message.data);

            if (data.type === 'player-joined') {
                players = data.players;
                updatePlayersList();
            } else if (data.type === 'start-game') {
                if (data.questions) {
                    selectRandomQuestions(data.questions);
                    startQuiz();
                } else {
                    console.error("No questions received from server");
                }
            } else if (data.type === 'timer-update') {
                document.getElementById('timer').textContent = `Time Left: ${data.timeLeft}s`;
            } else if (data.type === 'correct-answer') {
                showCorrectAnswer(data.correct);
            } else if (data.type === 'leaderboard') {
                showLeaderboard(data.players);
            } else if (data.type === 'next-question') {
                loadNextQuestion();
            }
        };
    }
}

function waitForSocketConnection(callback) {
    setTimeout(() => {
        if (socket.readyState === 1) {
            console.log("WebSocket is open now.");
            if (callback != null) {
                callback();
            }
        } else {
            console.log("Waiting for WebSocket connection...");
            waitForSocketConnection(callback);
        }
    }, 100);
}

function showUsernameInput() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('username-screen').style.display = 'block';
}

function chooseUsername() {
    username = document.getElementById('username-input').value;
    if (username) {
        document.getElementById('username-screen').style.display = 'none';
        document.getElementById('options-screen').style.display = 'block';
    } else {
        alert("Please enter a username!");
    }
}

function showJoinLobby() {
    document.getElementById('options-screen').style.display = 'none';
    document.getElementById('join-lobby-screen').style.display = 'block';
}

function goBack() {
    document.getElementById('create-lobby-screen').style.display = 'none';
    document.getElementById('join-lobby-screen').style.display = 'none';
    document.getElementById('options-screen').style.display = 'block';
}

function createLobby() {
    createWebSocket();
    lobbyCode = generateLobbyCode();
    isCreator = true;
    document.getElementById('options-screen').style.display = 'none';
    document.getElementById('create-lobby-screen').style.display = 'block';
    document.getElementById('lobby-code').textContent = lobbyCode;

    if (isCreator) {
        document.getElementById('start-game-btn').style.display = 'block';
    }

    waitForSocketConnection(() => {
        socket.send(JSON.stringify({ type: 'create', code: lobbyCode, username: username }));
        players.push({ username: username, score: 0, isCreator: true });
        updatePlayersList();
    });
}

function joinLobby() {
    createWebSocket();
    lobbyCode = document.getElementById('lobby-input').value.toUpperCase();

    if (!lobbyCode) {
        alert("Please enter a valid lobby code!");
        return;
    }

    const joinLobbyScreen = document.getElementById('join-lobby-screen');
    const createLobbyScreen = document.getElementById('create-lobby-screen');

    if (joinLobbyScreen && createLobbyScreen) {
        joinLobbyScreen.style.display = 'none';
        createLobbyScreen.style.display = 'block';
    } else {
        console.error('Element not found');
        return;
    }

    document.getElementById('start-game-btn').style.display = 'none';
    document.getElementById('waiting-message').style.display = 'block';

    waitForSocketConnection(() => {
        socket.send(JSON.stringify({ type: 'join', code: lobbyCode, username: username }));
    });
}

function updatePlayersList() {
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';

    players.forEach(player => {
        const playerItem = document.createElement('li');
        playerItem.textContent = player.username;

        if (player.isCreator) {
            playerItem.classList.add('lobby-owner');
        } else {
            playerItem.classList.add('lobby-player');
        }

        playersList.appendChild(playerItem);
    });
}

function startGame() {
    if (!isCreator) {
        alert("Only the lobby creator can start the game!");
        return;
    }

    fetch('questions.json')
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                socket.send(JSON.stringify({ type: 'start-game', code: lobbyCode, questions: data }));
                selectRandomQuestions(data);
                startQuiz();
            } else {
                console.error("No questions received from server");
            }
        })
        .catch(err => console.error("Error loading questions: ", err));
}

function selectRandomQuestions(allQuestions) {
    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    selectedQuestions = shuffled.slice(0, maxQuestions);
}

function startQuiz() {
    currentQuestionIndex = 0;
    document.getElementById('create-lobby-screen').style.display = 'none';
    document.getElementById('quiz-screen').style.display = 'block';
    loadNextQuestion();
}

function loadNextQuestion() {
    if (currentQuestionIndex >= selectedQuestions.length) {
        showFinalLeaderboard();
        return;
    }

    const currentQuestion = selectedQuestions[currentQuestionIndex];
    document.getElementById('question-progress').textContent = `Round ${currentQuestionIndex + 1}/${selectedQuestions.length}`;
    document.getElementById('question-text').textContent = currentQuestion.question;
    const answerButtons = document.querySelectorAll('.answer-btn');
    answerButtons.forEach((button, index) => {
        button.textContent = currentQuestion.answers[index];
        button.onclick = () => submitAnswer(index);
        button.classList.remove('correct', 'selected', 'wrong');
        button.disabled = false;
    });

    hasAnswered = false;
    startTimer(15);
}

function submitAnswer(selected) {
    if (hasAnswered) return;

    const answerButtons = document.querySelectorAll('.answer-btn');
    answerButtons[selected].classList.add('selected');
    answerButtons.forEach(button => button.disabled = true);

    hasAnswered = true;

    const currentQuestion = selectedQuestions[currentQuestionIndex];
    if (selected === currentQuestion.correct) {
        playerScore += timeLeft * 10;
        updatePlayerScore(username, playerScore);
    } else {
        answerButtons[selected].classList.add('wrong');
    }
}

function updatePlayerScore(username, score) {
    players.forEach(player => {
        if (player.username === username) {
            player.score = score;
        }
    });
}

function startTimer(seconds) {
    timeLeft = seconds;
    document.getElementById('timer').textContent = `Time Left: ${timeLeft}s`;

    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').textContent = `Time Left: ${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(timer);
            showCorrectAnswer();
        }
    }, 1000);
}

function showCorrectAnswer() {
    const currentQuestion = selectedQuestions[currentQuestionIndex];
    const answerButtons = document.querySelectorAll('.answer-btn');
    answerButtons[currentQuestion.correct].classList.add('correct');

    setTimeout(() => {
        currentQuestionIndex++;
        showLeaderboard();
    }, 2000);
}

function showLeaderboard() {
    document.getElementById('quiz-screen').style.display = 'none';
    document.getElementById('leaderboard-screen').style.display = 'block';
    const leaderboardList = document.getElementById('leaderboard');
    leaderboardList.innerHTML = '';

    players.sort((a, b) => b.score - a.score);

    players.forEach((player, index) => {
        const playerItem = document.createElement('li');
        playerItem.textContent = `${index + 1}. ${player.username}: ${player.score} points`;
        leaderboardList.appendChild(playerItem);
    });

    setTimeout(() => {
        document.getElementById('leaderboard-screen').style.display = 'none';
        loadNextQuestion();
    }, 4000);
}

function showFinalLeaderboard() {
    alert("Quiz finished!");
}

function generateLobbyCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}



function showFinalLeaderboard() {
    alert("Quiz finished!");
}

function generateLobbyCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}











































