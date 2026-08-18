// shadows.js

function setupShadows(renderer, dirLight, map, playerGroup, scene) {
    // 1. Determinar el estado real de la configuración
    const isEnabled = !!(window.GameConfig && window.GameConfig.shadowsEnabled);

    // Configuración base del ShadowMap
    renderer.shadowMap.enabled = isEnabled;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    if (dirLight) {
        dirLight.castShadow = isEnabled;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 150;
        
        const d = 30;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.bias = -0.0005;
    }

    if (map) {
        map.receiveShadow = isEnabled;
        map.traverse(c => {
            if (c.isMesh) c.receiveShadow = isEnabled;
        });
    }

    // Función auxiliar global para aplicar o remover sombras respetando GameConfig
    window.applyShadowsToGroup = group => {
        if (!group) return;
        const shadowsEnabled = !!(window.GameConfig && window.GameConfig.shadowsEnabled);
        group.traverse(c => {
            if (c.isMesh) {
                c.castShadow = shadowsEnabled;
                c.receiveShadow = shadowsEnabled;
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

    // Función global para cambiar sombras dinámicamente desde el menú de opciones
    window.applyShadowSettings = enable => {
        const activeState = !!enable;
        if (window.GameConfig) window.GameConfig.shadowsEnabled = activeState;

        renderer.shadowMap.enabled = activeState; 
        if (dirLight) dirLight.castShadow = activeState;
        if (map) map.receiveShadow = activeState;
        
        // Refrescar TODOS los objetos existentes en la escena
        scene.traverse(c => {
            if (c.isMesh) {
                c.castShadow = activeState;
                c.receiveShadow = activeState;
                if (c.material) {
                    if (Array.isArray(c.material)) {
                        c.material.forEach(m => m.needsUpdate = true);
                    } else {
                        c.material.needsUpdate = true;
                    }
                }
            }
        });
        
        // Forzar actualización inmediata del renderizador
        renderer.shadowMap.needsUpdate = true;
    };

    // Aplicar al personaje inicial según la configuración real
    if (playerGroup) {
        window.applyShadowsToGroup(playerGroup);
    }
}

