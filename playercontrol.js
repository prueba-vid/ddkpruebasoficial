// js/playercontrol.js

// --- LÓGICA DE ATAQUES Y EJECUCIÓN DE HABILIDADES ---
function executePlayerAttack() {
    if (typeof triggerAttack === 'function') {
        triggerAttack(playerGroup, scene, map, grid, combatState);
    }
    if (typeof window.spawnAttackHitbox === 'function' && playerGroup) {
        window.spawnAttackHitbox(playerGroup.position, playerGroup.rotation.y, 1.8, 1.5, 2.0, 250);
    }

    // Sincronizar golpe con el rival vía red
    if (window.Network && window.Network.conexion && window.Network.conexion.open && playerGroup) {
        window.Network.enviarDatos({
            type: 'PLAYER_ATTACK_ANIM'
        });
        window.Network.enviarDatos({
            type: 'SPAWN_HITBOX',
            pos: playerGroup.position,
            rotY: playerGroup.rotation.y,
            width: 1.8,
            height: 1.5,
            reach: 2.0,
            duration: 250
        });
    }
}

function triggerSkillAction(actIndex, isPressed) {
    // Manejo especial para ACT2 con mecánica de carga (Hold)
    if (actIndex === 2 && window.currentCharacter === 'Kai') {
        if (isPressed) {
            if (typeof startKaiAct2Charge === 'function') {
                startKaiAct2Charge(window.activeActions, window.currentCharacter);
            }
        } else {
            if (typeof releaseKaiAct2Charge === 'function') {
                releaseKaiAct2Charge(playerGroup, scene, window.activeActions, window.currentCharacter);
                if (typeof window.spawnAttackHitbox === 'function') {
                    window.spawnAttackHitbox(playerGroup.position, playerGroup.rotation.y, 2.2, 1.8, 2.8, 300);
                }
            }
        }
        return;
    }

    // Ejecución estándar para el resto de habilidades
    if (typeof executeCharacterSkill === 'function' && playerGroup) {
        executeCharacterSkill(actIndex, isPressed, playerGroup, scene, window.activeActions);
        if (isPressed && typeof window.spawnAttackHitbox === 'function') {
            window.spawnAttackHitbox(playerGroup.position, playerGroup.rotation.y, 2.2, 1.8, 2.8, 300);
        }
    }
}

function triggerSpecialAction() {
    if (typeof executeCharacterSpecial === 'function' && playerGroup) {
        executeCharacterSpecial(playerGroup, scene);
        if (typeof window.spawnAttackHitbox === 'function') {
            window.spawnAttackHitbox(playerGroup.position, playerGroup.rotation.y, 2.8, 2.0, 3.2, 400);
        }
    }
}

// --- CONTROLES Y BINDING DE EVENTOS A LA UI ---
function initPlayerControls() {
    if (typeof bindEvents !== 'function') return;

    [1, 2, 3, 4].forEach(i => {
        const btn = $(`act${i}`);
        if (btn) {
            bindEvents(btn, 
                () => { setAction(ACTIONS[`ACT${i}`], true); triggerSkillAction(i, true); },
                () => { setAction(ACTIONS[`ACT${i}`], false); triggerSkillAction(i, false); }
            );
        }
    });

    if (DOM.specBtn) {
        bindEvents(DOM.specBtn, 
            () => { setAction(ACTIONS.ESPECIAL, true); triggerSpecialAction(); }, 
            () => setAction(ACTIONS.ESPECIAL, false)
        );
    }

    if (DOM.ultiBtn) {
        bindEvents(DOM.ultiBtn, () => { 
            if ((window.activeActions & ACTIONS.BLOQUEAR) || window.ultiCharge < 100) return; 
            setAction(ACTIONS.ULTI, true); 
            if (typeof resetUltiCharge === 'function') resetUltiCharge(); 
            if (typeof window.spawnAttackHitbox === 'function' && playerGroup) {
                window.spawnAttackHitbox(playerGroup.position, playerGroup.rotation.y, 3.5, 2.5, 4.0, 500);
            }
        }, () => setAction(ACTIONS.ULTI, false));
    }

    if (DOM.hitBtn) bindEvents(DOM.hitBtn, () => executePlayerAttack(), () => {});

    if (DOM.jumpBtn) bindEvents(DOM.jumpBtn, () => { 
        setAction(ACTIONS.SALTAR, true); 
        if (window.isGrounded) { 
            window.velocityY = jumpForce; 
            window.isGrounded = false; 
        } 
    }, () => setAction(ACTIONS.SALTAR, false));

    if (DOM.blockBtn) bindEvents(DOM.blockBtn, () => setAction(ACTIONS.BLOQUEAR, true), () => setAction(ACTIONS.BLOQUEAR, false));

    if (DOM.dashBtn) {
        bindEvents(DOM.dashBtn, () => {
            if ((window.activeActions & ACTIONS.BLOQUEAR) || !canDash || isDashing) return;
            setAction(ACTIONS.DASH, true); 
            isDashing = true; 
            canDash = false; 

            // Se incrementa la duración un 15% extra
            dashTimer = DASH_DURATION * 1.15;
            
            if (window.Cooldowns) {
                window.Cooldowns.triggerCooldown('dashCd', DASH_COOLDOWN / 1000, () => { canDash = true; });
            } else {
                setTimeout(() => canDash = true, DASH_COOLDOWN);
            }

            // DASH INTELIGENTE: Detectar intención inicial
            const hasJoystickInput = (window.activeActions & ACTIONS.JOYSTICK) && 
                                     window.touchState && 
                                     (Math.abs(window.touchState.inputX) > 0.1 || Math.abs(window.touchState.inputY) > 0.1);

            if (hasJoystickInput) {
                window.isJoystickDash = true;
                window.dashJoystickAngle = Math.atan2(-window.touchState.inputY, window.touchState.inputX);
            } else {
                window.isJoystickDash = false;
                if (playerGroup) {
                    dashDirection.set(Math.sin(playerGroup.rotation.y), 0, Math.cos(playerGroup.rotation.y)).normalize();
                }
            }
        }, () => setAction(ACTIONS.DASH, false));
    }
}

