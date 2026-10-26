// --- SISTEMA DE HABILIDADES Y COOLDOWNS PARA KENJI (kenji.js) ---

const KENJI_BASE_DAMAGE = 25;

const kenjiCooldowns = {
    SPEC: false,
    ACT1: false,
    ACT2: false,
    ACT3: false,
    ACT4: false
};

const kenjiIntervals = {};
let kenjiActiveFrames = [];

// --- MATERIAL PROCEDURAL: MARRÓN MEDIO TEXTURIZADO CON CRISTALES ---
function createKenjiBrownMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, '#8b5a2b');
    gradient.addColorStop(0.5, '#6b4226');
    gradient.addColorStop(1, '#4a2e18');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#3d2314';
    ctx.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * 256, Math.random() * 256);
        ctx.lineTo(Math.random() * 256, Math.random() * 256);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.6,
        metalness: 0.2
    });
}

function createKenjiCrystalMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#a0522d';
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = '#d2b48c';
    for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 15, 0, Math.PI * 2);
        ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.1,
        metalness: 0.7,
        emissive: 0x5c3317,
        emissiveIntensity: 0.4
    });
}

const KENJI_BROWN_MAT = createKenjiBrownMaterial();
const KENJI_CRYSTAL_MAT = createKenjiCrystalMaterial();

function autoDispose(mesh, parentScene) {
    if (!mesh) return;
    setTimeout(() => {
        disposeMesh(mesh, parentScene);
    }, 5000);
}

function resetKenjiState(scene, playerGroup) {
    kenjiActiveFrames.forEach(id => cancelAnimationFrame(id));
    kenjiActiveFrames = [];

    Object.keys(kenjiIntervals).forEach(key => {
        if (kenjiIntervals[key]) {
            clearInterval(kenjiIntervals[key]);
            kenjiIntervals[key] = null;
        }
    });

    ['specBtn', 'act1', 'act2', 'act3', 'act4'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            const overlay = btn.querySelector('.cd-overlay');
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }
    });

    Object.keys(kenjiCooldowns).forEach(key => {
        kenjiCooldowns[key] = false;
    });
}

function applyKenjiDamage(damage, playerGroup) {
    if (typeof receiveDamage === 'function') {
        const attackerPos = playerGroup ? playerGroup.position : null;
        receiveDamage(damage, attackerPos, true);
    } else if (typeof applySkillDamage === 'function') {
        applySkillDamage(damage);
    }
}

function triggerKenjiCooldown(btnId, durationSeconds, cdKey) {
    if (kenjiCooldowns[cdKey]) return;
    kenjiCooldowns[cdKey] = true;

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

    if (kenjiIntervals[cdKey]) clearInterval(kenjiIntervals[cdKey]);

    kenjiIntervals[cdKey] = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) {
            overlay.textContent = timeLeft;
        } else {
            clearInterval(kenjiIntervals[cdKey]);
            kenjiIntervals[cdKey] = null;
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            kenjiCooldowns[cdKey] = false;
        }
    }, 1000);
}

function canUseKenjiSkill(activeActions) {
    if (typeof ACTIONS !== 'undefined' && (activeActions & ACTIONS.BLOQUEAR)) return false;
    return true;
}

function disposeMesh(mesh, parentScene) {
    if (!mesh) return;
    if (parentScene) parentScene.remove(mesh);
    if (mesh.parent) mesh.parent.remove(mesh);
    mesh.traverse((child) => {
        if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
        }
    });
}

// --- ESPECIAL (SPEC): GOLPE CON MAZO PEQUEÑO (+10% daño / 10s CD) ---
function createMiniMaceMesh() {
    const maceGroup = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8);
    const handle = new THREE.Mesh(handleGeo, KENJI_BROWN_MAT);

    const headGeo = new THREE.DodecahedronGeometry(0.22);
    const head = new THREE.Mesh(headGeo, KENJI_CRYSTAL_MAT);
    head.position.y = 0.4;

    maceGroup.add(handle, head);
    return maceGroup;
}

function useKenjiSpecial(playerGroup, scene, activeActions) {
    if (!canUseKenjiSkill(activeActions) || kenjiCooldowns.SPEC) return;
    triggerKenjiCooldown('specBtn', 10, 'SPEC');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'SPEC');

    const activeScene = scene || (typeof window.scene !== 'undefined' ? window.scene : null);
    if (!activeScene) return;

    const mace = createMiniMaceMesh();
    const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y).normalize();
    const hitPos = playerGroup.position.clone().addScaledVector(forwardDir, 1.2);
    mace.position.copy(hitPos);
    mace.position.y += 0.5;

    activeScene.add(mace);

    if (typeof dummyMesh !== 'undefined' && dummyMesh) {
        if (playerGroup.position.distanceTo(dummyMesh.position) <= 2.2) {
            applyKenjiDamage(KENJI_BASE_DAMAGE * 1.10, playerGroup);
        }
    }

    setTimeout(() => disposeMesh(mace, activeScene), 300);
}

