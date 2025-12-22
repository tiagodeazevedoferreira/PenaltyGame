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
      playerScore: 0, goalieScore: 0, currentAttempt: 1, totalAttempts: 5,
      countdown: 3, isPlaying: false,
      shotX: null, shotY: null, shotZone: null, goalieZone: null,
      shotsHistory: [], currentStreak: 0, seriesWon: 0, bestStreak: 0,
      dragStartX: 0, dragStartY: 0, dragStartTime: 0,
      dragCurrentX: 0, dragCurrentY: 0, powerFactor: 1
    };

    this.aiConfig = {
      difficulty: 'medium', reactionDelayMs: 400, growMultiplier: 1,
      studyFactor: 0.4, historyWindow: 10
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

    // bloqueia scroll durante arrasto
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
    if (this.difficultySelect) this.difficultySelect.value = level;
  }

  loadStatsFromStorage() {
    const storedSeriesWon = localStorage.getItem('pg_seriesWon');
    const storedBestStreak = localStorage.getItem('pg_bestStreak');
    if (storedSeriesWon !== null) this.gameState.seriesWon = parseInt(storedSeriesWon, 10) || 0;
    if (storedBestStreak !== null) this.gameState.bestStreak = parseInt(storedBestStreak, 10) || 0;
  }

  saveStatsToStorage() {
    localStorage.setItem('pg_seriesWon', this.gameState.seriesWon.toString());
    localStorage.setItem('pg_bestStreak', this.gameState.bestStreak.toString());
  }

  updateStatsHUD() {
    if (!this.shotHistoryEl || !this.seriesWonEl || !this.bestStreakEl) return;
    if (this.gameState.shotsHistory.length
