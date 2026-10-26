// --- js/Hitboxmap.js ---

const GROUND_Y = 0;
const DUMMIES_LIST = []; 
const STEP_HEIGHT = 1.2; // Aumentado para cubrir la altura del respaldo/asiento del banco

function applyMapBounds(playerGroup, isGrounded) {
    if (!playerGroup) return;

    const colliders = window.mapColliders;
    
    if (colliders && colliders.length > 0) {
        getPlayerHitboxBounds(playerGroup, playerBoxTemp);

        for (let i = 0; i < colliders.length; i++) {
            const obstacleBox = colliders[i];

            if (playerBoxTemp.intersectsBox(obstacleBox)) {
                const playerFeetY = playerBoxTemp.min.y;
                const obstacleTopY = obstacleBox.max.y;
                const heightDifference = obstacleTopY - playerFeetY;

                // Si los pies están por encima o muy cerca del tope del objeto
                if (heightDifference > 0 && heightDifference <= STEP_HEIGHT) {
                    const yDiff = obstacleTopY - playerFeetY;
                    playerGroup.position.y += yDiff;

                    // Actualizar estado de caída/suelo
                    window.isGrounded = true;
                    window.velocityY = 0;

                    // Actualizamos la caja localmente en Y
                    playerBoxTemp.min.y += yDiff;
                    playerBoxTemp.max.y += yDiff;
                } else {
                    // Colisión lateral (muros u obstáculos que superan STEP_HEIGHT)
                    const overlapXMin = playerBoxTemp.max.x - obstacleBox.min.x;
                    const overlapXMax = obstacleBox.max.x - playerBoxTemp.min.x;
                    const overlapZMin = playerBoxTemp.max.z - obstacleBox.min.z;
                    const overlapZMax = obstacleBox.max.z - playerBoxTemp.min.z;

                    const overlapX = overlapXMin < overlapXMax ? -overlapXMin : overlapXMax;
                    const overlapZ = overlapZMin < overlapZMax ? -overlapZMin : overlapZMax;

                    const pushX = Math.abs(overlapX) < Math.abs(overlapZ);

                    if (pushX) {
                        playerGroup.position.x += overlapX;
                        playerBoxTemp.min.x += overlapX;
                        playerBoxTemp.max.x += overlapX;
                    } else {
                        playerGroup.position.z += overlapZ;
                        playerBoxTemp.min.z += overlapZ;
                        playerBoxTemp.max.z += overlapZ;
                    }
                }
            }
        }
    }

    // Límites de suelo base y respawn
    const posY = playerGroup.position.y;
    if (posY < GROUND_Y) {
        playerGroup.position.y = GROUND_Y;
    }

    if (posY < -10) {
        const respawnX = Math.abs(playerGroup.position.x - 150) < 50 ? 150 : 0;
        playerGroup.position.set(respawnX, 1, 0);
    }
}