// --- ACT1: MANO DE AMULETO MARRÓN DESDE EL SUELO (+45% daño / 25s CD) ---
function createAmulethandMesh() {
    const handGroup = new THREE.Group();
    const palmGeo = new THREE.BoxGeometry(0.8, 0.3, 0.8);
    const palm = new THREE.Mesh(palmGeo, KENJI_BROWN_MAT);

    for (let i = -0.3; i <= 0.3; i += 0.2) {
        const fingerGeo = new THREE.BoxGeometry(0.12, 0.6, 0.12);
        const finger = new THREE.Mesh(fingerGeo, KENJI_BROWN_MAT);
        finger.position.set(i, 0.3, 0.35);
        handGroup.add(finger);
    }
    handGroup.add(palm);
    return handGroup;
}

function useKenjiAct1(playerGroup, scene, activeActions) {
    if (!canUseKenjiSkill(activeActions) || kenjiCooldowns.ACT1) return;
    triggerKenjiCooldown('act1', 25, 'ACT1');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT1');

    const activeScene = scene || (typeof window.scene !== 'undefined' ? window.scene : null);
    if (!activeScene) return;

    const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y).normalize();
    const spawnPos = playerGroup.position.clone().addScaledVector(forwardDir, 2.5);

    const hand = createAmulethandMesh();
    hand.position.set(spawnPos.x, playerGroup.position.y - 1.0, spawnPos.z);
    hand.rotation.y = playerGroup.rotation.y;
    activeScene.add(hand);

    let startTime = performance.now();
    let damageApplied = false;

    function animateHand(now) {
        let elapsed = (now - startTime) / 1000;

        if (elapsed < 0.25) {
            hand.position.y = (playerGroup.position.y - 1.0) + (elapsed / 0.25) * 1.5;
        } else if (elapsed < 0.5) {
            hand.position.addScaledVector(forwardDir, 0.1);
            if (!damageApplied && typeof dummyMesh !== 'undefined' && dummyMesh) {
                if (hand.position.distanceTo(dummyMesh.position) < 2.0) {
                    applyKenjiDamage(KENJI_BASE_DAMAGE * 1.45, playerGroup);
                    damageApplied = true;
                }
            }
        }

        if (elapsed < 0.8) {
            let frameId = requestAnimationFrame(animateHand);
            kenjiActiveFrames.push(frameId);
        } else {
            disposeMesh(hand, activeScene);
        }
    }

    let frameId = requestAnimationFrame(animateHand);
    kenjiActiveFrames.push(frameId);
}

// --- ACT2: RÁFAGA DE CRISTALES (3 proyectiles seguidos, +15% daño c/u / 17s CD) ---
function useKenjiAct2(playerGroup, scene, activeActions) {
    if (!canUseKenjiSkill(activeActions) || kenjiCooldowns.ACT2) return;
    triggerKenjiCooldown('act2', 17, 'ACT2');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT2');

    const activeScene = scene || (typeof window.scene !== 'undefined' ? window.scene : null);
    if (!activeScene) return;

    const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y).normalize();

    let shotsFired = 0;
    const shootInterval = setInterval(() => {
        if (shotsFired >= 3) {
            clearInterval(shootInterval);
            return;
        }

        const crystalGeo = new THREE.IcosahedronGeometry(0.2, 0);
        const crystal = new THREE.Mesh(crystalGeo, KENJI_CRYSTAL_MAT);
        crystal.position.copy(playerGroup.position).add(new THREE.Vector3(0, 0.8, 0));

        activeScene.add(crystal);
        autoDispose(crystal, activeScene);

        let distanceTravelled = 0;
        function animateCrystal() {
            crystal.position.addScaledVector(forwardDir, 0.4);
            distanceTravelled += 0.4;

            if (typeof dummyMesh !== 'undefined' && dummyMesh && crystal.position.distanceTo(dummyMesh.position) < 1.0) {
                applyKenjiDamage(KENJI_BASE_DAMAGE * 1.15, playerGroup);
                disposeMesh(crystal, activeScene);
                return;
            }

            if (distanceTravelled < 12.0 && crystal.parent) {
                let frameId = requestAnimationFrame(animateCrystal);
                kenjiActiveFrames.push(frameId);
            } else {
                disposeMesh(crystal, activeScene);
            }
        }

        let frameId = requestAnimationFrame(animateCrystal);
        kenjiActiveFrames.push(frameId);

        shotsFired++;
    }, 180);
}

