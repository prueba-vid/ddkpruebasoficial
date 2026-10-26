// --- SISTEMA DE HABILIDADES Y COOLDOWNS PARA RYU (js/ryu.js) ---

const RYU_BASE_DAMAGE = 25;

const ryuCooldowns = {
    SPEC: false,
    ACT1: false,
    ACT2: false,
    ACT3: false,
    ACT4: false
};

// --- MATERIALES DE RYU ---
const RYU_COIN_MAT = new THREE.MeshStandardMaterial({ color: 0xE5E4E2, roughness: 0.3, metalness: 0.8 });
const RYU_WIND_MAT = new THREE.MeshPhysicalMaterial({
    color: 0xE0FFFF,
    emissive: 0x87CEEB,
    roughness: 0.1,
    transmission: 0.9,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide
});

function triggerRyuCooldown(btnId, durationSeconds, cdKey) {
    ryuCooldowns[cdKey] = true;
    const btn = document.getElementById(btnId);
    if (!btn) return;

    let overlay = btn.querySelector('.cd-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'cd-overlay';
        btn.appendChild(overlay);
    }

    let timeLeft = durationSeconds;
    overlay.textContent = timeLeft;

    const interval = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) {
            overlay.textContent = timeLeft;
        } else {
            clearInterval(interval);
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            ryuCooldowns[cdKey] = false;
        }
    }, 1000);
}

function canUseRyuSkill(activeActions, currentCharacter) {
    const char = currentCharacter || window.currentCharacter;
    if (char !== 'Ryu') return false;
    if (typeof ACTIONS !== 'undefined' && activeActions & ACTIONS.BLOQUEAR) return false;
    return true;
}

function disposeMesh(mesh, targetScene) {
    if (!mesh) return;
    if (targetScene) targetScene.remove(mesh);
    else if (mesh.parent) mesh.parent.remove(mesh);

    mesh.traverse((child) => {
        if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }
    });
}

// --- GENERADOR DE ROCAS ---
function createRockMesh() {
    const rockGroup = new THREE.Group();

    const rockColors = [0x555555, 0x444444, 0x666059, 0x333333];
    const randomColor = rockColors[Math.floor(Math.random() * rockColors.length)];
    
    const rockMat = new THREE.MeshLambertMaterial({
        color: randomColor,
        wireframe: false
    });

    const mainGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const mainMesh = new THREE.Mesh(mainGeo, rockMat);
    mainMesh.rotation.set(Math.random(), Math.random(), Math.random());
    rockGroup.add(mainMesh);

    const subGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    subMesh = new THREE.Mesh(subGeo, rockMat);
    subMesh.position.set(0.1, -0.05, 0.08);
    subMesh.rotation.set(Math.random(), Math.random(), Math.random());
    rockGroup.add(subMesh);

    rockGroup.scale.set(0.9, 0.9, 0.9);
    return rockGroup;
}

// --- FUNCIÓN AUXILIAR PARA MOSTRAR MONEDA (VARIANTE DE ATC4 CON ESPECIAL) ---
function fireRyuCoin(playerGroup, activeScene) {
    const coinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16);
    const coin = new THREE.Mesh(coinGeo, RYU_COIN_MAT);
    
    const playerRot = playerGroup.rotation.y;
    const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRot).normalize();
    
    coin.position.copy(playerGroup.position).add(new THREE.Vector3(0, 1.2, 0));
    coin.rotation.x = Math.PI / 2;
    if (activeScene) activeScene.add(coin);

    let distanceTraveled = 0;
    const maxDistance = 12.0;
    const speed = 30.0;
    let lastTime = performance.now();

    function animateCoin(now) {
        const dt = (now - lastTime) / 1000;
        lastTime = now;

        const moveStep = speed * dt;
        coin.position.addScaledVector(dir, moveStep);
        coin.rotation.z += 24.0 * dt;
        distanceTraveled += moveStep;

        if (typeof dummyMesh !== 'undefined' && dummyMesh) {
            const coinPos = coin.position.clone();
            const enemyPos = dummyMesh.position.clone().add(new THREE.Vector3(0, 0.8, 0));
            
            if (coinPos.distanceTo(enemyPos) < 0.9) {
                // Daño: 32% más que el básico (25 * 1.32 = 33)
                const damage = RYU_BASE_DAMAGE * 1.32;
                if (typeof applySkillDamage === 'function') applySkillDamage(damage);
                disposeMesh(coin, activeScene);
                return;
            }
        }

        if (distanceTraveled < maxDistance) {
            requestAnimationFrame(animateCoin);
        } else {
            disposeMesh(coin, activeScene);
        }
    }

    requestAnimationFrame(animateCoin);
}

