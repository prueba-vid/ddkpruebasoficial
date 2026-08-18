// --- SISTEMA DE HABILIDADES Y COOLDOWNS PARA ITSUKI (itsuki.js) ---

const ITSUKI_BASE_DAMAGE = 25;
const COLOR_GREY_LIGHT = 0xd3d3d3;
const COLOR_WHITE = 0xffffff;

const itsukiCooldowns = { SPEC: false, ACT1: false, ACT2: false, ACT3: false, ACT4: false };
const itsukiIntervals = {};
let itsukiActiveFrames = [];

let itsukiSpecClicks = 0;
let isAct3Empowered = false;

let activeItsukiClone = null;
let itsukiCloneTimer = null;

window.isItsukiVaseActive = false;
window.isItsukiCastingLaser = false;

let itsukiVaseMesh = null;
let itsukiVaseTimer = null;

// --- UTILDADES Y AYUDANTES ---
function createItsukiEfectoMaterial(color = COLOR_GREY_LIGHT, opacity = 0.8, transparent = true) {
    return new THREE.MeshBasicMaterial({ color, transparent, opacity, side: THREE.DoubleSide });
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
        receiveDamage(damage, playerGroup ? playerGroup.position : null, true);
    }
}

function triggerItsukiCooldown(btnId, duration, cdKey) {
    if (itsukiCooldowns[cdKey]) return;
    itsukiCooldowns[cdKey] = true;

    const btn = document.getElementById(btnId);
    if (!btn) return;

    let overlay = btn.querySelector('.cd-overlay') || document.createElement('div');
    overlay.className = 'cd-overlay';
    if (!overlay.parentNode) btn.appendChild(overlay);

    let timeLeft = duration;
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
    if (window.isItsukiCastingLaser || window.isItsukiVaseActive) return false;
    if (typeof ACTIONS !== 'undefined' && (activeActions & ACTIONS.BLOQUEAR)) return false;
    return true;
}

function resetItsukiState(scene, playerGroup) {
    itsukiActiveFrames.forEach(cancelAnimationFrame);
    itsukiActiveFrames = [];

    Object.keys(itsukiIntervals).forEach(k => { if (itsukiIntervals[k]) clearInterval(itsukiIntervals[k]); });
    Object.keys(itsukiCooldowns).forEach(k => itsukiCooldowns[k] = false);

    ['specBtn', 'act1', 'act2', 'act3', 'act4'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            const ov = btn.querySelector('.cd-overlay');
            if (ov) btn.removeChild(ov);
            btn.style.boxShadow = "none";
        }
    });

    if (itsukiVaseTimer) clearTimeout(itsukiVaseTimer);
    if (itsukiCloneTimer) clearTimeout(itsukiCloneTimer);
    if (itsukiVaseMesh) disposeMesh(itsukiVaseMesh, playerGroup);
    if (activeItsukiClone) disposeMesh(activeItsukiClone, scene);

    activeItsukiClone = null;
    itsukiVaseMesh = null;
    itsukiVaseTimer = null;
    itsukiCloneTimer = null;
    window.isItsukiVaseActive = false;
    window.isItsukiCastingLaser = false;
    itsukiSpecClicks = 0;
    isAct3Empowered = false;
}

// --- 1. ESPECIAL (SPEC) ---
function useItsukiSpecial(playerGroup, activeActions) {
    if (!canUseItsukiSkill(activeActions) || itsukiCooldowns.SPEC) return;
    triggerItsukiCooldown('specBtn', 15, 'SPEC');

    if (++itsukiSpecClicks >= 5) {
        isAct3Empowered = true;
        itsukiSpecClicks = 0;
        const act3Btn = document.getElementById('act3');
        if (act3Btn) act3Btn.style.boxShadow = "0 0 14px #d3d3d3";
    }
}

