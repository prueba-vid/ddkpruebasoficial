// --- SISTEMA DE HABILIDADES Y COOLDOWNS PARA RYU (js/ryu.js) ---

const RYU_BASE_DAMAGE = 25;

const ryuCooldowns = {
    SPEC: false,
    ACT1: false,
    ACT2: false,
    ACT3: false,
    ACT4: false
};

// Variables de estado para Ryu
let ryuActiveRocks = [];
let isRyuRocksActive = false;

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
    const subMesh = new THREE.Mesh(subGeo, rockMat);
    subMesh.position.set(0.1, -0.05, 0.08);
    subMesh.rotation.set(Math.random(), Math.random(), Math.random());
    rockGroup.add(subMesh);

    rockGroup.scale.set(0.9, 0.9, 0.9);
    return rockGroup;
}

// --- 1. ACT1: LANZAMIENTO DE MONEDA ---
function useRyuAct1(playerGroup, scene, activeActions, currentCharacter) {
    if (!canUseRyuSkill(activeActions, currentCharacter)) return;
    if (ryuCooldowns.ACT1) return;
    triggerRyuCooldown('act1', 17, 'ACT1');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT1');

    const activeScene = scene || playerGroup.parent;
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
                const damage = RYU_BASE_DAMAGE * 1.15;
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

// --- 2. ACT2: PATADA VOLADORA (CORREGIDO PARA EVITAR TEPEO) ---
function useRyuAct2(playerGroup, scene, activeActions, currentCharacter) {
    if (!canUseRyuSkill(activeActions, currentCharacter)) return;
    if (ryuCooldowns.ACT2) return;
    triggerRyuCooldown('act2', 25, 'ACT2');

    const torso = playerGroup.children[0];
    const leftArm = torso?.children?.find(c => c.position.x < 0 && c.type === "Group");
    const rightArm = torso?.children?.find(c => c.position.x > 0 && c.type === "Group");
    const leftLeg = playerGroup.children.find(c => c.position.x < 0 && c !== torso && c.type === "Group");
    const rightLeg = playerGroup.children.find(c => c.position.x > 0 && c !== torso && c.type === "Group");

    const playerRot = playerGroup.rotation.y;
    const dashDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRot).normalize();

    // Guardamos la altura inicial del jugador antes de la animación
    const startY = playerGroup.position.y;

    let startTime = performance.now();
    let lastTime = performance.now();
    const duration = 0.4;
    const speed = 13.2;
    let hasHit = false;

    function animateFlyingKick(now) {
        let dt = (now - lastTime) / 1000;
        lastTime = now;

        let elapsed = (now - startTime) / 1000;
        let progress = Math.min(elapsed / duration, 1.0);

        playerGroup.position.addScaledVector(dashDir, speed * dt);
        
        // Se suma a la altura inicial en vez de sobreescribirla a 0
        const heightArc = Math.sin(progress * Math.PI) * 0.6;
        playerGroup.position.y = startY + heightArc;

        if (torso) {
            torso.rotation.x = -Math.PI / 4;
            torso.rotation.z = 0.2;
        }

        if (rightLeg) rightLeg.rotation.x = -Math.PI / 2.2; 
        if (leftLeg) leftLeg.rotation.x = Math.PI / 4;      

        if (rightArm) rightArm.rotation.x = Math.PI / 3;
        if (leftArm) leftArm.rotation.x = -Math.PI / 2;

        if (!hasHit && typeof dummyMesh !== 'undefined' && dummyMesh) {
            const playerPos = playerGroup.position.clone();
            const enemyPos = dummyMesh.position.clone();
            playerPos.y = 0;
            enemyPos.y = 0;

            if (playerPos.distanceTo(enemyPos) < 0.9) {
                hasHit = true;
                const damage = RYU_BASE_DAMAGE * 1.25;
                if (typeof applySkillDamage === 'function') applySkillDamage(damage);
            }
        }

        if (progress < 1.0) {
            requestAnimationFrame(animateFlyingKick);
        } else {
            if (torso) torso.rotation.set(0, 0, 0);
            if (rightLeg) rightLeg.rotation.set(0, 0, 0);
            if (leftLeg) leftLeg.rotation.set(0, 0, 0);
            if (rightArm) rightArm.rotation.set(-0.6, 0, 0.3);
            if (leftArm) leftArm.rotation.set(-0.6, 0, -0.3);
        }
    }

    requestAnimationFrame(animateFlyingKick);
}

