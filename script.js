// Get references to DOM elements
const game = document.getElementById('game');
const scoreDisplay = document.getElementById('score');
const bin = document.getElementById('bin');
const livesDisplay = document.getElementById('lives');

// Get the jerrycan image element by its ID
const jerrycan = document.getElementById('jerrycan');

// If jerrycan exists, set its image to water-can-transparent.png
// Make sure your HTML uses <img id="jerrycan"> for this to work
if (jerrycan) {
  jerrycan.src = '/img/water-can-transparent.png'; // Path to your jerry can image
}

// Initialize game state
let score = 0;   // Player's score
let binModes = ['recycle', 'waste'];
let binModeIndex = 0;
let binMode = binModes[binModeIndex];   // Current bin mode
let paused = false; // Game pause state
let fallIntervals = []; // Store all fall intervals
let pausedItems = []; // Store paused items
let lives = 3;

// Show lives as jerry cans
function updateLives() {
  livesDisplay.innerHTML = '';
  for (let i = 0; i < lives; i++) {
    const life = document.createElement('div');
    life.className = 'life-jerrycan';
    livesDisplay.appendChild(life);
  }
}
updateLives();

// Toggle bin mode on right-click (cycle through recycle, waste)
game.addEventListener('contextmenu', e => {
  e.preventDefault();

  // Cycle bin mode
  binModeIndex = (binModeIndex + 1) % binModes.length;
  binMode = binModes[binModeIndex];

  // Update bin display and color
  bin.textContent = binMode.charAt(0).toUpperCase() + binMode.slice(1);

  // Set bin color to match trash type
  if (binMode === 'recycle') {
    bin.style.backgroundColor = '#ffc600'; // yellow for recycle
    bin.style.color = '#222';
    bin.style.borderColor = '#ffc600';
  } else if (binMode === 'waste') {
    bin.style.backgroundColor = '#333333'; // dark for waste
    bin.style.color = '#fff';
    bin.style.borderColor = '#333333';
  }
  // Jerrycan is always visible, no display toggling
});

// Move bin and jerry can with mouse
game.addEventListener('mousemove', e => {
  const rect = game.getBoundingClientRect();

  // Position bin relative to mouse
  bin.style.left = `${e.clientX - rect.left - 40}px`;
  bin.style.top  = `${e.clientY - rect.top - 20}px`;

  // Move jerry can horizontally with mouse, keep at bottom
  const jerrycanWidth = jerrycan.offsetWidth || 48;
  jerrycan.style.left = `${Math.min(Math.max(e.clientX - rect.left - jerrycanWidth / 2, 0), game.clientWidth - jerrycanWidth)}px`;
});

// Listen for Escape key to toggle pause/unpause
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!paused) {
      // First press: pause game, stop all intervals, store items
      paused = true;
      fallIntervals.forEach(clearInterval);
      fallIntervals = [];
      // Store all falling items currently in the DOM
      pausedItems = Array.from(document.querySelectorAll('.falling'));
    } else {
      // Second press: unpause game, respawn all paused items
      paused = false;
      pausedItems.forEach(item => resumeFalling(item));
      pausedItems = [];
    }
  }
});

// Resume falling for a paused item
function resumeFalling(item) {
  // Continue falling animation for the given item
  const fall = setInterval(() => {
    if (paused) return;

    const currentTop = parseInt(item.style.top);

    item.style.top = `${currentTop + 3}px`;

    const binRect  = bin.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const jerrycanRect = jerrycan.getBoundingClientRect();

    // Check if item overlaps with bin
    const overlap = (
      !(
        itemRect.right  < binRect.left  ||
        itemRect.left   > binRect.right ||
        itemRect.bottom < binRect.top   ||
        itemRect.top    > binRect.bottom
      )
    );

    // Check if water droplet overlaps with jerry can (always enabled)
    const waterCollected = (
      item.dataset.type === 'water' &&
      !(itemRect.right  < jerrycanRect.left  ||
        itemRect.left   > jerrycanRect.right ||
        itemRect.bottom < jerrycanRect.top   ||
        itemRect.top    > jerrycanRect.bottom)
    );

    // Only lose a life if garbage passes below the bottom of the jerrycan
    if (currentTop > (jerrycan.offsetTop + jerrycan.offsetHeight)) {
      if (item.dataset.type === 'trash-recycle' || item.dataset.type === 'trash-waste') {
        lives--;
        updateLives();
        if (lives <= 0) {
          showGameOver();
          return;
        }
      }
      item.remove();
      clearInterval(fall);
      fallIntervals = fallIntervals.filter(f => f !== fall);
      return;
    }

    if (overlap) {
      // Increase score if correct bin is used
      if (
        (item.dataset.type === 'trash-recycle' && binMode === 'recycle') ||
        (item.dataset.type === 'trash-waste'   && binMode === 'waste')
      ) {
        score++;
        scoreDisplay.textContent = `Score: ${score}`;
      }
      item.remove();
      clearInterval(fall);
      fallIntervals = fallIntervals.filter(f => f !== fall);

    } else if (waterCollected) {
      // Increase score for collecting water with jerry can
      score++;
      scoreDisplay.textContent = `Score: ${score}`;
      item.remove();
      clearInterval(fall);
      fallIntervals = fallIntervals.filter(f => f !== fall);
    }
  }, 16);

  fallIntervals.push(fall);
}

