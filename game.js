// js/game.js

// --- 1. CONFIGURACIÓN THREE.JS Y ESCENA ---
const scene = new THREE.Scene(); 
window.scene = scene;
scene.background = new THREE.Color(0x14141f);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight); 

const MAX_PIXEL_RATIO = 1.9;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
document.body.appendChild(renderer.domElement);

window.applyResolutionSettings = (scale) => {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO) * scale);
};

scene.add(new THREE.AmbientLight(0xffffff, 0.35));

// --- LLAMADA AL MAPA DESDE map.js ---
const { map, grid, dirLight } = createMap(scene);

// Colecciones para iteración rápida
const activeNameTags = new Set();
const activeDummies = new Set();

// Matrices reutilizables para optimización de cálculos
const projScreenMatrix = new THREE.Matrix4();
const frustum = new THREE.Frustum();
const headPos = new THREE.Vector3();
const forwardVec = new THREE.Vector3();
const rightVec = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const tempFlyDir = new THREE.Vector3();
const tempFlyRight = new THREE.Vector3();
const tempMoveVector = new THREE.Vector3();

// --- POOL DE OBJECTS PARA HITBOXES ---
class HitboxPool {
    constructor(scene, initialSize = 5) {
        this.scene = scene;
        this.pool = [];
        for (let i = 0; i < initialSize; i++) {
            const box = new THREE.Box3();
            const helper = new THREE.Box3Helper(box, 0xff0000);
            helper.visible = false;
            this.scene.add(helper);
            this.pool.push({ box, helper, active: false, timer: 0 });
        }
    }

    spawn(originPos, rotationY, width = 1.8, height = 1.5, reach = 2.0, durationMs = 200) {
        let item = this.pool.find(p => !p.active);
        if (!item) {
            const box = new THREE.Box3();
            const helper = new THREE.Box3Helper(box, 0xff0000);
            this.scene.add(helper);
            item = { box, helper, active: false, timer: 0 };
            this.pool.push(item);
        }

        const halfW = width / 2;
        const forwardX = Math.sin(rotationY) * (reach / 2);
        const forwardZ = Math.cos(rotationY) * (reach / 2);

        item.box.min.set(originPos.x + forwardX - halfW, originPos.y + 0.2, originPos.z + forwardZ - halfW);
        item.box.max.set(originPos.x + forwardX + halfW, originPos.y + 0.2 + height, originPos.z + forwardZ + halfW);

        item.helper.visible = true;
        item.active = true;
        item.timer = durationMs / 1000;
    }

    update(delta) {
        for (const item of this.pool) {
            if (item.active) {
                item.timer -= delta;
                if (item.timer <= 0) {
                    item.active = false;
                    item.helper.visible = false;
                }
            }
        }
    }
}

const hitboxPool = new HitboxPool(scene);

function disposeGroup(group) {
    if (!group) return;
    group.traverse(child => {
        if (child.isMesh || child.isSprite) {
            if (child.name === "nameTagSprite") activeNameTags.delete(child);
            if (child.isDummy || child.name === "dummy") activeDummies.delete(child);

            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(mat => {
                    ['map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap', 'envMap', 'alphaMap', 'aoMap', 'displacementMap', 'emissiveMap', 'gradientMap', 'metalnessMap', 'roughnessMap'].forEach(texKey => {
                        if (mat[texKey]) mat[texKey].dispose();
                    });
                    mat.dispose();
                });
            }
        }
    });
}

// --- 2. JUGADOR Y SISTEMA DE PERSONAJES ---
let playerData = window.loadPlayerSkin();
let { playerGroup, torso, leftArm, rightArm } = playerData;
window.playerGroup = playerGroup;
scene.add(playerGroup);

const playerBodyBox = new THREE.Box3();
const playerHitboxHelper = new THREE.Box3Helper(playerBodyBox, 0x00ff00);
playerHitboxHelper.visible = false;
scene.add(playerHitboxHelper);

window.spawnAttackHitbox = function(originPos, rotationY, width = 1.8, height = 1.5, reach = 2.0, durationMs = 200) {
    if (!window.GameConfig?.showHitboxes) return;
    hitboxPool.spawn(originPos, rotationY, width, height, reach, durationMs);
};

window.updateHitboxVisibility = function() {
    const isVisible = !!(window.GameConfig && window.GameConfig.showHitboxes);
    playerHitboxHelper.visible = isVisible;

    activeDummies.forEach(obj => {
        if (!obj.bodyBox) {
            obj.bodyBox = new THREE.Box3();
            obj.hitboxHelper = new THREE.Box3Helper(obj.bodyBox, 0xff0000);
            scene.add(obj.hitboxHelper);
        }
        obj.hitboxHelper.visible = isVisible && obj.visible;
    });
};