// --- 3. ACT3: DASH PEQUEÑO CON AGARRE, ELEVACIÓN Y LANZAMIENTO ---
function useRyuAct3(playerGroup, scene, activeActions, currentCharacter) {
    if (!canUseRyuSkill(activeActions, currentCharacter)) return;
    if (ryuCooldowns.ACT3) return;
    triggerRyuCooldown('act3', 18, 'ACT3');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT3');

    const torso = playerGroup.children[0];
    const rightArm = torso?.children?.find(c => c.position.x > 0 && c.type === "Group");

    const playerRot = playerGroup.rotation.y;
    const dashDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRot).normalize();

    let startTime = performance.now();
    let lastTime = performance.now();
    const dashDuration = 0.25;
    const dashSpeed = 16.0;
    let isGrabbing = false;

    function animateGrabAndThrow(now) {
        let dt = (now - lastTime) / 1000;
        lastTime = now;

        let elapsed = (now - startTime) / 1000;
        let progress = Math.min(elapsed / dashDuration, 1.0);

        // Fase 1: Dash corto hacia adelante
        if (!isGrabbing) {
            playerGroup.position.addScaledVector(dashDir, dashSpeed * dt);

            // Extendemos el brazo derecho hacia adelante para hacer ademán de agarre
            if (rightArm) rightArm.rotation.x = -Math.PI / 1.5;

            if (typeof dummyMesh !== 'undefined' && dummyMesh) {
                const playerPos = playerGroup.position.clone();
                const enemyPos = dummyMesh.position.clone();

                if (playerPos.distanceTo(enemyPos) < 1.2) {
                    isGrabbing = true;
                    executeGrabPhase(dummyMesh);
                    return;
                }
            }

            if (progress < 1.0) {
                requestAnimationFrame(animateGrabAndThrow);
            } else {
                if (rightArm) rightArm.rotation.set(-0.6, 0, 0.3);
            }
        }
    }

    // Fase 2: Agarre, elevación con la mano y lanzamiento continuo
    function executeGrabPhase(enemy) {
        let grabStartTime = performance.now();
        let lastGrabTime = performance.now();
        const liftDuration = 0.35;
        const throwDuration = 0.25;
        let thrown = false;

        const targetHoldPos = new THREE.Vector3();

        function animateLiftAndThrow(now) {
            let dt = (now - lastGrabTime) / 1000;
            lastGrabTime = now;

            let elapsed = (now - grabStartTime) / 1000;

            if (elapsed < liftDuration) {
                // Elevamos el brazo hacia arriba
                if (rightArm) rightArm.rotation.x = -Math.PI;

                // Calculamos la posición de la mano arriba de la cabeza del personaje
                targetHoldPos.copy(playerGroup.position).add(new THREE.Vector3(0, 2.3, 0)).addScaledVector(dashDir, 0.4);
                
                // Transición fluida del enemigo a la mano (sin tepeo)
                enemy.position.lerp(targetHoldPos, dt * 18.0);

                requestAnimationFrame(animateLiftAndThrow);
            } else if (!thrown) {
                thrown = true;
                
                // Aplicar daño del 30% más sobre el básico (25 * 1.30 = 32.5)
                const totalDamage = RYU_BASE_DAMAGE * 1.30;
                if (typeof applySkillDamage === 'function') applySkillDamage(totalDamage);

                // Lanzar al enemigo un poco lejos
                let throwDistance = 0;
                const maxThrowDist = 4.5;
                const throwSpeed = 18.0;

                function animateThrow(tNow) {
                    let tDt = (tNow - lastGrabTime) / 1000;
                    lastGrabTime = tNow;

                    const moveStep = throwSpeed * tDt;
                    enemy.position.addScaledVector(dashDir, moveStep);
                    
                    // Va bajando progresivamente hasta tocar suelo
                    if (enemy.position.y > 0) {
                        enemy.position.y = Math.max(0, enemy.position.y - (9.8 * tDt * 1.5));
                    }

                    throwDistance += moveStep;

                    if (throwDistance < maxThrowDist && enemy.position.y > 0) {
                        requestAnimationFrame(animateThrow);
                    } else {
                        enemy.position.y = 0;
                        if (rightArm) rightArm.rotation.set(-0.6, 0, 0.3);
                    }
                }

                requestAnimationFrame(animateThrow);
            }
        }

        requestAnimationFrame(animateLiftAndThrow);
    }

    requestAnimationFrame(animateGrabAndThrow);
}

