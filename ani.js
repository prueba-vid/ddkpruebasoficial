// --- SISTEMA DE ANIMACIONES DEL JUGADOR (ani.js - Optimizado sin clonación) ---

let aniTime = 0;
let isAttackingAnim = false;
let attackAnimTimer = 0;
let totalAttackDuration = 0;
let currentAttackType = null;

// SISTEMA DE COMBO
let comboStep = 0;
let comboResetTimer = 0;

// ONDA DE AIRE DE DASH (Reemplaza a los fantasmas para optimizar rendimiento)
let dashWaveMesh = null;
let dashWaveMaterial = null;
let dashWaveTimer = 0;
const DASH_WAVE_DURATION = 0.15; // Onda rápida y ligera

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

// INICIALIZACIÓN DE LA ONDA DE AIRE
function initDashWave(scene) {
    if (dashWaveMesh) return;

    // Anillo plano para simular la ráfaga de aire
    const geometry = new THREE.RingGeometry(0.2, 0.7, 16);
    dashWaveMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0
    });

    dashWaveMesh = new THREE.Mesh(geometry, dashWaveMaterial);
    dashWaveMesh.visible = false;
    scene.add(dashWaveMesh);
}

// DISPARAR ONDA AL INICIAR EL DASH
function triggerDashWave(playerGroup, scene) {
    if (!dashWaveMesh) initDashWave(scene);

    dashWaveMesh.position.copy(playerGroup.position);
    dashWaveMesh.position.y += 0.4; // Altura media del jugador
    dashWaveMesh.rotation.copy(playerGroup.rotation);
    
    // Orientar la onda hacia atrás del movimiento para simular empuje
    dashWaveMesh.rotation.x = Math.PI / 2;

    dashWaveMesh.scale.set(1, 1, 1);
    dashWaveMaterial.opacity = 0.8;
    dashWaveMesh.visible = true;
    dashWaveTimer = DASH_WAVE_DURATION;
}

// ACTUALIZAR LA ONDA DE AIRE
function updateDashWave(delta) {
    if (!dashWaveMesh || !dashWaveMesh.visible) return;

    dashWaveTimer -= delta;

    if (dashWaveTimer <= 0) {
        dashWaveMesh.visible = false;
    } else {
        const progress = 1.0 - (dashWaveTimer / DASH_WAVE_DURATION);
        
        // La onda crece rápido en tamaño
        const scale = 1 + progress * 2.5;
        dashWaveMesh.scale.set(scale, scale, scale);

        // Desvanecimiento rápido de opacidad
        dashWaveMaterial.opacity = (1 - progress) * 0.7;
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

    // Postura inclinada de la aceleración
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

let wasDashingLastFrame = false;

function updatePlayerAnimations(playerGroup, isMoving, isDashing, isBlocking, isGrounded, scene, delta) {
    updateDashWave(delta);

    // Activar la onda de aire solo al presionar/iniciar el dash
    if (isDashing && !wasDashingLastFrame) {
        triggerDashWave(playerGroup, scene);
    }
    wasDashingLastFrame = isDashing;

    // Reset de combos
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

