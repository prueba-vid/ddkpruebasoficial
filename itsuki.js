// --- SISTEMA DE HABILIDADES DE ITSUKI (itsuki.js) ---

const ITSUKI_BASE_DAMAGE = 25;
const COLOR_GREY_LIGHT = 0xd3d3d3;

// Estado de Cooldowns
const itsukiCooldowns = {
    SPEC: false,
    ACT1: false,
    ACT2: false,
    ACT3: false,
    ACT4: false
};

const itsukiIntervals = {};
let itsukiActiveFrames = [];

// Contador de bolas extra para ACT4 (base 3, máximo 10)
let itsukiAct4BallCount = 3;

// --- MATERIALES Y LIMPIEZA DE MEMORIA ---

function createItsukiEfectoMaterial(opacity = 0.85, transparent = true) {
    return new THREE.MeshBasicMaterial({
        color: COLOR_GREY_LIGHT,
        transparent: transparent,
        opacity: opacity,
        side: THREE.DoubleSide
    });
}

function disposeMesh(mesh, parentScene) {
    if (!mesh) return;
    if (parentScene) parentScene.remove(mesh);
    mesh.traverse(child => {
        if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        }
    });
}

function applyItsukiDamage(damage, playerGroup) {
    if (typeof receiveDamage === 'function') {
        const attackerPos = playerGroup ? playerGroup.position : null;
        receiveDamage(damage, attackerPos, true);
    }
}

function triggerItsukiCooldown(btnId, durationSeconds, cdKey) {
    if (itsukiCooldowns[cdKey]) return;
    itsukiCooldowns[cdKey] = true;

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

    if (itsukiIntervals[cdKey]) clearInterval(itsukiIntervals[cdKey]);

    itsukiIntervals[cdKey] = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) {
            overlay.textContent = timeLeft;
        } else {
            clearInterval(itsukiIntervals[cdKey]);
            itsukiIntervals[cdKey] = null;
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            itsukiCooldowns[cdKey] = false;
        }
    }, 1000);
}

function canUseItsukiSkill(activeActions) {
    if (typeof ACTIONS !== 'undefined' && (activeActions & ACTIONS.BLOQUEAR)) return false;
    return true;
}

function resetItsukiState(scene, playerGroup) {
    itsukiActiveFrames.forEach(id => cancelAnimationFrame(id));
    itsukiActiveFrames = [];

    Object.keys(itsukiIntervals).forEach(key => {
        if (itsukiIntervals[key]) {
            clearInterval(itsukiIntervals[key]);
            itsukiIntervals[key] = null;
        }
    });

    Object.keys(itsukiCooldowns).forEach(key => {
        itsukiCooldowns[key] = false;
    });

    itsukiAct4BallCount = 3;
}

// --- 1. ESPECIAL (SPEC): ACUMULAR BOLAS PARA ACT4 (17s CD) ---

function useItsukiSpecial(playerGroup, activeActions) {
    if (!canUseItsukiSkill(activeActions) || itsukiCooldowns.SPEC) return;
    triggerItsukiCooldown('specBtn', 17, 'SPEC');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'SPEC');

    // Incrementar en +1 el disparo de ACT4 hasta llegar a un tope de 10
    if (itsukiAct4BallCount < 10) {
        itsukiAct4BallCount++;
    }

    // Efecto visual de pulso al presionar SPEC
    const scene = playerGroup.parent || (typeof window.scene !== 'undefined' ? window.scene : null);
    if (scene) {
        const aura = new THREE.Mesh(
            new THREE.SphereGeometry(0.8, 16, 16),
            createItsukiEfectoMaterial(0.5)
        );
        aura.position.copy(playerGroup.position).add(new THREE.Vector3(0, 0.8, 0));
        scene.add(aura);

        setTimeout(() => disposeMesh(aura, scene), 250);
    }
}

// --- 2. ACT1: CLON CON EXPLOSIÓN A LOS 1.5s (22s CD) ---

