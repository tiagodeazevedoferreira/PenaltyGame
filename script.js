class PenaltyGame {

  constructor() {
    this.gameArea = document.getElementById('gameArea');
    this.goalZone = document.getElementById('goalZone');
    this.goalkeeper = document.getElementById('goalkeeper');
    this.ball = document.getElementById('ball');
    this.targetIndicator = document.getElementById('targetIndicator');
    this.playerScoreEl = document.getElementById('playerScore');
    this.goalieScoreEl = document.getElementById('goalieScore');
    this.countdownEl = document.getElementById('countdown');
    this.statusEl = document.getElementById('status');
    this.attemptsEl = document.getElementById('attempts');
    this.restartBtn = document.getElementById('restartBtn');

    // Configurações do jogo
    this.zones = [
      {x: 0.1, y: 0.1, name: 'Canto Sup Esq'},    // 0
      {x: 0.3, y: 0.1, name: 'Esq Superior'},     // 1
      {x: 0.5, y: 0.1, name: 'Centro Superior'},  // 2
      {x: 0.7, y: 0.1, name: 'Dir Superior'},     // 3
      {x: 0.9, y: 0.1, name: 'Canto Sup Dir'},    // 4
      {x: 0.1, y: 0.4, name: 'Esq Média'},        // 5
      {x: 0.5, y: 0.4, name: 'Centro'},           // 6
      {x: 0.9, y: 0.4, name: 'Dir Média'},        // 7
      {x: 0.1, y: 0.7, name: 'Esq Inferior'},     // 8
      {x: 0.5, y: 0.7, name: 'Chão Centro'},      // 9
      {x: 0.9, y: 0.7, name: 'Dir Inferior'}      // 10
    ];

    this.gameState = {
      playerScore: 0,
      goalieScore: 0,
      currentAttempt: 1,
      totalAttempts: 5,
      countdown: 3,
      isAiming: false,
      aimStartTime: 0,
      aimStartPos: {x: 0, y: 0},
      targetZone: null,
      difficulty: 0.3, // 30% chance goleiro acertar no início
      isPlaying: false
    };

    this.init();
  }

  init() {
    this.gameArea.addEventListener('pointerdown', (e) => this.startAim(e));
    this.gameArea.addEventListener('pointermove', (e) => this.updateAim(e));
    this.gameArea.addEventListener('pointerup', () => this.shoot());
    this.restartBtn.addEventListener('click', () => this.restart());

    this.startNewAttempt();
  }

  startCountdown() {
    this.gameState.isPlaying = true;
    this.countdownEl.textContent = '3';

    const countdown = setInterval(() => {
      this.gameState.countdown--;

      if (this.gameState.countdown > 0) {
        this.countdownEl.textContent = this.gameState.countdown;
        this.countdownEl.style.transform = 'scale(1.2)';
        setTimeout(() => this.countdownEl.style.transform = 'scale(1)', 150);
      } else {
        clearInterval(countdown);
        this.countdownEl.textContent = 'VAI!';
        this.countdownEl.style.color = '#10b981';

        setTimeout(() => {
          this.countdownEl.style.display = 'none';
          this.statusEl.textContent = 'Toque e arraste para mirar!';
        }, 800);
      }
    }, 1000);
  }

  startAim(e) {
    if (!this.gameState.isPlaying || this.gameState.isAiming) return;

    const rect = this.gameArea.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Verifica se está na zona do gol
    if (x >= 0.05 && x <= 0.95 && y >= 0.05 && y <= 0.45) {
      this.gameState.isAiming = true;
      this.gameState.aimStartTime = Date.now();
      this.gameState.aimStartPos = {x, y};

      // Encontra zona mais próxima
      this.gameState.targetZone = this.zones.reduce((closest, zone) => {
        const dist = Math.hypot(x - zone.x, y - zone.y);
        return dist < closest.dist ? {zone, dist} : closest;
      }, {zone: null, dist: Infinity}).zone;

      this.updateTargetIndicator();
      this.statusEl.textContent = 'Arraste para ajustar força...';
    }
  }

  updateAim(e) {
    if (!this.gameState.isAiming) return;

    const rect = this.gameArea.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Atualiza zona alvo
    this.gameState.targetZone = this.zones.reduce((closest, zone) => {
      const dist = Math.hypot(x - zone.x, y - zone.y);
      return dist < closest.dist ? {zone, dist} : closest;
    }, {zone: null, dist: Infinity}).zone;

    this.updateTargetIndicator();
  }

  updateTargetIndicator() {
    if (!this.gameState.targetZone) return;

    const rect = this.goalZone.getBoundingClientRect();
    const gameRect = this.gameArea.getBoundingClientRect();

    const left = gameRect.left + this.gameState.targetZone.x * rect.width + rect.left - gameRect.left;
    const top = gameRect.top + this.gameState.targetZone.y * rect.height + rect.top - gameRect.top;

    this.targetIndicator.style.left = `${left}px`;
    this.targetIndicator.style.top = `${top}px`;
    this.targetIndicator.classList.add('active');
  }

  shoot() {
    if (!this.gameState.isAiming || !this.gameState.targetZone) return;

    this.gameState.isAiming = false;
    this.targetIndicator.classList.remove('active');

    const holdTime = (Date.now() - this.gameState.aimStartTime) / 1000;
    const power = Math.min(holdTime / 2, 1.5); // Máx 1.5s = força máxima

    this.statusEl.textContent = 'CHUTE!';

    // Anima bola
    this.ball.style.left = '50%';
    this.ball.style.opacity = '1';
    this.ball.classList.add('flying');

    // Goleiro reage após 300ms
    setTimeout(() => this.goalieReaction(power), 300);

    this.gameState.isPlaying = false;
  }

  goalieReaction(power) {
    // Dificuldade gradativa (não usamos diretamente aqui, mas pode entrar na escolha futura)
    const goalieAccuracy = this.gameState.difficulty + (this.gameState.currentAttempt - 1) * 0.08;

    // Direções possíveis: esquerda, centro, direita
    const goaliePositions = ['left', 'center', 'right'];
    const goalieChoice = goaliePositions[Math.floor(Math.random() * goaliePositions.length)];

    // Limpa classes antigas
    this.goalkeeper.classList.remove('goalkeeper-left', 'goalkeeper-center', 'goalkeeper-right');

    // Aplica sprite e deslocamento conforme direção
    if (goalieChoice === 'left') {
      this.goalkeeper.classList.add('goalkeeper-left');
      this.goalkeeper.style.transform = 'translate(-80%, -50%)'; // pulo à esquerda
    } else if (goalieChoice === 'right') {
      this.goalkeeper.classList.add('goalkeeper-right');
      this.goalkeeper.style.transform = 'translate(-20%, -50%)'; // pulo à direita
    } else {
      this.goalkeeper.classList.add('goalkeeper-center');
      this.goalkeeper.style.transform = 'translate(-50%, -50%) translateY(-10px)'; // leve salto no centro
    }

    setTimeout(() => {
      this.checkGoal(goalieChoice, power);
    }, 500);
  }

  checkGoal(goalieChoice, power) {
    const targetX = this.gameState.targetZone.x;

    // Mapeia posições do goleiro para zonas horizontais
    const goalieZone = {left: 0.25, center: 0.5, right: 0.75}[goalieChoice];

    // Gol se: distância > precisão goleiro OU força alta
    const distance = Math.abs(targetX - goalieZone);
    const successChance = distance > 0.25 || power > 1.2;

    if (successChance && Math.random() > this.gameState.difficulty) {
      this.gameState.playerScore++;
      this.playerScoreEl.textContent = this.gameState.playerScore;
      this.statusEl.textContent = 'GOL!';
      this.statusEl.style.color = '#10b981';
    } else {
      this.gameState.goalieScore++;
      this.goalieScoreEl.textContent = this.gameState.goalieScore;
      this.statusEl.textContent = 'DEFESA!';
      this.statusEl.style.color = '#ef4444';
    }

    this.nextAttempt();
  }

  nextAttempt() {
    if (this.gameState.currentAttempt < this.gameState.totalAttempts) {
      setTimeout(() => this.startNewAttempt(), 2000);
    } else {
      this.endGame();
    }
  }

  startNewAttempt() {
    this.gameState.currentAttempt++;
    this.gameState.countdown = 3;
    this.gameState.targetZone = null;

    // Reset posições
    this.ball.style.opacity = '0';
    this.ball.classList.remove('flying');

    this.goalkeeper.classList.remove('goalkeeper-left', 'goalkeeper-center', 'goalkeeper-right');
    this.goalkeeper.classList.add('goalkeeper-center');
    this.goalkeeper.style.transform = 'translate(-50%, -50%)';

    this.targetIndicator.classList.remove('active');
    this.attemptsEl.textContent = this.gameState.currentAttempt;
    this.statusEl.textContent = 'Preparado...';
    this.statusEl.style.color = 'white';
    this.countdownEl.style.display = 'block';
    this.countdownEl.style.color = '#f59e0b';

    this.startCountdown();
  }

  endGame() {
    this.statusEl.innerHTML = `
      ${this.gameState.playerScore > this.gameState.goalieScore ? '🏆 VITÓRIA!' : '😤 Derrota!'}
      <br>Final: ${this.gameState.playerScore} x ${this.gameState.goalieScore}
    `;
    this.restartBtn.style.display = 'block';
  }

  restart() {
    this.gameState = {
      playerScore: 0,
      goalieScore: 0,
      currentAttempt: 0,
      totalAttempts: 5,
      countdown: 3,
      isAiming: false,
      aimStartTime: 0,
      aimStartPos: {x: 0, y: 0},
      targetZone: null,
      difficulty: 0.3,
      isPlaying: false
    };

    this.playerScoreEl.textContent = '0';
    this.goalieScoreEl.textContent = '0';
    this.attemptsEl.textContent = '1';
    this.statusEl.textContent = 'Nova série iniciada!';
    this.restartBtn.style.display = 'none';

    this.startNewAttempt();
  }
}

// Inicializa jogo quando DOM carregar
window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }

  new PenaltyGame();
});
