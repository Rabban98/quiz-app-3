const WebSocket = require('ws');
const port = process.env.PORT || 8080; // Render tillhandahåller PORT via environment variables
const server = new WebSocket.Server({ port: port });

let lobbies = {}; // Lagrar lobbys och spelare

server.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'create') {
            lobbies[data.code] = { 
                players: [{ username: data.username, isCreator: true, answered: false, score: 0 }],
                sockets: [ws],
                questions: [],
                currentQuestionIndex: 0,
                timer: null,
                timeLeft: 15
            };
            sendLobbyUpdate(data.code);
        }

        if (data.type === 'join') {
            if (lobbies[data.code]) {
                console.log(`${data.username} joined lobby ${data.code}`);
                lobbies[data.code].players.push({ username: data.username, isCreator: false, answered: false, score: 0 });
                lobbies[data.code].sockets.push(ws);
                sendLobbyUpdate(data.code);
            } else {
                console.log("Invalid lobby code:", data.code);
                ws.send(JSON.stringify({ type: 'invalid-code' }));
            }
        }

        if (data.type === 'start-game') {
            if (lobbies[data.code]) {
                lobbies[data.code].questions = data.questions;
                sendGameStart(data.code);
                startTimer(data.code);
            }
        }

        if (data.type === 'player-answered') {
            handlePlayerAnswer(data.code, data.username, data.selectedAnswer, data.timeLeft);
        }
    });
});

function sendLobbyUpdate(lobbyCode) {
    const players = lobbies[lobbyCode].players;
    lobbies[lobbyCode].sockets.forEach(socket => {
        socket.send(JSON.stringify({ type: 'player-joined', players }));
    });
}

function sendGameStart(lobbyCode) {
    const sockets = lobbies[lobbyCode].sockets;
    const currentQuestion = lobbies[lobbyCode].questions[lobbies[lobbyCode].currentQuestionIndex];
    sockets.forEach(socket => {
        socket.send(JSON.stringify({ type: 'start-game', question: currentQuestion }));
    });
}

function handlePlayerAnswer(lobbyCode, username, selectedAnswer, timeLeft) {
    const player = lobbies[lobbyCode].players.find(p => p.username === username);
    const currentQuestion = lobbies[lobbyCode].questions[lobbies[lobbyCode].currentQuestionIndex];

    if (selectedAnswer === currentQuestion.correct) {
        const points = timeLeft * 10;  // Poäng baserat på hur snabbt man svarade rätt
        player.score += points;
    } else {
        player.score += 0; // Inget poäng om svaret är fel
    }

    const allAnswered = lobbies[lobbyCode].players.every(player => player.answered);

    if (allAnswered) {
        clearInterval(lobbies[lobbyCode].timer);
        showCorrectAnswer(lobbyCode);
    }
}

function startTimer(lobbyCode) {
    lobbies[lobbyCode].timeLeft = 15;
    lobbies[lobbyCode].timer = setInterval(() => {
        lobbies[lobbyCode].timeLeft--;

        // Skicka uppdaterad tid till alla spelare
        lobbies[lobbyCode].sockets.forEach(socket => {
            socket.send(JSON.stringify({ type: 'timer-update', timeLeft: lobbies[lobbyCode].timeLeft }));
        });

        if (lobbies[lobbyCode].timeLeft <= 0) {
            clearInterval(lobbies[lobbyCode].timer);
            showCorrectAnswer(lobbyCode);
        }
    }, 1000);
}

function showCorrectAnswer(lobbyCode) {
    const currentQuestion = lobbies[lobbyCode].questions[lobbies[lobbyCode].currentQuestionIndex];
    lobbies[lobbyCode].sockets.forEach(socket => {
        socket.send(JSON.stringify({ type: 'correct-answer', correct: currentQuestion.correct }));
    });

    setTimeout(() => {
        showLeaderboard(lobbyCode);
    }, 2000); // Visa rätt svar i 2 sekunder
}

function showLeaderboard(lobbyCode) {
    const players = lobbies[lobbyCode].players;
    players.sort((a, b) => b.score - a.score);

    lobbies[lobbyCode].sockets.forEach(socket => {
        socket.send(JSON.stringify({ type: 'leaderboard', players }));
    });

    setTimeout(() => {
        loadNextQuestion(lobbyCode);
    }, 3000); // Visa leaderboard i 3 sekunder
}

function loadNextQuestion(lobbyCode) {
    lobbies[lobbyCode].currentQuestionIndex++;
    if (lobbies[lobbyCode].currentQuestionIndex >= lobbies[lobbyCode].questions.length) {
        endGame(lobbyCode);
    } else {
        lobbies[lobbyCode].players.forEach(player => player.answered = false);
        startTimer(lobbyCode);
        const currentQuestion = lobbies[lobbyCode].questions[lobbies[lobbyCode].currentQuestionIndex];
        lobbies[lobbyCode].sockets.forEach(socket => {
            socket.send(JSON.stringify({ type: 'next-question', question: currentQuestion }));
        });
    }
}

function endGame(lobbyCode) {
    lobbies[lobbyCode].sockets.forEach(socket => {
        socket.send(JSON.stringify({ type: 'game-over' }));
    });
}




