// --- 2. ACT1: CLON INTERACTIVO / DETONABLE ---
function useItsukiAct1(playerGroup, scene, activeActions) {
    if (!canUseItsukiSkill(activeActions)) return;

    // Si el clon ya existe y pasaron al menos 3 segundos desde su creación, detona
    if (activeItsukiClone) {
        if (Date.now() - activeItsukiClone.spawnTime >= 3000) {
            explodeItsukiClone(playerGroup, scene);
        }
        return;
    }

    if (!itsukiCooldowns.ACT1) spawnItsukiClone(playerGroup, scene);
}

function spawnItsukiClone(playerGroup, scene) {
    const act1Btn = document.getElementById('act1');
    const mat = createItsukiEfectoMaterial(COLOR_GREY_LIGHT, 0.65);

    activeItsukiClone = playerGroup.clone(true);
    activeItsukiClone.traverse(c => { if (c.isMesh) c.material = mat; });
    activeItsukiClone.position.copy(playerGroup.position);
    activeItsukiClone.rotation.copy(playerGroup.rotation);
    activeItsukiClone.spawnTime = Date.now();
    scene.add(activeItsukiClone);

    if (act1Btn) act1Btn.style.boxShadow = "0 0 10px #d3d3d3";

    // Destrucción automática tras 7 segundos si no se detona
    itsukiCloneTimer = setTimeout(() => {
        if (activeItsukiClone) {
            disposeMesh(activeItsukiClone, scene);
            activeItsukiClone = null;
            if (act1Btn) act1Btn.style.boxShadow = "none";
            triggerItsukiCooldown('act1', 13, 'ACT1');
        }
    }, 7000);
}

function explodeItsukiClone(playerGroup, scene) {
    if (!activeItsukiClone) return;

    const pos = activeItsukiClone.position.clone();
    const act1Btn = document.getElementById('act1');

    disposeMesh(activeItsukiClone, scene);
    activeItsukiClone = null;
    if (itsukiCloneTimer) clearTimeout(itsukiCloneTimer);
    if (act1Btn) act1Btn.style.boxShadow = "none";

    // Efecto visual de explosión gris
    const radius = 3.0;
    const exp = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 16),
        createItsukiEfectoMaterial(COLOR_GREY_LIGHT, 0.85)
    );
    exp.position.copy(pos).add(new THREE.Vector3(0, 0.8, 0));
    scene.add(exp);
    setTimeout(() => disposeMesh(exp, scene), 180);

    const dmg = (typeof BASE_DAMAGE !== 'undefined' ? BASE_DAMAGE : ITSUKI_BASE_DAMAGE) * 1.20;
    if (typeof dummyMesh !== 'undefined' && dummyMesh && pos.distanceTo(dummyMesh.position) <= radius) {
        applyItsukiDamage(dmg, playerGroup);
    }

    triggerItsukiCooldown('act1', 13, 'ACT1');
}

// --- 3. ACT2: ONDA EXPANSIVA 3D ---
function useItsukiAct2(playerGroup, scene, activeActions) {
    if (!canUseItsukiSkill(activeActions) || itsukiCooldowns.ACT2) return;
    triggerItsukiCooldown('act2', 20, 'ACT2');

    const maxRadius = 5.0, duration = 0.45;

    const domeMat = createItsukiEfectoMaterial(COLOR_GREY_LIGHT, 0.7);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    dome.position.copy(playerGroup.position);

    const ringGeo = new THREE.RingGeometry(0.2, 0.6, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = createItsukiEfectoMaterial(COLOR_WHITE, 0.9);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(playerGroup.position);
    ring.position.y = 0.08;

    scene.add(dome, ring);

    const startTime = performance.now();
    function animate(now) {
        const progress = Math.min((now - startTime) / 1000 / duration, 1.0);
        const scale = progress * maxRadius;

        dome.scale.setScalar(scale);
        domeMat.opacity = 0.7 * (1 - progress);
        ring.scale.setScalar(scale);
        ringMat.opacity = 0.9 * (1 - progress);

        if (progress < 1.0) {
            itsukiActiveFrames.push(requestAnimationFrame(animate));
        } else {
            if (typeof dummyMesh !== 'undefined' && dummyMesh && playerGroup.position.distanceTo(dummyMesh.position) <= maxRadius) {
                if (typeof applyStun === 'function') applyStun(dummyMesh, 2000);
                applyItsukiDamage(ITSUKI_BASE_DAMAGE * 0.8, playerGroup);
            }
            disposeMesh(dome, scene);
            disposeMesh(ring, scene);
        }
    }
    itsukiActiveFrames.push(requestAnimationFrame(animate));
}

// --- 4. ACT3: DISPARO DE BOLAS DE ENERGÍA / RAYO ---
function useItsukiAct3(playerGroup, scene, activeActions) {
    if (!canUseItsukiSkill(activeActions) || itsukiCooldowns.ACT3) return;
    triggerItsukiCooldown('act3', 27, 'ACT3');

    const btn = document.getElementById('act3');
    if (btn) btn.style.boxShadow = "none";

    if (isAct3Empowered) {
        isAct3Empowered = false;
        executeItsukiLaser(playerGroup, scene);
    } else {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => spawnSingleEnergyBall(playerGroup, scene), i * 180);
        }
    }
}

