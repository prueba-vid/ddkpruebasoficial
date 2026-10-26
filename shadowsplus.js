// js/shadowsplus.js

(function() {
    let shadowPlusActive = false;
    let targetScene = null;
    let targetRenderer = null;
    let targetDirLight = null;

    function shouldIgnoreMesh(mesh) {
        if (!mesh || !mesh.isMesh) return true;
        if (mesh.name === 'nameTagSprite' || mesh.name === 'healthBar') return true;

        if (window.currentCharacter === 'Arisa' && (mesh.name === 'playerGroup' || (mesh.name && mesh.name.toLowerCase().includes('arisa')))) {
            return true;
        }

        if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            if (mats.some(m => m.transparent && m.opacity < 0.8)) return true;
        }

        return false;
    }

    // Procesa el mesh de forma segura ANTES o DURANTE el render
    function setupMeshShadow(mesh) {
        if (shouldIgnoreMesh(mesh)) {
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            return;
        }

        // Si activamos las sombras antes de que Three.js compile el material por primera vez en escena,
        // no hay bajón de FPS ni necesidad de forzar needsUpdate.
        mesh.castShadow = shadowPlusActive;
        mesh.receiveShadow = shadowPlusActive;
    }

    window.setupShadowsPlus = function(renderer, dirLight, map, playerGroup, scene) {
        targetRenderer = renderer;
        targetScene = scene;
        targetDirLight = dirLight;

        // Asignación limpia cuando entra un objeto nuevo
        const originalAdd = scene.add;
        scene.add = function(...objects) {
            originalAdd.apply(this, objects);
            if (shadowPlusActive) {
                for (let i = 0; i < objects.length; i++) {
                    objects[i].traverse(child => {
                        if (child.isMesh) setupMeshShadow(child);
                    });
                }
            }
        };

        if (window.GameConfig && window.GameConfig.shadowsPlusEnabled) {
            window.applyShadowsPlusSettings(true);
        }
    };

    window.applyShadowsPlusSettings = function(enable) {
        shadowPlusActive = !!enable;
        if (window.GameConfig) {
            window.GameConfig.shadowsPlusEnabled = shadowPlusActive;
            if (shadowPlusActive) window.GameConfig.shadowsEnabled = false;
        }

        if (!targetRenderer || !targetScene) return;

        targetRenderer.shadowMap.enabled = shadowPlusActive;
        
        // PCFShadowMap consume mucho menos rendimiento que PCFSoftShadowMap
        targetRenderer.shadowMap.type = THREE.PCFShadowMap; 

        if (targetDirLight) {
            targetDirLight.castShadow = shadowPlusActive;
            // Reducir la resolución a 1024 recupera casi todos los FPS perdidos
            targetDirLight.shadow.mapSize.width = 1024;
            targetDirLight.shadow.mapSize.height = 1024;
            targetDirLight.shadow.bias = -0.0005;
        }

        // Recorrido inicial estático
        targetScene.traverse(obj => {
            if (obj.isMesh) {
                setupMeshShadow(obj);
                if (obj.material) {
                    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                    mats.forEach(m => { m.needsUpdate = true; });
                }
            }
        });
    };
})();

