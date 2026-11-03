// Game Core Variables
let scene, camera, renderer;
let obstacles = [];
let lootItems = [];
let extractionPortal;
let audioCtx;

// Gameplay Variables
let gameActive = false;
let lootCollected = 0;
let timeRemaining = 30;
let countdownInterval;
let playerPositionZ = 0;

// SECURE EVENT LISTENERS (Replaces inline onclick)
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', rebootGame);
});

// Initialize Web Audio API safely after a user gesture
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Play synthetic sound effects using oscillator nodes
function playSynthSound(freq, type, duration) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// Launch Game Instance
function startGame() {
    initAudio();
    playSynthSound(440, 'sawtooth', 0.3); // Boot sound
    
    document.getElementById('start-screen').style.display = 'none';
    gameActive = true;
    
    init3DScene();
    startTimer();
    animate();
}

// Setup Three.js World Rendering Environment
function init3DScene() {
    const container = document.getElementById('canvas-container');
    container.innerHTML = ''; // Wipe past instances
    obstacles = [];
    lootItems = [];
    lootCollected = 0;
    timeRemaining = 30;
    playerPositionZ = 0;
    
    document.getElementById('loot-count').innerText = lootCollected;
    document.getElementById('timer').innerText = timeRemaining;

    // Create Scene & Camera Setup
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05050a, 0.03);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);

    // Renderer Configuration
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(scene.fog.color);
    container.appendChild(renderer.domElement);

    // Dynamic Lighting
    const ambientLight = new THREE.AmbientLight(0x111133);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00ffcc, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Build Retro Grid Ground Network
    const gridHelper = new THREE.GridHelper(200, 50, 0xff0055, 0x111122);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Spawn Glitch Obstacles (Irregular Shapes)
    for (let i = 0; i < 20; i++) {
        const geoType = Math.random() > 0.5 ? new THREE.IcosahedronGeometry(1.2, 0) : new THREE.ConeGeometry(0.8, 2, 4);
        const mat = new THREE.MeshPhongMaterial({
            color: 0xff0055,
            wireframe: Math.random() > 0.3,
            emissive: 0x330011
        });
        const mesh = new THREE.Mesh(geoType, mat);
        mesh.position.set((Math.random() - 0.5) * 15, 1, -Math.random() * 80);
        scene.add(mesh);
        obstacles.push(mesh);
    }

    // Spawn Loot Cubes
    for (let i = 0; i < 5; i++) {
        const geo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const mat = new THREE.MeshStandardMaterial({ color: 0x00ffcc, roughness: 0.1, metalness: 0.8 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set((Math.random() - 0.5) * 12, 0.6, -20 - (i * 12));
        scene.add(mesh);
        lootItems.push(mesh);
    }

    // Spawn Timed Extraction Portal Setup
    const portalGeo = new THREE.TorusGeometry(2, 0.2, 8, 24);
    const portalMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true });
    extractionPortal = new THREE.Mesh(portalGeo, portalMat);
    extractionPortal.position.set(0, 2, -85);
    scene.add(extractionPortal);

    // Keyboard Controller Bindings
    window.addEventListener('keydown', handleMovement);
    window.addEventListener('resize', onWindowResize);
}

// Controller Actions
function handleMovement(e) {
    if (!gameActive) return;
    if (e.key === 'ArrowLeft' || e.key === 'a') camera.position.x -= 0.5;
    if (e.key === 'ArrowRight' || e.key === 'd') camera.position.x += 0.5;
}

// Countdown Clock Automation Rule
function startTimer() {
    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        if (!gameActive) return;
        timeRemaining--;
        document.getElementById('timer').innerText = timeRemaining;

        if (timeRemaining <= 0) {
            endGame(false, "TIME EXPIRED: SYSTEM OVERLOAD");
        }
    }, 1000);
}

// Main Frame Render Cycle
function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    // Auto-advance player down the digital path
    camera.position.z -= 0.12;
    playerPositionZ = camera.position.z;

    // Rotate Obstacles & Portals for active visual glitch effect
    obstacles.forEach((obj, idx) => {
        obj.rotation.x += 0.01;
        obj.rotation.y += 0.02;
        
        // Basic Proximity Hazard Check
        if (camera.position.distanceTo(obj.position) < 1.3) {
            endGame(false, "COLLISION DETECTED: CORE CORRUPTED");
        }
    });

    // Check Loot Item Intersections
    lootItems.forEach((loot, idx) => {
        loot.rotation.y += 0.04;
        
        if (loot.visible && camera.position.distanceTo(loot.position) < 1.5) {
            loot.visible = false;
            lootCollected++;
            document.getElementById('loot-count').innerText = lootCollected;
            playSynthSound(880, 'sine', 0.15); // Loot pickup sound
        }
    });

    // Animate the Extraction Portal ring
    if (extractionPortal) {
        extractionPortal.rotation.z += 0.03;
        
        // Victory Condition Check
        if (camera.position.z <= extractionPortal.position.z + 1) {
            if (lootCollected >= 3) {
                endGame(true, `SUCCESSFULLY EXTRACTED ${lootCollected} OBJECTS`);
            } else {
                endGame(false, "EXTRACTION DENIED: INSUFFICIENT LOOT QUANTITY");
            }
        }
    }

    renderer.render(scene, camera);
}

// Termination Phase Controller
function endGame(isVictory, statusText) {
    gameActive = false;
    clearInterval(countdownInterval);
    
    if (isVictory) {
        playSynthSound(600, 'triangle', 0.5);
        document.getElementById('end-title').innerText = "SYSTEM SECURED";
        document.getElementById('end-title').style.color = "#00ffcc";
        document.getElementById('game-over-screen').style.borderColor = "#00ffcc";
    } else {
        playSynthSound(150, 'sawtooth', 0.6);
        document.getElementById('end-title').innerText = "SYSTEM FAIL";
        document.getElementById('end-title').style.color = "#ff0055";
        document.getElementById('game-over-screen').style.borderColor = "#ff0055";
    }

    document.getElementById('end-status').innerText = statusText;
    document.getElementById('game-over-screen').style.display = 'flex';
}

// Reboot Game Routine
function rebootGame() {
    document.getElementById('game-over-screen').style.display = 'none';
    gameActive = true;
    init3DScene();
    startTimer();
    animate();
}

// Window Responsive Scaler
function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
