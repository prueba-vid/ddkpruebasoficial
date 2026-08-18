// js/game.js

// --- 1. CONFIGURACIÓN THREE.JS Y ESCENA ---
const scene = new THREE.Scene(); 
window.scene = scene;
scene.background = new THREE.Color(0x14141f);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight); 
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

window.applyResolutionSettings = scale => renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * scale);
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

// --- LLAMADA AL MAPA DESDE map.js ---
const { map, grid, dirLight } = createMap(scene);

function disposeGroup(group) {
    if (!group) return;
    group.traverse(child => {
        if (child.isMesh || child.isSprite) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        if (mat.map) mat.map.dispose();
                        mat.dispose();
                    });
                } else {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            }
        }
    });
}

function createItsukiSkin() {
    if (typeof createItsukiMaterial === 'function') {
        const base = typeof createKaiSkin === 'function' ? createKaiSkin() : { playerGroup: new THREE.Group() };
        const mat = createItsukiMaterial();
        base.playerGroup.traverse(child => {
            if (child.isMesh) child.material = mat;
        });
        return base;
    }
    return typeof createKaiSkin === 'function' ? createKaiSkin() : { playerGroup: new THREE.Group() };
}

// --- 2. JUGADOR Y SISTEMA DE CAMBIO DE PERSONAJE ---
let selectedSkin = localStorage.getItem('selectedSkin') || 'clasica';
let playerData;

function loadPlayerSkin() {
    selectedSkin = (localStorage.getItem('selectedSkin') || 'clasica').toLowerCase();

    if (selectedSkin.includes('arisa')) {
        window.currentCharacter = 'Arisa';
        playerData = typeof createArisaSkin === 'function' ? createArisaSkin() : createKaiSkin();
    } else if (selectedSkin.includes('itsuki')) {
        window.currentCharacter = 'Itsuki';
        playerData = typeof createItsukiSkin === 'function' ? createItsukiSkin() : createKaiSkin();
    } else if (selectedSkin.includes('ryu')) {
        window.currentCharacter = 'Ryu';
        playerData = typeof createRyuSkin === 'function' ? createRyuSkin() : createKaiSkin();
    } else {
        window.currentCharacter = 'Kai';
        playerData = createKaiSkin();
    }

    return playerData;
}

playerData = loadPlayerSkin();
let { playerGroup, torso, leftArm, rightArm } = playerData;
scene.add(playerGroup);

// --- SISTEMA PRECISO DE HITBOXES Y ÁREAS DE IMPACTO ---
const playerBodyBox = new THREE.Box3();
const playerHitboxHelper = new THREE.Box3Helper(playerBodyBox, 0x00ff00); // Verde para el personaje
playerHitboxHelper.visible = false;
scene.add(playerHitboxHelper);

window.spawnAttackHitbox = function(originPos, rotationY, width = 1.8, height = 1.5, reach = 2.0, durationMs = 200) {
    if (!window.GameConfig?.showHitboxes) return;

    const attackBox = new THREE.Box3();
    const halfW = width / 2;
    
    const forwardX = Math.sin(rotationY) * (reach / 2);
    const forwardZ = Math.cos(rotationY) * (reach / 2);

    attackBox.min.set(originPos.x + forwardX - halfW, originPos.y + 0.2, originPos.z + forwardZ - halfW);
    attackBox.max.set(originPos.x + forwardX + halfW, originPos.y + 0.2 + height, originPos.z + forwardZ + halfW);

    const attackHelper = new THREE.Box3Helper(attackBox, 0xff0000); // Rojo para la zona de ataque
    scene.add(attackHelper);

    setTimeout(() => {
        scene.remove(attackHelper);
        if (attackHelper.geometry) attackHelper.geometry.dispose();
    }, durationMs);
};

