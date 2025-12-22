class PenaltyGame {
  constructor() {
    this.gameArea = document.getElementById('gameArea');
    this.goalZone = document.getElementById('goalZone');
    this.goalkeeper = document.getElementById('goalkeeper');
    this.ball = document.getElementById('ball');
    this.targetIndicator = document.getElementById('targetIndicator');
    this.dragIndicator = document.getElementById('dragIndicator');

    this.playerScoreEl = document.getElementById('playerScore');
    this.goalieScoreEl = document.getElementById('goalieScore');
    this.countdownEl = document.getElementById('countdown');
    this.statusEl = document.getElementById('status');
    this.attemptsEl = document.getElementById('attempts');
    this.restartBtn = document.getElementById('restartBtn');

    this.shotHistoryEl = document.getElementById('shotHistory');
    this.seriesWonEl = document.getElementById('seriesWon');
    this.bestStreakEl = document.getElementById('bestStreak');
    this.difficultySelect = document.getElementById('difficultySelect');

    // grade 3x5 (15 zonas) - só para IA
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
      shotZone: null,
      goalieZone: null,
      shotsHistory: [],
      currentStreak: 0,
      seriesWon: 0,
      bestStreak: 0,
      dragStartX: 0,
      dragStartY: 0,
      dragStartTime: 0,
      dragCurrentX: 0,
      dragCurrentY: 0,
      powerFactor: 1
    };

    this.aiConfig = {
      difficulty: 'medium',
      reactionDelayMs: 400,
      growMultiplier: 1,
      studyFactor: 0.4,
      historyWindow: 10
    };

    this.canVibrate = 'vibrate' in navigator;

    this.loadStatsFromStorage();
    this.init();
    this.updateStatsHUD();
  }

  init() {
    // EVENTOS DE ARRASTO COM preventDefault para desktop/mobile
    const preventDefault = (e) => e.preventDefault();

    this.gameArea.addEventListener('pointerdown', (e) => {
      preventDefault(e);
      this.onDragStart(e);
    });
    this.gameArea.addEventListener('pointermove', (e) => {
      preventDefault(e);
      this.onDragMove(e);
    });
    this.gameArea.addEventListener('pointerup', (e) => {
      preventDefault(e);
      this.onDragEnd(e);
    });
    this.gameArea.addEventListener('pointercancel', (e) => {
      preventDefault(e);
      this.onDragEnd(e);
    });

    // bloqueia scroll durante arrasto em mobile
    document.addEventListener('touchmove', preventDefault, { passive: false });
    document.addEventListener('touchstart', preventDefault, { passive: false });

    this.restartBtn.addEventListener('click', () => this.restart());

    if (this.difficultySelect) {
      this.difficultySelect.addEventListener('change', (e) =>
        this.changeDifficulty(e.target.value)
      );
    }

    this.changeDifficulty('medium');
    this.startNewAttempt();
  }

  changeDifficulty(level) {
    this.aiConfig.difficulty = level;

    if (level === 'easy') {
      this.aiConfig.reactionDelayMs = 550;
      this.aiConfig.growMultiplier = 0.8;
      this.aiConfig.studyFactor = 0.2;
    } else if (level === 'hard') {
      this.aiConfig.reactionDelayMs = 250;
      this.aiConfig.growMultiplier = 1.3;
      this.aiConfig.studyFactor = 0.6;
    } else {
      this.aiConfig.reactionDelayMs = 400;
      this.aiConfig.growMultiplier = 1.0;
      this.aiConfig.studyFactor = 0.4;
    }

    if (this.difficultySelect) {
      this.difficultySelect.value = level;
    }
  }

  loadStatsFromStorage() {
    const storedSeriesWon = localStorage.getItem('pg_seriesWon');
    const storedBestStreak = localStorage.getItem('pg_bestStreak');

    if (storedSeriesWon !== null) {
      this.gameState.seriesWon = parseInt(storedSeriesWon, 10) || 0;
    }
    if (storedBestStreak !== null) {
      this.gameState.bestStreak = parseInt(storedBestStreak, 10) || 0;
    }
  }

  saveStatsToStorage() {
    localStorage.setItem('pg_seriesWon', this.gameState.seriesWon.toString());
    localStorage.setItem('pg_bestStreak', this.gameState.bestStreak.toString());
  }

  updateStatsHUD() {
    if (!this.shotHistoryEl || !this.seriesWonEl || !this.bestStreakEl) return;

    if (this.gameState.shotsHistory.length === 0) {
      this.shotHistoryEl.textContent = 'Últimos chutes: -';
    } else {
      this.shotHistoryEl.textContent =
        'Últimos chutes: ' + this.gameState.shotsHistory.join(', ');
    }

    this.seriesWonEl.textContent = this.gameState.seriesWon;
    this.bestStreakEl.textContent = this.gameState.bestStreak;
  }

  // 10% por tentativa, escalado pela dificuldade
  getCurrentGrowFactor() {
    const attemptIndex = this.gameState.currentAttempt - 1;
    const base = 1 + 0.1 * attemptIndex;
    return base * this.aiConfig.growMultiplier;
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
          this.statusEl.textContent = 'Arraste para chutar!';
        }, 800);
      }
    }, 1000);
  }

  // ===== CONTROLES POR ARRASTO =====
  onDragStart(e) {
    if (!this.gameState.isPlaying) return;

    const rect = this.gameArea.getBoundingClientRect();
    this.gameState.dragStartX = e.clientX - rect.left;
    this.gameState.dragStartY = e.clientY - rect.top;
    this.gameState.dragStartTime = performance.now();
    this.gameState.dragCurrentX = this.gameState.dragStartX;
    this.gameState.dragCurrentY = this.gameState.dragStartY;

    this.showDragIndicator();
  }

  onDragMove(e) {
    if (!this.gameState.isPlaying || this.gameState.dragStartTime === 0) return;

    const rect = this.gameArea.getBoundingClientRect();
    this.gameState.dragCurrentX = e.clientX - rect.left;
    this.gameState.dragCurrentY = e.clientY - rect.top;

    this.updateDragIndicator();
  }

  onDragEnd(e) {
    if (!this.gameState.isPlaying || this.gameState.dragStartTime === 0) return;

    const dragTime = performance.now() - this.gameState.dragStartTime;
    const dragDistance = Math.hypot(
      this.gameState.dragCurrentX - this.gameState.dragStartX,
      this.gameState.dragCurrentY - this.gameState.dragStartY
    );

    // força: combinação de velocidade + distância
    const velocity = dragDistance / Math.max(dragTime, 50);
    let power = Math.max(0.8, Math.min(1.6, velocity * 2 + dragDistance * 0.001));

    this.gameState.dragStartTime = 0;
    this.hideDragIndicator();

    this.executeDragShot(power);
  }

  showDragIndicator() {
    this.dragIndicator.classList.add('active');
    this.dragIndicator.innerHTML = `
      <div class="drag-line" id="dragLine"></div>
      <div class="drag-arrow" id="dragArrow"></div>
      <div class="power-meter" id="powerMeter">
        <div class="power-fill" id="powerFill"></div>
      </div>
    `;
  }

  updateDragIndicator() {
    const dx = this.gameState.dragCurrentX - this.gameState.dragStartX;
    const dy = this.gameState.dragCurrentY - this.gameState.dragStartY;
    const length = Math.min(200, Math.hypot(dx, dy));
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = angleRad * 180 / Math.PI;

    const line = document.getElementById('dragLine');
    const arrow = document.getElementById('dragArrow');
    const fill = document.getElementById('powerFill');

    if (line && arrow && fill) {
      line.style.width = length + 'px';
      line.style.left = this.gameState.dragStartX + 'px';
      line.style.top = this.gameState.dragStartY + 'px';
      line.style.transform = `rotate(${angleDeg}deg)`;

      arrow.style.left =
        this.gameState.dragStartX + Math.cos(angleRad) * length + 'px';
      arrow.style.top =
        this.gameState.dragStartY + Math.sin(angleRad) * length + 'px';
      arrow.style.transform = `rotate(${angleDeg}deg) translateX(-50%)`;

      const previewPower = Math.max(0.8, Math.min(1.6, length * 0.007));
      fill.style.width = (previewPower * 50) + '%';
    }
  }

  hideDragIndicator() {
    this.dragIndicator.classList.remove('active');
    this.dragIndicator.innerHTML = '';
  }

  executeDragShot(power) {
    const gameRect = this.gameArea.getBoundingClientRect();
    const goalRect = this.goalZone.getBoundingClientRect();

    const dx = this.gameState.dragCurrentX - this.gameState.dragStartX;
    const dy = this.gameState.dragCurrentY - this.gameState.dragStartY;

    // distância inicial do centro do gol para risco de chute pra fora
    const goalCenterX = goalRect.left - gameRect.left + goalRect.width / 2;
    const goalCenterY = goalRect.top - gameRect.top + goalRect.height / 2;
    const distToGoal = Math.hypot(
      this.gameState.dragStartX - goalCenterX,
      this.gameState.dragStartY - goalCenterY
    );
    const outRisk = Math.min(1, distToGoal / (goalRect.width * 0.6));

    // chance de fora proporcional à distância
    if (Math.random() < outRisk * 0.3) {
      this.gameState.isPlaying = false;
      this.statusEl.textContent = 'Chute fraco/fora!';
      this.statusEl.style.color = '#f97316';
      this.gameState.currentStreak = 0;
      this.animateShot(gameRect, this.gameState.dragCurrentX + gameRect.left, this.gameState.dragCurrentY + gameRect.top);
      this.nextAttempt();
      return;
    }

    // mapeia para coordenada contínua dentro do gol
    let targetRelX = 0.5 + (dx / 800); // leve variação horizontal
    let targetRelY = 0.5 + (dy / 600) * 0.4; // arrastar pra cima = mais alto (y menor visual, mas aqui normalizamos)

    targetRelX = Math.max(0.05, Math.min(0.95, targetRelX));
    targetRelY = Math.max(0.05, Math.min(0.95, targetRelY));

    const targetX = goalRect.left - gameRect.left + targetRelX * goalRect.width;
    const targetY = goalRect.top - gameRect.top + targetRelY * goalRect.height;

    this.gameState.shotX = targetRelX;
    this.gameState.shotY = targetRelY;
    this.gameState.shotZone = this.getZoneFromCoords(targetRelX, targetRelY);
    this.gameState.isPlaying = false;
    this.gameState.powerFactor = power;

    // registra direção para IA
    let dir = 'C';
    if (targetRelX < 1/3) dir = 'E';
    else if (targetRelX > 2/3) dir = 'D';
    this.gameState.shotsHistory.push(dir);
    if (this.gameState.shotsHistory.length > 10) {
      this.gameState.shotsHistory.shift();
    }
    this.updateStatsHUD();

    this.targetIndicator.style.left = `${targetX - 12}px`;
    this.targetIndicator.style.top = `${targetY - 12}px`;
    this.targetIndicator.classList.add('active');

    this.animateShot(gameRect, targetX + gameRect.left, targetY + gameRect.top);
    setTimeout(() => this.goalieReaction(), 200);
  }

  animateShot(gameRect, targetX, targetY) {
    const startX = gameRect.width / 2;
    const startY = gameRect.height;
    const power = this.gameState.powerFactor || 1;

    this.ball.style.opacity = '1';
    this.ball.style.left = `${startX - 22}px`;
    this.ball.style.top = `${startY - 66}px`;

    const deltaX = targetX - (gameRect.left + startX);
    const deltaY = targetY - (gameRect.top + startY);
    const distance = Math.hypot(deltaX, deltaY);

    const baseDuration = Math.max(450, Math.min(850, distance * 0.65));
    const duration = baseDuration / power;

    const midX = deltaX * 0.5;
    const midY = deltaY * 0.5 - 40 * power;

    this.ball.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', offset: 0 },
        { transform: `translate(${midX}px, ${midY}px) rotate(450deg)`, offset: 0.5 },
        { transform: `translate(${deltaX}px, ${deltaY}px) rotate(900deg) scale(0.9)`, offset: 1 }
      ],
      {
        duration,
        easing: 'cubic-bezier(0.25,0.46,0.45,0.94)'
      }
    );
  }

  // ===== IA / ZONAS =====
  getZoneFromCoords(x, y) {
    let col = Math.floor(x / this.colWidth);
    let row = Math.floor(y / this.rowHeight);

    if (col < 0) col = 0;
    if (col > this.gridCols - 1) col = this.gridCols - 1;
    if (row < 0) row = 0;
    if (row > this.gridRows - 1) row = this.gridRows - 1;

    return row * this.gridCols + col + 1;
  }

  getNeighborZones(zone) {
    const neighbors = [zone];
    const row = Math.floor((zone - 1) / this.gridCols);
    const col = (zone - 1) % this.gridCols;

    if (col > 0) neighbors.push(zone - 1);
    if (col < this.gridCols - 1) neighbors.push(zone + 1);
    if (row > 0) neighbors.push(zone - this.gridCols);
    if (row < this.gridRows - 1) neighbors.push(zone + this.gridCols);

    return neighbors;
  }

  goalieReaction() {
    const shotZone = this.gameState.shotZone;

    const recent = this.gameState.shotsHistory.slice(-this.aiConfig.historyWindow);
    let countE = 0, countC = 0, countD = 0;
    recent.forEach((d) => {
      if (d === 'E') countE++;
      else if (d === 'D') countD++;
      else countC++;
    });

    let favoriteSide = null;
    if (recent.length > 0) {
      if (countE >= countC && countE >= countD) favoriteSide = 'left';
      else if (countD >= countE && countD >= countC) favoriteSide = 'right';
      else favoriteSide = 'center';
    }

    let chosenZone;
    if (!shotZone) {
      chosenZone = Math.floor(Math.random() * 15) + 1;
    } else {
      const neighbors = this.getNeighborZones(shotZone);
      const weighted = [];

      for (let i = 0; i < 6; i++) weighted.push(shotZone);
      neighbors
        .filter((z) => z !== shotZone)
        .forEach((z) => { for (let i = 0; i < 3; i++) weighted.push(z); });

      const allZones = Array.from({ length: 15 }, (_, i) => i + 1);
      allZones
        .filter((z) => !neighbors.includes(z))
        .forEach((z) => weighted.push(z));

      if (favoriteSide) {
        const boost = Math.max(1, Math.round(this.aiConfig.studyFactor * 10));
        const leftZones  = [1,2,6,7,11,12];
        const centerZones = [3,8,13];
        const rightZones = [4,5,9,10,14,15];

        const sideZones =
          favoriteSide === 'left' ? leftZones :
          favoriteSide === 'right' ? rightZones :
          centerZones;

        sideZones.forEach((z) => {
          for (let i = 0; i < boost; i++) weighted.push(z);
        });
      }

      chosenZone = weighted[Math.floor(Math.random() * weighted.length)];
    }

    this.gameState.goalieZone = chosenZone;

    this.goalkeeper.classList.remove(
      'goalkeeper-left',
      'goalkeeper-right',
      'goalkeeper-high',
      'goalkeeper-center',
      'goalkeeper-down'
    );

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

    const randomZone = this.gameState.goalieZone;
    const cls = spriteMap[randomZone];

    let translateX = -50;
    let translateY = -50;

    const index = randomZone - 1;
    const row = Math.floor(index / this.gridCols);
    const col = index % this.gridCols;

    if (row === 0) translateY = -68;
    else if (row === 2) translateY = -40;

    if (randomZone === 1 || randomZone === 6 || randomZone === 11) {
      translateX = -120;
    } else if (randomZone === 5 || randomZone === 10 || randomZone === 15) {
      translateX = 20;
    } else {
      if (col === 0) translateX = -85;
      else if (col === 1) translateX = -65;
      else if (col === 2) translateX = -50;
      else if (col === 3) translateX = -35;
      else if (col === 4) translateX = -15;
    }

    if (cls) this.goalkeeper.classList.add(cls);
    this.goalkeeper.style.transform = `translate(${translateX}%, ${translateY}%)`;

    setTimeout(() => this.checkGoal(), this.aiConfig.reactionDelayMs);
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

  getDefendedZonesForGoalieZone(zone) {
    switch (zone) {
      case 1:  return [1, 2];
      case 5:  return [5, 4];
      case 6:  return [6, 7];
      case 10: return [10, 9];
      case 11: return [11, 12];
      case 15: return [15, 14];
      default: return [zone];
    }
  }

  getInflatedGoalieRect(zone) {
    const base = this.getZoneRect(zone);
    let grow = this.getCurrentGrowFactor();

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

    const defendedZones = this.getDefendedZonesForGoalieZone(goalieZone);

    if (!defendedZones.includes(shotZone)) {
      this.gameState.playerScore++;
      this.playerScoreEl.textContent = this.gameState.playerScore;
      this.statusEl.textContent = 'GOL!';
      this.statusEl.style.color = '#10b981';
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
    this.statusEl.innerHTML =
      `${this.gameState.playerScore > this.gameState.goalieScore ? '🏆 VITÓRIA!' : '😤 Derrota!'} ` +
      `Final: ${this.gameState.playerScore} x ${this.gameState.goalieScore}`;
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
      goalieZone: null,
      shotsHistory: [],
      currentStreak: 0,
      seriesWon: this.gameState.seriesWon || 0,
      bestStreak: this.gameState.bestStreak || 0,
      dragStartX: 0,
      dragStartY: 0,
      dragStartTime: 0,
      dragCurrentX: 0,
      dragCurrentY: 0,
      powerFactor: 1
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

    this.updateStatsHUD();
    this.startCountdown();
  }
}

window.addEventListener('load', () => {
  new PenaltyGame();
});
