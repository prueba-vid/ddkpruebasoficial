// --- SISTEMA DE HABILIDADES Y COOLDOWNS PARA FUNETSU (funetsu.js) ---

const FUNETSU_BASE_DAMAGE = 25;

const funetsuCooldowns = {
    SPEC: false,
    ACT1: false,
    ACT2: false,
    ACT3: false,
    ACT4: false
};

const funetsuIntervals = {};
let funetsuActiveFrames = []; // Registro de requestAnimationFrames activos

// Estado global para marca de Habilidad Especial y ACT4
let funetsuMarkedTarget = null;
let funetsuMarkOutlineMesh = null;
let funetsuMarkTimeoutId = null;

// --- GENERACIÓN DE MATERIALES PROCEDURALES DE ALTA CALIDAD ---
function createGoldMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, '#ffd700');
    gradient.addColorStop(0.5, '#fff8dc');
    gradient.addColorStop(1, '#b8860b');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 40, 0, Math.PI * 2);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.2,
        metalness: 0.8,
        emissive: 0xffd700,
        emissiveIntensity: 0.35
    });
}

function createSilverMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, '#e6e8fa');
    gradient.addColorStop(0.5, '#ffffff');
    gradient.addColorStop(1, '#708090');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.1,
        metalness: 0.9,
        emissive: 0xaaaaaa,
        emissiveIntensity: 0.2
    });
}

const FUNETSU_GOLD_MAT = createGoldMaterial();
const FUNETSU_SILVER_MAT = createSilverMaterial();

// FUNCIÓN AUXILIAR: AUTODESTRUCCIÓN EN 5 SEGUNDOS
function autoDispose(mesh, parentScene) {
    if (!mesh) return;
    setTimeout(() => {
        disposeMesh(mesh, parentScene);
    }, 5000);
}

// LIMPIEZA COMPLETA DE COOLDOWNS Y RECURSOS 3D
function resetFunetsuState(scene, playerGroup) {
    funetsuActiveFrames.forEach(id => cancelAnimationFrame(id));
    funetsuActiveFrames = [];

    Object.keys(funetsuIntervals).forEach(key => {
        if (funetsuIntervals[key]) {
            clearInterval(funetsuIntervals[key]);
            funetsuIntervals[key] = null;
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

    Object.keys(funetsuCooldowns).forEach(key => {
        funetsuCooldowns[key] = false;
    });

    if (funetsuMarkTimeoutId) clearTimeout(funetsuMarkTimeoutId);
    if (funetsuMarkOutlineMesh) disposeMesh(funetsuMarkOutlineMesh, scene);
    funetsuMarkedTarget = null;
    funetsuMarkOutlineMesh = null;
}

function applyFunetsuDamage(damage, playerGroup) {
    if (typeof receiveDamage === 'function') {
        const attackerPos = playerGroup ? playerGroup.position : null;
        receiveDamage(damage, attackerPos, true);
    } else if (typeof applySkillDamage === 'function') {
        applySkillDamage(damage);
    }
}

function triggerFunetsuCooldown(btnId, durationSeconds, cdKey) {
    if (funetsuCooldowns[cdKey]) return;
    funetsuCooldowns[cdKey] = true;

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

    if (funetsuIntervals[cdKey]) clearInterval(funetsuIntervals[cdKey]);

    funetsuIntervals[cdKey] = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) {
            overlay.textContent = timeLeft;
        } else {
            clearInterval(funetsuIntervals[cdKey]);
            funetsuIntervals[cdKey] = null;
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            funetsuCooldowns[cdKey] = false;
        }
    }, 1000);
}

function canUseFunetsuSkill(activeActions) {
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

// EFECTO VISUAL COMPLEMENTARIO: PARTÍCULAS DORADAS
function createGoldSparkEffect(position, scene) {
    const activeScene = scene || (typeof window.scene !== 'undefined' ? window.scene : null);
    if (!activeScene) return;

    const group = new THREE.Group();
    const particleGeo = new THREE.SphereGeometry(0.08, 8, 8);

    for (let i = 0; i < 12; i++) {
        const p = new THREE.Mesh(particleGeo, FUNETSU_GOLD_MAT);
        p.position.copy(position);
        p.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            Math.random() * 3 + 1,
            (Math.random() - 0.5) * 4
        );
        group.add(p);
    }

    activeScene.add(group);
    autoDispose(group, activeScene); // Limpieza de seguridad a los 5s

    let startTime = performance.now();
    let frameId;

    function animateSparks(now) {
        let elapsed = (now - startTime) / 1000;
        group.children.forEach(p => {
            p.position.addScaledVector(p.userData.velocity, 0.016);
        });

        if (elapsed < 0.35) {
            frameId = requestAnimationFrame(animateSparks);
            funetsuActiveFrames.push(frameId);
        } else {
            disposeMesh(group, activeScene);
        }
    }
    frameId = requestAnimationFrame(animateSparks);
    funetsuActiveFrames.push(frameId);
}

