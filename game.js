// Glitchrun 3D - Game Script
let scene, camera, renderer;
let player;
let keys = {};
let gridWidth = 5;
let laneWidth = 2;

// Game state tracker
let gameStarted = false;

// Camera angle tracking via mouse
let cameraPitch = 0.6; // Vertical tilt angle (Up/Down) in radians
let cameraYaw = 0;     // Horizontal rotation angle (Left/Right) in radians
const mouseSensitivity = 0.003;

function init() {
    // 1. Create Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);

    // 2. Setup Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

    // 3. Setup Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 4. Create Player (Humanoid placeholder)
    const playerGroup = new THREE.Group();
    
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    playerGroup.add(body);

    const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.0;
    playerGroup.add(head);

    player = playerGroup;
    player.position.set(0, 0, 0); 
    scene.add(player);

    // 5. Build Grid Track
    createGridTrack();

    // 6. Event Listeners
    window.addEventListener('keydown', (e) => { keys[e.key] = true; });
    window.addEventListener('keyup', (e) => { keys[e.key] = false; });
    window.addEventListener('resize', onWindowResize);

    // Bind the start button explicitly
    setupStartButton();

    // Listen for mouse movements when pointer is locked
    document.addEventListener('mousemove', onMouseMove);

    // Initial camera placement
    updateCamera();

    // Start Loop
    animate();
}

function setupStartButton() {
    // Find your start button in index.html
    const startBtn = document.getElementById('startButton') || document.querySelector('button');
    const startMenu = document.getElementById('startMenu') || document.getElementById('menu') || document.getElementById('overlay');

    if (startBtn) {
        startBtn.addEventListener('click', (e) => {
            // Prevent HTML bubble issues
            e.stopPropagation(); 
            
            // Hide the UI menu overlay
            if (startMenu) startMenu.style.display = 'none';
            
            // Activate game and capture mouse loop
            gameStarted = true;
            renderer.domElement.requestPointerLock();
        });
    }

    // Allow re-locking cursor if player clicks screen *after* game has started
    renderer.domElement.addEventListener('click', () => {
        if (gameStarted) {
            renderer.domElement.requestPointerLock();
        }
    });
}

function createGridTrack() {
    const tileGeo = new THREE.BoxGeometry(laneWidth - 0.1, 0.1, laneWidth - 0.1);
    const tileMat = new THREE.MeshBasicMaterial({ color: 0x111133, wireframe: false });

    for (let x = -2; x <= 2; x++) {
        for (let z = -20; z <= 20; z++) {
            const tile = new THREE.Mesh(tileGeo, tileMat);
            tile.position.set(x * laneWidth, -0.05, z * laneWidth);
            scene.add(tile);

            const edges = new THREE.EdgesGeometry(tileGeo);
            const lineMat = new THREE.LineBasicMaterial({ color: 0x3333aa });
            const line = new THREE.LineSegments(edges, lineMat);
            line.position.copy(tile.position);
            scene.add(line);
        }
    }
}

function onMouseMove(event) {
    // Only look around if game started and pointer lock is active
    if (gameStarted && document.pointerLockElement === renderer.domElement) {
        cameraYaw -= event.movementX * mouseSensitivity;
        cameraPitch += event.movementY * mouseSensitivity;

        // Limit vertical looking angles so camera doesn't flip upside down
        cameraPitch = Math.max(0.1, Math.min(1.4, cameraPitch));
    }
}

function handleInput() {
    // Stop movement processing if the game hasn't officially started
    if (!gameStarted) return;

    const moveSpeed = 0.15;

    // Movement relative to world axes
    if (keys['a'] || keys['A']) {
        player.position.x -= moveSpeed;
    }
    if (keys['d'] || keys['D']) {
        player.position.x += moveSpeed;
    }
    if (keys['w'] || keys['W']) {
        player.position.z -= moveSpeed; 
    }
    if (keys['s'] || keys['S']) {
        player.position.z += moveSpeed; 
    }

    // Keep player confined to the grid boundary widthwise
    const maxBoundary = 2.5 * laneWidth;
    if (player.position.x < -maxBoundary) player.position.x = -maxBoundary;
    if (player.position.x > maxBoundary) player.position.x = maxBoundary;
}

function updateCamera() {
    const distance = 6; 

    // Spherical coordinate math to orbit camera around the player
    const height = distance * Math.sin(cameraPitch);
    const horizontalDistance = distance * Math.cos(cameraPitch);

    camera.position.x = player.position.x + horizontalDistance * Math.sin(cameraYaw);
    camera.position.y = player.position.y + height;
    camera.position.z = player.position.z + horizontalDistance * Math.cos(cameraYaw);

    // Focus camera target directly on the player
    camera.lookAt(player.position.x, player.position.y + 0.5, player.position.z);
}

function animate() {
    requestAnimationFrame(animate);

    handleInput();
    updateCamera();

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Start setup
init();
