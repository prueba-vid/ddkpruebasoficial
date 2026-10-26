const PLAYER_HITBOX = {
    radiusX: 0.4,
    radiusZ: 0.4,
    height: 1.8
};

const playerBoxTemp = new THREE.Box3();

function updatePlayerPhysics(playerGroup, velocityY, gravity, delta, isGrounded) {
    let newVelocity = velocityY;
    let groundedState = isGrounded;

    const groundY = (typeof MAP_LIMITS !== 'undefined') ? MAP_LIMITS.groundY : 0;

    if (playerGroup.position.y > groundY || !groundedState) {
        newVelocity += gravity * delta;
        playerGroup.position.y += newVelocity * delta;
        groundedState = false;
    }

    if (playerGroup.position.y <= groundY) {
        playerGroup.position.y = groundY;
        newVelocity = 0;
        groundedState = true;
    }

    return { velocityY: newVelocity, isGrounded: groundedState };
}

function getPlayerHitboxBounds(playerGroup, targetBox) {
    if (!playerGroup || !targetBox) return;
    const pos = playerGroup.position;
    targetBox.min.set(pos.x - PLAYER_HITBOX.radiusX, pos.y, pos.z - PLAYER_HITBOX.radiusZ);
    targetBox.max.set(pos.x + PLAYER_HITBOX.radiusX, pos.y + PLAYER_HITBOX.height, pos.z + PLAYER_HITBOX.radiusZ);
}