// --- 1. ESPECIAL (SPEC): MARCA DORADA EN AURA ---
function useFunetsuSpecial(playerGroup, scene, activeActions) {
    if (!canUseFunetsuSkill(activeActions) || funetsuCooldowns.SPEC) return;
    if (typeof dummyMesh === 'undefined' || !dummyMesh) return;

    const maxDistance = 15;
    const playerPos = playerGroup.position.clone();
    const targetPos = dummyMesh.position.clone();

    const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y).normalize();
    const toTarget = new THREE.Vector3().subVectors(targetPos, playerPos);
    const distance = toTarget.length();

    toTarget.normalize();
    const angle = forwardDir.angleTo(toTarget);

    if (distance <= maxDistance && angle < Math.PI / 4) {
        triggerFunetsuCooldown('specBtn', 14, 'SPEC');
        if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'SPEC');

        if (funetsuMarkOutlineMesh) {
            disposeMesh(funetsuMarkOutlineMesh, scene);
        }
        if (funetsuMarkTimeoutId) clearTimeout(funetsuMarkTimeoutId);

        funetsuMarkedTarget = dummyMesh;

        const outlineGeo = new THREE.BoxGeometry(1.2, 2.2, 1.2);
        const outlineMat = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });

        funetsuMarkOutlineMesh = new THREE.Mesh(outlineGeo, outlineMat);
        funetsuMarkedTarget.add(funetsuMarkOutlineMesh);
        autoDispose(funetsuMarkOutlineMesh, scene); // Auto borrado de seguridad a los 5s

        funetsuMarkTimeoutId = setTimeout(() => {
            if (funetsuMarkOutlineMesh) {
                disposeMesh(funetsuMarkOutlineMesh, scene);
                funetsuMarkOutlineMesh = null;
            }
            funetsuMarkedTarget = null;
        }, 5000);
    }
}

// --- 2. ACT1: PÚAS EN LÍNEA RECTA ---
function createDetailedSpikeMesh() {
    const spikeGroup = new THREE.Group();
    const mainConeGeo = new THREE.ConeGeometry(0.2, 0.9, 6);
    const mainCone = new THREE.Mesh(mainConeGeo, FUNETSU_SILVER_MAT);
    mainCone.position.y = 0.45;

    const baseRingGeo = new THREE.TorusGeometry(0.22, 0.04, 8, 16);
    const baseRing = new THREE.Mesh(baseRingGeo, FUNETSU_GOLD_MAT);
    baseRing.rotation.x = Math.PI / 2;

    spikeGroup.add(mainCone, baseRing);
    return spikeGroup;
}

function useFunetsuAct1(playerGroup, scene, activeActions) {
    if (!canUseFunetsuSkill(activeActions) || funetsuCooldowns.ACT1) return;
    triggerFunetsuCooldown('act1', 25, 'ACT1');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT1');

    const activeScene = scene || (typeof window.scene !== 'undefined' ? window.scene : null);
    if (!activeScene) return;

    const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y).normalize();
    const spikeLineGroup = new THREE.Group();

    const numberOfSpikes = 8;
    const distanceStep = 1.0;
    const baseGroundY = playerGroup.position.y - 0.9;

    for (let i = 1; i <= numberOfSpikes; i++) {
        const spike = createDetailedSpikeMesh();
        const pos = playerGroup.position.clone().add(forwardDir.clone().multiplyScalar(i * distanceStep));
        spike.position.set(pos.x, baseGroundY, pos.z);
        spikeLineGroup.add(spike);
    }

    activeScene.add(spikeLineGroup);
    autoDispose(spikeLineGroup, activeScene); // Borra las púas obligatoriamente a los 5s

    let startTime = performance.now();
    let lastDamageTime = 0;
    const duration = 5.0;
    const retractDuration = 0.3;
    let frameId;

    function animateSpikes(now) {
        let elapsed = (now - startTime) / 1000;

        if (elapsed < 0.25) {
            const emergeProgress = elapsed / 0.25;
            spikeLineGroup.children.forEach(spike => {
                if (spike.visible) spike.position.y = baseGroundY + (emergeProgress * 0.9);
            });
        } else if (elapsed > (duration - retractDuration)) {
            const retractProgress = (duration - elapsed) / retractDuration;
            spikeLineGroup.children.forEach(spike => {
                if (spike.visible) spike.position.y = baseGroundY + (Math.max(0, retractProgress) * 0.9);
            });
        } else {
            spikeLineGroup.children.forEach(spike => {
                if (spike.visible) spike.position.y = baseGroundY + 0.9;
            });
        }

        if (typeof dummyMesh !== 'undefined' && dummyMesh && (now - lastDamageTime > 500) && elapsed < (duration - retractDuration)) {
            const spikesToRemove = [];
            spikeLineGroup.children.forEach(spike => {
                if (!spike.visible) return;
                const worldPos = new THREE.Vector3();
                spike.getWorldPosition(worldPos);
                if (worldPos.distanceTo(dummyMesh.position) < 1.1) {
                    spikesToRemove.push(spike);
                }
            });

            if (spikesToRemove.length > 0) {
                applyFunetsuDamage(FUNETSU_BASE_DAMAGE * 1.35, playerGroup);
                createGoldSparkEffect(dummyMesh.position, activeScene);
                lastDamageTime = now;

                spikesToRemove.forEach(spike => {
                    disposeMesh(spike, spikeLineGroup);
                });
            }
        }

        if (elapsed < duration && spikeLineGroup.children.length > 0) {
            frameId = requestAnimationFrame(animateSpikes);
            funetsuActiveFrames.push(frameId);
        } else {
            disposeMesh(spikeLineGroup, activeScene);
        }
    }

    frameId = requestAnimationFrame(animateSpikes);
    funetsuActiveFrames.push(frameId);
}

