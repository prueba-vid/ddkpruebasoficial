// --- js/Hitboxmap.js ---

const GROUND_Y = 0;
const DUMMIES_LIST = []; 
const STEP_HEIGHT = 0.5; // Altura máxima que el jugador sube automáticamente como escalón

function applyMapBounds(playerGroup, isGrounded) {
    if (!playerGroup) return;

    const colliders = window.mapColliders;
    
    // 1. Resolver colisiones contra obstáculos (X, Y, Z)
    if (colliders && colliders.length > 0) {
        getPlayerHitboxBounds(playerGroup, playerBoxTemp);

        for (let i = 0; i < colliders.length; i++) {
            const obstacleBox = colliders[i];

            if (playerBoxTemp.intersectsBox(obstacleBox)) {
                // Penetración en cada eje
                const overlapXMin = playerBoxTemp.max.x - obstacleBox.min.x;
                const overlapXMax = obstacleBox.max.x - playerBoxTemp.min.x;
                const overlapZMin = playerBoxTemp.max.z - obstacleBox.min.z;
                const overlapZMax = obstacleBox.max.z - playerBoxTemp.min.z;

                const overlapX = overlapXMin < overlapXMax ? -overlapXMin : overlapXMax;
                const overlapZ = overlapZMin < overlapZMax ? -overlapZMin : overlapZMax;

                // Margen inferior del jugador respecto al techo del obstáculo
                const playerFeetY = playerBoxTemp.min.y;
                const obstacleTopY = obstacleBox.max.y;
                const heightDifference = obstacleTopY - playerFeetY;

                // Si los pies del jugador están cerca de la superficie del objeto (o cayendo sobre él)
                if (heightDifference > 0 && heightDifference <= STEP_HEIGHT) {
                    // Lo posicionamos exactamente encima del banco/plataforma
                    const yDiff = obstacleTopY - playerFeetY;
                    playerGroup.position.y += yDiff;

                    // Actualizamos la caja localmente en Y
                    playerBoxTemp.min.y += yDiff;
                    playerBoxTemp.max.y += yDiff;
                } else {
                    // Colisión lateral (muros, obstáculos altos)
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

    // 2 y 3. Limites del suelo base y respawn
    const posY = playerGroup.position.y;
    if (posY < GROUND_Y) {
        playerGroup.position.y = GROUND_Y;
    }

    if (posY < -10) {
        const respawnX = Math.abs(playerGroup.position.x - 150) < 50 ? 150 : 0;
        playerGroup.position.set(respawnX, 1, 0);
    }
}

function registerDummy(dummyObj) {
    DUMMIES_LIST.push(dummyObj);
}

function updateDummyBounds() {
    for (let i = 0; i < DUMMIES_LIST.length; i++) {
        const obj = DUMMIES_LIST[i];
        
        if (obj.position.y < GROUND_Y) {
            obj.position.y = GROUND_Y;
        }
        
        if (obj.position.y < -10) {
            const respawnX = Math.abs(obj.position.x - 150) < 50 ? 150 : 0;
            obj.position.set(respawnX, 1, 0);
        }
    }
}

