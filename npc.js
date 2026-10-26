// --- LÓGICA DEL NPC (DUMMY) AUTÓNOMO OPTIMIZADA ---

let currentScene = null; // Referencia global a la escena activa
let dummyMesh = null;
let dummyHealth = 600;
const DUMMY_MAX_HEALTH = 600;
let healthBarMesh = null;
let hpGreenMesh = null;

// Variables para la regeneración de vida
let lastDamageTime = 0;
const REGEN_DELAY = 15000;
const REGEN_RATE = 20;

// Variables para animación de empuje (Knockback)
let isKnockbacking = false;
let knockbackStartPos = new THREE.Vector3();
let knockbackTargetPos = new THREE.Vector3();
let knockbackStartTime = 0;
let knockbackDuration = 0;
let knockbackOnComplete = null;

// Reutilización de objetos en memoria para evitar Garbage Collection
const vecScratch = new THREE.Vector3();
const MAP_LIMITS_DEFAULT = { minX: -9.5, maxX: 9.5, minZ: -9.5, maxZ: 9.5 };

// Materiales y Geometrías cacheados para reutilización
const sharedGreenMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff44, roughness: 0.6 });
const redDamageColor = new THREE.Color(0xff0000);
const originalGreenColor = new THREE.Color(0x00ff44);
const barBgMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
const barHpMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });

// Geometrías compartidas para la barra de vida
const barBgGeo = new THREE.PlaneGeometry(0.8, 0.1);
const barHpGeo = new THREE.PlaneGeometry(0.8, 0.1);
barHpGeo.translate(0.4, 0, 0);

let damageTimeoutId = null;
let ragdollDelayTimeoutId = null;
let ragdollRecoverTimeoutId = null;
let respawnTimeoutId = null;

function createHealthBar() {
    const group = new THREE.Group();

    const bgMesh = new THREE.Mesh(barBgGeo, barBgMaterial);
    group.add(bgMesh);

    hpGreenMesh = new THREE.Mesh(barHpGeo, barHpMaterial.clone());
    hpGreenMesh.position.x = -0.4;
    hpGreenMesh.name = "healthGreen";
    group.add(hpGreenMesh);

    group.position.set(0, 1.6, 0);
    return group;
}

function updateHealthBarVisual() {
    if (!dummyMesh || !hpGreenMesh) return;
    const pct = Math.max(0, dummyHealth / DUMMY_MAX_HEALTH);
    hpGreenMesh.scale.x = pct;
    
    if (pct < 0.35) {
        hpGreenMesh.material.color.setHex(0xff0000);
    } else {
        hpGreenMesh.material.color.setHex(0x00ff00);
    }
}

function updateHealthBarRotation(camera) {
    if (healthBarMesh && camera) {
        healthBarMesh.lookAt(camera.position);
    }
}

function clampToMapBounds(position) {
    const limits = (typeof MAP_LIMITS !== 'undefined') ? MAP_LIMITS : MAP_LIMITS_DEFAULT;
    position.x = Math.max(limits.minX, Math.min(limits.maxX, position.x));
    position.z = Math.max(limits.minZ, Math.min(limits.maxZ, position.z));
}

function updateDummyBounds() {
    if (dummyMesh) {
        clampToMapBounds(dummyMesh.position);
    }
}

function applyKnockback(directionVector, totalDistance = 0.5, durationMs = 100, onComplete = null) {
    if (!dummyMesh) return;

    knockbackStartPos.copy(dummyMesh.position);
    knockbackTargetPos.copy(dummyMesh.position).addScaledVector(directionVector, totalDistance);
    clampToMapBounds(knockbackTargetPos);

    knockbackStartTime = performance.now();
    knockbackDuration = durationMs;
    knockbackOnComplete = onComplete;
    isKnockbacking = true;
}