window.updateHitboxVisibility = function() {
    const isVisible = !!(window.GameConfig && window.GameConfig.showHitboxes);
    playerHitboxHelper.visible = isVisible;

    scene.traverse(obj => {
        if (obj.isDummy || obj.name === "dummy") {
            if (!obj.bodyBox) {
                obj.bodyBox = new THREE.Box3();
                obj.hitboxHelper = new THREE.Box3Helper(obj.bodyBox, 0xff0000);
                scene.add(obj.hitboxHelper);
            }
            obj.hitboxHelper.visible = isVisible;
        }
    });
};

function resetCharacterState() {
    if (typeof resetArisaState === 'function') {
        resetArisaState(scene, playerGroup);
    }
    if (typeof resetItsukiState === 'function') {
        resetItsukiState(scene, playerGroup);
    }

    if (typeof teleportPlayer === 'function' && playerGroup) {
        const physState = teleportPlayer(playerGroup, 0, 1, 0);
        window.velocityY = physState.velocityY;
        window.isGrounded = physState.isGrounded;
    } else if (playerGroup) {
        playerGroup.position.set(0, 1, 0);
        playerGroup.rotation.set(0, 0, 0);
        window.velocityY = 0;
        window.isGrounded = false;
    }

    canDash = true;
    isDashing = false;

    // Reseteo de overlays usando el sistema de ui.js
    if (window.Cooldowns?.intervals) {
        Object.keys(window.Cooldowns.intervals).forEach(id => {
            clearInterval(window.Cooldowns.intervals[id]);
            delete window.Cooldowns.intervals[id];
            const el = $(id);
            if (el) {
                el.style.display = 'none';
                el.textContent = '';
            }
        });
    }

    if (window.touchState) {
        window.touchState.inputX = 0;
        window.touchState.inputY = 0;
    }
}

// --- CONFIGURACIÓN DE SOMBRAS E INICIALIZACIÓN ---
if (typeof setupShadows === 'function') {
    setupShadows(renderer, dirLight, map, playerGroup, scene);
}
if (typeof setupShadowsPlus === 'function') {
    setupShadowsPlus(renderer, dirLight, map, playerGroup, scene);
}

window.changeCharacter = function(skinName) {
    if (skinName) localStorage.setItem('selectedSkin', skinName);

    if (playerGroup) {
        scene.remove(playerGroup);
        disposeGroup(playerGroup);
    }

    playerData = loadPlayerSkin();
    playerGroup = playerData.playerGroup;
    torso = playerData.torso;
    leftArm = playerData.leftArm;
    rightArm = playerData.rightArm;

    playerGroup.position.set(0, 1, 0);
    scene.add(playerGroup);

    if (window.GameConfig?.shadowsPlusEnabled && typeof window.applyShadowsPlusSettings === 'function') {
        window.applyShadowsPlusSettings(true);
    } else if (typeof window.applyShadowsToGroup === 'function') {
        window.applyShadowsToGroup(playerGroup);
    } else {
        const shadowsEnabled = !!(window.GameConfig && window.GameConfig.shadowsEnabled);
        playerGroup.traverse(c => {
            if (c.isMesh) {
                c.castShadow = shadowsEnabled;
                c.receiveShadow = shadowsEnabled;
            }
        });
    }

    renderer.shadowMap.needsUpdate = true;

    if (typeof NameTagSystem !== 'undefined') {
        const currentName = window.playerUsername || "Jugador";
        NameTagSystem.attachToPlayer(playerGroup, currentName, 2.2);
    }

    resetCharacterState();
};

window.addEventListener('skinChanged', () => {
    const currentSavedSkin = localStorage.getItem('selectedSkin') || 'clasica';
    window.changeCharacter(currentSavedSkin);
});

// Adjuntar NameTag en la carga inicial
if (typeof NameTagSystem !== 'undefined') {
    const currentName = window.playerUsername || "Jugador";
    NameTagSystem.attachToPlayer(playerGroup, currentName, 2.2);
}