// --- HABILIDAD ESPACIAL: ONDA DE VIENTO (SIN VARIANTE AÉREA) ---
function useRyuSpecial(playerGroup, scene, activeActions, currentCharacter) {
    if (!canUseRyuSkill(activeActions, currentCharacter)) return;
    if (ryuCooldowns.SPEC) return;

    triggerRyuCooldown('specBtn', 9, 'SPEC');

    const activeScene = scene || playerGroup.parent || (typeof window.scene !== 'undefined' ? window.scene : null);

    const windGeo = new THREE.ConeGeometry(1.1, 1.8, 16);
    const windMesh = new THREE.Mesh(windGeo, RYU_WIND_MAT);

    const playerRot = playerGroup.rotation.y;
    let dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRot).normalize();

    // Onda horizontal en tierra
    windMesh.rotation.x = Math.PI / 2;
    windMesh.rotation.z = -playerRot;
    windMesh.position.copy(playerGroup.position).add(new THREE.Vector3(0, 0.9, 0));

    if (activeScene) {
        activeScene.add(windMesh);
    }

    let progress = 0;
    const maxProgress = 0.3;
    let lastTime = performance.now();

    function animateWind(now) {
        let dt = (now - lastTime) / 1000;
        lastTime = now;

        progress += 2.1 * dt;
        windMesh.position.addScaledVector(dir, 16.8 * dt);
        windMesh.scale.add(new THREE.Vector3(3.0 * dt, 3.0 * dt, 3.0 * dt));

        if (typeof dummyMesh !== 'undefined' && dummyMesh) {
            const windPos = windMesh.position.clone();
            const enemyPos = dummyMesh.position.clone();

            if (windPos.distanceTo(enemyPos) < 1.5) {
                dummyMesh.position.addScaledVector(dir, 13.2 * dt);
            }
        }

        if (progress < maxProgress) {
            requestAnimationFrame(animateWind);
        } else {
            disposeMesh(windMesh, activeScene);
        }
    }

    requestAnimationFrame(animateWind);
}

// --- 1. ATC1: DASH Y GOLPE (+48% DAÑO, 18s CD) ---
function useRyuAct1(playerGroup, scene, activeActions, currentCharacter) {
    if (!canUseRyuSkill(activeActions, currentCharacter)) return;
    if (ryuCooldowns.ACT1) return;
    triggerRyuCooldown('act1', 18, 'ACT1');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT1');

    const playerRot = playerGroup.rotation.y;
    const dashDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRot).normalize();

    let startTime = performance.now();
    let lastTime = performance.now();
    const dashDuration = 0.25;
    const dashSpeed = 18.0;
    let hasHit = false;

    function animateDashPunch(now) {
        let dt = (now - lastTime) / 1000;
        lastTime = now;

        let elapsed = (now - startTime) / 1000;
        let progress = Math.min(elapsed / dashDuration, 1.0);

        playerGroup.position.addScaledVector(dashDir, dashSpeed * dt);

        if (!hasHit && typeof dummyMesh !== 'undefined' && dummyMesh) {
            const playerPos = playerGroup.position.clone();
            const enemyPos = dummyMesh.position.clone();
            playerPos.y = 0;
            enemyPos.y = 0;

            if (playerPos.distanceTo(enemyPos) < 1.1) {
                hasHit = true;
                // Daño: 48% más que el básico (25 * 1.48 = 37)
                const damage = RYU_BASE_DAMAGE * 1.48;
                if (typeof applySkillDamage === 'function') applySkillDamage(damage);
            }
        }

        if (progress < 1.0 && !hasHit) {
            requestAnimationFrame(animateDashPunch);
        } else if (!hasHit) {
            // Golpe al finalizar el dash aunque no haya chocado antes
            if (typeof dummyMesh !== 'undefined' && dummyMesh) {
                const playerPos = playerGroup.position.clone();
                const enemyPos = dummyMesh.position.clone();
                playerPos.y = 0;
                enemyPos.y = 0;

                if (playerPos.distanceTo(enemyPos) < 1.5) {
                    const damage = RYU_BASE_DAMAGE * 1.48;
                    if (typeof applySkillDamage === 'function') applySkillDamage(damage);
                }
            }
        }
    }

    requestAnimationFrame(animateDashPunch);
}