// --- ACT3: SERPIENTE MONSTRUOSA DE AMULETO (+40% daño / 22s CD) ---
function createSnakeMonsterMesh() {
    const snakeGroup = new THREE.Group();

    // Cabeza semi rectangular
    const headGeo = new THREE.BoxGeometry(0.7, 0.5, 0.9);
    const head = new THREE.Mesh(headGeo, KENJI_BROWN_MAT);
    head.position.z = 0.5;

    // Brazos
    const armGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const leftArm = new THREE.Mesh(armGeo, KENJI_BROWN_MAT);
    leftArm.position.set(-0.45, -0.1, 0.3);
    const rightArm = new THREE.Mesh(armGeo, KENJI_BROWN_MAT);
    rightArm.position.set(0.45, -0.1, 0.3);

    // Cuerpo serpiente
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.1, 2.5, 8);
    const body = new THREE.Mesh(bodyGeo, KENJI_BROWN_MAT);
    body.rotation.x = Math.PI / 3;
    body.position.z = -0.8;

    snakeGroup.add(head, leftArm, rightArm, body);
    return snakeGroup;
}

function useKenjiAct3(playerGroup, scene, activeActions) {
    if (!canUseKenjiSkill(activeActions) || kenjiCooldowns.ACT3) return;
    triggerKenjiCooldown('act3', 22, 'ACT3');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT3');

    const activeScene = scene || (typeof window.scene !== 'undefined' ? window.scene : null);
    if (!activeScene) return;

    const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y).normalize();

    const snake = createSnakeMonsterMesh();
    snake.position.copy(playerGroup.position).addScaledVector(forwardDir, 0.5);
    snake.position.y -= 0.5;
    snake.rotation.y = playerGroup.rotation.y;

    activeScene.add(snake);

    let startTime = performance.now();
    let hitApplied = false;

    function animateSnake(now) {
        let elapsed = (now - startTime) / 1000;

        snake.position.addScaledVector(forwardDir, 0.25);

        if (!hitApplied && typeof dummyMesh !== 'undefined' && dummyMesh) {
            if (snake.position.distanceTo(dummyMesh.position) < 1.6) {
                applyKenjiDamage(KENJI_BASE_DAMAGE * 1.40, playerGroup);
                hitApplied = true;
            }
        }

        if (elapsed < 0.6) {
            let frameId = requestAnimationFrame(animateSnake);
            kenjiActiveFrames.push(frameId);
        } else {
            disposeMesh(snake, activeScene);
        }
    }

    let frameId = requestAnimationFrame(animateSnake);
    kenjiActiveFrames.push(frameId);
}

// --- ACT4: CLON DE AMULETO AUTÓNOMO (25 daño por golpe, dura 8s / 27s CD) ---
function useKenjiAct4(playerGroup, scene, activeActions) {
    if (!canUseKenjiSkill(activeActions) || kenjiCooldowns.ACT4) return;
    triggerKenjiCooldown('act4', 27, 'ACT4');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT4');

    const activeScene = scene || (typeof window.scene !== 'undefined' ? window.scene : null);
    if (!activeScene) return;

    // Copia la estructura visual del jugador usando el material de amuleto
    const cloneMesh = playerGroup.clone(true);
    cloneMesh.traverse((child) => {
        if (child.isMesh) child.material = KENJI_BROWN_MAT;
    });

    const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y).normalize();
    cloneMesh.position.copy(playerGroup.position).addScaledVector(forwardDir, 1.0);

    activeScene.add(cloneMesh);

    let startTime = performance.now();
    let lastAttackTime = 0;
    const duration = 8.0;

    function animateClone(now) {
        let elapsed = (now - startTime) / 1000;

        if (typeof dummyMesh !== 'undefined' && dummyMesh) {
            const dirToEnemy = new THREE.Vector3().subVectors(dummyMesh.position, cloneMesh.position);
            dirToEnemy.y = 0;
            const dist = dirToEnemy.length();

            if (dist > 1.0) {
                dirToEnemy.normalize();
                cloneMesh.position.addScaledVector(dirToEnemy, 0.08);
                cloneMesh.rotation.y = Math.atan2(dirToEnemy.x, dirToEnemy.z);
            } else if (now - lastAttackTime > 1200) {
                applyKenjiDamage(25, playerGroup);
                lastAttackTime = now;
            }
        }

        if (elapsed < duration) {
            let frameId = requestAnimationFrame(animateClone);
            kenjiActiveFrames.push(frameId);
        } else {
            disposeMesh(cloneMesh, activeScene);
        }
    }

    let frameId = requestAnimationFrame(animateClone);
    kenjiActiveFrames.push(frameId);
}