// --- 3. ACT2: RÁFAGA DE CUCHILLOS EN ABANICO ---
function createDetailedKnifeMesh() {
    const knifeGroup = new THREE.Group();

    const bladeGeo = new THREE.BoxGeometry(0.12, 0.04, 0.65);
    const blade = new THREE.Mesh(bladeGeo, FUNETSU_SILVER_MAT);

    const guardGeo = new THREE.BoxGeometry(0.22, 0.06, 0.05);
    const guard = new THREE.Mesh(guardGeo, FUNETSU_GOLD_MAT);
    guard.position.z = -0.32;

    const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8);
    const handle = new THREE.Mesh(handleGeo, FUNETSU_GOLD_MAT);
    handle.rotation.x = Math.PI / 2;
    handle.position.z = -0.45;

    knifeGroup.add(blade, guard, handle);
    return knifeGroup;
}

function useFunetsuAct2(playerGroup, scene, activeActions) {
    if (!canUseFunetsuSkill(activeActions) || funetsuCooldowns.ACT2) return;
    triggerFunetsuCooldown('act2', 16, 'ACT2');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT2');

    const activeScene = scene || (typeof window.scene !== 'undefined' ? window.scene : null);
    if (!activeScene) return;

    const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y).normalize();
    const angles = [0, -0.25, 0.25];
    const knives = [];

    angles.forEach(angleOffset => {
        const knife = createDetailedKnifeMesh();
        const dir = forwardDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset);

        knife.position.copy(playerGroup.position).add(new THREE.Vector3(0, 0.8, 0));
        knife.rotation.y = playerGroup.rotation.y + angleOffset;

        activeScene.add(knife);
        autoDispose(knife, activeScene); // Garantiza que las dagas se borren sí o sí a los 5s
        knives.push({ mesh: knife, dir: dir, hit: false });
    });

    const speed = 0.4;
    const maxDistance = 12.0;
    let travelled = 0;
    let frameId;

    function animateKnives() {
        travelled += speed;

        knives.forEach(k => {
            if (k.hit || !k.mesh) return;

            k.mesh.position.addScaledVector(k.dir, speed);

            if (typeof dummyMesh !== 'undefined' && dummyMesh) {
                const knifePos = k.mesh.position.clone();
                const enemyPos = dummyMesh.position.clone();
                knifePos.y = 0;
                enemyPos.y = 0;

                if (knifePos.distanceTo(enemyPos) < 1.0) {
                    k.hit = true;
                    applyFunetsuDamage(FUNETSU_BASE_DAMAGE * 1.30, playerGroup);
                    createGoldSparkEffect(dummyMesh.position, activeScene);
                    disposeMesh(k.mesh, activeScene);
                    k.mesh = null;
                }
            }
        });

        const activeKnives = knives.filter(k => !k.hit && k.mesh);
        if (travelled < maxDistance && activeKnives.length > 0) {
            frameId = requestAnimationFrame(animateKnives);
            funetsuActiveFrames.push(frameId);
        } else {
            knives.forEach(k => {
                if (k.mesh) disposeMesh(k.mesh, activeScene);
            });
        }
    }

    frameId = requestAnimationFrame(animateKnives);
    funetsuActiveFrames.push(frameId);
}

