/**
 * shader.js - Sistema de Shaders y Mejoras Visuales para DDK COMBAT
 * Optimizado - Sin luz en faroles y con caché de materiales/geometrías
 */

(function() {
    'use strict';

    const ShaderEngine = {
        enabled: false,
        mode: 0,
        scene: null,
        camera: null,
        renderer: null,
        clock: new THREE.Clock(),
        leafObjects: [],
        skillParticles: [],
        originalMaterials: new Map(),
        generatedMaterials: [],
        materialCache: new Map(), // CACHÉ: Evita clonar materiales idénticos
        sharedParticleGeo: new THREE.BoxGeometry(0.12, 0.12, 0.12), // OPTIMIZACIÓN: Geometría única
        textures: {},
        hemiLight: null,
        softDirLight: null
    };

    function generateCanvasTexture(type) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(256, 256);
        const data = imgData.data;

        const heightMap = new Float32Array(256 * 256);
        
        for (let x = 0; x < 256; x++) {
            for (let y = 0; y < 256; y++) {
                let h = 0.5;

                if (type === 'floor_normal') {
                    const tileSize = 32;
                    const row = Math.floor(y / tileSize);
                    const offsetX = (row % 2 === 0) ? 0 : tileSize / 2;
                    const gx = (x + offsetX) % tileSize;
                    const gy = y % tileSize;
                    const isEdgeX = gx <= 1 || gx >= tileSize - 2;
                    const isEdgeY = gy <= 1 || gy >= tileSize - 2;

                    if (isEdgeX || isEdgeY) {
                        h = 0.25; 
                    } else {
                        const noise = (Math.sin(x * 0.3) * Math.cos(y * 0.3)) * 0.05;
                        h = 0.6 + noise;
                    }
                } else if (type === 'bench_normal') {
                    const line = y % 16;
                    const grain = Math.sin(x * 0.1) * 0.05;
                    h = (line < 2 || line > 14) ? 0.3 : (0.7 + grain);
                }
                heightMap[y * 256 + x] = h;
            }
        }

        const strength = 1.5;
        for (let y = 0; y < 256; y++) {
            for (let x = 0; x < 256; x++) {
                const left   = heightMap[y * 256 + ((x - 1 + 256) % 256)];
                const right  = heightMap[y * 256 + ((x + 1) % 256)];
                const top    = heightMap[((y - 1 + 256) % 256) * 256 + x];
                const bottom = heightMap[((y + 1) % 256) * 256 + x];

                let dx = (right - left) * strength;
                let dy = (bottom - top) * strength;
                let dz = 1.0;
                const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
                
                dx /= len; dy /= len; dz /= len;

                const idx = (y * 256 + x) * 4;
                data[idx]     = Math.floor((dx * 0.5 + 0.5) * 255);
                data[idx + 1] = Math.floor((dy * 0.5 + 0.5) * 255);
                data[idx + 2] = Math.floor((dz * 0.5 + 0.5) * 255);
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
        return texture;
    }

    function initTextures() {
        if (!ShaderEngine.textures.floorNormal) {
            ShaderEngine.textures.floorNormal = generateCanvasTexture('floor_normal');
            ShaderEngine.textures.floorNormal.repeat.set(16, 16);
        }
        if (!ShaderEngine.textures.benchNormal) {
            ShaderEngine.textures.benchNormal = generateCanvasTexture('bench_normal');
            ShaderEngine.textures.benchNormal.repeat.set(6, 2);
        }
    }

    function clearGeneratedMaterials() {
        ShaderEngine.generatedMaterials.forEach(mat => {
            if (mat && typeof mat.dispose === 'function') mat.dispose();
        });
        ShaderEngine.generatedMaterials = [];
        ShaderEngine.materialCache.clear();
    }

    function applyShaderSettings(mode) {
        ShaderEngine.mode = parseInt(mode) || 0;
        ShaderEngine.enabled = ShaderEngine.mode > 0;

        if (!ShaderEngine.scene && window.scene) ShaderEngine.scene = window.scene;
        if (!ShaderEngine.camera && window.camera) ShaderEngine.camera = window.camera;
        if (!ShaderEngine.renderer && window.renderer) ShaderEngine.renderer = window.renderer;

        if (!ShaderEngine.scene) return;

        initTextures();

        if (ShaderEngine.renderer) {
            ShaderEngine.renderer.toneMapping = ShaderEngine.enabled ? (THREE.ReinhardToneMapping || 2) : (THREE.NoToneMapping || 0);
            ShaderEngine.renderer.toneMappingExposure = 1.0;
        }

        processSceneObjects();
        updatePostLights();
    }

    function isEntityOrPlayer(obj) {
        let current = obj;
        while (current) {
            const name = current.name ? current.name.toLowerCase() : '';
            if (
                current === window.playerGroup ||
                name.includes('player') || name.includes('kai') ||
                name.includes('arisa') || name.includes('itsuki') ||
                name.includes('ryu') || name.includes('dummy') ||
                name.includes('arm') || name.includes('torso') ||
                name.includes('leg') || name.includes('head') ||
                current.isDummy
            ) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }

    function processSceneObjects() {
        if (!ShaderEngine.scene) return;

        ShaderEngine.leafObjects = [];
        clearGeneratedMaterials();

        ShaderEngine.scene.traverse((obj) => {
            if (!obj.isMesh) return;
            if (isEntityOrPlayer(obj)) return;

            if (obj.geometry) {
                if (!obj.geometry.attributes.normal) obj.geometry.computeVertexNormals();
                if (typeof obj.geometry.computeTangents === 'function' && !obj.geometry.attributes.tangent) {
                    obj.geometry.computeTangents();
                }
            }

            if (!ShaderEngine.originalMaterials.has(obj.id)) {
                ShaderEngine.originalMaterials.set(obj.id, obj.material);
            }

            const originalMat = ShaderEngine.originalMaterials.get(obj.id);

            if (!ShaderEngine.enabled) {
                obj.material = originalMat;
                if (obj.userData.initialRotZ !== undefined) obj.rotation.z = obj.userData.initialRotZ;
                if (obj.userData.initialRotX !== undefined) obj.rotation.x = obj.userData.initialRotX;
                if (obj.userData.initialScaleY !== undefined) obj.scale.y = obj.userData.initialScaleY;
                if (obj.userData.initialScaleX !== undefined) obj.scale.x = obj.userData.initialScaleX;
                return;
            }

            const matName = (originalMat && originalMat.name) ? originalMat.name.toLowerCase() : '';
            const objName = obj.name ? obj.name.toLowerCase() : '';
            const baseColor = originalMat && originalMat.color ? originalMat.color : new THREE.Color(0x888888);
            const baseMap = originalMat && originalMat.map ? originalMat.map : null;

            // Determinar categoría para el Caché
            const isExplicitFloor = objName.includes('floor') || objName.includes('ground') || objName.includes('suelo');
            const isLargeHorizontalBox = obj.geometry && obj.geometry.type === 'BoxGeometry' && 
                                         obj.geometry.parameters && 
                                         (obj.geometry.parameters.width >= 30 || obj.geometry.parameters.depth >= 30) &&
                                         !objName.includes('wall') && !objName.includes('muro') && !objName.includes('pared');
            
            let category = 'wall';
            if (isExplicitFloor || isLargeHorizontalBox) category = 'floor';
            else if (objName.includes('lamp') || objName.includes('pole') || objName.includes('farol')) category = 'lamp'; // Modificado para apagar
            else if (objName.includes('bench') || objName.includes('banco') || matName.includes('wood') || matName.includes('madera')) category = 'bench';
            else if (objName.includes('bush') || objName.includes('arbusto') || objName.includes('tree') || objName.includes('leaf') || (baseColor.g > baseColor.r && baseColor.g > baseColor.b)) category = 'veg';

            // Comportamientos de animación de vegetación
            if (category === 'veg') {
                if (obj.userData.initialRotZ === undefined) obj.userData.initialRotZ = obj.rotation.z;
                if (obj.userData.initialRotX === undefined) obj.userData.initialRotX = obj.rotation.x;
                if (obj.userData.initialScaleY === undefined) obj.userData.initialScaleY = obj.scale.y;
                if (obj.userData.initialScaleX === undefined) obj.userData.initialScaleX = obj.scale.x;
                ShaderEngine.leafObjects.push(obj);
            }

            // OPTIMIZACIÓN: Si el material ya fue calculado para esta textura original y categoría, recíclalo.
            const originalMatId = originalMat ? originalMat.id : 'null';
            const cacheKey = `${originalMatId}_${category}`;
            
            if (ShaderEngine.materialCache.has(cacheKey)) {
                obj.material = ShaderEngine.materialCache.get(cacheKey);
                return;
            }

            let newMat;
            
            // 1. SUELO
            if (category === 'floor') {
                const floorNormal = ShaderEngine.textures.floorNormal.clone();
                floorNormal.repeat.set(16, 16);
                floorNormal.needsUpdate = true;

                newMat = new THREE.MeshStandardMaterial({
                    color: baseColor,
                    map: baseMap,
                    normalMap: floorNormal,
                    normalScale: new THREE.Vector2(0.8, 0.8),
                    roughness: 0.6,
                    metalness: 0.05
                });
            }
            // 2. FAROLES (Sin luz emisiva)
            else if (category === 'lamp') {
                newMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(0x1a1c20), // Color oscuro de metal apagado
                    roughness: 0.4,
                    metalness: 0.8
                });
            }
            // 3. BANCOS DE MADERA
            else if (category === 'bench') {
                newMat = new THREE.MeshStandardMaterial({
                    color: baseColor,
                    map: baseMap,
                    normalMap: ShaderEngine.textures.benchNormal,
                    normalScale: new THREE.Vector2(0.8, 0.8),
                    roughness: 0.5,
                    metalness: 0.05
                });
            }
            // 4. VEGETACIÓN
            else if (category === 'veg') {
                newMat = new THREE.MeshStandardMaterial({
                    color: baseColor,
                    map: baseMap,
                    roughness: 0.8,
                    metalness: 0.0
                });
            }
            // 5. PAREDES Y RESTO LISO
            else {
                newMat = new THREE.MeshStandardMaterial({
                    color: baseColor,
                    map: baseMap,
                    roughness: 0.7,
                    metalness: 0.1
                });
            }

            // Guardar en Caché
            ShaderEngine.materialCache.set(cacheKey, newMat);
            ShaderEngine.generatedMaterials.push(newMat);
            obj.material = newMat;
        });
    }

    function updatePostLights() {
        if (!ShaderEngine.enabled || !ShaderEngine.scene) {
            if (ShaderEngine.hemiLight) ShaderEngine.hemiLight.visible = false;
            if (ShaderEngine.softDirLight) ShaderEngine.softDirLight.visible = false;
            return;
        }

        // Ya no iteramos toda la escena para agregar luces locales a faroles (Optimización de CPU)

        if (!ShaderEngine.hemiLight) {
            ShaderEngine.hemiLight = new THREE.HemisphereLight(0xddf0ff, 0x443322, 0.7);
            ShaderEngine.scene.add(ShaderEngine.hemiLight);
        } else {
            ShaderEngine.hemiLight.visible = true;
        }

        if (!ShaderEngine.softDirLight) {
            ShaderEngine.softDirLight = new THREE.DirectionalLight(0xffffff, 0.4);
            ShaderEngine.softDirLight.position.set(12, 20, 10);
            ShaderEngine.scene.add(ShaderEngine.softDirLight);
        } else {
            ShaderEngine.softDirLight.visible = true;
        }
    }

    function animate() {
        requestAnimationFrame(animate);

        if (!ShaderEngine.enabled) return;

        const time = ShaderEngine.clock.getElapsedTime();

        if (ShaderEngine.mode === 2) {
            ShaderEngine.leafObjects.forEach((obj, idx) => {
                const offset = idx * 1.4;
                const windFast = Math.sin(time * 3.2 + offset);
                const windSlow = Math.cos(time * 1.1 + offset * 0.5);

                obj.rotation.z = obj.userData.initialRotZ + (windFast * 0.02);
                obj.rotation.x = obj.userData.initialRotX + (windSlow * 0.015);
                obj.scale.y = obj.userData.initialScaleY + (windFast * 0.015);
                obj.scale.x = obj.userData.initialScaleX - (windFast * 0.01);
            });

            for (let i = ShaderEngine.skillParticles.length - 1; i >= 0; i--) {
                const p = ShaderEngine.skillParticles[i];
                p.position.add(p.userData.velocity);
                p.scale.multiplyScalar(0.95);
                p.userData.life -= 0.02;

                if (p.userData.life <= 0) {
                    ShaderEngine.scene.remove(p);
                    // OPTIMIZACIÓN: Solo limpia el material si es la última partícula viva de su grupo para evitar leaks, no destruye la geometría global
                    if (p.userData.isLast && p.material) p.material.dispose();
                    ShaderEngine.skillParticles.splice(i, 1);
                }
            }
        }
    }

    window.triggerSkillEffect = function(position, colorHex) {
        if (!ShaderEngine.enabled || ShaderEngine.mode !== 2 || !ShaderEngine.scene) return;

        const particleCount = 10;
        const color = new THREE.Color(colorHex || 0x00ffff);

        const flashLight = new THREE.PointLight(color, 1.5, 5);
        if (position && position.isVector3) {
            flashLight.position.copy(position);
        } else if (position) {
            flashLight.position.set(position.x || 0, position.y || 0, position.z || 0);
        }

        ShaderEngine.scene.add(flashLight);

        setTimeout(() => {
            ShaderEngine.scene.remove(flashLight);
            flashLight.dispose();
        }, 120);

        // OPTIMIZACIÓN: Instanciando 1 solo material para este grupo de partículas
        const sharedMat = new THREE.MeshBasicMaterial({ color: color });

        for (let i = 0; i < particleCount; i++) {
            // Reutiliza ShaderEngine.sharedParticleGeo
            const p = new THREE.Mesh(ShaderEngine.sharedParticleGeo, sharedMat);

            if (position && position.isVector3) {
                p.position.copy(position);
            } else if (position) {
                p.position.set(position.x || 0, position.y || 0, position.z || 0);
            }

            p.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.15,
                    Math.random() * 0.2,
                    (Math.random() - 0.5) * 0.15
                ),
                life: 1.0,
                isLast: (i === particleCount - 1) // Para saber en qué momento liberar el sharedMat
            };

            ShaderEngine.scene.add(p);
            ShaderEngine.skillParticles.push(p);
        }
    };

    window.ShaderEngine = {
        applySettings: applyShaderSettings
    };

    animate();
})();

