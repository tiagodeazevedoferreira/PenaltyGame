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

    // 11 zonas de chute
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

    // mapeamento zona -> sprite do goleiro
    this.zoneToGoalkeeperSprite = [
      'left',   // 0 Canto sup esq
      'left',   // 1 Esq superior
      'high',   // 2 Centro superior
      'right',  // 3 Dir superior
      'right',  // 4 Canto sup dir
      'left',   // 5 Esq média
      'center', // 6 Centro médio
      'right',  // 7 Dir média
      'left',   // 8 Esq inferior
      'down',   // 9 Chão centro
      'right'   // 10 Dir inferior
    ];

    this.shotSpots = [];

    this.gameState = {
      playerScore: 0,
      goalieScore: 0,
      currentAttempt: 1,
      totalAttempts: 5,
      countdown: 3,
      targetZoneIndex: null,
      difficulty: 0.3,
      isPlaying: false
    };

    this.createShotSpots();
    this.init();
  }

  init() {
    this.gameArea.addEventListener('pointerdown', (e) => this.onShootClick(e));
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
        setTimeout(() => (this.countdownEl.style.transform = 'scale(1)'), 150);
      } else {
        clearInterval(countdown);
        this.countdownEl.textContent = 'VAI!';
        this.countdownEl.style.color = '#10b981';

        setTimeout(() => {
          this.countdownEl.style.display = 'none';
          this.statusEl.textContent = 'Toque no gol para chutar!';
        }, 800);
      }
    }, 1000);
  }

  // clique/touch único define a direção
  onShootClick(e) {
    if (!this.gameState.isPlaying) return;

    const rect = this.gameArea.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Aceita apenas cliques na região do gol
    if (x < 0.05 || x > 0.95 || y < 0.05 || y > 0.45) return;

    // zona mais próxima
    const closest = this.zones.reduce(
      (acc, zone, idx) => {
        const dist = Math.hypot(x - zone.x, y - zone.y);
        return dist < acc.dist ? {idx, zone, dist} : acc;
      },
      {idx: null, zone: null, dist: Infinity}
    );

    this.gameState.targetZoneIndex = closest.idx;

    this.statusEl.textContent = 'CHUTE!';
    this.gameState.isPlaying = false;

    const goalRect = this.goalZone.getBoundingClientRect();
    const targetZone = closest.zone;
    const targetPxX = goalRect.left + targetZone.x * goalRect.width;
    const targetPxY = goalRect.top + targetZone.y * goalRect.height;

    // indicador de alvo
    this.targetIndicator.style.left = `${targetPxX - rect.left - 12}px`;
    this.targetIndicator.style.top = `${targetPxY - rect.top - 12}px`;
    this.targetIndicator.classList.add('active');

    // bola parte do centro inferior da área
    const startX = rect.width / 2;
    const startY = rect.height;

    this.ball.style.opacity = '1';
    this.ball.style.left = `${startX - 20}px`;
    this.ball.style.top = `${startY - 60}px`;

    const deltaX = targetPxX - (rect.left + startX);
    const deltaY = targetPxY - (rect.top + startY);

    this.ball.animate(
      [
        { transform: 'translate(0, 0)', offset: 0 },
        { transform: `translate(${deltaX}px, ${deltaY}px)`, offset: 1 }
      ],
      { duration: 500, easing: 'cubic-bezier(0.25,0.46,0.45,0.94)' }
    );

    setTimeout(() => this.goalieReaction(), 200);
  }

  // goleiro escolhe movimento com base na zona de chute
  goalieReaction() {
    const idx = this.gameState.targetZoneIndex;
    if (idx == null) return;

    const spriteKey = this.zoneToGoalkeeperSprite[idx];

    // limpa classes anteriores
    this.goalkeeper.classList.remove(
      'goalkeeper-left',
      'goalkeeper-right',
      'goalkeeper-high',
      'goalkeeper-center',
      'goalkeeper-down'
    );

    // aplica sprite e deslocamento conforme direção/altura
    let translateX = -50;
    let translateY = -50;

    if (spriteKey === 'left') {
      this.goalkeeper.classList.add('goalkeeper-left');
      translateX = -75;
    } else if (spriteKey === 'right') {
      this.goalkeeper.classList.add('goalkeeper-right');
      translateX = -25;
    } else if (spriteKey === 'high') {
      this.goalkeeper.classList.add('goalkeeper-high');
      translateY = -65;
    } else if (spriteKey === 'down') {
      this.goalkeeper.classList.add('goalkeeper-down');
      translateY = -40;
    } else {
      this.goalkeeper.classList.add('goalkeeper-center');
    }

    this.goalkeeper.style.transform = `translate(${translateX}%, ${translateY}%)`;

    setTimeout(() => {
      this.checkGoal(spriteKey);
    }, 400);
  }

  checkGoal(spriteKey) {
    const idx = this.gameState.targetZoneIndex;
    const targetZone = this.zones[idx];

    // posição horizontal do chute (0 esquerda, 1 direita)
    const targetX = targetZone.x;

    // posição efetiva do goleiro conforme sprite
    let goalieX;
    if (spriteKey === 'left') goalieX = 0.25;
    else if (spriteKey === 'right') goalieX = 0.75;
    else goalieX = 0.5; // high, center, down

    const distance = Math.abs(targetX - goalieX);
    const successChance = distance > 0.2; // margem pequena

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
      setTimeout(() => this.startNewAttempt(), 1500);
    } else {
      this.endGame();
    }
  }

  startNewAttempt() {
    this.gameState.currentAttempt++;
    this.gameState.countdown = 3;
    this.gameState.targetZoneIndex = null;

    this.ball.style.opacity = '0';
    this.targetIndicator.classList.remove('active');

    // volta goleiro para sprite central neutro
    this.goalkeeper.classList.remove(
      'goalkeeper-left',
      'goalkeeper-right',
      'goalkeeper-high',
      'goalkeeper-center',
      'goalkeeper-down'
    );
    this.goalkeeper.classList.add('goalkeeper-center');
    this.goalkeeper.style.transform = 'translate(-50%, -50%)';

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
      targetZoneIndex: null,
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

  createShotSpots() {
    const placeSpots = () => {
      this.shotSpots.forEach((el) => el.remove());
      this.shotSpots = [];

      const goalRect = this.goalZone.getBoundingClientRect();
      const gameRect = this.gameArea.getBoundingClientRect();

      this.zones.forEach((zone) => {
        const spot = document.createElement('div');
        spot.className = 'shot-spot';

        const x = gameRect.left + zone.x * goalRect.width + goalRect.left - gameRect.left;
        const y = gameRect.top + zone.y * goalRect.height + goalRect.top - gameRect.top;

        spot.style.left = `${x - 9}px`;
        spot.style.top = `${y - 9}px`;

        this.gameArea.appendChild(spot);
        this.shotSpots.push(spot);
      });
    };

    setTimeout(placeSpots, 50);
    window.addEventListener('resize', () => setTimeout(placeSpots, 50));
  }
}

window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
  new PenaltyGame();
});
