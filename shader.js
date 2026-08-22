/**
 * shader.js - Sistema de Shaders y Mejoras Visuales Estilo Voxel / Minecraft PBR
 * Creado para DDK COMBAT
 */

(function() {
    'use strict';

    const ShaderEngine = {
        enabled: false,
        mode: 0, // 0: Off, 1: Normal, 2: Sofisticado
        scene: null,
        camera: null,
        renderer: null,
        clock: new THREE.Clock(),
        pointLights: [],
        leafObjects: [],
        skillParticles: [],
        originalMaterials: new Map(),
        generatedMaterials: [],
        textures: {},
        hemiLight: null,
        softDirLight: null
    };

    // Generador de Normal Maps estilo Minecraft Shaders (Bloques PBR con biseles y grietas)
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
                    // Estilo Adoquinado Voxel de Minecraft: Bloques biselados con relieve interno de piedra
                    const tileSize = 32;
                    const gx = x % tileSize;
                    const gy = y % tileSize;
                    const border = 2;

                    // Bordes/Bisel del bloque
                    const distToBorderX = Math.min(gx, tileSize - 1 - gx);
                    const distToBorderY = Math.min(gy, tileSize - 1 - gy);
                    const borderDist = Math.min(distToBorderX, distToBorderY);

                    if (borderDist < border) {
                        h = 0.1 * (borderDist / border); // Caída rápida en los bordes para bisel pronunciado
                    } else {
                        // Ruido de textura mineral sobre la cara superior del bloque
                        const noise = (Math.sin(x * 0.4) * Math.cos(y * 0.4) + Math.sin(x * 0.9 + y * 0.7)) * 0.1;
                        h = 0.85 + noise;
                    }
                } else if (type === 'bench_normal') {
                    // Vetas profundas de madera tallada
                    const line = y % 16;
                    const grain = Math.sin(x * 0.1) * 0.1;
                    h = (line < 2 || line > 14) ? 0.2 : (0.8 + grain);
                } else if (type === 'stone_normal') {
                    // Textura rugosa de piedra/hormigón para las jardineras
                    const noise1 = Math.sin(x * 0.3) * Math.cos(y * 0.3);
                    const noise2 = Math.sin(x * 0.8 + y * 0.5);
                    h = 0.5 + (noise1 * 0.2) + (noise2 * 0.15);
                }

                heightMap[y * 256 + x] = h;
            }
        }

        // Filtro Sobel para vectores de normales estilizados tipo Minecraft PBR
        const strength = type === 'floor_normal' ? 4.5 : (type === 'stone_normal' ? 3.0 : 4.0);

        for (let y = 0; y < 256; y++) {
            for (let x = 0; x < 256; x++) {
                const left   = heightMap[y * 256 + Math.max(0, x - 1)];
                const right  = heightMap[y * 256 + Math.min(255, x + 1)];
                const top    = heightMap[Math.max(0, y - 1) * 256 + x];
                const bottom = heightMap[Math.min(255, y + 1) * 256 + x];

                let dx = (right - left) * strength;
                let dy = (bottom - top) * strength;
                let dz = 1.0;

                const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
                dx /= len;
                dy /= len;
                dz /= len;

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
        if (!ShaderEngine.textures.stoneNormal) {
            ShaderEngine.textures.stoneNormal = generateCanvasTexture('stone_normal');
            ShaderEngine.textures.stoneNormal.repeat.set(2, 2);
        }
    }

    function clearGeneratedMaterials() {
        ShaderEngine.generatedMaterials.forEach(mat => {
            if (mat && typeof mat.dispose === 'function') mat.dispose();
        });
        ShaderEngine.generatedMaterials = [];
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
            const toneMappingConst = THREE.ReinhardToneMapping || 2;
            const noToneMappingConst = THREE.NoToneMapping || 0;

            ShaderEngine.renderer.toneMapping = ShaderEngine.enabled ? toneMappingConst : noToneMappingConst;
            ShaderEngine.renderer.toneMappingExposure = 1.0;
        }

        processSceneObjects();
        updatePostLights();
    }

    // Helper para verificar si un Mesh pertenece a un Jugador / NPC
    function isEntityOrPlayer(obj) {
        let current = obj;
        while (current) {
            const name = current.name ? current.name.toLowerCase() : '';
            if (
                current === window.playerGroup ||
                name.includes('player') ||
                name.includes('kai') ||
                name.includes('arisa') ||
                name.includes('itsuki') ||
                name.includes('ryu') ||
                name.includes('dummy') ||
                name.includes('arm') ||
                name.includes('torso') ||
                name.includes('leg') ||
                name.includes('head') ||
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

            // Ignorar entidades y personajes para no alterar sus materiales ni mover sus cuerpos
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
            const baseColor = originalMat && originalMat.color ? originalMat.color.clone() : new THREE.Color(0x888888);
            const baseMap = originalMat && originalMat.map ? originalMat.map : null;

            const isLargeBox = obj.geometry && obj.geometry.type === 'BoxGeometry' && 
                               obj.geometry.parameters && 
                               (obj.geometry.parameters.width >= 30 || obj.geometry.parameters.depth >= 30);

            let newMat;

            // 1. SUELO (Relieve Adoquinado Estilo Minecraft Shaders + Reflejos de Lluvia)
            if (objName.includes('floor') || objName.includes('ground') || objName.includes('suelo') || isLargeBox) {
                const floorNormal = ShaderEngine.textures.floorNormal.clone();
                floorNormal.repeat.set(16, 16);
                floorNormal.needsUpdate = true;

                newMat = new THREE.MeshStandardMaterial({
                    color: baseColor,
                    map: baseMap,
                    normalMap: floorNormal,
                    normalScale: new THREE.Vector2(2.2, 2.2),
                    roughness: 0.12, // Superficie humedecida por lluvia con reflejo directo de luces
                    metalness: 0.1,
                    aoMapIntensity: 1.0
                });
            }
            // 2. FAROLES (Estructura de hierro oscuro + Brillo en cabezal)
            else if (objName.includes('lamp') || objName.includes('pole') || objName.includes('farol')) {
                const isHead = originalMat && originalMat.emissive && originalMat.emissive.r > 0.1;
                if (isHead) {
                    newMat = new THREE.MeshStandardMaterial({
                        color: baseColor,
                        emissive: originalMat.emissive,
                        emissiveIntensity: 1.8,
                        roughness: 0.2,
                        metalness: 0.1
                    });
                } else {
                    newMat = new THREE.MeshStandardMaterial({
                        color: new THREE.Color(0x1a1c20),
                        roughness: 0.35,
                        metalness: 0.85 // Aspecto metálico realista
                    });
                }
            }
            // 3. PIEDRAS / JARDINERAS
            else if (objName.includes('pot') || objName.includes('planter') || objName.includes('jardinera') || objName.includes('stone') || matName.includes('stone')) {
                newMat = new THREE.MeshStandardMaterial({
                    color: baseColor,
                    map: baseMap,
                    normalMap: ShaderEngine.textures.stoneNormal,
                    normalScale: new THREE.Vector2(1.5, 1.5),
                    roughness: 0.75,
                    metalness: 0.05
                });
            }
            // 4. BANCOS DE MADERA
            else if (objName.includes('bench') || objName.includes('banco') || matName.includes('wood') || matName.includes('madera')) {
                newMat = new THREE.MeshStandardMaterial({
                    color: baseColor,
                    map: baseMap,
                    normalMap: ShaderEngine.textures.benchNormal,
                    normalScale: new THREE.Vector2(2.5, 2.5),
                    roughness: 0.45, // Barnizado suave sobre la madera
                    metalness: 0.05
                });
            }
            // 5. VEGETACIÓN / HOJAS Y ARBUSTOS (Únicamente elementos decorativos del mapa)
            else if (objName.includes('bush') || objName.includes('arbusto') || objName.includes('tree') || objName.includes('leaf') || (baseColor.g > baseColor.r && baseColor.g > baseColor.b)) {
                newMat = new THREE.MeshStandardMaterial({
                    color: baseColor,
                    map: baseMap,
                    roughness: 0.7,
                    metalness: 0.0
                });

                if (obj.userData.initialRotZ === undefined) obj.userData.initialRotZ = obj.rotation.z;
                if (obj.userData.initialRotX === undefined) obj.userData.initialRotX = obj.rotation.x;
                if (obj.userData.initialScaleY === undefined) obj.userData.initialScaleY = obj.scale.y;
                if (obj.userData.initialScaleX === undefined) obj.userData.initialScaleX = obj.scale.x;

                ShaderEngine.leafObjects.push(obj);
            }
            // 6. RESTO DE OBJETOS DEL MAPA
            else {
                newMat = new THREE.MeshStandardMaterial({
                    color: baseColor,
                    map: baseMap,
                    roughness: 0.6,
                    metalness: 0.1
                });
            }

            obj.material = newMat;
            ShaderEngine.generatedMaterials.push(newMat);
        });
    }

    function updatePostLights() {
        ShaderEngine.pointLights.forEach(light => {
            if (light.parent) light.parent.remove(light);
            light.dispose();
        });
        ShaderEngine.pointLights = [];

        if (!ShaderEngine.enabled || !ShaderEngine.scene) {
            if (ShaderEngine.hemiLight) ShaderEngine.hemiLight.visible = false;
            if (ShaderEngine.softDirLight) ShaderEngine.softDirLight.visible = false;
            return;
        }

        // Iluminación cálida en los faroles del mapa
        ShaderEngine.scene.traverse((obj) => {
            if (isEntityOrPlayer(obj)) return;

            const isPole = obj.name && (obj.name.toLowerCase().includes('lamp') || obj.name.toLowerCase().includes('pole') || obj.name.toLowerCase().includes('farol'));
            const isYellowHead = obj.material && obj.material.color && (obj.material.color.r > 0.8 && obj.material.color.g > 0.6 && obj.material.color.b < 0.4);

            if (isPole || isYellowHead) {
                const light = new THREE.PointLight(0xffb74d, 1.2, 10);
                light.position.set(0, 1.2, 0);
                obj.add(light);
                ShaderEngine.pointLights.push(light);
            }
        });

        if (!ShaderEngine.hemiLight) {
            ShaderEngine.hemiLight = new THREE.HemisphereLight(0xddf0ff, 0x443322, 0.85);
            ShaderEngine.scene.add(ShaderEngine.hemiLight);
        } else {
            ShaderEngine.hemiLight.visible = true;
        }

        if (!ShaderEngine.softDirLight) {
            ShaderEngine.softDirLight = new THREE.DirectionalLight(0xffffff, 0.5);
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
            // Movimiento suave de viento exclusivo para arbustos y plantas
            ShaderEngine.leafObjects.forEach((obj, idx) => {
                const offset = idx * 1.4;
                
                const windFast = Math.sin(time * 3.2 + offset);
                const windSlow = Math.cos(time * 1.1 + offset * 0.5);

                obj.rotation.z = obj.userData.initialRotZ + (windFast * 0.03) + (windSlow * 0.02);
                obj.rotation.x = obj.userData.initialRotX + (windSlow * 0.02);

                obj.scale.y = obj.userData.initialScaleY + (windFast * 0.025);
                obj.scale.x = obj.userData.initialScaleX - (windFast * 0.015);
            });

            // Partículas de habilidades
            for (let i = ShaderEngine.skillParticles.length - 1; i >= 0; i--) {
                const p = ShaderEngine.skillParticles[i];
                p.position.add(p.userData.velocity);
                p.scale.multiplyScalar(0.95);
                p.userData.life -= 0.02;

                if (p.userData.life <= 0) {
                    ShaderEngine.scene.remove(p);
                    if (p.geometry) p.geometry.dispose();
                    if (p.material) p.material.dispose();
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

        for (let i = 0; i < particleCount; i++) {
            const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
            const mat = new THREE.MeshBasicMaterial({ color: color });
            const p = new THREE.Mesh(geo, mat);

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
                life: 1.0
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

