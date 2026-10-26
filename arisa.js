// --- SISTEMA DE HABILIDADES Y COOLDOWNS PARA ARISA (Arisa.js) ---

const ARISA_BASE_DAMAGE = 25;

const arisaCooldowns = {
    SPEC: false,
    ACT1: false,
    ACT2: false,
    ACT3: false,
    ACT4: false
};

const arisaIntervals = {};
let arisaActiveFrames = []; // Registro de requestAnimationFrames activos

// Variables para ACT4 (Yunque)
let activeAnvilPreview = null;
let isHoldingAct4 = false;

// LIMPIEZA COMPLETA DE COOLDOWNS Y OBJETOS
function resetArisaState(scene, playerGroup) {
    // Cancelar animaciones en curso para evitar memory leaks
    arisaActiveFrames.forEach(id => cancelAnimationFrame(id));
    arisaActiveFrames = [];

    // Detener intervalos de UI
    Object.keys(arisaIntervals).forEach(key => {
        if (arisaIntervals[key]) {
            clearInterval(arisaIntervals[key]);
            arisaIntervals[key] = null;
        }
    });

    // Remover overlays visuales
    ['specBtn', 'act1', 'act2', 'act3', 'act4'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            const overlay = btn.querySelector('.cd-overlay');
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }
    });

    // Resetear banderas
    Object.keys(arisaCooldowns).forEach(key => {
        arisaCooldowns[key] = false;
    });

    // Destruir elementos 3D
    if (activeAnvilPreview) disposeMesh(activeAnvilPreview, scene);

    activeAnvilPreview = null;
    isHoldingAct4 = false;
}

function applyArisaDamage(damage, playerGroup) {
    if (typeof receiveDamage === 'function') {
        const attackerPos = playerGroup ? playerGroup.position : null;
        receiveDamage(damage, attackerPos, true);
    }
}

function createArisaMaterial() {
    return new THREE.MeshPhysicalMaterial({
        color: 0x00bfff,
        emissive: 0x005588,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.85,
        transparent: true,
        opacity: 0.65,
        ior: 1.2,
        side: THREE.DoubleSide
    });
}

const ARISA_MAT = createArisaMaterial();

function triggerArisaCooldown(btnId, durationSeconds, cdKey) {
    if (arisaCooldowns[cdKey]) return;
    arisaCooldowns[cdKey] = true;

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

    if (arisaIntervals[cdKey]) clearInterval(arisaIntervals[cdKey]);

    arisaIntervals[cdKey] = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) {
            overlay.textContent = timeLeft;
        } else {
            clearInterval(arisaIntervals[cdKey]);
            arisaIntervals[cdKey] = null;
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            arisaCooldowns[cdKey] = false;
        }
    }, 1000);
}

function canUseArisaSkill(activeActions) {
    if (typeof ACTIONS !== 'undefined' && (activeActions & ACTIONS.BLOQUEAR)) return false;
    return true;
}

function disposeMesh(mesh, parentScene) {
    if (!mesh) return;
    if (parentScene) parentScene.remove(mesh);
    mesh.traverse((child) => {
        if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
        }
    });
}

// --- 1. ESPECIAL (SPEC): ANTERIOR ACT2 (SOGA DE ATRACCIÓN CON 17s DE CD) ---
function createRopeMesh() {
    const ropeGroup = new THREE.Group();
    const loopGeo = new THREE.TorusGeometry(0.25, 0.03, 10, 20);
    const loop = new THREE.Mesh(loopGeo, ARISA_MAT);
    loop.rotation.x = Math.PI / 2;
    loop.name = "lassoHead";
    ropeGroup.add(loop);

    const lineGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 8);
    lineGeo.translate(0, 0.5, 0);
    const line = new THREE.Mesh(lineGeo, ARISA_MAT);
    line.name = "ropeLine";
    ropeGroup.add(line);

    return ropeGroup;
}