function spawnSingleEnergyBall(playerGroup, scene) {
    const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y).normalize();
    const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 16, 16),
        createItsukiEfectoMaterial(COLOR_GREY_LIGHT, 0.9)
    );

    ball.position.copy(playerGroup.position).add(new THREE.Vector3(0, 0.8, 0)).addScaledVector(dir, 0.5);
    scene.add(ball);

    const speed = 16.0, maxDist = 12.0;
    let dist = 0, lastTime = performance.now();

    function update(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        const step = speed * dt;
        ball.position.addScaledVector(dir, step);
        dist += step;

        let hit = false;
        if (typeof dummyMesh !== 'undefined' && dummyMesh) {
            const enemyPos = dummyMesh.position.clone().add(new THREE.Vector3(0, 0.8, 0));
            if (ball.position.distanceTo(enemyPos) <= 0.8) {
                hit = true;
                applyItsukiDamage(ITSUKI_BASE_DAMAGE * 0.45, playerGroup);

                const exp = new THREE.Mesh(
                    new THREE.SphereGeometry(0.5, 12, 12),
                    createItsukiEfectoMaterial(COLOR_GREY_LIGHT, 0.8)
                );
                exp.position.copy(ball.position);
                scene.add(exp);
                setTimeout(() => disposeMesh(exp, scene), 100);
            }
        }

        if (hit || dist >= maxDist) {
            disposeMesh(ball, scene);
        } else {
            itsukiActiveFrames.push(requestAnimationFrame(update));
        }
    }
    itsukiActiveFrames.push(requestAnimationFrame(update));
}

