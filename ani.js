// --- SISTEMA DE ANIMACIONES DEL JUGADOR (ani.js - Optimizado) ---

let aniTime = 0;
let isAttackingAnim = false;
let attackAnimTimer = 0;
let totalAttackDuration = 0;
let currentAttackType = null;

// SISTEMA DE COMBO
let comboStep = 0;
let comboResetTimer = 0;

// SISTEMA DE FANTASMAS (OBJECT POOLING)
const MAX_GHOSTS = 8;
const ghostPool = [];
let ghostSpawnTimer = 0;

// Curvas de Easing
function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
}

function easeInOutSinusoidal(x) {
    return -(Math.cos(Math.PI * x) - 1) / 2;
}

// INICIALIZACIÓN DE PARTES (Llamar al crear el jugador)
function initPlayerParts(playerGroup) {
    const body = playerGroup.children[0];
    if (!body) return null;

    playerGroup.userData.parts = {
        body: body,
        leftArm: body.children?.find(c => c.position.x < 0 && c.type === "Group"),
        rightArm: body.children?.find(c => c.position.x > 0 && c.type === "Group"),
        leftLeg: body.children?.find(c => c.position.x < 0 && c.position.y < 0 && c.type === "Group"),
        rightLeg: body.children?.find(c => c.position.x > 0 && c.position.y < 0 && c.type === "Group")
    };
    return playerGroup.userData.parts;
}

// INICIALIZACIÓN DE POOL DE DASH
function initDashGhostPool(scene, playerGroup) {
    if (ghostPool.length > 0) return;

    for (let i = 0; i < MAX_GHOSTS; i++) {
        const ghostMat = new THREE.MeshBasicMaterial({
            color: 0x881111,
            transparent: true,
            opacity: 0
        });

        const ghost = playerGroup.clone(true);
        ghost.visible = false;

        ghost.traverse((child) => {
            if (child.isMesh) {
                child.material = ghostMat;
            }
        });

        scene.add(ghost);
        ghostPool.push({ mesh: ghost, life: 0, maxLife: 0.12, mat: ghostMat });
    }
}

function createDashGhost(playerGroup, scene) {
    if (ghostPool.length === 0) initDashGhostPool(scene, playerGroup);

    const ghost = ghostPool.find(g => !g.mesh.visible);
    if (!ghost) return;

    ghost.mesh.position.copy(playerGroup.position);
    ghost.mesh.rotation.copy(playerGroup.rotation);
    ghost.mesh.visible = true;
    ghost.life = ghost.maxLife;
    ghost.mat.opacity = 0.55;
}

function updateDashGhosts(delta) {
    for (let i = 0; i < ghostPool.length; i++) {
        const g = ghostPool[i];
        if (!g.mesh.visible) continue;

        g.life -= delta;
        if (g.life <= 0) {
            g.mesh.visible = false;
        } else {
            g.mat.opacity = (g.life / g.maxLife) * 0.55;
        }
    }
}

// ANIMACIÓN DE BLOQUEO / GUARDIA
function animateBlock(playerGroup, delta) {
    if (isAttackingAnim) return;

    const parts = playerGroup.userData.parts || initPlayerParts(playerGroup);
    if (!parts || !parts.body) return;

    const { body, leftArm, rightArm } = parts;
    const lerpSpeed = delta * 18;

    body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, -0.12, lerpSpeed);
    body.position.y = THREE.MathUtils.lerp(body.position.y, 0.70, lerpSpeed);

    if (leftArm) {
        leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -1.45, lerpSpeed);
        leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0.45, lerpSpeed);
        leftArm.position.set(-0.12, 0.22, 0.18);
    }
    if (rightArm) {
        rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -1.45, lerpSpeed);
        rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, -0.45, lerpSpeed);
        rightArm.position.set(0.12, 0.22, 0.18);
    }
}

function animateMovement(playerGroup, speedFactor, isBlocking, delta) {
    if (isAttackingAnim) return;

    const parts = playerGroup.userData.parts || initPlayerParts(playerGroup);
    if (!parts || !parts.body) return;

    const { body, leftArm, rightArm, leftLeg, rightLeg } = parts;
    if (!leftLeg || !rightLeg) return;

    const lerpSpeed = delta * 15;

    if (!isBlocking) {
        body.position.y = THREE.MathUtils.lerp(body.position.y, 0.73 + Math.sin(aniTime * 2) * 0.02, lerpSpeed);
        body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0.08, lerpSpeed);
        body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, Math.sin(aniTime) * 0.03, lerpSpeed);
    }

    aniTime += delta * speedFactor * 14;

    const legAngle = Math.sin(aniTime) * 0.7;
    const armAngle = Math.sin(aniTime) * 0.5;

    leftLeg.rotation.x = legAngle;
    rightLeg.rotation.x = -legAngle;
    leftLeg.position.set(-0.13, -0.26, 0);
    rightLeg.position.set(0.13, -0.26, 0);

    if (isBlocking) {
        animateBlock(playerGroup, delta);
    } else if (leftArm && rightArm) {
        leftArm.rotation.x = -0.5 - armAngle;
        rightArm.rotation.x = -0.5 + armAngle;
        leftArm.rotation.z = -0.25;
        rightArm.rotation.z = 0.25;
        leftArm.position.set(-0.27, 0.2, 0);
        rightArm.position.set(0.27, 0.2, 0);
    }
}