function useArisaSpecial(playerGroup, activeActions) {
    if (!canUseArisaSkill(activeActions) || arisaCooldowns.SPEC) return;
    triggerArisaCooldown('specBtn', 17, 'SPEC');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'SPEC');

    const scene = playerGroup.parent || (typeof window.scene !== 'undefined' ? window.scene : null);
    if (!scene) return;

    const torso = playerGroup.children[0];
    const rightArm = torso?.children?.find(c => c.position.x > 0 && c.type === "Group");
    const leftArm = torso?.children?.find(c => c.position.x < 0 && c.type === "Group");

    const rope = createRopeMesh();
    scene.add(rope);

    const lassoHead = rope.getObjectByName("lassoHead");
    const ropeLine = rope.getObjectByName("ropeLine");

    let currentDist = 0.2;
    const maxDist = 7.0;
    const throwSpeed = 0.45;
    let state = "THROW";
    let caughtTarget = null;
    let spinAngle = 0;
    let frameId;

    const playerRot = playerGroup.rotation.y;
    const throwDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRot).normalize();

    function animateRope() {
        const startPos = playerGroup.position.clone().add(new THREE.Vector3(0, 0.8, 0));

        if (rightArm) {
            rightArm.rotation.x = (state === "THROW") ? -Math.PI / 1.8 : -Math.PI / 3;
        }

        if (state === "THROW") {
            currentDist += throwSpeed;
            spinAngle += 0.4;

            const headPos = startPos.clone().addScaledVector(throwDir, currentDist);
            lassoHead.position.copy(headPos);
            lassoHead.rotation.y = spinAngle;

            ropeLine.position.copy(startPos);
            ropeLine.scale.set(1, currentDist, 1);
            ropeLine.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), throwDir);

            if (typeof dummyMesh !== 'undefined' && dummyMesh) {
                const targetPos = dummyMesh.position.clone().add(new THREE.Vector3(0, 0.8, 0));
                
                if (headPos.distanceTo(targetPos) < 1.0) {
                    state = "PULL";
                    caughtTarget = dummyMesh;
                    applyArisaDamage(10, playerGroup);
                }
            }

            if (currentDist >= maxDist && state === "THROW") {
                state = "RETRACT";
            }
        } 
        else if (state === "PULL") {
            if (caughtTarget) {
                const pullDir = new THREE.Vector3()
                    .subVectors(playerGroup.position, caughtTarget.position);
                pullDir.y = 0;

                const distanceToPlayer = pullDir.length();

                if (distanceToPlayer > 1.2) {
                    pullDir.normalize();
                    caughtTarget.position.addScaledVector(pullDir, throwSpeed * 1.3);
                } else {
                    state = "END";
                }

                const headPos = caughtTarget.position.clone().add(new THREE.Vector3(0, 0.8, 0));
                lassoHead.position.copy(headPos);

                const actualRopeVec = new THREE.Vector3().subVectors(headPos, startPos);
                const actualDist = actualRopeVec.length();

                ropeLine.position.copy(startPos);
                ropeLine.scale.set(1, Math.max(actualDist, 0.1), 1);

                if (actualDist > 0.05) {
                    actualRopeVec.normalize();
                    ropeLine.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), actualRopeVec);
                }
            } else {
                state = "RETRACT";
            }
        } 
        else if (state === "RETRACT") {
            currentDist -= throwSpeed * 1.5;
            const headPos = startPos.clone().addScaledVector(throwDir, Math.max(currentDist, 0.1));
            
            lassoHead.position.copy(headPos);
            ropeLine.position.copy(startPos);
            ropeLine.scale.set(1, Math.max(currentDist, 0.1), 1);
            ropeLine.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), throwDir);

            if (currentDist <= 0.3) {
                state = "END";
            }
        }

        if (state !== "END") {
            frameId = requestAnimationFrame(animateRope);
            arisaActiveFrames.push(frameId);
        } else {
            if (rightArm) rightArm.rotation.set(-0.6, 0, 0.3);
            if (leftArm) leftArm.rotation.set(-0.6, 0, -0.3);
            disposeMesh(rope, scene);
        }
    }

    frameId = requestAnimationFrame(animateRope);
    arisaActiveFrames.push(frameId);
}