function executeItsukiLaser(playerGroup, scene) {
    const laserLength = 12.0, duration = 3.5;
    window.isItsukiCastingLaser = true;

    const laserGroup = new THREE.Group();

    const coreGeo = new THREE.CylinderGeometry(0.09, 0.09, laserLength, 12).rotateX(Math.PI / 2).translate(0, 0, laserLength / 2);
    const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: COLOR_WHITE }));

    const auraGeo = new THREE.CylinderGeometry(0.28, 0.28, laserLength, 12).rotateX(Math.PI / 2).translate(0, 0, laserLength / 2);
    const auraMat = createItsukiEfectoMaterial(COLOR_GREY_LIGHT, 0.55);
    const aura = new THREE.Mesh(auraGeo, auraMat);

    const offset = new THREE.Vector3(0, 0.65, 0.4);
    const charge = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), createItsukiEfectoMaterial(COLOR_GREY_LIGHT, 0.85));
    const impact = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), createItsukiEfectoMaterial(COLOR_GREY_LIGHT, 0.9));
    impact.position.set(0, 0, laserLength);

    laserGroup.add(core, aura, charge, impact);
    scene.add(laserGroup);

    const startTime = performance.now();
    let lastTick = performance.now();

    function animate(now) {
        const elapsed = (now - startTime) / 1000;
        const currentPos = playerGroup.position.clone().add(offset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y));

        laserGroup.position.copy(currentPos);
        laserGroup.rotation.y = playerGroup.rotation.y;

        const pulse = 1.0 + Math.sin(elapsed * 30) * 0.15;
        aura.scale.set(pulse, 1, pulse);
        impact.scale.setScalar(pulse);

        if (now - lastTick >= 120) {
            lastTick = now;
            if (typeof dummyMesh !== 'undefined' && dummyMesh) {
                const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y).normalize();
                const toEnemy = dummyMesh.position.clone().sub(playerGroup.position);
                toEnemy.y = 0;
                const proj = toEnemy.dot(dir);
                if (proj > 0 && proj <= laserLength + 0.5) {
                    const closest = playerGroup.position.clone().addScaledVector(dir, proj);
                    closest.y = dummyMesh.position.y;
                    if (closest.distanceTo(dummyMesh.position) <= 1.0) {
                        applyItsukiDamage(ITSUKI_BASE_DAMAGE * 0.15, playerGroup);
                    }
                }
            }
        }

        if (elapsed < duration) {
            itsukiActiveFrames.push(requestAnimationFrame(animate));
        } else {
            disposeMesh(laserGroup, scene);
            window.isItsukiCastingLaser = false;
        }
    }
    itsukiActiveFrames.push(requestAnimationFrame(animate));
}

// --- 5. ACT4: JARRÓN (CONTRAATAQUE) ---
function createVaseMesh() {
    const group = new THREE.Group();
    const mat = createItsukiEfectoMaterial(COLOR_GREY_LIGHT, 1.0, false);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.25, 1.1, 16), mat); body.position.y = 0.55;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.35, 16), mat); neck.position.y = 1.15;
    const lipGeo = new THREE.TorusGeometry(0.26, 0.05, 8, 16).rotateX(Math.PI / 2);
    const lip = new THREE.Mesh(lipGeo, mat); lip.position.y = 1.32;

    group.add(body, neck, lip);
    return group;
}

function useItsukiAct4(playerGroup, scene, activeActions) {
    if (!canUseItsukiSkill(activeActions) || itsukiCooldowns.ACT4 || window.isItsukiVaseActive) return;

    triggerItsukiCooldown('act4', 18, 'ACT4');
    window.isItsukiVaseActive = true;
    playerGroup.children.forEach(c => c.visible = false);

    itsukiVaseMesh = createVaseMesh();
    playerGroup.add(itsukiVaseMesh);

    itsukiVaseTimer = setTimeout(() => removeItsukiVaseMode(playerGroup), 4000);
}

function removeItsukiVaseMode(playerGroup) {
    if (!window.isItsukiVaseActive) return;
    window.isItsukiVaseActive = false;
    if (itsukiVaseTimer) clearTimeout(itsukiVaseTimer);

    if (itsukiVaseMesh && playerGroup) {
        disposeMesh(itsukiVaseMesh, playerGroup);
        itsukiVaseMesh = null;
    }
    if (playerGroup) playerGroup.children.forEach(c => c.visible = true);
}

function checkItsukiVaseCounter(attackerGroup, scene, playerGroup) {
    if (window.isItsukiVaseActive) {
        applyItsukiDamage(ITSUKI_BASE_DAMAGE * 1.30, playerGroup);

        const exp = new THREE.Mesh(
            new THREE.SphereGeometry(1.2, 16, 16),
            createItsukiEfectoMaterial(COLOR_GREY_LIGHT, 0.8)
        );
        exp.position.copy(playerGroup.position).add(new THREE.Vector3(0, 0.6, 0));
        scene.add(exp);
        setTimeout(() => disposeMesh(exp, scene), 200);

        removeItsukiVaseMode(playerGroup);
        return true;
    }
    return false;
}