// Spawn a falling item at random position and type
function spawnItem() {
  if (paused) return;

  const item = document.createElement('div');
  const types = ['water', 'trash-recycle', 'trash-waste'];
  const type = types[Math.floor(Math.random() * types.length)];
  item.className = `falling ${type}`;
  item.dataset.type = type;
  item.style.left = `${Math.random() * (game.clientWidth - 40)}px`;
  item.style.top = '0px';
  game.appendChild(item);

  // Make the item fall and check for jerry can collision (for water)
  const interval = setInterval(() => {
    if (paused) return;
    let top = parseInt(item.style.top);
    item.style.top = (top + 3) + 'px';

    // Only lose a life if garbage passes below the bottom of the jerrycan
    if (top > (jerrycan.offsetTop + jerrycan.offsetHeight)) {
      if (type === 'trash-recycle' || type === 'trash-waste') {
        lives--;
        updateLives();
        if (lives <= 0) {
          showGameOver();
          return;
        }
      }
      item.remove();
      clearInterval(interval);
      fallIntervals = fallIntervals.filter(f => f !== interval);
      return;
    }

    // Only check collision for water
    if (type === 'water') {
      const itemRect = item.getBoundingClientRect();
      const jerrycanRect = jerrycan.getBoundingClientRect();
      const hitJerrycan = !(
        itemRect.right < jerrycanRect.left ||
        itemRect.left > jerrycanRect.right ||
        itemRect.bottom < jerrycanRect.top ||
        itemRect.top > jerrycanRect.bottom
      );
      if (hitJerrycan) {
        // Prevent score update after game over
        if (lives > 0) {
          score++;
          scoreDisplay.textContent = `Score: ${score}`;
        }
        item.remove();
        clearInterval(interval);
        fallIntervals = fallIntervals.filter(f => f !== interval);
        return;
      }
    }

    if (top > game.clientHeight) {
      item.remove();
      clearInterval(interval);
      fallIntervals = fallIntervals.filter(f => f !== interval);
    }
  }, 16);
  fallIntervals.push(interval);

  // Only give points if the bin mode matches the trash type
  item.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Prevent score update after game over
    if (
      lives > 0 &&
      (
        (type === 'trash-recycle' && binMode === 'recycle') ||
        (type === 'trash-waste' && binMode === 'waste')
      )
    ) {
      score++;
      scoreDisplay.textContent = `Score: ${score}`;
    }
    item.remove();
    clearInterval(interval);
    fallIntervals = fallIntervals.filter(f => f !== interval);
  });
}

// Store the interval ID so we can stop it later
let spawnInterval = setInterval(spawnItem, 1000);

// Show game over screen and final score
function showGameOver() {
  // Stop spawning new items
  clearInterval(spawnInterval);
  // Stop all falling item intervals
  fallIntervals.forEach(clearInterval);
  fallIntervals = [];

  // Clear game area
  game.innerHTML = '';

  // Show game over message
  const gameOverMsg = document.createElement('div');
  gameOverMsg.className = 'gameover-msg';
  gameOverMsg.textContent = 'Game Over!';

  const finalScore = document.createElement('div');
  finalScore.className = 'gameover-score';
  finalScore.textContent = `Your score: ${score}`;

  const btn = document.createElement('button');
  btn.className = 'gameover-btn';
  btn.textContent = 'Restart/Work in Progress';
  // Button is present and styled, but does nothing

  const overlay = document.createElement('div');
  overlay.id = 'gameover-overlay';
  overlay.appendChild(gameOverMsg);
  overlay.appendChild(finalScore);
  overlay.appendChild(btn);

  document.body.appendChild(overlay);
}