window.updateNameTagsVisibility = () => {
    const mode = window.GameConfig?.nameTagVisibility ?? 0;
    const myNameTag = playerGroup.getObjectByName("nameTagSprite");
    if (myNameTag) myNameTag.visible = !(mode === 1 || mode === 2);

    scene.traverse(obj => {
        if (obj !== playerGroup && obj.name === "nameTagSprite") {
            obj.visible = !(mode === 2 || mode === 3);
        }
    });
};

const defaultArmPosLeft = new THREE.Vector3(-0.27, 0.2, 0);
const defaultArmPosRight = new THREE.Vector3(0.27, 0.2, 0);
if (typeof spawnDummy === 'function') spawnDummy(scene);

// --- 3. VARIABLES GLOBALES DE FÍSICA Y MOVIMIENTO ---
window.velocityY = 0;
window.isGrounded = true;
window.moveSpeed = 7.2;
window.gravity = -32.4;
window.jumpForce = 9.5;
let camDistance = window.GameConfig?.camDistance || 4.5;

window.updateCameraDistance = dist => { camDistance = dist; };

window.isDashing = false;
window.dashTimer = 0;
window.canDash = true;
window.DASH_DURATION = 0.18;
window.DASH_SPEED = 28.0;
window.DASH_COOLDOWN = 4500; 

window.dashDirection = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const tempArmPosLeft = new THREE.Vector3(-0.1, 0.26, 0.2);
const tempArmPosRight = new THREE.Vector3(0.1, 0.26, 0.2);
let frameCount = 0, lastFpsUpdate = performance.now(), lastRenderTime = performance.now();

const headPos = new THREE.Vector3();
const forwardVec = new THREE.Vector3();
const rightVec = new THREE.Vector3();

window.combatState = { canHit: true, HIT_COOLDOWN: 250 };

function processContinuousSkills(delta, currentScene) {
    const actions = window.activeActions;

    if (window.currentCharacter === 'Itsuki') {
        if (actions & ACTIONS.ESPECIAL) useItsukiSpecial(playerGroup, actions);
        if (actions & ACTIONS.ACT1) useItsukiAct1(playerGroup, currentScene, actions);
        if (actions & ACTIONS.ACT2) useItsukiAct2(playerGroup, currentScene, actions);
        if (actions & ACTIONS.ACT3) useItsukiAct3(playerGroup, currentScene, actions);
        if (actions & ACTIONS.ACT4) useItsukiAct4(playerGroup, currentScene, actions);
    } else if (window.currentCharacter === 'Arisa') {
        if (actions & ACTIONS.ESPECIAL) useArisaSpecial(playerGroup, actions);
        if (actions & ACTIONS.ACT1) useArisaAct1(playerGroup, currentScene, actions);
        if (actions & ACTIONS.ACT2) useArisaAct2(playerGroup, currentScene, actions);
        if (actions & ACTIONS.ACT3) useArisaAct3(playerGroup, currentScene, actions);
        if (actions & ACTIONS.ACT4) holdArisaAct4(playerGroup, currentScene, actions);
    }
}

// --- 4. BUCLE PRINCIPAL ---
let memoryCleanupTimer = 0;

