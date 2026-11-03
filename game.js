// --- Game Configuration & Constants ---
const GRID_SIZE = 20;
const CELL_SIZE = 2;
const HAZARD_COUNT = 8;
const ITEM_COUNT = 5;

// --- Game State Variables ---
let scene, camera, renderer;
let player, playerGridPos = { x: 0, z: 0 };
let gridHelper;
let hazards = [];
let lootItems = [];
let portal = null;
let score = 0;
let playerHealth = 100;
let isGameOver = false;
let gameStarted = false;
let gameTime = 0;

// Track active keyboard inputs (W, A, S, D)
const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

// --- DOM Elements ---
const healthEl = document.getElementById('health');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const statusOverlay = document.getElementById('status-overlay');
const statusText = document.getElementById('status-text');
const startBtn = document.getElementById('start-btn');

// --- Audio Engine (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// --- Initialization ---
function init() {
    // 1. Create Scene & Renderer
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a14);
    scene.fog = new THREE.FogExp2(0x0a0a14, 0.05);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);

    // 2. Setup Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // 3. Add Cyber-Grid Layout
    gridHelper = new THREE.GridHelper(GRID_SIZE * CELL_SIZE, GRID_SIZE, 0x00ffcc, 0x333344);
    gridHelper.position.set(0, 0, 0);
    scene.add(gridHelper);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0x00ffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // 5. Spawn Player Character Model
    const playerGeo = new THREE.CylinderGeometry(0.4, 0.6, 1.6, 8);
    const playerMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc, roughness: 0.2, metalness: 0.5 });
    player = new THREE.Mesh(playerGeo, playerMat);
    player.position.y = 0.8; 
    scene.add(player);

    // Center camera onto player perspective
    updateCameraPosition();

    // 6. Generate Level Entities
    generateHazards();
    generateLoot();
    spawnExtractionPortal();

    // 7. Attach Keyboard Event Handlers
    window.addEventListener('keydown', (e) => handleKeyboard(e, true));
    window.addEventListener('keyup', (e) => handleKeyboard(e, false));
    window.addEventListener('resize', onWindowResize);

    // 8. Open UI Main Screen Overlay
    showOverlay("GLITCHRUN 3D", true);
}

// --- Input Processing (W, A, S, D Handling) ---
function handleKeyboard(event, isPressed) {
    const key = event.key.toLowerCase();
    if (key === 'w') keys.w = isPressed;
    if (key === 'a') keys.a = isPressed;
    if (key === 's') keys.s = isPressed;
    if (key === 'd') keys.d = isPressed;
}

function updateMovement() {
    if (!gameStarted || isGameOver) return;

    let targetX = playerGridPos.x;
    let targetZ = playerGridPos.z;

    // Process positional shifts based on active key states
    if (keys.w) targetZ -= 1; // Forward
    if (keys.s) targetZ += 1; // Backward
    if (keys.a) targetX -= 1; // Left
    if (keys.d) targetX += 1; // Right

    // Enforce grid boundaries
    const halfGrid = GRID_SIZE / 2;
    if (targetX >= -halfGrid && targetX < halfGrid && targetZ >= -halfGrid && targetZ < halfGrid) {
        playerGridPos.x = targetX;
        playerGridPos.z = targetZ;
        
        // Translate grid coordinates into 3D space positions
        player.position.x = playerGridPos.x * CELL_SIZE + CELL_SIZE / 2;
        player.position.z = playerGridPos.z * CELL_SIZE + CELL_SIZE / 2;
        
        updateCameraPosition();
        checkCollisions();
    }
}

function updateCameraPosition() {
    camera.position.set(player.position.x, player.position.y + 4, player.position.z + 8);
    camera.lookAt(player.position);
}

function checkCollisions() {
    // 1. Hazard Overlaps
    hazards.forEach(h => {
        if (h.gridX === playerGridPos.x && h.gridZ === playerGridPos.z) {
            playerHealth = Math.max(0, playerHealth - 1.5);
            healthEl.textContent = Math.floor(playerHealth);
            playTone(90, 'sawtooth', 0.05); // Critical distortion audio trigger
            
            // Visual glitch trigger rumble
            camera.position.x += (Math.random() - 0.5) * 0.3;
            camera.position.y += (Math.random() - 0.5) * 0.3;

            if (playerHealth <= 0) triggerEndgame(false);
        }
    });

    // 2. Loot Collecting Overlaps
    for (let i = lootItems.length - 1; i >= 0; i--) {
        let item = lootItems[i];
        if (item.gridX === playerGridPos.x && item.gridZ === playerGridPos.z) {
            scene.remove(item.mesh);
            lootItems.splice(i, 1);
            score += 100;
            scoreEl.textContent = score;
            playTone(600, 'sine', 0.15); // Upbeat chime score trigger
        }
    }

    // 3. System Data Core Extraction Check
    if (portal && playerGridPos.x === portal.gridX && playerGridPos.z === portal.gridZ) {
        triggerEndgame(true);
    }
}

function animate(timestamp) {
    requestAnimationFrame(animate);

    // Pulse/spin environment items to enrich visuals
    const timeFactor = timestamp * 0.002;
    
    hazards.forEach(h => {
        h.mesh.rotation.x += 0.02;
        h.mesh.rotation.y += 0.01;
        h.mesh.position.y = 0.6 + Math.sin(timeFactor + h.seed) * 0.15; // Hovering effect
    });

    lootItems.forEach(item => {
        item.mesh.rotation.y += 0.04;
    });

    if (portal) {
        portal.mesh.rotation.z += 0.03;
    }

    // Execute input processing frame changes
    updateMovement();

    // Clock calculation logic
    if (gameStarted && !isGameOver) {
        gameTime += 1 / 60;
        timerEl.textContent = Math.floor(gameTime);
    }

    renderer.render(scene, camera);
}

// --- Menu UI Screen States Manager ---
function showOverlay(text, showButton) {
    statusText.textContent = text;
    statusOverlay.style.display = 'flex';
    startBtn.style.display = showButton ? 'block' : 'none';
}

function hideOverlay() {
    statusOverlay.style.display = 'none';
}

function triggerEndgame(survived) {
    isGameOver = true;
    gameStarted = false;
    if (survived) {
        playTone(440, 'square', 0.2);
        setTimeout(() => playTone(554, 'square', 0.2), 150);
        setTimeout(() => playTone(659, 'square', 0.4), 300);
        showOverlay(`SYSTEM CLEANSED! Score: ${score}`, true);
        startBtn.textContent = "Run Again";
    } else {
        playTone(120, 'sawtooth', 0.6);
        showOverlay("CONNECTION TERMINATED - KILLED BY GLITCH", true);
        startBtn.textContent = "Reboot Profile";
    }
}

// --- Button Interaction Trigger ---
startBtn.addEventListener('click', () => {
    hideOverlay();

    // Reset structural state if re-running
    if (isGameOver) {
        playerHealth = 100;
        score = 0;
        gameTime = 0;
        playerGridPos = { x: 0, z: 0 };
        healthEl.textContent = "100";
        scoreEl.textContent = "0";
        timerEl.textContent = "0";

        // Re-spawn items dynamically
        lootItems.forEach(i => scene.remove(i.mesh));
        hazards.forEach(h => scene.remove(h.mesh));
        if (portal) scene.remove(portal.mesh);

        lootItems = [];
        hazards = [];
        generateHazards();
        generateLoot();
        spawnExtractionPortal();

        isGameOver = false;
    }

    gameStarted = true;
});

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Kickstart script environment setup
init();
animate(0);