// --- 2. ATC2: PISTÓN + 3 PIEDRAS AL FRENTE EN LÍNEA RECTA (+35% DAÑO C/U, 16s CD) ---
function useRyuAct2(playerGroup, scene, activeActions, currentCharacter) {
    if (!canUseRyuSkill(activeActions, currentCharacter)) return;
    if (ryuCooldowns.ACT2) return;
    triggerRyuCooldown('act2', 16, 'ACT2');

    const activeScene = scene || playerGroup.parent;
    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT2');

    const playerRot = playerGroup.rotation.y;
    const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRot).normalize();
    const sideDir = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRot).normalize();

    const spawnCenter = playerGroup.position.clone().addScaledVector(forwardDir, 1.2).add(new THREE.Vector3(0, 0.8, 0));
    const rockSpacing = 0.8;

    const offsets = [
        new THREE.Vector3(0, 0, 0),                             // Centro (dónde apunta)
        sideDir.clone().multiplyScalar(-rockSpacing),          // Izquierda
        sideDir.clone().multiplyScalar(rockSpacing)            // Derecha
    ];

    const rocks = [];
    offsets.forEach(offset => {
        const rock = createRockMesh();
        rock.position.copy(spawnCenter).add(offset);
        if (activeScene) activeScene.add(rock);
        rocks.push(rock);
    });

    const speed = 28.0;
    const maxDist = 15.0;
    let distTraveled = 0;
    let lastTime = performance.now();

    function animateRocks(now) {
        let dt = (now - lastTime) / 1000;
        lastTime = now;

        const moveStep = speed * dt;
        distTraveled += moveStep;

        rocks.forEach(rock => {
            if (!rock.parent) return;

            rock.position.addScaledVector(forwardDir, moveStep);
            rock.rotation.x += 12.0 * dt;
            rock.rotation.y += 12.0 * dt;

            if (typeof dummyMesh !== 'undefined' && dummyMesh) {
                const rPos = rock.position.clone();
                const ePos = dummyMesh.position.clone().add(new THREE.Vector3(0, 0.8, 0));

                if (rPos.distanceTo(ePos) < 0.9) {
                    // Daño: 35% más que el básico por piedra (25 * 1.35 = 33.75)
                    if (typeof applySkillDamage === 'function') applySkillDamage(RYU_BASE_DAMAGE * 1.35);
                    disposeMesh(rock, activeScene);
                }
            }
        });

        if (distTraveled < maxDist) {
            requestAnimationFrame(animateRocks);
        } else {
            rocks.forEach(rock => disposeMesh(rock, activeScene));
        }
    }

    requestAnimationFrame(animateRocks);
}

