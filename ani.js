// --- SISTEMA DE ANIMACIONES DEL JUGADOR, COMBOS, SALTO, DASH Y HABILIDADES (ani.js) ---

let aniTime = 0;
let isAttackingAnim = false;
let attackAnimTimer = 0;
let totalAttackDuration = 0;
let currentAttackType = null; // 'HIT1', 'HIT2', 'HIT3', 'HIT4', 'ACT1', etc.

// SISTEMA DE COMBO (1 a 4)
let comboStep = 0;
let comboResetTimeout = null;

// COPIA Y EFECTOS DE DASH (Estela)
let dashGhostGroup = [];

function createDashGhost(playerGroup, scene) {
    if (!scene) return;
    
    const ghost = playerGroup.clone(true);
    ghost.position.copy(playerGroup.position);
    ghost.rotation.copy(playerGroup.rotation);

    ghost.traverse((child) => {
        if (child.isMesh) {
            child.material = new THREE.MeshBasicMaterial({
                color: 0x611212,
                transparent: true,
                opacity: 0.45
            });
        }
    });

    scene.add(ghost);
    dashGhostGroup.push({ mesh: ghost, life: 0.18 });
}

function updateDashGhosts(scene, delta) {
    for (let i = dashGhostGroup.length - 1; i >= 0; i--) {
        const g = dashGhostGroup[i];
        g.life -= delta;
        
        g.mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.opacity = Math.max(0, g.life / 0.18) * 0.45;
            }
        });

        if (g.life <= 0) {
            scene.remove(g.mesh);
            g.mesh.traverse((child) => { if (child.geometry) child.geometry.dispose(); });
            dashGhostGroup.splice(i, 1);
        }
    }
}

// ANIMACIÓN DE BLOQUEO / GUARDIA MEJORADA
function animateBlock(playerGroup, delta) {
    if (isAttackingAnim) return;

    const body = playerGroup.children[0];
    if (!body) return;

    const leftArm = body.children?.find(c => c.position.x < 0 && c.type === "Group");
    const rightArm = body.children?.find(c => c.position.x > 0 && c.type === "Group");

    const lerpSpeed = delta * 15;

    // Torso con leve inclinación defensiva hacia atrás
    body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, -0.1, lerpSpeed);
    body.position.y = THREE.MathUtils.lerp(body.position.y, 0.71, lerpSpeed);

    // Brazos suben cruzados protegiendo la cabeza y el rostro
    if (leftArm) {
        leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -1.4, lerpSpeed);
        leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0.4, lerpSpeed);
        leftArm.position.set(-0.12, 0.22, 0.18);
    }
    if (rightArm) {
        rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -1.4, lerpSpeed);
        rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, -0.4, lerpSpeed);
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

    const lerpSpeed = delta * 12;

    // Estabilizar torso si no bloquea
    if (!isBlocking) {
        body.position.y = THREE.MathUtils.lerp(body.position.y, 0.73, lerpSpeed);
        body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0, lerpSpeed);
        body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, 0, lerpSpeed);
    }

    aniTime += delta * speedFactor * 12;

    const legAngle = Math.sin(aniTime) * 0.65;
    const armAngle = Math.sin(aniTime) * 0.45;

    leftLeg.rotation.x = legAngle;
    rightLeg.rotation.x = -legAngle;
    leftLeg.rotation.z = 0;
    rightLeg.rotation.z = 0;
    leftLeg.position.set(-0.13, -0.26, 0);
    rightLeg.position.set(0.13, -0.26, 0);

    if (isBlocking) {
        animateBlock(playerGroup, delta);
    } else if (leftArm && rightArm) {
        leftArm.rotation.x = -0.6 - armAngle;
        rightArm.rotation.x = -0.6 + armAngle;
        leftArm.rotation.z = -0.3;
        rightArm.rotation.z = 0.3;
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

    const lerpSpeed = delta * 10;

    // Restaurar Piernas
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

    // Restaurar Torso
    if (body) {
        body.position.y = THREE.MathUtils.lerp(body.position.y, 0.73, lerpSpeed);
        body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0, lerpSpeed);
        body.rotation.y = THREE.MathUtils.lerp(body.rotation.y, 0, lerpSpeed);
        body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, 0, lerpSpeed);
    }

    // Restaurar Brazos
    if (leftArm && rightArm) {
        leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -0.6, lerpSpeed);
        rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -0.6, lerpSpeed);
        leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, -0.3, lerpSpeed);
        rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0.3, lerpSpeed);
        leftArm.position.set(-0.27, 0.2, 0);
        rightArm.position.set(0.27, 0.2, 0);
    }
}