// --- 2. ACT1: MARTILLAZO ---
function createMaceMesh() {
    const maceGroup = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 12);
    const handle = new THREE.Mesh(handleGeo, ARISA_MAT);
    handle.position.y = 0.9;

    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.8);
    const head = new THREE.Mesh(headGeo, ARISA_MAT);
    head.position.y = 1.6;

    maceGroup.add(handle, head);
    return maceGroup;
}

function useArisaAct1(playerGroup, scene, activeActions) {
    if (!canUseArisaSkill(activeActions) || arisaCooldowns.ACT1) return;
    triggerArisaCooldown('act1', 20, 'ACT1');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT1');

    const torso = playerGroup.children[0];
    const leftArm = torso?.children?.find(c => c.position.x < 0 && c.type === "Group");
    const rightArm = torso?.children?.find(c => c.position.x > 0 && c.type === "Group");

    const maceGroup = createMaceMesh();
    scene.add(maceGroup);

    let startTime = performance.now();
    const duration = 0.35;
    let frameId;

    function animateHammerStrike(now) {
        const playerRotation = playerGroup.rotation.y;
        const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRotation).normalize();

        let elapsed = (now - startTime) / 1000;
        let progress = Math.min(elapsed / duration, 1.0);
        let swingAngle = -Math.PI / 2.2 + (Math.pow(progress, 2.5) * Math.PI * 1.05);

        if (leftArm && rightArm) {
            let armAngle = -Math.PI * 0.85 + (progress * Math.PI * 1.1);
            leftArm.rotation.x = armAngle;
            rightArm.rotation.x = armAngle;
        }

        maceGroup.rotation.set(0, playerRotation, 0);
        maceGroup.rotateX(swingAngle);

        const forwardOffset = 0.5 + (progress * 0.6);
        const heightOffset = 1.2 - (progress * 1.0);

        maceGroup.position.copy(playerGroup.position)
            .addScaledVector(dir, forwardOffset)
            .add(new THREE.Vector3(0, heightOffset, 0));

        if (progress < 1.0) {
            frameId = requestAnimationFrame(animateHammerStrike);
            arisaActiveFrames.push(frameId);
        } else {
            if (typeof dummyMesh !== 'undefined' && dummyMesh) {
                const strikePoint = playerGroup.position.clone().addScaledVector(dir, 1.8);
                const enemyPos = dummyMesh.position.clone();
                strikePoint.y = 0;
                enemyPos.y = 0;

                if (strikePoint.distanceTo(enemyPos) < 1.2) {
                    applyArisaDamage(ARISA_BASE_DAMAGE * 1.45, playerGroup);
                }
            }

            if (leftArm && rightArm) {
                leftArm.rotation.set(-0.6, 0, -0.3);
                rightArm.rotation.set(-0.6, 0, 0.3);
            }
            disposeMesh(maceGroup, scene);
        }
    }
    frameId = requestAnimationFrame(animateHammerStrike);
    arisaActiveFrames.push(frameId);
}

// --- 3. NUEVA ACT2: MINI GOLEM PROYECTIL (20s COOLDOWN) ---
function createMiniGolemMesh() {
    const golemGroup = new THREE.Group();

    // Cuerpo
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.6, 0.4);
    const body = new THREE.Mesh(bodyGeo, ARISA_MAT);
    body.position.y = 0.4;
    golemGroup.add(body);

    // Cabeza
    const headGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const head = new THREE.Mesh(headGeo, ARISA_MAT);
    head.position.y = 0.85;
    golemGroup.add(head);

    // Brazos
    const armGeo = new THREE.BoxGeometry(0.18, 0.45, 0.18);
    const leftArm = new THREE.Mesh(armGeo, ARISA_MAT);
    leftArm.position.set(-0.35, 0.4, 0);
    const rightArm = new THREE.Mesh(armGeo, ARISA_MAT);
    rightArm.position.set(0.35, 0.4, 0);
    golemGroup.add(leftArm, rightArm);

    return golemGroup;
}