// --- 4. ACT4: SISTEMA DE DOS TOQUES (ÓRBITA Y DISPARO) ---
function useRyuAct4(playerGroup, scene, activeActions, currentCharacter) {
    if (!canUseRyuSkill(activeActions, currentCharacter)) return;

    const activeScene = scene || playerGroup.parent;

    // SEGUNDO TOQUE: Disparar rocas
    if (isRyuRocksActive && ryuActiveRocks.length > 0) {
        isRyuRocksActive = false;
        
        const playerRot = playerGroup.rotation.y;
        let shootDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRot).normalize();

        // VARIANTE: Si está en el aire, disparar en diagonal hacia abajo
        const inAir = (typeof window.isGrounded !== 'undefined') ? !window.isGrounded : (playerGroup.position.y > 1.2);
        if (inAir) {
            shootDir.y = -0.85; 
            shootDir.normalize();
        }

        const rocksToShoot = [...ryuActiveRocks];
        ryuActiveRocks = [];

        rocksToShoot.forEach((rock, idx) => {
            let distTraveled = 0;
            const maxDist = 16.0;
            const speed = 33.0;
            let lastTime = performance.now();

            function animateShootRock(now) {
                let dt = (now - lastTime) / 1000;
                lastTime = now;

                const moveStep = speed * dt;
                rock.position.addScaledVector(shootDir, moveStep);
                rock.rotation.x += 15.0 * dt;
                rock.rotation.y += 15.0 * dt;
                distTraveled += moveStep;

                if (typeof dummyMesh !== 'undefined' && dummyMesh) {
                    const rPos = rock.position.clone();
                    const ePos = dummyMesh.position.clone().add(new THREE.Vector3(0, 0.8, 0));

                    if (rPos.distanceTo(ePos) < 1.0) {
                        if (typeof applySkillDamage === 'function') applySkillDamage(12);
                        disposeMesh(rock, activeScene);
                        return;
                    }
                }

                if (rock.position.y <= 0) {
                    disposeMesh(rock, activeScene);
                    return;
                }

                if (distTraveled < maxDist) {
                    requestAnimationFrame(animateShootRock);
                } else {
                    disposeMesh(rock, activeScene);
                }
            }
            setTimeout(() => requestAnimationFrame(animateShootRock), idx * 70);
        });

        // Cooldown solo después del segundo toque
        triggerRyuCooldown('act4', 20, 'ACT4');
        return;
    }

    // PRIMER TOQUE: Crear piedras en órbita
    if (ryuCooldowns.ACT4) return;

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT4');

    isRyuRocksActive = true;
    ryuActiveRocks = [];

    for (let i = 0; i < 3; i++) {
        const rock = createRockMesh();
        if (activeScene) activeScene.add(rock);
        ryuActiveRocks.push(rock);
    }

    let orbitAngle = 0;
    const radius = 1.3;
    let lastTime = performance.now();

    function animateOrbit(now) {
        if (!isRyuRocksActive || ryuActiveRocks.length === 0) return;

        let dt = (now - lastTime) / 1000;
        lastTime = now;

        orbitAngle += 3.0 * dt;
        const center = playerGroup.position.clone().add(new THREE.Vector3(0, 1.0, 0));

        ryuActiveRocks.forEach((rock, index) => {
            const angle = orbitAngle + (index * (Math.PI * 2 / 3));
            rock.position.x = center.x + Math.sin(angle) * radius;
            rock.position.z = center.z + Math.cos(angle) * radius;
            rock.position.y = center.y + Math.sin(orbitAngle * 2 + index) * 0.2;
            rock.rotation.x += 2.4 * dt;
            rock.rotation.y += 2.4 * dt;
        });

        requestAnimationFrame(animateOrbit);
    }

    requestAnimationFrame(animateOrbit);
}

// --- 5. ESPECIAL: ONDA DE VIENTO Y SALTO HACIA ARRIBA ---
function useRyuSpecial(playerGroup, scene, activeActions, currentCharacter) {
    if (!canUseRyuSkill(activeActions, currentCharacter)) return;
    if (ryuCooldowns.SPEC) return;

    triggerRyuCooldown('specBtn', 9, 'SPEC');

    const activeScene = scene || playerGroup.parent || (typeof window.scene !== 'undefined' ? window.scene : null);

    const isJumping = (typeof ACTIONS !== 'undefined') && (activeActions & ACTIONS.SALTAR);
    const inAir = (typeof window.isGrounded !== 'undefined') ? !window.isGrounded : (playerGroup.position.y > 1.1);

    const windGeo = new THREE.ConeGeometry(1.1, 1.8, 16);
    const windMesh = new THREE.Mesh(windGeo, RYU_WIND_MAT);

    const playerRot = playerGroup.rotation.y;
    let dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRot).normalize();

    // VARIANTE: Si salta o está en el aire, se dispara hacia abajo y el jugador se eleva
    if (isJumping || inAir) {
        if (typeof window.velocityY !== 'undefined') {
            window.velocityY = 13.5; 
        } else {
            playerGroup.position.y += 2.5;
        }
        if (typeof window.isGrounded !== 'undefined') window.isGrounded = false;

        // Dirección de la ráfaga blanca de aire apunta verticalmente HACIA ABAJO
        dir.set(0, -1, 0);
        windMesh.rotation.x = Math.PI; 
        windMesh.rotation.z = 0;
        windMesh.position.copy(playerGroup.position).add(new THREE.Vector3(0, -0.2, 0));
    } else {
        // En tierra: onda horizontal común
        windMesh.rotation.x = Math.PI / 2;
        windMesh.rotation.z = -playerRot;
        windMesh.position.copy(playerGroup.position).add(new THREE.Vector3(0, 0.9, 0));
    }

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