function useItsukiAct1(playerGroup, scene, activeActions) {
    if (!canUseItsukiSkill(activeActions) || itsukiCooldowns.ACT1) return;
    triggerItsukiCooldown('act1', 22, 'ACT1');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT1');

    const cloneMat = createItsukiEfectoMaterial(0.65);
    const clone = playerGroup.clone(true);
    clone.traverse(child => {
        if (child.isMesh) child.material = cloneMat;
    });

    clone.position.copy(playerGroup.position);
    clone.rotation.copy(playerGroup.rotation);
    scene.add(clone);

    // Explota exactamente a los 1.5 segundos
    setTimeout(() => {
        const explosionPos = clone.position.clone();
        disposeMesh(clone, scene);

        const radius = 3.0;
        const explosionMesh = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 16, 16),
            createItsukiEfectoMaterial(0.8)
        );
        explosionMesh.position.copy(explosionPos).add(new THREE.Vector3(0, 0.8, 0));
        scene.add(explosionMesh);

        setTimeout(() => disposeMesh(explosionMesh, scene), 200);

        // Daño: 40% más que el golpe básico (25 * 1.40 = 35)
        if (typeof dummyMesh !== 'undefined' && dummyMesh) {
            const enemyPos = dummyMesh.position.clone();
            if (explosionPos.distanceTo(enemyPos) <= radius) {
                applyItsukiDamage(ITSUKI_BASE_DAMAGE * 1.40, playerGroup);
            }
        }
    }, 1500);
}

// --- 3. ACT2: ONDA EXPANSIVA DE CEGADO (18s CD) ---

function useItsukiAct2(playerGroup, scene, activeActions) {
    if (!canUseItsukiSkill(activeActions) || itsukiCooldowns.ACT2) return;
    triggerItsukiCooldown('act2', 18, 'ACT2');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT2');

    const maxRadius = 5.5;
    const duration = 0.4;

    const ringGeo = new THREE.RingGeometry(0.2, 0.8, 32).rotateX(-Math.PI / 2);
    const ringMat = createItsukiEfectoMaterial(0.85);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(playerGroup.position);
    ring.position.y = 0.1;

    scene.add(ring);

    const startTime = performance.now();
    let frameId;

    function animateWave(now) {
        const progress = Math.min((now - startTime) / 1000 / duration, 1.0);
        const scale = progress * maxRadius;

        ring.scale.setScalar(scale);
        ringMat.opacity = 0.85 * (1 - progress);

        if (progress < 1.0) {
            frameId = requestAnimationFrame(animateWave);
            itsukiActiveFrames.push(frameId);
        } else {
            // Aplica efecto de tapar pantalla (Blind/Cegado) por 2 segundos sin daño
            if (typeof dummyMesh !== 'undefined' && dummyMesh) {
                if (playerGroup.position.distanceTo(dummyMesh.position) <= maxRadius) {
                    if (typeof applyBlindEffect === 'function') {
                        applyBlindEffect(dummyMesh, 2000);
                    } else if (typeof applyBlind === 'function') {
                        applyBlind(dummyMesh, 2000);
                    }
                }
            }
            disposeMesh(ring, scene);
        }
    }

    frameId = requestAnimationFrame(animateWave);
    itsukiActiveFrames.push(frameId);
}

// --- 4. NUEVA ACT3: DESPLIEGUE DE 3 CLONES (20s CD) ---