// --- 4. ACT3: CARRERA, AGARRE Y GOLPE SUPERSÓNICO ---
function useFunetsuAct3(playerGroup, scene, activeActions) {
    if (!canUseFunetsuSkill(activeActions) || funetsuCooldowns.ACT3) return;
    triggerFunetsuCooldown('act3', 18, 'ACT3');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT3');

    const activeScene = scene || (typeof window.scene !== 'undefined' ? window.scene : null);
    const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y).normalize();

    let startTime = performance.now();
    const dashDuration = 0.4;
    const dashSpeed = 0.38;
    let grabbed = false;
    let frameId;

    function animateDash(now) {
        let elapsed = (now - startTime) / 1000;

        playerGroup.position.addScaledVector(forwardDir, dashSpeed);

        if (typeof applyMapBounds === 'function') {
            const isGroundedState = typeof isGrounded !== 'undefined' ? isGrounded : true;
            applyMapBounds(playerGroup, isGroundedState);
        }

        if (!grabbed && typeof dummyMesh !== 'undefined' && dummyMesh) {
            const playerPos = playerGroup.position.clone();
            const enemyPos = dummyMesh.position.clone();
            playerPos.y = 0;
            enemyPos.y = 0;

            if (playerPos.distanceTo(enemyPos) < 1.2) {
                grabbed = true;

                const grabPos = playerGroup.position.clone().addScaledVector(forwardDir, 0.8);
                dummyMesh.position.copy(grabPos);

                const hitImpactPos = dummyMesh.position.clone();

                applyFunetsuDamage(FUNETSU_BASE_DAMAGE * 1.30, playerGroup);
                createGoldSparkEffect(hitImpactPos, activeScene);

                const shockwaveGeo = new THREE.RingGeometry(0.1, 1.2, 16);
                const shockwave = new THREE.Mesh(shockwaveGeo, FUNETSU_GOLD_MAT);
                shockwave.position.copy(hitImpactPos);
                shockwave.position.y = 0.5;
                shockwave.rotation.x = -Math.PI / 2;
                activeScene.add(shockwave);
                autoDispose(shockwave, activeScene); // Borrado de seguridad a 5s

                setTimeout(() => disposeMesh(shockwave, activeScene), 150);
            }
        }

        if (elapsed < dashDuration && !grabbed) {
            frameId = requestAnimationFrame(animateDash);
            funetsuActiveFrames.push(frameId);
        }
    }

    frameId = requestAnimationFrame(animateDash);
    funetsuActiveFrames.push(frameId);
}

// --- 5. ACT4: ATAQUE SUPERSÓNICO CON TELETRANSPORTE ---
function useFunetsuAct4(playerGroup, scene, activeActions) {
    if (!canUseFunetsuSkill(activeActions) || funetsuCooldowns.ACT4) return;
    if (!funetsuMarkedTarget) return;

    triggerFunetsuCooldown('act4', 28, 'ACT4');
    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT4');

    const activeScene = scene || (typeof window.scene !== 'undefined' ? window.scene : null);
    const targetEnemy = funetsuMarkedTarget;

    const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y).normalize();
    const targetPos = playerGroup.position.clone().addScaledVector(forwardDir, 1.4);
    targetEnemy.position.copy(targetPos);

    if (typeof applyMapBounds === 'function') {
        const isGroundedState = typeof isGrounded !== 'undefined' ? isGrounded : true;
        applyMapBounds(targetEnemy, isGroundedState);
    }

    if (funetsuMarkOutlineMesh) {
        disposeMesh(funetsuMarkOutlineMesh, activeScene);
        funetsuMarkOutlineMesh = null;
    }
    if (funetsuMarkTimeoutId) clearTimeout(funetsuMarkTimeoutId);
    funetsuMarkedTarget = null;

    const shockwaveGeo = new THREE.RingGeometry(0.2, 2.2, 32);
    const shockwave = new THREE.Mesh(shockwaveGeo, FUNETSU_GOLD_MAT);
    shockwave.position.copy(targetPos);
    shockwave.position.y = 0.5;
    shockwave.rotation.x = -Math.PI / 2;
    activeScene.add(shockwave);
    autoDispose(shockwave, activeScene); // Borrado de seguridad a 5s

    applyFunetsuDamage(FUNETSU_BASE_DAMAGE * 1.45, playerGroup);
    createGoldSparkEffect(targetPos, activeScene);

    let scaleProgress = 0.2;
    let frameId;

    function animateShockwave() {
        scaleProgress += 0.2;
        shockwave.scale.set(scaleProgress, scaleProgress, scaleProgress);

        if (scaleProgress < 2.2) {
            frameId = requestAnimationFrame(animateShockwave);
            funetsuActiveFrames.push(frameId);
        } else {
            disposeMesh(shockwave, activeScene);
        }
    }

    frameId = requestAnimationFrame(animateShockwave);
    funetsuActiveFrames.push(frameId);
}