function animate() {
    requestAnimationFrame(animate); 

    if (!window.isGameStarted) {
        lastRenderTime = performance.now();
        return;
    }

    const now = performance.now();
    if (window.GameConfig?.limitFPS && (now - lastRenderTime < (1000 / window.GameConfig.targetFPS) - 1)) return;
    const delta = Math.min((now - lastRenderTime) / 1000, 0.1); 
    lastRenderTime = now;
    frameCount++;
    
    if (now - lastFpsUpdate >= 500) { 
        if (window.GameConfig?.showFPS && DOM.fpsCounter) {
            DOM.fpsCounter.textContent = `FPS: ${Math.round((frameCount * 1000) / (now - lastFpsUpdate))}`; 
        }
        frameCount = 0; 
        lastFpsUpdate = now; 
    }

    memoryCleanupTimer += delta;
    if (memoryCleanupTimer > 10) {
        renderer.info.reset();
        memoryCleanupTimer = 0;
    }

    if (typeof updateDummyRegen === 'function') updateDummyRegen(delta);
    if (typeof updateDummyBounds === 'function') updateDummyBounds();
    if (typeof checkDummyCollision === 'function') checkDummyCollision(playerGroup);

    const isBlocking = !!(window.activeActions & ACTIONS.BLOQUEAR);
    const isMoving = !!(window.activeActions & ACTIONS.JOYSTICK);
    
    processContinuousSkills(delta, scene);

    // MOVIMIENTO Y CONTROL DEL JUGADOR
    if (typeof updatePlayerMovement === 'function') {
        updatePlayerMovement(delta, isMoving, isBlocking);
    }

    // MOVER PROYECTILES ACTIVOS (KAI Y OTROS)
    if (typeof updateProjectilesMovement === 'function') {
        updateProjectilesMovement(delta, scene);
    }

    // POSICIONAMIENTO DE BRAZOS SEGÚN BLOQUEO
    const lerpSpeed = delta * 15;
    if (leftArm && rightArm) {
        leftArm.position.lerp(isBlocking ? tempArmPosLeft : defaultArmPosLeft, lerpSpeed); 
        rightArm.position.lerp(isBlocking ? tempArmPosRight : defaultArmPosRight, lerpSpeed);
    }

    // CÁMARA
    const camThetaVal = window.touchState ? (window.touchState.camTheta || 0) : 0;
    headPos.set(playerGroup.position.x, playerGroup.position.y + 1.25, playerGroup.position.z);
    const camPhiVal = window.touchState ? (window.touchState.camPhi || 0) : 0;

    const sinPhi = Math.sin(camPhiVal);
    const cosPhi = Math.cos(camPhiVal);
    const sinTheta = Math.sin(camThetaVal);
    const cosTheta = Math.cos(camThetaVal);

    forwardVec.set(-sinPhi * sinTheta, -cosPhi, -sinPhi * cosTheta).normalize();
    rightVec.set(cosTheta, 0, -sinTheta).normalize();

    lookTarget.copy(headPos).addScaledVector(rightVec, 0.42);
    camera.position.copy(lookTarget).addScaledVector(forwardVec, -camDistance);
    
    if (camera.position.y < 0.4) camera.position.y = 0.4;
    camera.lookAt(lookTarget);

    if (typeof healthBarMesh !== 'undefined' && healthBarMesh) healthBarMesh.quaternion.copy(camera.quaternion);

    scene.traverse(obj => {
        if (obj.name === "nameTagSprite" && obj.visible) {
            obj.quaternion.copy(camera.quaternion);
        }
    });

    // CAJAS DE HITBOX EN TIEMPO REAL
    if (window.GameConfig?.showHitboxes) {
        if (typeof getPlayerHitboxBounds === 'function') {
            getPlayerHitboxBounds(playerGroup, playerBodyBox);
        }

        scene.traverse(obj => {
            if ((obj.isDummy || obj.name === "dummy") && obj.bodyBox) {
                const dPos = obj.position;
                obj.bodyBox.min.set(dPos.x - 0.4, dPos.y, dPos.z - 0.4);
                obj.bodyBox.max.set(dPos.x + 0.4, dPos.y + 1.8, dPos.z + 0.4);
            }
        });
    }

    // Transmisión de movimiento en red
    if (typeof window.broadcastLocalTransform === 'function' && playerGroup) {
        window.broadcastLocalTransform(playerGroup);
    }

    renderer.render(scene, camera);
}

const onResize = () => { 
    if (DOM.warn) DOM.warn.style.display = window.innerWidth < window.innerHeight ? 'flex' : 'none'; 
    camera.aspect = window.innerWidth / window.innerHeight; 
    camera.updateProjectionMatrix(); 
    renderer.setSize(window.innerWidth, window.innerHeight); 
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * (window.GameConfig?.resolutionScale || 1.0)); 
};

window.addEventListener('resize', onResize); 
onResize(); 
animate();