function resetCharacterState() {
    if (typeof window.resetCharacterStateCustom === 'function') {
        window.resetCharacterStateCustom(scene, playerGroup);
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

    window.canDash = true;
    window.isDashing = false;

    if (window.Cooldowns?.intervals) {
        Object.keys(window.Cooldowns.intervals).forEach(id => {
            clearInterval(window.Cooldowns.intervals[id]);
            delete window.Cooldowns.intervals[id];
            const el = typeof $ === 'function' ? $(id) : document.getElementById(id);
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

// --- CONFIGURACIÓN DE SOMBRAS ---
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

    playerData = window.loadPlayerSkin();
    playerGroup = playerData.playerGroup;
    window.playerGroup = playerGroup;
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

    registerSceneElements();
    resetCharacterState();
};

window.addEventListener('skinChanged', () => {
    const currentSavedSkin = localStorage.getItem('selectedSkin') || 'clasica';
    window.changeCharacter(currentSavedSkin);
});

if (typeof NameTagSystem !== 'undefined') {
    const currentName = window.playerUsername || "Jugador";
    NameTagSystem.attachToPlayer(playerGroup, currentName, 2.2);
}

function registerSceneElements() {
    activeNameTags.clear();
    activeDummies.clear();
    scene.traverse(obj => {
        if (obj.name === "nameTagSprite") activeNameTags.add(obj);
        if (obj.isDummy || obj.name === "dummy") activeDummies.add(obj);
    });
}

window.updateNameTagsVisibility = () => {
    const mode = window.GameConfig?.nameTagVisibility ?? 0;
    const myNameTag = playerGroup.getObjectByName("nameTagSprite");
    if (myNameTag) myNameTag.visible = !(mode === 1 || mode === 2);

    activeNameTags.forEach(obj => {
        if (obj !== myNameTag) {
            obj.visible = !(mode === 2 || mode === 3);
        }
    });
};

const defaultArmPosLeft = new THREE.Vector3(-0.27, 0.2, 0);
const defaultArmPosRight = new THREE.Vector3(0.27, 0.2, 0);
const tempArmPosLeft = new THREE.Vector3(-0.1, 0.26, 0.2);
const tempArmPosRight = new THREE.Vector3(0.1, 0.26, 0.2);

if (typeof spawnDummy === 'function') {
    spawnDummy(scene);
    registerSceneElements();
}

// --- CÁMARA Y ESTADO ---
let camDistance = window.GameConfig?.camDistance || 4.5;
window.updateCameraDistance = dist => { camDistance = dist; };

let frameCount = 0;
let lastFpsUpdate = performance.now();
let lastRenderTime = performance.now();
let memoryCleanupTimer = 0;

window.combatState = { canHit: true, HIT_COOLDOWN: 250 };

// --- HELPER DE ACTUALIZACIÓN DE SISTEMAS ---
function updateExternalSystems(delta) {
    if (typeof updateDummyRegen === 'function') updateDummyRegen(delta);
    if (typeof updateDummyBounds === 'function') updateDummyBounds();
    if (typeof checkDummyCollision === 'function') checkDummyCollision(playerGroup);
    if (typeof window.processContinuousSkills === 'function') window.processContinuousSkills(delta, scene);
    if (typeof updateProjectilesMovement === 'function') updateProjectilesMovement(delta, scene);
}

// --- 4. BUCLE PRINCIPAL ---
function animate() {
    requestAnimationFrame(animate); 

    // TRANSMISIÓN CONTINUA DE POSICIÓN (Incluso si no ha presionado iniciar)
    if (typeof window.broadcastLocalTransform === 'function' && window.playerGroup) {
        window.broadcastLocalTransform(window.playerGroup);
    }

    if (!window.isGameStarted) {
        lastRenderTime = performance.now();
        renderer.render(scene, camera);
        return;
    }

    const now = performance.now();
    if (window.GameConfig?.limitFPS && (now - lastRenderTime < (1000 / window.GameConfig.targetFPS) - 1)) return;
    const delta = Math.min((now - lastRenderTime) / 1000, 0.1); 
    lastRenderTime = now;
    frameCount++;
    
    if (now - lastFpsUpdate >= 500) { 
        if (window.GameConfig?.showFPS && typeof DOM !== 'undefined' && DOM.fpsCounter) {
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

    hitboxPool.update(delta);
    updateExternalSystems(delta);

    const isBlocking = typeof ACTIONS !== 'undefined' && !!(window.activeActions & ACTIONS.BLOQUEAR);
    const isMoving = typeof ACTIONS !== 'undefined' && !!(window.activeActions & ACTIONS.JOYSTICK);

    if (window.GameConfig?.flyEnabled && window.playerUsername === "VidMC3") {
        window.velocityY = 0;
        window.isGrounded = true;

        if (isMoving && window.touchState) {
            const camThetaVal = window.touchState.camTheta || 0;
            const camPhiVal = window.touchState.camPhi || 0;

            tempFlyDir.set(
                -Math.sin(camPhiVal) * Math.sin(camThetaVal),
                -Math.cos(camPhiVal),
                -Math.sin(camPhiVal) * Math.cos(camThetaVal)
            ).normalize();

            tempFlyRight.set(
                Math.cos(camThetaVal),
                0,
                -Math.sin(camThetaVal)
            ).normalize();

            const inputX = window.touchState.inputX || 0;
            const inputY = window.touchState.inputY || 0;

            tempMoveVector.set(0, 0, 0);
            tempMoveVector.addScaledVector(tempFlyDir, -inputY);
            tempMoveVector.addScaledVector(tempFlyRight, inputX);

            if (tempMoveVector.lengthSq() > 0) {
                tempMoveVector.normalize();
                playerGroup.position.addScaledVector(tempMoveVector, window.moveSpeed * delta);
                
                const targetRotY = Math.atan2(tempMoveVector.x, tempMoveVector.z);
                playerGroup.rotation.y = targetRotY;
            }
        }
    } else if (typeof window.updatePlayerMovement === 'function') {
        window.updatePlayerMovement(delta, isMoving, isBlocking);
    }

    const lerpSpeed = delta * 15;
    if (leftArm && rightArm) {
        leftArm.position.lerp(isBlocking ? tempArmPosLeft : defaultArmPosLeft, lerpSpeed); 
        rightArm.position.lerp(isBlocking ? tempArmPosRight : defaultArmPosRight, lerpSpeed);
    }

    const camThetaVal = window.touchState ? (window.touchState.camTheta || 0) : 0;
    const camPhiVal = window.touchState ? (window.touchState.camPhi || 0) : 0;
    headPos.set(playerGroup.position.x, playerGroup.position.y + 1.25, playerGroup.position.z);

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

    if (typeof healthBarMesh !== 'undefined' && healthBarMesh) {
        healthBarMesh.quaternion.copy(camera.quaternion);
    }

    activeNameTags.forEach(obj => {
        if (obj.visible) {
            obj.quaternion.copy(camera.quaternion);
        }
    });

    camera.updateMatrixWorld();
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);

    const showHitboxes = !!(window.GameConfig && window.GameConfig.showHitboxes);

    activeDummies.forEach(obj => {
        if (!obj.bodyBox) {
            obj.bodyBox = new THREE.Box3();
            obj.hitboxHelper = new THREE.Box3Helper(obj.bodyBox, 0xff0000);
            scene.add(obj.hitboxHelper);
        }

        const dPos = obj.position;
        obj.bodyBox.min.set(dPos.x - 0.4, dPos.y, dPos.z - 0.4);
        obj.bodyBox.max.set(dPos.x + 0.4, dPos.y + 1.8, dPos.z + 0.4);

        const inFrustum = frustum.intersectsBox(obj.bodyBox);
        obj.visible = inFrustum;

        if (obj.hitboxHelper) {
            obj.hitboxHelper.visible = showHitboxes && inFrustum;
        }
    });

    if (showHitboxes && typeof getPlayerHitboxBounds === 'function') {
        getPlayerHitboxBounds(playerGroup, playerBodyBox);
    }

    renderer.render(scene, camera);
}

// --- EVENTO RESIZE ---
const onResize = () => { 
    if (typeof DOM !== 'undefined' && DOM.warn) {
        DOM.warn.style.display = window.innerWidth < window.innerHeight ? 'flex' : 'none'; 
    }
    camera.aspect = window.innerWidth / window.innerHeight; 
    camera.updateProjectionMatrix(); 
    renderer.setSize(window.innerWidth, window.innerHeight); 
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO) * (window.GameConfig?.resolutionScale || 1.0)); 
};

window.addEventListener('resize', onResize); 
onResize(); 
registerSceneElements();
animate();

