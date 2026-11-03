const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// DOM Elements
const screenOverlay = document.getElementById('screen-overlay');
const menuContent = document.getElementById('menu-content');
const lootSign = document.getElementById('loot-count');
const timerSign = document.getElementById('timer');
const healthBar = document.getElementById('health-bar');

// Game State Configurations
let gameActive = false;
let score = 0;
let timeLeft = 30;
let timerInterval;

// Player Object
const player = {
    x: 50,
    y: 50,
    radius: 15,
    speed: 4,
    health: 100,
    maxHealth: 100
};

// Game Entities arrays
let enemies = [];
let lootItems = [];

// Extraction Zone definition
const extractionZone = {
    x: 700,
    y: 500,
    width: 80,
    height: 80,
    active: false
};

// Keyboard Input Tracking
const keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

// Initialize/Reset settings
function initGame() {
    score = 0;
    timeLeft = 30;
    player.x = 50;
    player.y = 50;
    player.health = 100;
    extractionZone.active = false;
    enemies = [];
    lootItems = [];

    lootSign.innerText = `0/5`;
    lootSign.style.color = '#ffd700';
    timerSign.innerText = `Time Left: 30s`;
    healthBar.style.width = '100%';

    // Spawn 5 random loot elements across the map
    for (let i = 0; i < 5; i++) {
        lootItems.push({
            x: Math.random() * (canvas.width - 100) + 50,
            y: Math.random() * (canvas.height - 100) + 50,
            radius: 8
        });
    }

    // Spawn starting guard enemies
    for (let i = 0; i < 3; i++) {
        enemies.push({
            x: Math.random() * (canvas.width - 300) + 250,
            y: Math.random() * (canvas.height - 300) + 250,
            radius: 12,
            speed: Math.random() * 1.5 + 1.5
        });
    }
}

// Make startGame global so the HTML button can trigger it
window.startGame = function() {
    initGame();
    screenOverlay.classList.add('hidden');
    gameActive = true;

    // Start Countdown Timer Clock
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!gameActive) return;
        timeLeft--;
        timerSign.innerText = `Time Left: ${timeLeft}s`;

        // Slowly spawn additional enemies
        if (timeLeft % 7 === 0) {
            enemies.push({
                x: Math.random() * canvas.width,
                y: 0,
                radius: 12,
                speed: 2.5
            });
        }

        if (timeLeft <= 0) {
            endGame(false, "TIME EXPIRED");
        }
    }, 1000);

    // Fire up rendering loop
    requestAnimationFrame(update);
}

function endGame(victory, message) {
    gameActive = false;
    clearInterval(timerInterval);
    screenOverlay.classList.remove('hidden');
    
    if (victory) {
        screenOverlay.className = ""; 
        screenOverlay.classList.add('victory');
        menuContent.innerHTML = `
            <h1>MISSION SUCCESS!</h1>
            <p>You secured the cargo and escaped alive.</p>
            <button class="btn" onclick="startGame()">Play Again</button>
        `;
    } else {
        screenOverlay.className = "";
        menuContent.innerHTML = `
            <h1>MISSION FAILED</h1>
            <p>Reason: ${message}</p>
            <button class="btn" style="background:#dc3545;" onclick="startGame()">Try Again</button>
        `;
    }
}

// Mathematical Distance Helper
function getDistance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

// Main Engine Loop
function update() {
    if (!gameActive) return;

    // Clear Viewport Matrix
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- 1. PLAYER MOVEMENT & COLLISION BOUNDS ---
    if (keys['ArrowUp'] || keys['w'] || keys['W']) player.y -= player.speed;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) player.y += player.speed;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) player.x -= player.speed;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) player.x += player.speed;

    // Keep Player restricted on screen edges
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

    // --- 2. DRAW EXTRACTION ZONE ---
    if (extractionZone.active) {
        ctx.fillStyle = 'rgba(40, 167, 69, 0.3)';
        ctx.fillRect(extractionZone.x, extractionZone.y, extractionZone.width, extractionZone.height);
        ctx.strokeStyle = '#28a745';
        ctx.lineWidth = 3;
        ctx.strokeRect(extractionZone.x, extractionZone.y, extractionZone.width, extractionZone.height);
        
        // Text Label over pad
        ctx.fillStyle = '#28a745';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText("ESCAPE HERE", extractionZone.x + 2, extractionZone.y - 8);

        // Win condition check
        if (player.x > extractionZone.x && player.x < extractionZone.x + extractionZone.width &&
            player.y > extractionZone.y && player.y < extractionZone.y + extractionZone.height) {
            endGame(true);
            return;
        }
    }

    // --- 3. LOOT COLLECTION ---
    lootItems.forEach((loot, index) => {
        // Draw Loot
        ctx.beginPath();
        ctx.arc(loot.x, loot.y, loot.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffd700';
        ctx.fill();
        ctx.shadowBlur = 0; 

        // Collision check
        if (getDistance(player.x, player.y, loot.x, loot.y) < player.radius + loot.radius) {
            lootItems.splice(index, 1);
            score++;
            lootSign.innerText = `${score}/5`;
            
            if (score >= 5) {
                extractionZone.active = true;
                lootSign.style.color = '#28a745';
                lootSign.innerText = `READY TO EXTRACT!`;
            }
        }
    });

    // --- 4. ENEMY AI INTELLIGENCE & TRACKING ---
    enemies.forEach(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const angle = Math.atan2(dy, dx);
        
        enemy.x += Math.cos(angle) * enemy.speed;
        enemy.y += Math.sin(angle) * enemy.speed;

        // Render Threat Drones
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff3333';
        ctx.fill();

        // Drone Sensor Center Core
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();

        // Collision damage check
        if (getDistance(player.x, player.y, enemy.x, enemy.y) < player.radius + enemy.radius) {
            player.health -= 0.5;
            healthBar.style.width = `${Math.max(0, player.health)}%`;
            
            if (player.health <= 0) {
                endGame(false, "ELIMINATED BY ENEMY THREATS");
                return;
            }
        }
    });

    // --- 5. RENDER PLAYER MODEL ---
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#007bff';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    requestAnimationFrame(update);
}

// Paint initial grid preview on load canvas
ctx.fillStyle = '#1a1a1a';
ctx.fillRect(0, 0, canvas.width, canvas.height);
Step 2: Clear out the script from your HTML file

Remember, since the game logic is now inside game.js, you must remove the duplicate code from your index.html file and link the file properly. Ensure the bottom of your index.html file looks exactly like this right before it ends:
html
    <!-- ... Rest of your game layout divs ... -->
    </div>
</div>

<!-- This links your HTML directly to the script above -->
<script src="game.js"></script>

</body>
</html>
