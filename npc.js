// --- LÓGICA DEL NPC (DUMMY) AUTÓNOMO ---

let dummyMesh = null;
let dummyHealth = 600;
const DUMMY_MAX_HEALTH = 600;
let healthBarMesh = null;

// Variables para la regeneración de vida
let lastDamageTime = 0;
const REGEN_DELAY = 15000; // 15 segundos en milisegundos
const REGEN_RATE = 20;      // Puntos de vida regenerados por segundo

function createHealthBar() {
    const group = new THREE.Group();

    const bgGeo = new THREE.PlaneGeometry(0.8, 0.1);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
    group.add(new THREE.Mesh(bgGeo, bgMat));

    const hpGeo = new THREE.PlaneGeometry(0.8, 0.1);
    hpGeo.translate(0.4, 0, 0); 
    
    const hpMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    const hp = new THREE.Mesh(hpGeo, hpMat);
    hp.position.x = -0.4;
    hp.name = "healthGreen";
    group.add(hp);

    group.position.set(0, 1.6, 0);
    return group;
}

function updateHealthBarVisual() {
    if (!dummyMesh) return;
    const hpGreen = dummyMesh.getObjectByName("healthGreen");
    if (hpGreen) {
        const pct = Math.max(0, dummyHealth / DUMMY_MAX_HEALTH);
        hpGreen.scale.x = pct;
        hpGreen.material.color.setHex(pct < 0.35 ? 0xff0000 : 0x00ff00);
    }
}

function updateHealthBarRotation(camera) {
    if (healthBarMesh && camera) {
        healthBarMesh.lookAt(camera.position);
    }
}

function clampToMapBounds(position) {
    const limits = (typeof MAP_LIMITS !== 'undefined') ? MAP_LIMITS : { minX: -9.5, maxX: 9.5, minZ: -9.5, maxZ: 9.5 };
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

    const startPos = dummyMesh.position.clone();
    const targetPos = startPos.clone().addScaledVector(directionVector, totalDistance);
    clampToMapBounds(targetPos);

    const startTime = performance.now();

    function step(currentTime) {
        if (!dummyMesh) return;

        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / durationMs, 1);

        dummyMesh.position.lerpVectors(startPos, targetPos, progress);
        clampToMapBounds(dummyMesh.position);

        if (progress < 1) {
            requestAnimationFrame(step);
        } else if (typeof onComplete === 'function') {
            onComplete();
        }
    }

    requestAnimationFrame(step);
}

// --- MECÁNICA DE RAGDOLL / KNOCKDOWN CON ORIENTACIÓN FÍSICA ---
function applyRagdoll(targetEntity, pushDirection, delayMs = 180) {
    const target = targetEntity || dummyMesh;
    if (!target || target.userData.isDown) return;

    target.userData.isDown = true;

    setTimeout(() => {
        if (!target) return;

        // Calcular la dirección hacia donde fue empujado en el plano XZ
        const angle = Math.atan2(pushDirection.x, pushDirection.z);

        // Orienta al NPC mirando hacia la dirección del impacto y lo tumba de espaldas/frente
        target.rotation.set(0, angle, 0);
        target.rotateX(-Math.PI / 2);
        target.position.y = 0.15; 

        if (healthBarMesh) healthBarMesh.visible = false;

        // Levantarse después de 2 segundos manteniendo la dirección donde quedó mirando
        setTimeout(() => {
            if (target && dummyHealth > 0) {
                // Mantiene la rotación en Y pero restaura la verticalidad en X y Z
                target.rotation.set(0, angle, 0);
                target.position.y = 0;
                target.userData.isDown = false;
                if (healthBarMesh) healthBarMesh.visible = true;
            }
        }, 2000);
    }, delayMs);
}

function spawnDummy(scene) {
    cleanDummy(scene);

    dummyMesh = new THREE.Group();

    const createMaterial = () => new THREE.MeshStandardMaterial({ color: 0x00ff44, roughness: 0.6 });

    const addDummyPart = (geoArgs, x, y, z) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...geoArgs), createMaterial());
        mesh.position.set(x, y, z);
        dummyMesh.add(mesh);
    };

    addDummyPart([0.16, 0.5, 0.16], -0.16, 0.25, 0); 
    addDummyPart([0.16, 0.5, 0.16], 0.16, 0.25, 0);  
    addDummyPart([0.48, 0.6, 0.24], 0, 0.8, 0);      
    addDummyPart([0.12, 0.55, 0.12], -0.32, 0.77, 0); 
    addDummyPart([0.12, 0.55, 0.12], 0.32, 0.77, 0);  

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), createMaterial());
    head.position.set(0, 1.22, 0);
    dummyMesh.add(head);

    healthBarMesh = createHealthBar();
    dummyMesh.add(healthBarMesh);

    dummyMesh.position.set(0, 0, 0);
    
    dummyMesh.name = "Dummy";
    dummyMesh.userData.isDummy = true;
    dummyMesh.userData.isDown = false;
    
    scene.add(dummyMesh);
    dummyHealth = DUMMY_MAX_HEALTH;
    lastDamageTime = performance.now();
    updateHealthBarVisual();
    console.log("¡Dummy ha aparecido en el centro!");
}