// Inicializar bindings al cargar el script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlayerControls);
} else {
    initPlayerControls();
}

// --- ACTUALIZACIÓN DE MOVIMIENTO, FÍSICA Y ANIMACIONES DEL JUGADOR ---
window.updatePlayerMovement = function(delta, isMoving, isBlocking) {
    if (!playerGroup) return;

    if (isDashing) {
        dashTimer -= delta; 

        // Si se inició con joystick, actualiza dinámicamente según el ángulo de la cámara
        if (window.isJoystickDash && window.touchState) {
            const currentCamTheta = window.touchState.camTheta || 0;
            const targetAngle = currentCamTheta + window.dashJoystickAngle;
            dashDirection.set(Math.cos(targetAngle), 0, -Math.sin(targetAngle)).normalize();
        }

        playerGroup.position.x += dashDirection.x * DASH_SPEED * delta; 
        playerGroup.position.z += dashDirection.z * DASH_SPEED * delta;
        if (window.isGrounded) playerGroup.position.y = 1;

        if (typeof applyMapBounds === 'function') applyMapBounds(playerGroup, window.isGrounded);

        if (dashTimer <= 0) { 
            isDashing = false; 
            setAction(ACTIONS.DASH, false); 
            executePlayerAttack(); 
        }
    } else if (isMoving && window.touchState) { 
        const currentSpeed = isBlocking ? moveSpeed * 0.45 : moveSpeed;
        const joystickAngle = Math.atan2(-window.touchState.inputY, window.touchState.inputX);
        const inputMagnitude = Math.min(1.0, Math.sqrt(window.touchState.inputX * window.touchState.inputX + window.touchState.inputY * window.touchState.inputY));
        const moveAngle = (window.touchState.camTheta || 0) + joystickAngle;
        
        playerGroup.position.x += Math.cos(moveAngle) * currentSpeed * inputMagnitude * delta; 
        playerGroup.position.z -= Math.sin(moveAngle) * currentSpeed * inputMagnitude * delta;
    }

    // FÍSICA Y COLISIONES CON EL SUELO
    if (typeof updatePlayerPhysics === 'function') {
        const physicsResult = updatePlayerPhysics(playerGroup, window.velocityY, gravity, delta, window.isGrounded);
        window.velocityY = physicsResult.velocityY;
        window.isGrounded = physicsResult.isGrounded;
    }

    if (window.isGrounded) setAction(ACTIONS.SALTAR, false); 

    if (typeof updatePlayerAnimations === 'function') {
        updatePlayerAnimations(playerGroup, isMoving, isDashing, isBlocking, window.isGrounded, scene, delta);
    }
    
    if (typeof applyMapBounds === 'function') applyMapBounds(playerGroup, window.isGrounded);

    const camThetaVal = window.touchState ? (window.touchState.camTheta || 0) : 0;
    playerGroup.rotation.y = isDashing ? Math.atan2(dashDirection.x, dashDirection.z) : camThetaVal + Math.PI;
};