function useItsukiAct3(playerGroup, scene, activeActions) {
    if (!canUseItsukiSkill(activeActions) || itsukiCooldowns.ACT3) return;
    triggerItsukiCooldown('act3', 20, 'ACT3');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT3');

    const clonesList = [];
    const cloneMat = createItsukiEfectoMaterial(0.65);

    // Función para instanciar cada uno de los 3 clones
    function spawnTripleClone() {
        const clone = playerGroup.clone(true);
        clone.traverse(child => {
            if (child.isMesh) child.material = cloneMat;
        });

        clone.position.copy(playerGroup.position);
        clone.rotation.copy(playerGroup.rotation);
        scene.add(clone);
        clonesList.push(clone);
    }

    // Instanciación secuencial: 3 clones cada 1.6 segundos (0s, 1.6s y 3.2s)
    spawnTripleClone();
    setTimeout(() => spawnTripleClone(), 1600);
    setTimeout(() => spawnTripleClone(), 3200);

    // Expiración a los 5 segundos: Detona todos los clones creados simultáneamente
    setTimeout(() => {
        clonesList.forEach(clone => {
            if (!clone) return;

            const explosionPos = clone.position.clone();
            disposeMesh(clone, scene);

            // Efecto visual de explosión por clon
            const radius = 2.5;
            const explosionMesh = new THREE.Mesh(
                new THREE.SphereGeometry(radius, 16, 16),
                createItsukiEfectoMaterial(0.75)
            );
            explosionMesh.position.copy(explosionPos).add(new THREE.Vector3(0, 0.8, 0));
            scene.add(explosionMesh);

            setTimeout(() => disposeMesh(explosionMesh, scene), 200);

            // Daño: 10% del básico individualmente por clon (25 * 0.10 = 2.5)
            if (typeof dummyMesh !== 'undefined' && dummyMesh) {
                const enemyPos = dummyMesh.position.clone();
                if (explosionPos.distanceTo(enemyPos) <= radius) {
                    applyItsukiDamage(ITSUKI_BASE_DAMAGE * 0.10, playerGroup);
                }
            }
        });
    }, 5000);
}

// --- 5. ACT4: RÁFAGA DE BOLAS DE ENERGÍA CON REINICIO (22s CD) ---

function useItsukiAct4(playerGroup, scene, activeActions) {
    if (!canUseItsukiSkill(activeActions) || itsukiCooldowns.ACT4) return;
    triggerItsukiCooldown('act4', 22, 'ACT4');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT4');

    // Toma la cantidad actual acumulada con SPEC y reinicia el contador al valor base
    const ballsToShoot = itsukiAct4BallCount;
    itsukiAct4BallCount = 3;

    for (let i = 0; i < ballsToShoot; i++) {
        setTimeout(() => {
            spawnItsukiEnergyBall(playerGroup, scene);
        }, i * 160);
    }
}

function spawnItsukiEnergyBall(playerGroup, scene) {
    const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y).normalize();

    const ballGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const ballMat = createItsukiEfectoMaterial(0.9);
    const ball = new THREE.Mesh(ballGeo, ballMat);

    ball.position.copy(playerGroup.position).add(new THREE.Vector3(0, 0.8, 0)).addScaledVector(dir, 0.5);
    scene.add(ball);

    const speed = 15.0;
    const maxDist = 14.0;
    let traveledDist = 0;
    let lastTime = performance.now();
    let frameId;

    function animateBall(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        const step = speed * dt;
        ball.position.addScaledVector(dir, step);
        traveledDist += step;

        let hasHit = false;

        if (typeof dummyMesh !== 'undefined' && dummyMesh) {
            const enemyPos = dummyMesh.position.clone().add(new THREE.Vector3(0, 0.8, 0));
            if (ball.position.distanceTo(enemyPos) <= 0.8) {
                hasHit = true;

                // Cada bola inflige 15% más de daño que un básico (25 * 1.15 = 28.75)
                applyItsukiDamage(ITSUKI_BASE_DAMAGE * 1.15, playerGroup);

                // Destello de impacto
                const hitFx = new THREE.Mesh(
                    new THREE.SphereGeometry(0.4, 12, 12),
                    createItsukiEfectoMaterial(0.9)
                );
                hitFx.position.copy(ball.position);
                scene.add(hitFx);
                setTimeout(() => disposeMesh(hitFx, scene), 100);
            }
        }

        if (hasHit || traveledDist >= maxDist) {
            disposeMesh(ball, scene);
        } else {
            frameId = requestAnimationFrame(animateBall);
            itsukiActiveFrames.push(frameId);
        }
    }

    frameId = requestAnimationFrame(animateBall);
    itsukiActiveFrames.push(frameId);
}