// ANIMACIÓN DE SALTO ENRIQUECIDA
function animateJump(playerGroup, isBlocking, delta) {
    if (isAttackingAnim) return;

    const body = playerGroup.children[0];
    const leftArm = body?.children?.find(c => c.position.x < 0 && c.type === "Group");
    const rightArm = body?.children?.find(c => c.position.x > 0 && c.type === "Group");
    const leftLeg = body?.children?.find(c => c.position.x < 0 && c.position.y < 0 && c.type === "Group");
    const rightLeg = body?.children?.find(c => c.position.x > 0 && c.position.y < 0 && c.type === "Group");

    const lerpSpeed = delta * 12;

    if (body) {
        body.position.y = THREE.MathUtils.lerp(body.position.y, 0.73, lerpSpeed);
        body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0.15, lerpSpeed); // Leve inclinación aérea
    }

    // Piernas recogidas en el aire (postura de salto)
    if (leftLeg) {
        leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0.55, lerpSpeed);
        leftLeg.position.z = THREE.MathUtils.lerp(leftLeg.position.z, -0.05, lerpSpeed);
    }
    if (rightLeg) {
        rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, -0.35, lerpSpeed);
        rightLeg.position.z = THREE.MathUtils.lerp(rightLeg.position.z, 0.08, lerpSpeed);
    }

    if (isBlocking) {
        animateBlock(playerGroup, delta);
    } else if (leftArm && rightArm) {
        // Brazos alzados para acompañar el impulso
        leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -1.2, lerpSpeed);
        rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -1.2, lerpSpeed);
        leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, -0.4, lerpSpeed);
        rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0.4, lerpSpeed);
    }
}

// ANIMACIÓN DE DASH (POSTURA DE IMPULSO RÁPIDO)
function animateDash(playerGroup, scene, delta) {
    const lerpSpeed = delta * 25;

    const body = playerGroup.children[0];
    const leftArm = body?.children?.find(c => c.position.x < 0 && c.type === "Group");
    const rightArm = body?.children?.find(c => c.position.x > 0 && c.type === "Group");
    const leftLeg = body?.children?.find(c => c.position.x < 0 && c.position.y < 0 && c.type === "Group");
    const rightLeg = body?.children?.find(c => c.position.x > 0 && c.position.y < 0 && c.type === "Group");

    if (body) {
        body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0.45, lerpSpeed);
        body.position.y = THREE.MathUtils.lerp(body.position.y, 0.65, lerpSpeed);
    }

    if (leftArm) {
        leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0.8, lerpSpeed);
        leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, -0.4, lerpSpeed);
    }
    if (rightArm) {
        rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0.8, lerpSpeed);
        rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0.4, lerpSpeed);
    }

    if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, -0.8, lerpSpeed);
    if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0.8, lerpSpeed);

    if (Math.random() < 0.6) {
        createDashGhost(playerGroup, scene);
    }
}

// ANIMACIÓN DE GOLPES BÁSICOS (COMBO DE 4 PUÑETAZOS)
function triggerHitAnimation(playerGroup) {
    isAttackingAnim = true;
    attackAnimTimer = 0.25;
    totalAttackDuration = 0.25;

    if (comboResetTimeout) clearTimeout(comboResetTimeout);
    comboResetTimeout = setTimeout(() => { comboStep = 0; }, 1000);

    comboStep = (comboStep % 4) + 1;
    currentAttackType = `HIT${comboStep}`;
}

// ANIMACIONES DE HABILIDADES
function triggerSkillAnimation(playerGroup, skillType) {
    isAttackingAnim = true;
    currentAttackType = skillType;

    if (skillType === 'ACT1') {
        attackAnimTimer = 0.3;
        totalAttackDuration = 0.3;
    } else if (skillType === 'ACT2') {
        attackAnimTimer = 0.35;
        totalAttackDuration = 0.35;
    } else if (skillType === 'ACT3') {
        attackAnimTimer = 0.45;
        totalAttackDuration = 0.45;
    } else if (skillType === 'ACT4') {
        attackAnimTimer = 0.4;
        totalAttackDuration = 0.4;
    }
}