function cleanDummy(scene) {
    if (dummyMesh) {
        scene.remove(dummyMesh);
        dummyMesh.traverse((child) => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        dummyMesh = null;
        healthBarMesh = null;
    }
}

// Función central de impacto que recibe el daño directamente desde combate.js
function receiveDamage(amount, attackerPosition, isPhysicalHit = true, isFinisher = false) {
    if (!dummyMesh) return;

    // Inmune a golpes básicos mientras está en el suelo
    if (dummyMesh.userData.isDown && isPhysicalHit) {
        return;
    }

    dummyHealth = Math.max(0, dummyHealth - amount);
    lastDamageTime = performance.now();

    if (typeof addUltiCharge === 'function') addUltiCharge(20);

    if (isPhysicalHit && attackerPosition) {
        const knockbackDir = new THREE.Vector3()
            .subVectors(dummyMesh.position, attackerPosition)
            .normalize();
        knockbackDir.y = 0;

        if (isFinisher) {
            // Golpe 4: Empuje fuerte y posterior caída dinámica
            applyKnockback(knockbackDir, 1.5, 180);
            applyRagdoll(dummyMesh, knockbackDir, 180);
        } else {
            // Golpes normales
            applyKnockback(knockbackDir, 0.45, 110);
        }
    }

    updateHealthBarVisual();

    // Feedback visual de color (rojo temporal)
    dummyMesh.traverse((child) => {
        if (child.isMesh && child.name !== "healthGreen" && child.geometry.type !== "PlaneGeometry") {
            child.material.color.setHex(0xff0000);
        }
    });

    setTimeout(() => {
        if (dummyMesh && dummyHealth > 0) {
            dummyMesh.traverse((child) => {
                if (child.isMesh && child.name !== "healthGreen" && child.geometry.type !== "PlaneGeometry") {
                    child.material.color.setHex(0x00ff44);
                }
            });
        }
    }, 150);

    if (dummyHealth <= 0) {
        console.log("¡Dummy derrotado!");
        cleanDummy(scene);
        setTimeout(() => spawnDummy(scene), 2000);
    }
}

function updateDummyRegen(deltaTime) {
    if (!dummyMesh || dummyHealth <= 0 || dummyHealth >= DUMMY_MAX_HEALTH) return;

    const currentTime = performance.now();
    if (currentTime - lastDamageTime >= REGEN_DELAY) {
        dummyHealth = Math.min(DUMMY_MAX_HEALTH, dummyHealth + REGEN_RATE * deltaTime);
        updateHealthBarVisual();
    }
}

// Colisión física bidireccional entre el Jugador y el NPC (Con chequeo de altura Y)
function checkDummyCollision(playerGroup) {
    if (!dummyMesh || !playerGroup) return;

    // Si el jugador está sobre la cabeza del dummy, no lo desplaza
    const dummyTopY = dummyMesh.userData.isDown ? 0.3 : 1.3;
    if (playerGroup.position.y > dummyMesh.position.y + dummyTopY) {
        return; 
    }

    const playerRadius = 0.4;
    const dummyRadius = dummyMesh.userData.isDown ? 0.3 : 0.55; 
    const minDistance = playerRadius + dummyRadius;

    const dx = playerGroup.position.x - dummyMesh.position.x;
    const dz = playerGroup.position.z - dummyMesh.position.z;
    const distanceXZ = Math.sqrt(dx * dx + dz * dz);

    if (distanceXZ < minDistance && distanceXZ > 0) {
        const overlap = minDistance - distanceXZ;
        
        playerGroup.position.x += (dx / distanceXZ) * overlap;
        playerGroup.position.z += (dz / distanceXZ) * overlap;

        clampToMapBounds(playerGroup.position);
        clampToMapBounds(dummyMesh.position);
    }
}

