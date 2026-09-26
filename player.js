// Player.js
// --- LÓGICA DEL JUGADOR ---

let playerMesh = null;
const PLAYER_MAX_HEALTH = 600;
let playerHealthBarMesh = null;
let playerHpGreenMesh = null;

let playerLastDamageTime = 0;
const PLAYER_REGEN_DELAY = 15000;
const PLAYER_REGEN_RATE = 20;

let isPlayerKnockbacking = false;
let playerKnockbackStartPos = new THREE.Vector3();
let playerKnockbackTargetPos = new THREE.Vector3();
let playerKnockbackStartTime = 0;
let playerKnockbackDuration = 0;
let playerKnockbackOnComplete = null;

const playerVecScratch = new THREE.Vector3();

const basePlayerMaterial = new THREE.MeshStandardMaterial({ color: 0x0088ff, roughness: 0.6 });
const playerRedDamageColor = new THREE.Color(0xff0000);
const playerOriginalColor = new THREE.Color(0x0088ff);
const playerBarBgMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
const playerBarHpMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });

let playerDamageTimeoutId = null;

function createPlayerHealthBar() {
    const group = new THREE.Group();

    const bgGeo = new THREE.PlaneGeometry(0.8, 0.1);
    group.add(new THREE.Mesh(bgGeo, playerBarBgMaterial));

    const hpGeo = new THREE.PlaneGeometry(0.8, 0.1);
    hpGeo.translate(0.4, 0, 0); 
    
    playerHpGreenMesh = new THREE.Mesh(hpGeo, playerBarHpMaterial.clone());
    playerHpGreenMesh.position.x = -0.4;
    playerHpGreenMesh.name = "playerHealthGreen";
    group.add(playerHpGreenMesh);

    group.position.set(0, 1.6, 0);
    return group;
}

function updatePlayerHealthBarVisual(target = playerMesh) {
    if (!target || !playerHpGreenMesh) return;
    
    const currentHealth = target.userData.health ?? PLAYER_MAX_HEALTH;
    const pct = Math.max(0, currentHealth / PLAYER_MAX_HEALTH);
    
    playerHpGreenMesh.scale.x = pct;
    playerHpGreenMesh.material.color.setHex(pct < 0.35 ? 0xff0000 : 0x00ff00);

    if (target.userData.isLocalPlayer && typeof window.updatePlayerHUDHealth === 'function') {
        window.updatePlayerHUDHealth(currentHealth, PLAYER_MAX_HEALTH);
    }
}

function updatePlayerHealthBarRotation(camera) {
    if (playerHealthBarMesh && camera) {
        playerHealthBarMesh.lookAt(camera.position);
    }
}

function applyPlayerKnockback(directionVector, totalDistance = 0.5, durationMs = 100, onComplete = null) {
    if (!playerMesh) return;

    playerKnockbackStartPos.copy(playerMesh.position);
    playerKnockbackTargetPos.copy(playerMesh.position).addScaledVector(directionVector, totalDistance);
    
    if (typeof clampToMapBounds === 'function') {
        clampToMapBounds(playerKnockbackTargetPos);
    }

    playerKnockbackStartTime = performance.now();
    playerKnockbackDuration = durationMs;
    playerKnockbackOnComplete = onComplete;
    isPlayerKnockbacking = true;
}

function applyPlayerRagdoll(targetEntity, pushDirection, delayMs = 200) {
    const target = targetEntity || playerMesh;
    if (!target || target.userData.isDown) return;

    target.userData.isDown = true;

    setTimeout(() => {
        if (!target) return;

        const angle = Math.atan2(pushDirection.x, pushDirection.z);

        target.rotation.set(0, angle, 0);
        target.rotateX(-Math.PI / 2);
        target.position.y = 0.15; 

        if (playerHealthBarMesh) playerHealthBarMesh.visible = false;

        setTimeout(() => {
            if (target && target.userData.health > 0) {
                target.rotation.set(0, angle, 0);
                target.position.y = 0;
                target.userData.isDown = false;
                
                if (playerHealthBarMesh && target.userData.isRemotePlayer) {
                    playerHealthBarMesh.visible = true;
                }
            }
        }, 1000);
    }, delayMs);
}