// --- MECÁNICA DE RAGDOLL / KNOCKDOWN CON ORIENTACIÓN FÍSICA ---
function applyRagdoll(targetEntity, pushDirection, delayMs = 200) {
    const target = targetEntity || dummyMesh;
    if (!target || target.userData.isDown) return;

    target.userData.isDown = true;

    if (ragdollDelayTimeoutId) clearTimeout(ragdollDelayTimeoutId);
    ragdollDelayTimeoutId = setTimeout(() => {
        if (!target || !dummyMesh || dummyHealth <= 0) return;

        const angle = Math.atan2(pushDirection.x, pushDirection.z);

        target.rotation.set(0, 0, 0);
        target.rotation.y = angle;
        target.rotateX(-Math.PI / 2);
        target.position.y = 0.15; 

        if (healthBarMesh) healthBarMesh.visible = false;

        if (ragdollRecoverTimeoutId) clearTimeout(ragdollRecoverTimeoutId);
        ragdollRecoverTimeoutId = setTimeout(() => {
            if (target && dummyMesh && dummyHealth > 0) {
                target.rotation.set(0, angle, 0);
                target.position.y = 0;
                target.userData.isDown = false;
                if (healthBarMesh) healthBarMesh.visible = true;
            }
        }, 1000);
    }, delayMs);
}

function spawnDummy(scene) {
    if (scene) currentScene = scene;

    cleanDummy();

    dummyMesh = new THREE.Group();

    const addDummyPart = (geoArgs, x, y, z) => {
        const geo = new THREE.BoxGeometry(...geoArgs);
        const mesh = new THREE.Mesh(geo, sharedGreenMaterial);
        mesh.position.set(x, y, z);
        dummyMesh.add(mesh);
    };

    // Partes del cuerpo (Piernas, Torso, Brazos)
    addDummyPart([0.16, 0.5, 0.16], -0.16, 0.25, 0); 
    addDummyPart([0.16, 0.5, 0.16], 0.16, 0.25, 0);  
    addDummyPart([0.48, 0.6, 0.24], 0, 0.8, 0);      
    addDummyPart([0.12, 0.55, 0.12], -0.32, 0.77, 0); 
    addDummyPart([0.12, 0.55, 0.12], 0.32, 0.77, 0);  

    // Cabeza
    const headGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const head = new THREE.Mesh(headGeo, sharedGreenMaterial);
    head.position.set(0, 1.22, 0);
    dummyMesh.add(head);

    // Barra de salud
    healthBarMesh = createHealthBar();
    dummyMesh.add(healthBarMesh);

    dummyMesh.position.set(0, 0, 0);
    
    dummyMesh.name = "Dummy";
    dummyMesh.userData.isDummy = true;
    dummyMesh.userData.isDown = false;
    
    if (currentScene) currentScene.add(dummyMesh);
    
    dummyHealth = DUMMY_MAX_HEALTH;
    lastDamageTime = performance.now();
    sharedGreenMaterial.color.copy(originalGreenColor);
    updateHealthBarVisual();
}

function cleanDummy(scene = null) {
    const targetScene = scene || currentScene;

    // Cancelar todos los temporizadores activos
    if (damageTimeoutId) { clearTimeout(damageTimeoutId); damageTimeoutId = null; }
    if (ragdollDelayTimeoutId) { clearTimeout(ragdollDelayTimeoutId); ragdollDelayTimeoutId = null; }
    if (ragdollRecoverTimeoutId) { clearTimeout(ragdollRecoverTimeoutId); ragdollRecoverTimeoutId = null; }
    if (respawnTimeoutId) { clearTimeout(respawnTimeoutId); respawnTimeoutId = null; }

    if (dummyMesh) {
        if (dummyMesh.parent) {
            dummyMesh.parent.remove(dummyMesh);
        } else if (targetScene) {
            targetScene.remove(dummyMesh);
        }
        
        dummyMesh.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry && child.geometry !== barBgGeo && child.geometry !== barHpGeo) {
                    child.geometry.dispose();
                }
                if (child.name === "healthGreen" && child.material) {
                    child.material.dispose();
                }
            }
        });
        
        hpGreenMesh = null;
        dummyMesh = null;
        healthBarMesh = null;
        isKnockbacking = false;
        knockbackOnComplete = null;
    }

    sharedGreenMaterial.color.copy(originalGreenColor);
}

