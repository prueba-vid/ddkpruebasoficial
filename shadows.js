// shadows.js

function setupShadows(renderer, dirLight, map, playerGroup, scene) {
    const isEnabled = !!(window.GameConfig && window.GameConfig.shadowsEnabled);

    // Configuración base del ShadowMap
    renderer.shadowMap.enabled = isEnabled;
    renderer.shadowMap.type = THREE.PCFShadowMap; // Excelente equilibrio rendimiento/calidad

    if (dirLight) {
        dirLight.castShadow = isEnabled;
        
        // Mantener resolución 1024x1024 para ahorro de VRAM
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        
        // Ajuste de frustum para evitar que las sombras se corten demasiado rápido
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 100; // Reducido levemente de 150 para aprovechar mejor la resolución
        
        const d = 30;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;

        // FIX BUG: normalBias elimina el Shadow Acne sin provocar peter-panning ni perder rendimiento
        dirLight.shadow.bias = -0.0001;
        dirLight.shadow.normalBias = 0.05; 
    }

    if (map) {
        map.receiveShadow = isEnabled;
        map.traverse(c => {
            if (c.isMesh) {
                c.receiveShadow = isEnabled;
                c.castShadow = false; // El terreno no proyecta sombras innecesarias
            }
        });
    }

    // Aplica sombras al jugador u objetos dinámicos
    window.applyShadowsToGroup = group => {
        if (!group) return;
        const shadowsEnabled = !!(window.GameConfig && window.GameConfig.shadowsEnabled);
        group.traverse(c => {
            if (c.isMesh) {
                c.castShadow = shadowsEnabled;
                c.receiveShadow = false; 
            }
        });
    };

    // FIX BUG: Cambiar las sombras en tiempo de ejecución sin romper los materiales ni perder rendimiento
    window.applyShadowSettings = enable => {
        const activeState = !!enable;
        if (window.GameConfig) window.GameConfig.shadowsEnabled = activeState;

        renderer.shadowMap.enabled = activeState; 
        if (dirLight) dirLight.castShadow = activeState;

        // Recorrer la escena para actualizar estados de sombras de forma segura
        scene.traverse(c => {
            if (c.isMesh) {
                // Si el objeto pertenece al mapa solo recibe sombra, si no (jugador/NPCs/props), proyecta sombra
                const isMapMesh = map && (c === map || map.children.includes(c) || map.getObjectById(c.id));
                
                if (isMapMesh) {
                    c.receiveShadow = activeState;
                    c.castShadow = false;
                } else {
                    c.castShadow = activeState;
                    c.receiveShadow = false;
                }

                // FIX BUG: Notificar al material que las propiedades de sombra cambiaron
                if (c.material) {
                    if (Array.isArray(c.material)) {
                        c.material.forEach(m => m.needsUpdate = true);
                    } else {
                        c.material.needsUpdate = true;
                    }
                }
            }
        });
    };

    // Aplicar al personaje inicial
    if (playerGroup) {
        window.applyShadowsToGroup(playerGroup);
    }
}

