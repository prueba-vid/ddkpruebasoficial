// js/shadowsplus.js

(function() {
    let shadowPlusActive = false;
    let targetScene = null;
    let targetRenderer = null;
    let targetDirLight = null;

    // Excepciones donde no se proyectan sombras
    function isIgnoredObject(obj) {
        if (!obj) return true;
        
        // Excepción de Arisa (personaje transparente)
        if (window.currentCharacter === 'Arisa' && obj.name === 'playerGroup') {
            return true;
        }

        // Revisar materiales transparentes o nombres marcados
        let isTransparent = false;
        obj.traverse(child => {
            if (child.isMesh && child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach(m => {
                    if (m.transparent && m.opacity < 0.8) isTransparent = true;
                });
            }
            if (child.name && child.name.toLowerCase().includes('arisa')) {
                isTransparent = true;
            }
        });

        return isTransparent;
    }

    function processMeshShadows(obj, enable) {
        if (!obj || isIgnoredObject(obj)) return;

        obj.traverse(child => {
            if (child.isMesh) {
                // No proyectar sombras en barras de vida o UI 3D
                if (child.name === 'nameTagSprite' || child.name === 'healthBar') return;

                child.castShadow = enable;
                child.receiveShadow = enable;

                if (child.material) {
                    const mats = Array.isArray(child.material) ? child.material : [child.material];
                    mats.forEach(m => { m.needsUpdate = true; });
                }
            }
        });
    }

    window.setupShadowsPlus = function(renderer, dirLight, map, playerGroup, scene) {
        targetRenderer = renderer;
        targetScene = scene;
        targetDirLight = dirLight;

        // Interceptamos scene.add para detectar cuando nacen habilidades/efectos en tiempo real
        const originalAdd = scene.add;
        scene.add = function(...objects) {
            originalAdd.apply(this, objects);
            if (shadowPlusActive) {
                objects.forEach(obj => {
                    processMeshShadows(obj, true);
                });
                if (renderer.shadowMap) renderer.shadowMap.needsUpdate = true;
            }
        };

        // Estado inicial
        if (window.GameConfig && window.GameConfig.shadowsPlusEnabled) {
            window.applyShadowsPlusSettings(true);
        }
    };

    window.applyShadowsPlusSettings = function(enable) {
        shadowPlusActive = !!enable;
        if (window.GameConfig) {
            window.GameConfig.shadowsPlusEnabled = shadowPlusActive;
            if (shadowPlusActive) window.GameConfig.shadowsEnabled = false; // Exclusividad
        }

        if (!targetRenderer || !targetScene) return;

        targetRenderer.shadowMap.enabled = shadowPlusActive;
        targetRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

        if (targetDirLight) {
            targetDirLight.castShadow = shadowPlusActive;
            targetDirLight.shadow.mapSize.width = 2048;
            targetDirLight.shadow.mapSize.height = 2048;
            targetDirLight.shadow.camera.near = 0.5;
            targetDirLight.shadow.camera.far = 150;
            targetDirLight.shadow.bias = -0.0003;
        }

        // Recorrer toda la escena y reconfigurar cada objeto dinámicamente
        targetScene.traverse(obj => {
            if (obj.isMesh) {
                if (shadowPlusActive && !isIgnoredObject(obj)) {
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                } else {
                    obj.castShadow = false;
                    obj.receiveShadow = false;
                }
                if (obj.material) {
                    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                    mats.forEach(m => { m.needsUpdate = true; });
                }
            }
        });

        targetRenderer.shadowMap.needsUpdate = true;
    };
})();