// Función central de impacto
function receiveDamage(amount, attackerPosition, isPhysicalHit = true, isFinisher = false, scene = null) {
    if (scene) currentScene = scene;
    if (!dummyMesh || dummyHealth <= 0) return;

    if (dummyMesh.userData.isDown && isPhysicalHit) {
        return;
    }

    dummyHealth = Math.max(0, dummyHealth - amount);
    lastDamageTime = performance.now();

    if (typeof addUltiCharge === 'function') addUltiCharge(20);

    if (isPhysicalHit && attackerPosition) {
        vecScratch.subVectors(dummyMesh.position, attackerPosition);
        vecScratch.y = 0;
        
        if (vecScratch.lengthSq() > 0.00001) {
            vecScratch.normalize();
        } else {
            vecScratch.set(0, 0, 1);
        }

        if (isFinisher) {
            applyKnockback(vecScratch, 2.0, 200);
            applyRagdoll(dummyMesh, vecScratch, 200);
        } else {
            applyKnockback(vecScratch, 0.45, 110);
        }
    }

    updateHealthBarVisual();

    sharedGreenMaterial.color.copy(redDamageColor);

    if (damageTimeoutId) clearTimeout(damageTimeoutId);
    damageTimeoutId = setTimeout(() => {
        if (dummyMesh && dummyHealth > 0) {
            sharedGreenMaterial.color.copy(originalGreenColor);
        }
    }, 150);

    if (dummyHealth <= 0) {
        cleanDummy();
        respawnTimeoutId = setTimeout(() => { 
            if (currentScene) spawnDummy(currentScene); 
        }, 2000);
    }
}

function updateDummyRegen(deltaTime) {
    if (isKnockbacking && dummyMesh) {
        const elapsed = performance.now() - knockbackStartTime;
        const progress = Math.min(elapsed / knockbackDuration, 1);

        dummyMesh.position.lerpVectors(knockbackStartPos, knockbackTargetPos, progress);
        clampToMapBounds(dummyMesh.position);

        if (progress >= 1) {
            isKnockbacking = false;
            if (typeof knockbackOnComplete === 'function') {
                const cb = knockbackOnComplete;
                knockbackOnComplete = null;
                cb();
            }
        }
    }

    if (!dummyMesh || dummyHealth <= 0 || dummyHealth >= DUMMY_MAX_HEALTH) return;

    const currentTime = performance.now();
    if (currentTime - lastDamageTime >= REGEN_DELAY) {
        dummyHealth = Math.min(DUMMY_MAX_HEALTH, dummyHealth + REGEN_RATE * deltaTime);
        updateHealthBarVisual();
    }
}

// Colisión física 360° y plataforma superior
function checkDummyCollision(playerGroup) {
    if (!dummyMesh || !playerGroup) return;

    const playerRadius = 0.4;
    const dummyRadius = dummyMesh.userData.isDown ? 0.45 : 0.55; 
    const minDistance = playerRadius + dummyRadius;

    let dx = playerGroup.position.x - dummyMesh.position.x;
    let dz = playerGroup.position.z - dummyMesh.position.z;
    let distanceXZSquared = dx * dx + dz * dz;

    if (distanceXZSquared < minDistance * minDistance) {
        const distanceXZ = Math.sqrt(distanceXZSquared);
        const dummyTopY = dummyMesh.userData.isDown ? 0.35 : 1.42;
        const surfaceY = dummyMesh.position.y + dummyTopY;

        // Si el jugador está por encima o cayendo sobre la cabeza/plataforma del Dummy
        if (playerGroup.position.y >= surfaceY - 0.25) {
            playerGroup.position.y = surfaceY;
            if (typeof window.velocityY !== 'undefined') window.velocityY = 0;
            if (typeof window.isGrounded !== 'undefined') window.isGrounded = true;
            return; // Permite estar encima sin empujarlo hacia los lados
        }

        // Colisión lateral (si no está arriba)
        if (distanceXZ > 0.0001) {
            const overlap = minDistance - distanceXZ;
            playerGroup.position.x += (dx / distanceXZ) * overlap;
            playerGroup.position.z += (dz / distanceXZ) * overlap;
        } else {
            playerGroup.position.x += minDistance;
        }

        clampToMapBounds(playerGroup.position);
        clampToMapBounds(dummyMesh.position);
    }
}

