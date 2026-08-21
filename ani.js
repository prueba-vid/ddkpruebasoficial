// --- SISTEMA DE ANIMACIONES DEL JUGADOR, COMBOS, SALTO, DASH Y HABILIDADES (ani.js) ---

let aniTime = 0;
let isAttackingAnim = false;
let attackAnimTimer = 0;
let totalAttackDuration = 0;
let currentAttackType = null; // 'HIT1', 'HIT2', 'HIT3', 'HIT4', 'ACT1', etc.

// SISTEMA DE COMBO (1 a 4)
let comboStep = 0;
let comboResetTimeout = null;

// COPIA Y EFECTOS DE DASH (Estela Estilo JJS)
let dashGhostGroup = [];
let ghostSpawnTimer = 0;

// Curvas de Easing para suavizado
function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
}

function easeInOutSinusoidal(x) {
    return -(Math.cos(Math.PI * x) - 1) / 2;
}

function createDashGhost(playerGroup, scene) {
    if (!scene) return;
    
    const ghost = playerGroup.clone(true);
    ghost.position.copy(playerGroup.position);
    ghost.rotation.copy(playerGroup.rotation);

    const ghostMat = new THREE.MeshBasicMaterial({
        color: 0x881111,
        transparent: true,
        opacity: 0.55
    });

    ghost.traverse((child) => {
        if (child.isMesh) {
            child.material = ghostMat;
        }
    });

    scene.add(ghost);
    dashGhostGroup.push({ mesh: ghost, life: 0.12, maxLife: 0.12, mat: ghostMat });
}

function updateDashGhosts(scene, delta) {
    for (let i = dashGhostGroup.length - 1; i >= 0; i--) {
        const g = dashGhostGroup[i];
        g.life -= delta;

        const lifeRatio = Math.max(0, g.life / g.maxLife);

        if (g.mat) {
            g.mat.opacity = lifeRatio * 0.55;
        }

        if (g.life <= 0) {
            scene.remove(g.mesh);
            g.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
            });
            if (g.mat) g.mat.dispose(); // Liberar memoria GPU
            dashGhostGroup.splice(i, 1);
        }
    }
}

// ANIMACIÓN DE BLOQUEO / GUARDIA
function animateBlock(playerGroup, delta) {
    if (isAttackingAnim) return;

    const body = playerGroup.children[0];
    if (!body) return;

    const leftArm = body.children?.find(c => c.position.x < 0 && c.type === "Group");
    const rightArm = body.children?.find(c => c.position.x > 0 && c.type === "Group");

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

    const body = playerGroup.children[0];
    if (!body) return;

    const leftArm = body.children?.find(c => c.position.x < 0 && c.type === "Group");
    const rightArm = body.children?.find(c => c.position.x > 0 && c.type === "Group");
    const leftLeg = body.children?.find(c => c.position.x < 0 && c.position.y < 0 && c.type === "Group");
    const rightLeg = body.children?.find(c => c.position.x > 0 && c.position.y < 0 && c.type === "Group");

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

    const body = playerGroup.children[0];
    const leftArm = body?.children?.find(c => c.position.x < 0 && c.type === "Group");
    const rightArm = body?.children?.find(c => c.position.x > 0 && c.type === "Group");
    const leftLeg = body?.children?.find(c => c.position.x < 0 && c.position.y < 0 && c.type === "Group");
    const rightLeg = body?.children?.find(c => c.position.x > 0 && c.position.y < 0 && c.type === "Group");

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

    // Posición estática en Idle sin balanceos ni oscilaciones
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

    const body = playerGroup.children[0];
    const leftArm = body?.children?.find(c => c.position.x < 0 && c.type === "Group");
    const rightArm = body?.children?.find(c => c.position.x > 0 && c.type === "Group");
    const leftLeg = body?.children?.find(c => c.position.x < 0 && c.position.y < 0 && c.type === "Group");
    const rightLeg = body?.children?.find(c => c.position.x > 0 && c.position.y < 0 && c.type === "Group");

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

// DASH ESTILO JUJUTSU SHENANIGANS (Inclinación pronunciada, brazos atrás y control de estelas)
function animateDash(playerGroup, scene, delta) {
    const lerpSpeed = delta * 25;

    const body = playerGroup.children[0];
    if (!body) return;

    const leftArm = body.children?.find(c => c.position.x < 0 && c.type === "Group");
    const rightArm = body.children?.find(c => c.position.x > 0 && c.type === "Group");
    const leftLeg = body.children?.find(c => c.position.x < 0 && c.position.y < 0 && c.type === "Group");
    const rightLeg = body.children?.find(c => c.position.x > 0 && c.position.y < 0 && c.type === "Group");

    // Inclinación agresiva del torso
    body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0.7, lerpSpeed);
    body.position.y = THREE.MathUtils.lerp(body.position.y, 0.5, lerpSpeed);

    // Brazos estirados totalmente hacia atrás
    if (leftArm) {
        leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 1.4, lerpSpeed);
        leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, -0.2, lerpSpeed);
    }
    if (rightArm) {
        rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 1.4, lerpSpeed);
        rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0.2, lerpSpeed);
    }

    // Piernas en zancada rápida
    if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, -1.1, lerpSpeed);
    if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 1.1, lerpSpeed);

    // Generar estela cada 0.04s para no sobrecargar la memoria
    ghostSpawnTimer += delta;
    if (ghostSpawnTimer >= 0.04) {
        createDashGhost(playerGroup, scene);
        ghostSpawnTimer = 0;
    }
}

// TRIGGER DE ATAQUES Y COMBOS
function triggerHitAnimation(playerGroup) {
    isAttackingAnim = true;
    attackAnimTimer = 0.22;
    totalAttackDuration = 0.22;

    if (comboResetTimeout) clearTimeout(comboResetTimeout);
    comboResetTimeout = setTimeout(() => { comboStep = 0; }, 900);

    comboStep = (comboStep % 4) + 1;
    currentAttackType = `HIT${comboStep}`;
}

function triggerSkillAnimation(playerGroup, skillType) {
    isAttackingAnim = true;
    currentAttackType = skillType;

    if (skillType === 'ACT1') {
        attackAnimTimer = 0.28;
        totalAttackDuration = 0.28;
    } else if (skillType === 'ACT2') {
        attackAnimTimer = 0.32;
        totalAttackDuration = 0.32;
    } else if (skillType === 'ACT3') {
        attackAnimTimer = 0.40;
        totalAttackDuration = 0.40;
    } else if (skillType === 'ACT4') {
        attackAnimTimer = 0.35;
        totalAttackDuration = 0.35;
    }
}

// PROCESADOR DINÁMICO DE ATAQUES
function processAttackDynamics(playerGroup, delta) {
    const body = playerGroup.children[0];
    if (!body) return;

    const leftArm = body.children?.find(c => c.position.x < 0 && c.type === "Group");
    const rightArm = body.children?.find(c => c.position.x > 0 && c.type === "Group");
    const leftLeg = body.children?.find(c => c.position.x < 0 && c.position.y < 0 && c.type === "Group");

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
    updateDashGhosts(scene, delta);

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

