// --- js/Hitboxmap.js ---

const GROUND_Y = 0;

function applyMapBounds(playerGroup, isGrounded) {
    if (!playerGroup) return;

    // 1. Resolver colisiones contra obstáculos y muros del mapa
    if (window.mapColliders && window.mapColliders.length > 0) {
        getPlayerHitboxBounds(playerGroup, playerBoxTemp);

        for (let i = 0; i < window.mapColliders.length; i++) {
            const obstacleBox = window.mapColliders[i];

            if (playerBoxTemp.intersectsBox(obstacleBox)) {
                const overlapXMin = playerBoxTemp.max.x - obstacleBox.min.x;
                const overlapXMax = obstacleBox.max.x - playerBoxTemp.min.x;
                const overlapZMin = playerBoxTemp.max.z - obstacleBox.min.z;
                const overlapZMax = obstacleBox.max.z - playerBoxTemp.min.z;

                const overlapX = overlapXMin < overlapXMax ? -overlapXMin : overlapXMax;
                const overlapZ = overlapZMin < overlapZMax ? -overlapZMin : overlapZMax;

                if (Math.abs(overlapX) < Math.abs(overlapZ)) {
                    playerGroup.position.x += overlapX;
                } else {
                    playerGroup.position.z += overlapZ;
                }

                getPlayerHitboxBounds(playerGroup, playerBoxTemp);
            }
        }
    }

    // 2. Control de altura del piso (Suelo básico)
    if (playerGroup.position.y < GROUND_Y) {
        playerGroup.position.y = GROUND_Y;
    }

    // 3. Respawn de seguridad (si llega a caer al vacío por algún bug)
    if (playerGroup.position.y < -10) {
        playerGroup.position.set(0, 1, 0);
    }
}

function updateDummyBounds() {
    if (typeof scene === 'undefined') return;
    scene.traverse(obj => {
        if (obj.isDummy || obj.name === "dummy") {
            if (obj.position.y < GROUND_Y) {
                obj.position.y = GROUND_Y;
            }
            if (obj.position.y < -10) {
                obj.position.set(0, 1, 0);
            }
        }
    });
}

