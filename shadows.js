// shadows.js

function setupShadows(renderer, dirLight, map, playerGroup, scene) {
    // 1. Determinar el estado real de la configuración
    const isEnabled = !!(window.GameConfig && window.GameConfig.shadowsEnabled);

    // Configuración base del ShadowMap optimizada
    renderer.shadowMap.enabled = isEnabled;
    renderer.shadowMap.type = THREE.PCFShadowMap; // Más rápido que PCFSoftShadowMap

    if (dirLight) {
        dirLight.castShadow = isEnabled;
        // 1024x1024 es una potencia de 2 perfecta para WebGL (2048 consume 4 veces más memoria)
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
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
            if (c.isMesh) {
                c.receiveShadow = isEnabled;
                c.castShadow = false; // El mapa/terreno no necesita proyectar sombras sobre sí mismo
            }
        });
    }

    // Función auxiliar global para aplicar sombras al jugador/grupo respetando GameConfig
    window.applyShadowsToGroup = group => {
        if (!group) return;
        const shadowsEnabled = !!(window.GameConfig && window.GameConfig.shadowsEnabled);
        group.traverse(c => {
            if (c.isMesh) {
                // El jugador proyecta sombra, pero raramente necesita recibir sombras de otros objetos
                c.castShadow = shadowsEnabled;
                c.receiveShadow = false; 
            }
        });
    };

    // Función global para cambiar sombras dinámicamente desde el menú de opciones
    window.applyShadowSettings = enable => {
        const activeState = !!enable;
        if (window.GameConfig) window.GameConfig.shadowsEnabled = activeState;

        renderer.shadowMap.enabled = activeState; 
        if (dirLight) dirLight.castShadow = activeState;
        if (map) {
            map.traverse(c => {
                if (c.isMesh) c.receiveShadow = activeState;
            });
        }
        
        // Refrescar solo el estado de proyección sin forzar re-compilación de shaders
        scene.traverse(c => {
            if (c.isMesh && c !== map) {
                c.castShadow = activeState;
            }
        });
    };

    // Aplicar al personaje inicial según la configuración real
    if (playerGroup) {
        window.applyShadowsToGroup(playerGroup);
    }
}