function useArisaAct2(playerGroup, scene, activeActions) {
    if (!canUseArisaSkill(activeActions) || arisaCooldowns.ACT2) return;
    triggerArisaCooldown('act2', 20, 'ACT2');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT2');

    const golem = createMiniGolemMesh();
    
    // Dirección hacia adelante según rotación de Arisa
    const playerRot = playerGroup.rotation.y;
    const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRot).normalize();

    // Posicionamiento inicial frente al jugador
    golem.position.copy(playerGroup.position).addScaledVector(dir, 0.8);
    golem.position.y = 0;
    golem.rotation.y = playerRot;
    scene.add(golem);

    const moveSpeed = 0.25; // Velocidad de avance
    const lifetimeLimit = 2.0; // 2 segundos máximos
    let startTime = performance.now();
    let frameId;

    function animateGolem(now) {
        let elapsed = (now - startTime) / 1000;

        // Movimiento rectilíneo
        golem.position.addScaledVector(dir, moveSpeed);

        let hitEnemy = false;
        if (typeof dummyMesh !== 'undefined' && dummyMesh) {
            const golemPos = golem.position.clone();
            const enemyPos = dummyMesh.position.clone();
            golemPos.y = 0;
            enemyPos.y = 0;

            // Detección de impacto
            if (golemPos.distanceTo(enemyPos) < 1.0) {
                hitEnemy = true;
            }
        }

        // Si colisiona o expira el tiempo de 2s
        if (hitEnemy || elapsed >= lifetimeLimit) {
            if (hitEnemy) {
                // Daño: 45% más que un básico (25 * 1.45 = 36.25)
                applyArisaDamage(ARISA_BASE_DAMAGE * 1.45, playerGroup);
            }
            disposeMesh(golem, scene);
        } else {
            frameId = requestAnimationFrame(animateGolem);
            arisaActiveFrames.push(frameId);
        }
    }

    frameId = requestAnimationFrame(animateGolem);
    arisaActiveFrames.push(frameId);
}

// --- 4. ACT3: APUÑALAMIENTO ---
function createDaggerMesh() {
    const daggerGroup = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.22, 8);
    const handle = new THREE.Mesh(handleGeo, ARISA_MAT);

    const guardGeo = new THREE.BoxGeometry(0.24, 0.03, 0.06);
    const guard = new THREE.Mesh(guardGeo, ARISA_MAT);
    guard.position.y = 0.11;

    const bladeGeo = new THREE.ConeGeometry(0.08, 0.55, 4);
    const blade = new THREE.Mesh(bladeGeo, ARISA_MAT);
    blade.position.y = 0.38;

    daggerGroup.add(handle, guard, blade);
    return daggerGroup;
}

function useArisaAct3(playerGroup, scene, activeActions) {
    if (!canUseArisaSkill(activeActions) || arisaCooldowns.ACT3) return;
    triggerArisaCooldown('act3', 15, 'ACT3');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT3');

    const torso = playerGroup.children[0];
    const rightArm = torso?.children?.find(c => c.position.x > 0 && c.type === "Group") || playerGroup;

    const dagger = createDaggerMesh();
    dagger.position.set(0, -0.32, 0.25);
    dagger.rotation.x = Math.PI / 2.2;

    rightArm.add(dagger);

    let startTime = performance.now();
    let hasDealtDamage = false;
    let frameId;
    
    function animateStabArm(now) {
        let elapsed = (now - startTime) / 1000;

        if (elapsed < 0.12) {
            let thrustProgress = elapsed / 0.12;
            rightArm.rotation.x = -0.6 - (thrustProgress * 0.9);
            rightArm.position.z = thrustProgress * 0.25;

            if (!hasDealtDamage && thrustProgress > 0.8) {
                hasDealtDamage = true;
                if (typeof dummyMesh !== 'undefined' && dummyMesh) {
                    const playerRot = playerGroup.rotation.y;
                    const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRot).normalize();
                    const stabPoint = playerGroup.position.clone().addScaledVector(dir, 1.2);
                    const enemyPos = dummyMesh.position.clone();
                    stabPoint.y = 0;
                    enemyPos.y = 0;

                    if (stabPoint.distanceTo(enemyPos) < 1.1) {
                        applyArisaDamage(ARISA_BASE_DAMAGE * 1.20, playerGroup);
                    }
                }
            }

            frameId = requestAnimationFrame(animateStabArm);
            arisaActiveFrames.push(frameId);
        } else if (elapsed < 0.24) {
            let retractProgress = (elapsed - 0.12) / 0.12;
            rightArm.rotation.x = -1.5 + (retractProgress * 0.9);
            rightArm.position.z = 0.25 * (1.0 - retractProgress);
            frameId = requestAnimationFrame(animateStabArm);
            arisaActiveFrames.push(frameId);
        } else {
            rightArm.rotation.set(-0.6, 0, 0.3);
            rightArm.position.set(0.27, 0.2, 0);

            rightArm.remove(dagger);
            disposeMesh(dagger, rightArm);
        }
    }
    frameId = requestAnimationFrame(animateStabArm);
    arisaActiveFrames.push(frameId);
}