// --- 3. ATC3: GOLPE AL PISO DESTRUCCIÓN ÁREA (+46% DAÑO, 17s CD) ---
function useRyuAct3(playerGroup, scene, activeActions, currentCharacter) {
    if (!canUseRyuSkill(activeActions, currentCharacter)) return;
    if (ryuCooldowns.ACT3) return;
    triggerRyuCooldown('act3', 17, 'ACT3');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT3');

    const activeScene = scene || playerGroup.parent;

    // Crear un efecto visual de onda expansiva en el suelo
    const shockwaveGeo = new THREE.RingGeometry(0.2, 0.6, 32);
    const shockwaveMat = new THREE.MeshBasicMaterial({ color: 0x8B4513, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const shockwave = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    shockwave.rotation.x = -Math.PI / 2;
    shockwave.position.copy(playerGroup.position).add(new THREE.Vector3(0, 0.05, 0));
    
    if (activeScene) activeScene.add(shockwave);

    let radius = 0.6;
    const maxRadius = 3.5;
    let lastTime = performance.now();
    let damageApplied = false;

    function animateGroundSmash(now) {
        let dt = (now - lastTime) / 1000;
        lastTime = now;

        radius += 10.0 * dt;
        shockwave.scale.set(radius, radius, 1);
        shockwaveMat.opacity = Math.max(0, 1.0 - (radius / maxRadius));

        if (!damageApplied && typeof dummyMesh !== 'undefined' && dummyMesh) {
            const playerPos = playerGroup.position.clone();
            const enemyPos = dummyMesh.position.clone();
            playerPos.y = 0;
            enemyPos.y = 0;

            if (playerPos.distanceTo(enemyPos) <= maxRadius) {
                damageApplied = true;
                // Daño: 46% más que el básico (25 * 1.46 = 36.5)
                const damage = RYU_BASE_DAMAGE * 1.46;
                if (typeof applySkillDamage === 'function') applySkillDamage(damage);
            }
        }

        if (radius < maxRadius) {
            requestAnimationFrame(animateGroundSmash);
        } else {
            disposeMesh(shockwave, activeScene);
        }
    }

    requestAnimationFrame(animateGroundSmash);
}

// --- 4. ATC4: GOLPE MUY FUERTE EN LÍNEA RECTA (+35% DAÑO, VARIANTE CON ESPECIAL = MONEDA +32%, 17s CD) ---
function useRyuAct4(playerGroup, scene, activeActions, currentCharacter) {
    if (!canUseRyuSkill(activeActions, currentCharacter)) return;
    if (ryuCooldowns.ACT4) return;

    triggerRyuCooldown('act4', 17, 'ACT4');

    const activeScene = scene || playerGroup.parent;

    // Verificar si se presiona la habilidad especial al mismo tiempo
    const isSpecialPressed = (typeof ryuCooldowns !== 'undefined' && ryuCooldowns.SPEC) || 
                             ((typeof ACTIONS !== 'undefined') && (activeActions & ACTIONS.ESPECIAL));

    if (isSpecialPressed) {
        // VARIANTE: Sale la moneda de ATC1 con +32% de daño
        fireRyuCoin(playerGroup, activeScene);
        return;
    }

    // GOLPE EN LÍNEA RECTA REGULAR
    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT4');

    const playerRot = playerGroup.rotation.y;
    const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRot).normalize();

    let startTime = performance.now();
    let lastTime = performance.now();
    const duration = 0.2;
    const speed = 20.0;
    let hasHit = false;

    function animateHeavyPunch(now) {
        let dt = (now - lastTime) / 1000;
        lastTime = now;

        let elapsed = (now - startTime) / 1000;
        let progress = Math.min(elapsed / duration, 1.0);

        playerGroup.position.addScaledVector(dir, speed * dt);

        if (!hasHit && typeof dummyMesh !== 'undefined' && dummyMesh) {
            const playerPos = playerGroup.position.clone();
            const enemyPos = dummyMesh.position.clone();
            playerPos.y = 0;
            enemyPos.y = 0;

            if (playerPos.distanceTo(enemyPos) < 1.3) {
                hasHit = true;
                // Daño: 35% más que el básico (25 * 1.35 = 33.75)
                const damage = RYU_BASE_DAMAGE * 1.35;
                if (typeof applySkillDamage === 'function') applySkillDamage(damage);
            }
        }

        if (progress < 1.0) {
            requestAnimationFrame(animateHeavyPunch);
        }
    }

    requestAnimationFrame(animateHeavyPunch);
}

