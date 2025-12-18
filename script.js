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

    // grade 3x5 (15 zonas)
    this.gridCols = 5;
    this.gridRows = 3;
    this.colWidth = 1 / this.gridCols;
    this.rowHeight = 1 / this.gridRows;

    this.gameState = {
      playerScore: 0,
      goalieScore: 0,
      currentAttempt: 1,
      totalAttempts: 5,
      countdown: 3,
      isPlaying: false,
      shotX: null,
      shotY: null,
      shotZone: null,   // 1..15
      goalieZone: null  // 1..15
    };

    this.zoneOverlays = [];

    this.init();
    this.createZoneOverlays();
  }

  init() {
    this.gameArea.addEventListener('pointerdown', (e) => this.onShootClick(e));
    this.restartBtn.addEventListener('click', () => this.restart());
    this.startNewAttempt();
  }

  // 10% por tentativa
  getCurrentGrowFactor() {
    const attemptIndex = this.gameState.currentAttempt - 1;
    return 1 + 0.1 * attemptIndex;
  }

  startCountdown() {
    this.gameState.isPlaying = true;
    this.countdownEl.style.display = 'block';
    this.countdownEl.style.color = '#f59e0b';
    this.gameState.countdown = 3;
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
          this.statusEl.textContent = 'Toque em qualquer ponto do gol.';
        }, 800);
      }
    }, 1000);
  }

  onShootClick(e) {
    if (!this.gameState.isPlaying) return;

    const gameRect = this.gameArea.getBoundingClientRect();
    const goalRect = this.goalZone.getBoundingClientRect();
    const clickX = e.clientX;
    const clickY = e.clientY;

    const withinGoal =
      clickX >= goalRect.left &&
      clickX <= goalRect.right &&
      clickY >= goalRect.top &&
      clickY <= goalRect.bottom;

    if (!withinGoal) {
      // chute ruim / fora
      this.gameState.isPlaying = false;
      this.statusEl.textContent = 'Chute fora!';
      this.statusEl.style.color = '#f97316';
      this.animateShot(gameRect, clickX, clickY);
      this.nextAttempt();
      return;
    }

    // normalizado dentro do gol
    const relX = (clickX - goalRect.left) / goalRect.width;
    const relY = (clickY - goalRect.top) / goalRect.height;

    this.gameState.shotX = relX;
    this.gameState.shotY = relY;
    this.gameState.shotZone = this.getZoneFromCoords(relX, relY);
    this.gameState.isPlaying = false;

    // indicador
    this.targetIndicator.style.left = `${clickX - gameRect.left - 12}px`;
    this.targetIndicator.style.top = `${clickY - gameRect.top - 12}px`;
    this.targetIndicator.classList.add('active');

    this.animateShot(gameRect, clickX, clickY);
    setTimeout(() => this.goalieReaction(), 200);
  }

  animateShot(gameRect, targetX, targetY) {
    const startX = gameRect.width / 2;
    const startY = gameRect.height;
    this.ball.style.opacity = '1';
    this.ball.style.left = `${startX - 20}px`;
    this.ball.style.top = `${startY - 60}px`;

    const deltaX = targetX - (gameRect.left + startX);
    const deltaY = targetY - (gameRect.top + startY);

    this.ball.animate(
      [
        { transform: 'translate(0, 0)', offset: 0 },
        { transform: `translate(${deltaX}px, ${deltaY}px)`, offset: 1 }
      ],
      { duration: 500, easing: 'cubic-bezier(0.25,0.46,0.45,0.94)' }
    );
  }

  getZoneFromCoords(x, y) {
    let col = Math.floor(x / this.colWidth);
    let row = Math.floor(y / this.rowHeight);
    if (col < 0) col = 0;
    if (col > this.gridCols - 1) col = this.gridCols - 1;
    if (row < 0) row = 0;
    if (row > this.gridRows - 1) row = this.gridRows - 1;
    return row * this.gridCols + col + 1; // 1..15
  }

  goalieReaction() {
    // prioridades
    const priority1 = [6, 1, 10, 15];
    const priority2 = [7, 12, 9, 14];
    const priority3 = [1, 2, 4, 5];
    const allZones = Array.from({ length: 15 }, (_, i) => i + 1);

    const p1 = new Set(priority1);
    const p2 = new Set(priority2);
    const p3 = new Set(priority3);

    const priority4 = allZones.filter((z) => !p1.has(z) && !p2.has(z) && !p3.has(z));

    const weighted = [];
    const pushWithWeight = (arr, w) => {
      arr.forEach((z) => {
        for (let i = 0; i < w; i++) weighted.push(z);
      });
    };

    pushWithWeight(priority1, 4);
    pushWithWeight(priority2, 3);
    pushWithWeight(priority3, 2);
    pushWithWeight(priority4, 1);

    const randomZone = weighted[Math.floor(Math.random() * weighted.length)];
    this.gameState.goalieZone = randomZone;

    // limpa sprites
    this.goalkeeper.classList.remove(
      'goalkeeper-left',
      'goalkeeper-right',
      'goalkeeper-high',
      'goalkeeper-center',
      'goalkeeper-down'
    );

    // sprites por zona
    const spriteMap = {
      1: 'goalkeeper-left',
      2: 'goalkeeper-left',
      3: 'goalkeeper-high',
      4: 'goalkeeper-right',
      5: 'goalkeeper-right',
      6: 'goalkeeper-left',
      7: 'goalkeeper-left',
      8: 'goalkeeper-center',
      9: 'goalkeeper-right',
      10: 'goalkeeper-right',
      11: 'goalkeeper-left',
      12: 'goalkeeper-left',
      13: 'goalkeeper-down',
      14: 'goalkeeper-right',
      15: 'goalkeeper-right'
    };

    const cls = spriteMap[randomZone];

    let translateX = -50;
    let translateY = -50;

    const index = randomZone - 1;
    const row = Math.floor(index / this.gridCols);
    const col = index % this.gridCols;

    // altura básica por linha
    if (row === 0) translateY = -68;
    else if (row === 2) translateY = -40;

    // zonas de borda: mão sobrepondo a trave
    if (randomZone === 1 || randomZone === 6 || randomZone === 11) {
      translateX = -110; // mais para fora da esquerda
    } else if (randomZone === 5 || randomZone === 10 || randomZone === 15) {
      translateX = 10;   // mais para fora da direita
    } else {
      // zonas internas com leve ajuste
      if (col === 0) translateX = -80;
      else if (col === 1) translateX = -65;
      else if (col === 2) translateX = -50;
      else if (col === 3) translateX = -35;
      else if (col === 4) translateX = -20;
    }

    if (cls) this.goalkeeper.classList.add(cls);
    this.goalkeeper.style.transform = `translate(${translateX}%, ${translateY}%)`;

    setTimeout(() => this.checkGoal(), 400);
  }

  getZoneRect(zone) {
    const index = zone - 1;
    const row = Math.floor(index / this.gridCols);
    const col = index % this.gridCols;
    const minX = col * this.colWidth;
    const maxX = (col + 1) * this.colWidth;
    const minY = row * this.rowHeight;
    const maxY = (row + 1) * this.rowHeight;
    return { minX, maxX, minY, maxY };
  }

  getInflatedGoalieRect(zone) {
    const base = this.getZoneRect(zone);
    let grow = this.getCurrentGrowFactor();

    // bordas ganham mais alcance lógico
    const borderZones = new Set([1, 6, 11, 5, 10, 15]);
    if (borderZones.has(zone)) {
      grow *= 1.2;
    }

    const centerX = (base.minX + base.maxX) / 2;
    const centerY = (base.minY + base.maxY) / 2;
    const halfWidth = (base.maxX - base.minX) / 2 * grow;
    const halfHeight = (base.maxY - base.minY) / 2 * grow;

    let minX = centerX - halfWidth;
    let maxX = centerX + halfWidth;
    let minY = centerY - halfHeight;
    let maxY = centerY + halfHeight;

    minX = Math.max(0, minX);
    maxX = Math.min(1, maxX);
    minY = Math.max(0, minY);
    maxY = Math.min(1, maxY);

    return { minX, maxX, minY, maxY };
  }

  checkGoal() {
    const { shotX, shotY, shotZone, goalieZone } = this.gameState;

    if (shotX == null || shotY == null || !shotZone || !goalieZone) {
      this.nextAttempt();
      return;
    }

    const rect = this.getInflatedGoalieRect(goalieZone);
    const defended =
      shotX >= rect.minX &&
      shotX <= rect.maxX &&
      shotY >= rect.minY &&
      shotY <= rect.maxY;

    if (defended) {
      this.gameState.goalieScore++;
      this.goalieScoreEl.textContent = this.gameState.goalieScore;
      this.statusEl.textContent = 'DEFESA!';
      this.statusEl.style.color = '#ef4444';
    } else {
      this.gameState.playerScore++;
      this.playerScoreEl.textContent = this.gameState.playerScore;
      this.statusEl.textContent = 'GOL!';
      this.statusEl.style.color = '#10b981';
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
    this.gameState.shotX = null;
    this.gameState.shotY = null;
    this.gameState.shotZone = null;
    this.gameState.goalieZone = null;

    if (this.gameState.currentAttempt > 1) {
      this.gameState.currentAttempt++;
    }

    this.ball.style.opacity = '0';
    this.targetIndicator.classList.remove('active');

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

    this.startCountdown();
  }

  endGame() {
    this.statusEl.innerHTML = `
${this.gameState.playerScore > this.gameState.goalieScore ? '🏆 VITÓRIA!' : '😤 Derrota!'}
Final: ${this.gameState.playerScore} x ${this.gameState.goalieScore}
    `;
    this.restartBtn.style.display = 'block';
  }

  restart() {
    this.gameState = {
      playerScore: 0,
      goalieScore: 0,
      currentAttempt: 1,
      totalAttempts: 5,
      countdown: 3,
      isPlaying: false,
      shotX: null,
      shotY: null,
      shotZone: null,
      goalieZone: null
    };

    this.playerScoreEl.textContent = '0';
    this.goalieScoreEl.textContent = '0';
    this.attemptsEl.textContent = '1';
    this.statusEl.textContent = 'Nova série iniciada!';
    this.statusEl.style.color = 'white';
    this.restartBtn.style.display = 'none';

    this.goalkeeper.classList.remove(
      'goalkeeper-left',
      'goalkeeper-right',
      'goalkeeper-high',
      'goalkeeper-center',
      'goalkeeper-down'
    );
    this.goalkeeper.classList.add('goalkeeper-center');
    this.goalkeeper.style.transform = 'translate(-50%, -50%)';

    this.ball.style.opacity = '0';
    this.targetIndicator.classList.remove('active');

    this.startCountdown();
  }

  createZoneOverlays() {
    const makeOverlays = () => {
      this.zoneOverlays.forEach((el) => el.remove());
      this.zoneOverlays = [];

      const goalRect = this.goalZone.getBoundingClientRect();
      const gameRect = this.gameArea.getBoundingClientRect();

      const toPxRect = (minX, maxX, minY, maxY) => {
        const x = goalRect.left - gameRect.left + minX * goalRect.width;
        const y = goalRect.top - gameRect.top + minY * goalRect.height;
        const w = (maxX - minX) * goalRect.width;
        const h = (maxY - minY) * goalRect.height;
        return { x, y, w, h };
      };

      for (let zone = 1; zone <= 15; zone++) {
        const base = this.getZoneRect(zone);
        const { x, y, w, h } = toPxRect(base.minX, base.maxX, base.minY, base.maxY);
        const div = document.createElement('div');
        div.className = 'zone-overlay';

        const col = (zone - 1) % this.gridCols;
        const colors = [
          'rgba(59,130,246,0.18)',
          'rgba(56,189,248,0.18)',
          'rgba(16,185,129,0.18)',
          'rgba(251,191,36,0.18)',
          'rgba(239,68,68,0.18)'
        ];
        div.style.backgroundColor = colors[col];

        div.style.left = `${x}px`;
        div.style.top = `${y}px`;
        div.style.width = `${w}px`;
        div.style.height = `${h}px`;

        this.gameArea.appendChild(div);
        this.zoneOverlays.push(div);
      }
    };

    setTimeout(makeOverlays, 50);
    window.addEventListener('resize', () => setTimeout(makeOverlays, 50));
  }
}

window.addEventListener('load', () => {
  new PenaltyGame();
});