// --- 5. ACT4: CAÍDA DE YUNQUE ---
function createAnvilMesh() {
    const anvilGroup = new THREE.Group();
    const baseGeo = new THREE.BoxGeometry(0.6, 0.25, 0.4);
    const topGeo = new THREE.BoxGeometry(0.8, 0.35, 0.5);
    const hornGeo = new THREE.ConeGeometry(0.2, 0.5, 4);

    const base = new THREE.Mesh(baseGeo, ARISA_MAT);
    const top = new THREE.Mesh(topGeo, ARISA_MAT);
    top.position.y = 0.3;

    const horn = new THREE.Mesh(hornGeo, ARISA_MAT);
    horn.rotation.z = -Math.PI / 2;
    horn.position.set(0.5, 0.3, 0);

    anvilGroup.add(base, top, horn);
    return anvilGroup;
}

function holdArisaAct4(playerGroup, scene, activeActions) {
    if (!canUseArisaSkill(activeActions) || arisaCooldowns.ACT4) return;

    if (!isHoldingAct4) {
        isHoldingAct4 = true;
        if (!activeAnvilPreview) {
            activeAnvilPreview = createAnvilMesh();
            scene.add(activeAnvilPreview);
        }

        let frameId;
        function updateAnvilPosition() {
            if (!isHoldingAct4 || !activeAnvilPreview) return;

            const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y);
            const targetPos = playerGroup.position.clone().addScaledVector(dir, 2.8);
            targetPos.y = 2.5;

            activeAnvilPreview.position.copy(targetPos);
            activeAnvilPreview.rotation.y = playerGroup.rotation.y;

            frameId = requestAnimationFrame(updateAnvilPosition);
            arisaActiveFrames.push(frameId);
        }

        updateAnvilPosition();
    }
}

function releaseArisaAct4(playerGroup, scene, activeActions) {
    if (!isHoldingAct4 || !activeAnvilPreview) return;
    isHoldingAct4 = false;

    triggerArisaCooldown('act4', 25, 'ACT4');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT4');

    const fallingAnvil = activeAnvilPreview;
    activeAnvilPreview = null;

    let dropSpeed = 0;
    const gravityAcc = 28.0;
    let frameId;

    function dropAnimation() {
        dropSpeed += gravityAcc * 0.016;
        fallingAnvil.position.y -= dropSpeed * 0.016;

        if (fallingAnvil.position.y <= 0.3) {
            fallingAnvil.position.y = 0.3;

            if (typeof dummyMesh !== 'undefined' && dummyMesh) {
                const impactPos = new THREE.Vector3(fallingAnvil.position.x, 0, fallingAnvil.position.z);
                const enemyPos = dummyMesh.position.clone();
                enemyPos.y = 0;

                if (impactPos.distanceTo(enemyPos) < 1.0) {
                    applyArisaDamage(ARISA_BASE_DAMAGE * 1.48, playerGroup);
                }
            }

            setTimeout(() => disposeMesh(fallingAnvil, scene), 200);
        } else {
            frameId = requestAnimationFrame(dropAnimation);
            arisaActiveFrames.push(frameId);
        }
    }

    dropAnimation();
}