function resetToIdle(playerGroup, isBlocking, delta) {
    if (isAttackingAnim) return;

    const parts = playerGroup.userData.parts || initPlayerParts(playerGroup);
    if (!parts) return;

    const { body, leftArm, rightArm, leftLeg, rightLeg } = parts;
    const lerpSpeed = delta * 12;

    if (leftLeg) {
        leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, lerpSpeed);
        leftLeg.rotation.y = THREE.MathUtils.lerp(leftLeg.rotation.y, 0, lerpSpeed);
        leftLeg.rotation.z = THREE.MathUtils.lerp(leftLeg.rotation.z, 0, lerpSpeed);
        leftLeg.position.set(-0.13, -0.26, 0);
    }
    if (rightLeg) {
        rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, lerpSpeed);
        rightLeg.rotation.y = THREE.MathUtils.lerp(rightLeg.rotation.y, 0, lerpSpeed);
        rightLeg.rotation.z = THREE.MathUtils.lerp(rightLeg.rotation.z, 0, lerpSpeed);
        rightLeg.position.set(0.13, -0.26, 0);
    }

    if (isBlocking) {
        animateBlock(playerGroup, delta);
        return;
    }

    if (body) {
        body.position.y = THREE.MathUtils.lerp(body.position.y, 0.73, lerpSpeed);
        body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0, lerpSpeed);
        body.rotation.y = THREE.MathUtils.lerp(body.rotation.y, 0, lerpSpeed);
        body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, 0, lerpSpeed);
    }

    if (leftArm && rightArm) {
        leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -0.4, lerpSpeed);
        rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -0.4, lerpSpeed);
        leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, -0.25, lerpSpeed);
        rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0.25, lerpSpeed);
        leftArm.position.set(-0.27, 0.2, 0);
        rightArm.position.set(0.27, 0.2, 0);
    }
}

function animateJump(playerGroup, isBlocking, delta) {
    if (isAttackingAnim) return;

    const parts = playerGroup.userData.parts || initPlayerParts(playerGroup);
    if (!parts) return;

    const { body, leftArm, rightArm, leftLeg, rightLeg } = parts;
    const lerpSpeed = delta * 15;

    if (body) {
        body.position.y = THREE.MathUtils.lerp(body.position.y, 0.73, lerpSpeed);
        body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0.2, lerpSpeed);
    }

    if (leftLeg) {
        leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0.6, lerpSpeed);
        leftLeg.position.z = THREE.MathUtils.lerp(leftLeg.position.z, -0.05, lerpSpeed);
    }
    if (rightLeg) {
        rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, -0.4, lerpSpeed);
        rightLeg.position.z = THREE.MathUtils.lerp(rightLeg.position.z, 0.08, lerpSpeed);
    }

    if (isBlocking) {
        animateBlock(playerGroup, delta);
    } else if (leftArm && rightArm) {
        leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -1.3, lerpSpeed);
        rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -1.3, lerpSpeed);
        leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, -0.4, lerpSpeed);
        rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0.4, lerpSpeed);
    }
}

function animateDash(playerGroup, scene, delta) {
    const parts = playerGroup.userData.parts || initPlayerParts(playerGroup);
    if (!parts || !parts.body) return;

    const { body, leftArm, rightArm, leftLeg, rightLeg } = parts;
    const lerpSpeed = delta * 25;

    body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0.7, lerpSpeed);
    body.position.y = THREE.MathUtils.lerp(body.position.y, 0.5, lerpSpeed);

    if (leftArm) {
        leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 1.4, lerpSpeed);
        leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, -0.2, lerpSpeed);
    }
    if (rightArm) {
        rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 1.4, lerpSpeed);
        rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0.2, lerpSpeed);
    }

    if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, -1.1, lerpSpeed);
    if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 1.1, lerpSpeed);

    ghostSpawnTimer += delta;
    if (ghostSpawnTimer >= 0.04) {
        createDashGhost(playerGroup, scene);
        ghostSpawnTimer = 0;
    }
}

function triggerHitAnimation(playerGroup) {
    isAttackingAnim = true;
    attackAnimTimer = 0.22;
    totalAttackDuration = 0.22;

    comboResetTimer = 0.9;
    comboStep = (comboStep % 4) + 1;
    currentAttackType = `HIT${comboStep}`;
}

function triggerSkillAnimation(playerGroup, skillType) {
    isAttackingAnim = true;
    currentAttackType = skillType;

    switch (skillType) {
        case 'ACT1': attackAnimTimer = totalAttackDuration = 0.28; break;
        case 'ACT2': attackAnimTimer = totalAttackDuration = 0.32; break;
        case 'ACT3': attackAnimTimer = totalAttackDuration = 0.40; break;
        case 'ACT4': attackAnimTimer = totalAttackDuration = 0.35; break;
    }
}

