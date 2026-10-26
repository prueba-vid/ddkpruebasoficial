// js/gravedad.js

// --- VARIABLES GLOBALES DE FÍSICA Y MOVIMIENTO ---
window.velocityY = 0;
window.isGrounded = true;
window.moveSpeed = 7.2;
window.gravity = -32.4;
window.jumpForce = 9.5;

window.isDashing = false;
window.dashTimer = 0;
window.canDash = true;
window.DASH_DURATION = 0.18;
window.DASH_SPEED = 28.0;
window.DASH_COOLDOWN = 4500;

window.dashDirection = new THREE.Vector3();

/**
 * Procesa la física de gravedad, salto, dash y movimiento del jugador.
 * @param {number} delta - Tiempo transcurrido desde el último frame en segundos.
 * @param {boolean} isMoving - Indica si el jugador está moviendo el control/joystick.
 * @param {boolean} isBlocking - Indica si el jugador está en posición de bloqueo.
 */
function updatePlayerMovement(delta, isMoving, isBlocking) {
    if (!window.playerGroup) return;

    const playerGroup = window.playerGroup;

    // --- MANEJO DE DASH ---
    if (window.isDashing) {
        window.dashTimer += delta;
        playerGroup.position.addScaledVector(window.dashDirection, window.DASH_SPEED * delta);

        if (window.dashTimer >= window.DASH_DURATION) {
            window.isDashing = false;
        }
        return; // Durante el dash la gravedad estándar se pausa
    }

    // --- APLICACIÓN DE GRAVEDAD ---
    if (!window.isGrounded) {
        window.velocityY += window.gravity * delta;
    }

    // Actualizar posición vertical
    playerGroup.position.y += window.velocityY * delta;

    // Colisión básica con el suelo (Piso en Y = 0, Asumiendo origen de la malla en Y = 0)
    if (playerGroup.position.y <= 0) {
        playerGroup.position.y = 0;
        window.velocityY = 0;
        window.isGrounded = true;
    }

    // --- MOVIMIENTO HORIZONTAL ---
    if (isMoving && window.touchState) {
        const speed = isBlocking ? window.moveSpeed * 0.5 : window.moveSpeed;
        const camThetaVal = window.touchState.camTheta || 0;

        const forward = new THREE.Vector3(-Math.sin(camThetaVal), 0, -Math.cos(camThetaVal)).normalize();
        const right = new THREE.Vector3(Math.cos(camThetaVal), 0, -Math.sin(camThetaVal)).normalize();

        const inputX = window.touchState.inputX || 0;
        const inputY = window.touchState.inputY || 0;

        const moveDir = new THREE.Vector3();
        moveDir.addScaledVector(forward, inputY);
        moveDir.addScaledVector(right, inputX);

        if (moveDir.lengthSq() > 0) {
            moveDir.normalize();
            playerGroup.position.addScaledVector(moveDir, speed * delta);

            const targetRotY = Math.atan2(moveDir.x, moveDir.z);
            playerGroup.rotation.y = targetRotY;
        }
    }
}

/**
 * Función para ejecutar el salto respetando la fuerza configurada
 */
function performJump() {
    if (window.isGrounded && !window.isDashing) {
        window.velocityY = window.jumpForce;
        window.isGrounded = false;
    }
}

/**
 * Función helper para teletransportar al jugador reseteando su física
 */
function teleportPlayer(group, x, y, z) {
    if (group) {
        group.position.set(x, y, z);
        group.rotation.set(0, 0, 0);
    }
    window.velocityY = 0;
    window.isGrounded = false;
    return { velocityY: 0, isGrounded: false };
}

window.updatePlayerMovement = updatePlayerMovement;
window.performJump = performJump;
window.teleportPlayer = teleportPlayer;