function spawnPlayer(scene, isLocalPlayer = true) {
    cleanPlayer(scene);

    playerMesh = new THREE.Group();
    
    const instanceMaterial = basePlayerMaterial.clone();

    const addPlayerPart = (geoArgs, x, y, z) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...geoArgs), instanceMaterial);
        mesh.position.set(x, y, z);
        playerMesh.add(mesh);
    };

    addPlayerPart([0.16, 0.5, 0.16], -0.16, 0.25, 0); 
    addPlayerPart([0.16, 0.5, 0.16], 0.16, 0.25, 0);  
    addPlayerPart([0.48, 0.6, 0.24], 0, 0.8, 0);      
    addPlayerPart([0.12, 0.55, 0.12], -0.32, 0.77, 0); 
    addPlayerPart([0.12, 0.55, 0.12], 0.32, 0.77, 0);  

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), instanceMaterial);
    head.position.set(0, 1.22, 0);
    playerMesh.add(head);

    playerHealthBarMesh = createPlayerHealthBar();
    playerMesh.add(playerHealthBarMesh);

    if (isLocalPlayer) {
        playerHealthBarMesh.visible = false;
    }

    playerMesh.position.set(0, 0, 0);
    
    playerMesh.name = isLocalPlayer ? "LocalPlayer" : "RemotePlayer";
    playerMesh.uuid = isLocalPlayer ? "local_player" : ("remote_" + Math.random().toString(36).substr(2, 9));
    playerMesh.userData.isPlayer = true;
    playerMesh.userData.isLocalPlayer = isLocalPlayer;
    playerMesh.userData.isRemotePlayer = !isLocalPlayer;
    playerMesh.userData.isDown = false;
    playerMesh.userData.health = PLAYER_MAX_HEALTH;
    playerMesh.userData.material = instanceMaterial;
    
    scene.add(playerMesh);
    playerLastDamageTime = performance.now();
    
    updatePlayerHealthBarVisual(playerMesh);
}

function cleanPlayer(scene) {
    if (playerMesh) {
        if (playerDamageTimeoutId) clearTimeout(playerDamageTimeoutId);
        scene.remove(playerMesh);
        
        playerMesh.traverse((child) => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (child.material) child.material.dispose();
            }
        });
        
        if (playerHpGreenMesh) {
            playerHpGreenMesh.material.dispose();
            playerHpGreenMesh = null;
        }
        
        playerMesh = null;
        playerHealthBarMesh = null;
        isPlayerKnockbacking = false;
    }
}

function receivePlayerDamage(amount, attackerPosition, isPhysicalHit = true, isFinisher = false, scene = null, targetEntity = null) {
    const target = targetEntity || playerMesh;
    if (!target) return;

    if (attackerPosition && target.position.distanceToSquared(attackerPosition) < 0.01) {
        return;
    }

    if (target.userData && target.userData.isDummy) {
        if (typeof receiveDamage === 'function') {
            receiveDamage(amount, attackerPosition, isPhysicalHit, isFinisher, scene);
        }
        return;
    }

    if (target.userData.isDown && isPhysicalHit) {
        return;
    }

    target.userData.health = Math.max(0, (target.userData.health ?? PLAYER_MAX_HEALTH) - amount);
    playerLastDamageTime = performance.now();

    if (isPhysicalHit && attackerPosition) {
        playerVecScratch.subVectors(target.position, attackerPosition);
        playerVecScratch.y = 0;
        playerVecScratch.normalize();

        if (isFinisher) {
            applyPlayerKnockback(playerVecScratch, 2.0, 200);
            applyPlayerRagdoll(target, playerVecScratch, 200);
        } else {
            applyPlayerKnockback(playerVecScratch, 0.45, 110);
        }
    }

    updatePlayerHealthBarVisual(target);

    const mat = target.userData.material;
    if (mat) {
        mat.color.copy(playerRedDamageColor);

        if (playerDamageTimeoutId) clearTimeout(playerDamageTimeoutId);
        playerDamageTimeoutId = setTimeout(() => {
            if (target && target.userData.health > 0) {
                mat.color.copy(playerOriginalColor);
            }
        }, 150);
    }

    if (target.userData.health <= 0) {
        cleanPlayer(scene);
        setTimeout(() => { 
            if (scene) spawnPlayer(scene, true); 
        }, 2000);
    }
}

function updatePlayerRegen(deltaTime) {
    if (isPlayerKnockbacking && playerMesh) {
        const elapsed = performance.now() - playerKnockbackStartTime;
        const progress = Math.min(elapsed / playerKnockbackDuration, 1);

        playerMesh.position.lerpVectors(playerKnockbackStartPos, playerKnockbackTargetPos, progress);
        
        if (typeof clampToMapBounds === 'function') {
            clampToMapBounds(playerMesh.position);
        }

        if (progress >= 1) {
            isPlayerKnockbacking = false;
            if (typeof playerKnockbackOnComplete === 'function') {
                playerKnockbackOnComplete();
            }
        }
    }

    if (!playerMesh || playerMesh.userData.health <= 0 || playerMesh.userData.health >= PLAYER_MAX_HEALTH) return;

    const currentTime = performance.now();
    if (currentTime - playerLastDamageTime >= PLAYER_REGEN_DELAY) {
        playerMesh.userData.health = Math.min(PLAYER_MAX_HEALTH, playerMesh.userData.health + PLAYER_REGEN_RATE * deltaTime);
        updatePlayerHealthBarVisual(playerMesh);
    }
}