// PROCESADOR DINÁMICO DE ATAQUES Y COMBOS (INVERTIDO: DERECHA / IZQUIERDA)
function processAttackDynamics(playerGroup, delta) {
    const body = playerGroup.children[0];
    if (!body) return;

    const leftArm = body.children?.find(c => c.position.x < 0 && c.type === "Group");
    const rightArm = body.children?.find(c => c.position.x > 0 && c.type === "Group");
    const leftLeg = body.children?.find(c => c.position.x < 0 && c.position.y < 0 && c.type === "Group");
    const rightLeg = body.children?.find(c => c.position.x > 0 && c.position.y < 0 && c.type === "Group");

    const progress = 1.0 - (attackAnimTimer / totalAttackDuration);
    
    let extension = 0;
    if (progress < 0.3) {
        extension = progress / 0.3; 
    } else {
        extension = 1.0 - ((progress - 0.3) / 0.7); 
    }

    const lerpSpeed = delta * 20;

    switch (currentAttackType) {
        case 'HIT1': // 1. Golpe Derecho (Jab)
            body.rotation.y = THREE.MathUtils.lerp(body.rotation.y, 0.25 * extension, lerpSpeed);
            if (rightArm) {
                rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -1.6 * extension, lerpSpeed);
                rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, -0.1 * extension, lerpSpeed);
                rightArm.position.z = THREE.MathUtils.lerp(rightArm.position.z, 0.35 * extension, lerpSpeed);
            }
            if (leftArm) {
                leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -0.8, lerpSpeed);
                leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, -0.4, lerpSpeed);
            }
            break;

        case 'HIT2': // 2. Golpe Izquierdo (Cross)
            body.rotation.y = THREE.MathUtils.lerp(body.rotation.y, -0.4 * extension, lerpSpeed);
            if (leftArm) {
                leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -1.7 * extension, lerpSpeed);
                leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0.1 * extension, lerpSpeed);
                leftArm.position.z = THREE.MathUtils.lerp(leftArm.position.z, 0.4 * extension, lerpSpeed);
            }
            if (rightArm) {
                rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -0.5, lerpSpeed);
                rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0.4, lerpSpeed);
            }
            break;

        case 'HIT3': // 3. Golpe Derecho (Uppercut/Hook)
            body.rotation.y = THREE.MathUtils.lerp(body.rotation.y, 0.3 * extension, lerpSpeed);
            body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, -0.15 * extension, lerpSpeed);
            if (rightArm) {
                rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -2.1 * extension, lerpSpeed);
                rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, -0.3 * extension, lerpSpeed);
                rightArm.position.z = THREE.MathUtils.lerp(rightArm.position.z, 0.2 * extension, lerpSpeed);
            }
            break;

        case 'HIT4': // 4. Golpe Izquierdo Potente (Remate)
            body.rotation.y = THREE.MathUtils.lerp(body.rotation.y, -0.55 * extension, lerpSpeed);
            body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0.1 * extension, lerpSpeed);
            if (leftArm) {
                leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -2.0 * extension, lerpSpeed);
                leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0.2 * extension, lerpSpeed);
                leftArm.position.z = THREE.MathUtils.lerp(leftArm.position.z, 0.45 * extension, lerpSpeed);
            }
            if (rightArm) {
                rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -0.4, lerpSpeed);
                rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0.5, lerpSpeed);
            }
            break;

        case 'ACT1':
            if (rightArm) {
                rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -1.6 * extension, lerpSpeed);
                rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, -0.1, lerpSpeed);
                rightArm.position.z = THREE.MathUtils.lerp(rightArm.position.z, 0.3 * extension, lerpSpeed);
            }
            break;

        case 'ACT2':
            if (leftArm) {
                leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -1.2 * extension, lerpSpeed);
                leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0.5 * extension, lerpSpeed);
                leftArm.position.z = THREE.MathUtils.lerp(leftArm.position.z, 0.2 * extension, lerpSpeed);
            }
            break;

        case 'ACT3':
            if (leftArm && rightArm) {
                leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -1.4 * extension, lerpSpeed);
                rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -1.4 * extension, lerpSpeed);
                leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0.2, lerpSpeed);
                rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, -0.2, lerpSpeed);
                leftArm.position.z = THREE.MathUtils.lerp(leftArm.position.z, 0.3 * extension, lerpSpeed);
                rightArm.position.z = THREE.MathUtils.lerp(rightArm.position.z, 0.3 * extension, lerpSpeed);
            }
            break;

        case 'ACT4':
            if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, -0.8 * extension, lerpSpeed);
            if (leftArm && rightArm) {
                leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0.5 * extension, lerpSpeed);
                rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0.5 * extension, lerpSpeed);
                leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, -0.8 * extension, lerpSpeed);
                rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0.8 * extension, lerpSpeed);
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
