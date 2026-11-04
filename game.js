let scene, camera, renderer;
let player;
let keys = {};
let laneWidth = 2;
let gameStarted = false;

let cameraPitch = 0.6;
let cameraYaw = 0;
const mouseSensitivity = 0.003;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

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

    createGridTrack();

    window.addEventListener('keydown', (e) => { keys[e.key] = true; });
    window.addEventListener('keyup', (e) => { keys[e.key] = false; });
    window.addEventListener('resize', onWindowResize);

    setupStartButton();

    document.addEventListener('mousemove', onMouseMove);

    updateCamera();
    animate();
}

function setupStartButton() {
    const startBtn = document.getElementById('startButton');
    const startMenu = document.getElementById('startMenu');

    if (startBtn) {
        startBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (startMenu) startMenu.style.display = 'none';
            gameStarted = true;
            renderer.domElement.requestPointerLock();
        });
    }

    renderer.domElement.addEventListener('click', () => {
        if (gameStarted && document.pointerLockElement !== renderer.domElement) {
            renderer.domElement.requestPointerLock();
        }
    });
}

function createGridTrack() {
    const tileGeo = new THREE.BoxGeometry(laneWidth - 0.1, 0.1, laneWidth - 0.1);
    const tileMat = new THREE.MeshBasicMaterial({ color: 0x111133 });

    for (let x = -10; x <= 10; x++) {
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
    if (gameStarted && document.pointerLockElement === renderer.domElement) {
        cameraYaw -= event.movementX * mouseSensitivity;
        cameraPitch += event.movementY * mouseSensitivity;
        cameraPitch = Math.max(0.1, Math.min(1.4, cameraPitch));
    }
}

function handleInput() {
    if (!gameStarted) return;

    const moveSpeed = 0.15;
    let forwardX = -Math.sin(cameraYaw);
    let forwardZ = -Math.cos(cameraYaw);
    let rightX = -Math.cos(cameraYaw);
    let rightZ = Math.sin(cameraYaw);

    if (keys['w'] || keys['W']) {
        player.position.x += forwardX * moveSpeed;
        player.position.z += forwardZ * moveSpeed;
    }
    if (keys['s'] || keys['S']) {
        player.position.x -= forwardX * moveSpeed;
        player.position.z -= forwardZ * moveSpeed;
    }
    if (keys['a'] || keys['A']) {
        player.position.x -= rightX * moveSpeed;
        player.position.z -= rightZ * moveSpeed;
    }
    if (keys['d'] || keys['D']) {
        player.position.x += rightX * moveSpeed;
        player.position.z += rightZ * moveSpeed;
    }
}

function updateCamera() {
    const distance = 6; 
    const height = distance * Math.sin(cameraPitch);
    const horizontalDistance = distance * Math.cos(cameraPitch);

    camera.position.x = player.position.x + horizontalDistance * Math.sin(cameraYaw);
    camera.position.y = player.position.y + height;
    camera.position.z = player.position.z + horizontalDistance * Math.cos(cameraYaw);

    camera.lookAt(player.position.x, player.position.y + 0.5, player.position.z);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    handleInput();
    updateCamera();
    renderer.render(scene, camera);
}

window.onload = function() {
    init();
};
