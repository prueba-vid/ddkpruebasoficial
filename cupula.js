// --- js/cupula.js ---
(function() {
    'use strict';

    class DomeManager {
        constructor() {
            this.mesh = null;
            this.currentDomeId = 0;
            this.clock = new THREE.Clock();
            this.animationFrameId = null;

            // Lista de cúpulas
            this.domes = [
                { id: 1, name: "Cielo Clásico" },
                { id: 2, name: "Noche Estrellada" },
                { id: 3, name: "Matrix Morada" },
                { id: 4, name: "Auroras Boreales" },
                { id: 5, name: "Agujero Negro" }
            ];

            this.initLoop();
        }

        getScene() {
            return window.scene || null;
        }

        clearCurrentDome() {
            const scene = this.getScene();
            if (this.mesh) {
                if (scene) scene.remove(this.mesh);
                if (this.mesh.geometry) this.mesh.geometry.dispose();
                if (this.mesh.material) {
                    if (Array.isArray(this.mesh.material)) {
                        this.mesh.material.forEach(mat => mat.dispose());
                    } else {
                        this.mesh.material.dispose();
                    }
                }
                this.mesh = null;
            }
            this.currentDomeId = 0;
        }

        setDome(id) {
            const scene = this.getScene();
            if (!scene) {
                console.warn("DomeManager: Esperando a que 'window.scene' esté disponible...");
                return false;
            }

            const domeInfo = this.domes.find(d => d.id === parseInt(id));
            if (!domeInfo) return false;

            this.clearCurrentDome();
            this.currentDomeId = domeInfo.id;

            // Geometría optimizada: 32x16 es más que suficiente para shaders de cielo
            const geometry = new THREE.SphereGeometry(800, 32, 16);
            let material;

            switch (this.currentDomeId) {
                case 1: // Cielo Clásico
                    material = new THREE.ShaderMaterial({
                        uniforms: { time: { value: 0 } },
                        vertexShader: `
                            varying vec3 vWorldPosition;
                            void main() {
                                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                                vWorldPosition = worldPosition.xyz;
                                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                            }
                        `,
                        fragmentShader: `
                            varying vec3 vWorldPosition;
                            void main() {
                                float h = normalize(vWorldPosition).y;
                                vec3 skyColor = mix(vec3(0.8, 0.9, 1.0), vec3(0.1, 0.4, 0.8), max(h, 0.0));
                                gl_FragColor = vec4(skyColor, 1.0);
                            }
                        `,
                        side: THREE.BackSide,
                        depthWrite: false
                    });
                    break;

                case 2: // Noche Estrellada
                    material = new THREE.ShaderMaterial({
                        uniforms: { time: { value: 0 } },
                        vertexShader: `
                            varying vec3 vNormal;
                            void main() {
                                vNormal = normalize(position);
                                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                            }
                        `,
                        fragmentShader: `
                            varying vec3 vNormal;
                            uniform float time;

                            float hash(vec3 p) {
                                p = fract(p * vec3(443.897, 441.423, 437.195));
                                p += dot(p, p.yzx + 19.19);
                                return fract((p.x + p.y) * p.z);
                            }

                            void main() {
                                vec3 p = vNormal * 80.0;
                                vec3 id = floor(p);
                                vec3 f = fract(p);
                                
                                float n = hash(id);
                                float isStar = step(0.91, n);

                                vec3 starPos = vec3(hash(id + 0.1), hash(id + 0.2), hash(id + 0.3));
                                float dist = length(f - starPos);
                                float twinkle = sin(time * 2.5 + n * 6.283) * 0.5 + 0.5;
                                float star = smoothstep(0.25, 0.0, dist) * (0.7 + 0.5 * twinkle) * isStar;

                                vec3 spaceColor = mix(vec3(0.01, 0.01, 0.04), vec3(0.04, 0.02, 0.08), vNormal.y * 0.5 + 0.5);
                                vec3 finalColor = spaceColor + vec3(star * 2.0, star * 2.0, star * 2.5);

                                gl_FragColor = vec4(finalColor, 1.0);
                            }
                        `,
                        side: THREE.BackSide,
                        depthWrite: false
                    });
                    break;

                case 3: // Matrix Morada
                    material = new THREE.ShaderMaterial({
                        uniforms: { time: { value: 0 } },
                        vertexShader: `
                            varying vec3 vNormal;
                            void main() {
                                vNormal = normalize(position);
                                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                            }
                        `,
                        fragmentShader: `
                            varying vec3 vNormal;
                            uniform float time;

                            float hash(vec3 p) {
                                p = fract(p * vec3(12.9898, 78.233, 37.719));
                                return fract(dot(p, vec3(12.9898, 78.233, 37.719)));
                            }

                            float boxSDF(vec3 p, vec3 b) {
                                vec3 q = abs(p) - b;
                                return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
                            }

                            void main() {
                                vec3 dir = normalize(vNormal);
                                vec3 p = dir * 25.0;
                                p.y += time * 1.5;

                                vec3 id = floor(p);
                                vec3 f = fract(p) - 0.5;

                                float rnd = hash(id);
                                float isCube = step(0.65, rnd);

                                float d = boxSDF(f, vec3(0.18 + sin(time + rnd * 6.283) * 0.05));
                                float cube = smoothstep(0.02, 0.0, d) * isCube;
                                float depthGlow = smoothstep(0.25, 0.0, d) * 0.6 * isCube;

                                vec3 purpleBg = vec3(0.02, 0.0, 0.05);
                                vec3 cubeColor = vec3(0.6, 0.1, 0.9) * cube;
                                vec3 glowColor = vec3(0.4, 0.0, 0.8) * depthGlow;

                                gl_FragColor = vec4(purpleBg + cubeColor + glowColor, 1.0);
                            }
                        `,
                        side: THREE.BackSide,
                        depthWrite: false
                    });
                    break;

                case 4: // Auroras Boreales
                    material = new THREE.ShaderMaterial({
                        uniforms: { time: { value: 0 } },
                        vertexShader: `
                            varying vec3 vWorldPosition;
                            void main() {
                                vWorldPosition = position;
                                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                            }
                        `,
                        fragmentShader: `
                            varying vec3 vWorldPosition;
                            uniform float time;

                            void main() {
                                vec3 p = normalize(vWorldPosition);
                                float elevation = p.y;

                                // Capa base nocturna
                                vec3 nightSky = mix(vec3(0.01, 0.02, 0.06), vec3(0.002, 0.005, 0.02), clamp(elevation, 0.0, 1.0));

                                // Cálculo de cortinas de luz polar
                                float angle = atan(p.z, p.x);
                                float wave1 = sin(angle * 6.0 + time * 0.8 + sin(p.y * 4.0)) * 0.5 + 0.5;
                                float wave2 = cos(angle * 12.0 - time * 1.2 + p.y * 8.0) * 0.5 + 0.5;
                                float auroraShape = wave1 * wave2;

                                // Degradado por altura (se intensifica en el horizonte medio-alto)
                                float fade = smoothstep(-0.1, 0.3, elevation) * smoothstep(0.9, 0.4, elevation);
                                float intensity = auroraShape * fade;

                                // Colores características (Verde esmeralda y Violeta/Azul)
                                vec3 greenAurora = vec3(0.1, 0.9, 0.5);
                                vec3 violetAurora = vec3(0.4, 0.1, 0.8);
                                vec3 auroraColor = mix(greenAurora, violetAurora, sin(angle + time) * 0.5 + 0.5);

                                vec3 finalColor = nightSky + auroraColor * intensity * 2.2;
                                gl_FragColor = vec4(finalColor, 1.0);
                            }
                        `,
                        side: THREE.BackSide,
                        depthWrite: false
                    });
                    break;

                case 5: // Agujero Negro
                    material = new THREE.ShaderMaterial({
                        uniforms: { time: { value: 0 } },
                        vertexShader: `
                            varying vec3 vNormal;
                            void main() {
                                vNormal = normalize(position);
                                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                            }
                        `,
                        fragmentShader: `
                            varying vec3 vNormal;
                            uniform float time;

                            void main() {
                                vec3 dir = normalize(vNormal);
                                vec3 center = normalize(vec3(0.85, 0.15, -0.5));

                                float dist = length(dir - center);

                                float blackHole = smoothstep(0.22, 0.19, dist);

                                float rotAngle = atan(dir.z - center.z, dir.x - center.x) - time * 1.8;
                                float ringPattern = sin(rotAngle * 8.0) * 0.5 + 0.5;

                                float accretionDisk = smoothstep(0.42, 0.22, dist) * (1.0 - blackHole);
                                float whiteGlow = pow(accretionDisk, 1.5) * (0.8 + 0.4 * ringPattern);

                                vec3 spaceColor = vec3(0.005, 0.005, 0.015);
                                vec3 diskColor = mix(vec3(0.8, 0.85, 1.0), vec3(1.0, 1.0, 1.0), ringPattern) * whiteGlow * 3.0;

                                float isInsideHorizon = step(dist, 0.20);
                                vec3 finalColor = mix(spaceColor * (1.0 - blackHole) + diskColor, vec3(0.0), isInsideHorizon);

                                gl_FragColor = vec4(finalColor, 1.0);
                            }
                        `,
                        side: THREE.BackSide,
                        depthWrite: false
                    });
                    break;

                default:
                    material = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide, depthWrite: false });
                    break;
            }

            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.renderOrder = -1000;
            scene.add(this.mesh);

            return true;
        }

        initLoop() {
            const render = () => {
                this.animationFrameId = requestAnimationFrame(render);

                if (this.currentDomeId === 0 || !this.mesh) return;

                const elapsedTime = this.clock.getElapsedTime();

                if (this.mesh.material && this.mesh.material.uniforms && this.mesh.material.uniforms.time) {
                    this.mesh.material.uniforms.time.value = elapsedTime;
                }

                if (this.currentDomeId !== 5) {
                    this.mesh.rotation.y = elapsedTime * 0.02;
                }
            };
            render();
        }
    }

    window.DomeManager = new DomeManager();
})();