function processAttackDynamics(playerGroup, delta) {
    const parts = playerGroup.userData.parts || initPlayerParts(playerGroup);
    if (!parts || !parts.body) return;

    const { body, leftArm, rightArm, leftLeg } = parts;

    const linearProgress = 1.0 - (attackAnimTimer / totalAttackDuration);
    
    let extension = 0;
    if (linearProgress < 0.3) {
        extension = easeOutCubic(linearProgress / 0.3);
    } else {
        extension = easeInOutSinusoidal(1.0 - ((linearProgress - 0.3) / 0.7));
    }

    const lerpSpeed = delta * 25;

    switch (currentAttackType) {
        case 'HIT1':
            body.rotation.y = THREE.MathUtils.lerp(body.rotation.y, 0.35 * extension, lerpSpeed);
            if (rightArm) {
                rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -1.8 * extension, lerpSpeed);
                rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, -0.1 * extension, lerpSpeed);
                rightArm.position.z = THREE.MathUtils.lerp(rightArm.position.z, 0.4 * extension, lerpSpeed);
            }
            if (leftArm) {
                leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -0.7, lerpSpeed);
            }
            break;

        case 'HIT2':
            body.rotation.y = THREE.MathUtils.lerp(body.rotation.y, -0.45 * extension, lerpSpeed);
            if (leftArm) {
                leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -1.85 * extension, lerpSpeed);
                leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0.1 * extension, lerpSpeed);
                leftArm.position.z = THREE.MathUtils.lerp(leftArm.position.z, 0.45 * extension, lerpSpeed);
            }
            if (rightArm) {
                rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -0.4, lerpSpeed);
            }
            break;

        case 'HIT3':
            body.rotation.y = THREE.MathUtils.lerp(body.rotation.y, 0.4 * extension, lerpSpeed);
            body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, -0.2 * extension, lerpSpeed);
            if (rightArm) {
                rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -2.2 * extension, lerpSpeed);
                rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, -0.35 * extension, lerpSpeed);
                rightArm.position.z = THREE.MathUtils.lerp(rightArm.position.z, 0.3 * extension, lerpSpeed);
            }
            break;

        case 'HIT4':
            body.rotation.y = THREE.MathUtils.lerp(body.rotation.y, -0.65 * extension, lerpSpeed);
            body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0.2 * extension, lerpSpeed);
            if (leftArm) {
                leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -2.2 * extension, lerpSpeed);
                leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0.25 * extension, lerpSpeed);
                leftArm.position.z = THREE.MathUtils.lerp(leftArm.position.z, 0.5 * extension, lerpSpeed);
            }
            if (rightArm) {
                rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -0.3, lerpSpeed);
                rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0.5, lerpSpeed);
            }
            break;

        case 'ACT1':
            if (rightArm) {
                rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -1.8 * extension, lerpSpeed);
                rightArm.position.z = THREE.MathUtils.lerp(rightArm.position.z, 0.35 * extension, lerpSpeed);
            }
            break;

        case 'ACT2':
            if (leftArm) {
                leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -1.4 * extension, lerpSpeed);
                leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0.6 * extension, lerpSpeed);
                leftArm.position.z = THREE.MathUtils.lerp(leftArm.position.z, 0.25 * extension, lerpSpeed);
            }
            break;

        case 'ACT3':
            if (leftArm && rightArm) {
                leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -1.5 * extension, lerpSpeed);
                rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -1.5 * extension, lerpSpeed);
                leftArm.position.z = THREE.MathUtils.lerp(leftArm.position.z, 0.35 * extension, lerpSpeed);
                rightArm.position.z = THREE.MathUtils.lerp(rightArm.position.z, 0.35 * extension, lerpSpeed);
            }
            break;

        case 'ACT4':
            if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, -0.9 * extension, lerpSpeed);
            if (leftArm && rightArm) {
                leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0.6 * extension, lerpSpeed);
                rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0.6 * extension, lerpSpeed);
            }
            break;
    }
}

function updatePlayerAnimations(playerGroup, isMoving, isDashing, isBlocking, isGrounded, scene, delta) {
    updateDashGhosts(delta);

    // Reset de combos sin setTimeout
    if (comboResetTimer > 0) {
        comboResetTimer -= delta;
        if (comboResetTimer <= 0) comboStep = 0;
    }

    if (isAttackingAnim) {
        attackAnimTimer -= delta;
        processAttackDynamics(playerGroup, delta);

        if (attackAnimTimer <= 0) {
            isAttackingAnim = false;
            currentAttackType = null;
        }
    }

    if (isDashing) {
        animateDash(playerGroup, scene, delta);
        return; 
    } else {
        playerGroup.rotation.x = THREE.MathUtils.lerp(playerGroup.rotation.x, 0, delta * 15);
    }

    if (!isGrounded) {
        animateJump(playerGroup, isBlocking, delta);
    } else if (isMoving) {
        animateMovement(playerGroup, 1.0, isBlocking, delta);
    } else {
        resetToIdle(playerGroup, isBlocking, delta);
    }
}

