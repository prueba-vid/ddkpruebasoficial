// --- SISTEMA DE HABILIDADES Y COOLDOWNS PARA KAI (hb.js) ---

const BASE_DAMAGE = 25;

const cooldowns = {
    SPEC: false,
    ACT1: false,
    ACT2: false,
    ACT3: false,
    ACT4: false
};

window.activeProjectiles = window.activeProjectiles || [];
let act2ChargeStartTime = 0;

function createKaiSkillMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#870913';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    
    for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        let x = Math.random() * 256;
        let y = 0;
        ctx.moveTo(x, y);

        while (y < 256) {
            x += (Math.random() - 0.5) * 40;
            y += Math.random() * 30 + 10;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.3,
        metalness: 0.2,
        transparent: true,
        opacity: 1.0
    });
}

const KAI_SKILL_MAT = createKaiSkillMaterial();

function triggerCooldown(btnId, durationSeconds, cdKey) {
    cooldowns[cdKey] = true;
    const btn = document.getElementById(btnId);
    if (!btn) return;

    let overlay = btn.querySelector('.cd-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'cd-overlay';
        btn.appendChild(overlay);
    }

    let timeLeft = durationSeconds;
    overlay.textContent = timeLeft;

    const interval = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) {
            overlay.textContent = timeLeft;
        } else {
            clearInterval(interval);
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            cooldowns[cdKey] = false;
        }
    }, 1000);
}

function canUseKaiSkill(activeActions, currentCharacter) {
    if (currentCharacter !== 'Kai') return false;
    if (activeActions & 1024) return false;
    return true;
}

// --- 1. ESPECIAL (SPEC): TELETRANSPORTE ---
function useKaiSpecial(playerGroup, activeActions, currentCharacter) {
    if (!canUseKaiSkill(activeActions, currentCharacter)) return;
    if (cooldowns.SPEC) return;
    
    triggerCooldown('specBtn', 15, 'SPEC');

    const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y);
    const tpDistance = 2.1;

    playerGroup.position.add(forwardDir.multiplyScalar(tpDistance));

    if (typeof applyMapBounds === 'function') {
        const isGroundedState = typeof isGrounded !== 'undefined' ? isGrounded : true;
        applyMapBounds(playerGroup, isGroundedState);
    }
}

function consumeHitDamage() {
    return BASE_DAMAGE;
}

// --- 2. ACT1: BRAZO DE PUÑO DESDE EL SUELO (+40% daño = 35) ---
function useKaiAct1(playerGroup, scene, activeActions, currentCharacter) {
    if (!canUseKaiSkill(activeActions, currentCharacter)) return;
    if (cooldowns.ACT1) return;
    triggerCooldown('act1', 22, 'ACT1');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT1');

    const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y);
    const spawnPos = playerGroup.position.clone().add(forwardDir.clone().multiplyScalar(1.2));
    spawnPos.y = playerGroup.position.y - 1.2; 

    const armGroup = new THREE.Group();

    // Brazo
    const armGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.2, 8);
    const armMesh = new THREE.Mesh(armGeo, KAI_SKILL_MAT);
    armMesh.position.y = 0.6;
    armGroup.add(armMesh);

    // Puño
    const fistGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
    const fistMesh = new THREE.Mesh(fistGeo, KAI_SKILL_MAT);
    fistMesh.position.y = 1.3;
    armGroup.add(fistMesh);

    armGroup.position.copy(spawnPos);
    armGroup.rotation.y = playerGroup.rotation.y;
    scene.add(armGroup);

    let frame = 0;
    const act1Damage = BASE_DAMAGE * 1.40; // 35
    let hitApplied = false;

    const punchAnim = setInterval(() => {
        frame++;
        armGroup.position.y += 0.22;

        if (!hitApplied && typeof dummyMesh !== 'undefined' && dummyMesh) {
            if (armGroup.position.distanceTo(dummyMesh.position) < 2.0) {
                applySkillDamage(act1Damage);
                hitApplied = true;
            }
        }

        if (frame >= 10) {
            clearInterval(punchAnim);
            scene.remove(armGroup);
            armGeo.dispose();
            fistGeo.dispose();
        }
    }, 25);
}

// --- 3. ACT2: BOLA DE ENERGÍA DE CARGA (HOLD) ---
function startKaiAct2Charge(activeActions, currentCharacter) {
    if (!canUseKaiSkill(activeActions, currentCharacter)) return;
    if (cooldowns.ACT2) return;
    act2ChargeStartTime = Date.now();
}

function releaseKaiAct2Charge(playerGroup, scene, activeActions, currentCharacter) {
    if (!canUseKaiSkill(activeActions, currentCharacter)) return;
    if (cooldowns.ACT2 || act2ChargeStartTime === 0) return;

    triggerCooldown('act2', 28, 'ACT2');

    const chargeTime = (Date.now() - act2ChargeStartTime) / 1000;
    act2ChargeStartTime = 0;

    let damageMultiplier = 1.0;
    if (chargeTime >= 3) {
        damageMultiplier = 1.40; // 35
    } else if (chargeTime >= 2) {
        damageMultiplier = 1.30; // 32.5
    } else if (chargeTime >= 1) {
        damageMultiplier = 1.20; // 30
    }

    const finalDamage = BASE_DAMAGE * damageMultiplier;

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT2');

    const ballGeo = new THREE.SphereGeometry(0.28 + (damageMultiplier - 1), 16, 16);
    const ball = new THREE.Mesh(ballGeo, KAI_SKILL_MAT);

    const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y).normalize();
    ball.position.copy(playerGroup.position).add(new THREE.Vector3(0, 0.8, 0)).add(dir.clone().multiplyScalar(0.6));

    const activeScene = scene || window.scene;
    if (activeScene) activeScene.add(ball);

    window.activeProjectiles.push({
        mesh: ball,
        dir: dir,
        speed: 12,
        damage: finalDamage,
        life: 2.0,
        isExplosive: true,
        explosionRadius: 2.0 + (damageMultiplier * 0.5)
    });
}

function useKaiAct2(playerGroup, scene, activeActions, currentCharacter) {
    startKaiAct2Charge(activeActions, currentCharacter);
    setTimeout(() => releaseKaiAct2Charge(playerGroup, scene, activeActions, currentCharacter), 100);
}

// --- 4. ACT3: 4 ESTACAS DIRECCIONALES EN CRUZ (25% DAÑO C/U = 6.25) ---
function useKaiAct3(playerGroup, scene, activeActions, currentCharacter) {
    if (!canUseKaiSkill(activeActions, currentCharacter)) return;
    if (cooldowns.ACT3) return;
    triggerCooldown('act3', 18, 'ACT3');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT3');

    const activeScene = scene || window.scene;
    if (!activeScene) return;

    const spikeDamage = BASE_DAMAGE * 0.25; // 6.25 de daño por estaca
    const offsetDistance = 1.2;

    // Vectores direccionales en base a la rotación del jugador
    const rotY = playerGroup.rotation.y;
    const directions = [
        new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY),  // Frente
        new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY), // Atrás
        new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY),  // Derecha
        new THREE.Vector3(-1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY)  // Izquierda
    ];

    const spikeGeo = new THREE.ConeGeometry(0.25, 1.6, 8);
    const spikesGroup = new THREE.Group();

    directions.forEach((dir) => {
        const spikeMesh = new THREE.Mesh(spikeGeo, KAI_SKILL_MAT);
        const spawnPos = playerGroup.position.clone().add(dir.clone().multiplyScalar(offsetDistance));
        
        // Posición inicial sumergida en el suelo
        spikeMesh.position.set(spawnPos.x, playerGroup.position.y - 0.8, spawnPos.z);
        spikesGroup.add(spikeMesh);
    });

    activeScene.add(spikesGroup);

    // Animación de brote hacia arriba
    let frame = 0;
    const riseAnim = setInterval(() => {
        frame++;
        spikesGroup.children.forEach(spike => {
            if (spike.position.y < playerGroup.position.y + 0.8) {
                spike.position.y += 0.2;
            }
        });

        // Comprobación de impacto durante el brote
        if (frame === 4 && typeof dummyMesh !== 'undefined' && dummyMesh) {
            spikesGroup.children.forEach(spike => {
                if (spike.position.distanceTo(dummyMesh.position) < 1.2) {
                    applySkillDamage(spikeDamage);
                }
            });
        }

        if (frame >= 8) {
            clearInterval(riseAnim);
        }
    }, 25);

    // Desaparición total a los 2 segundos exactos
    setTimeout(() => {
        activeScene.remove(spikesGroup);
        spikesGroup.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
        });
        spikeGeo.dispose();
    }, 2000);
}

// --- 5. ACT4: DASH CORTO CON DAÑO A ENEMIGOS EN TRAYECTO (+20% daño = 30) ---
function useKaiAct4(playerGroup, scene, activeActions, currentCharacter) {
    if (!canUseKaiSkill(activeActions, currentCharacter)) return;
    if (cooldowns.ACT4) return;
    triggerCooldown('act4', 16, 'ACT4');

    if (typeof triggerSkillAnimation === 'function') triggerSkillAnimation(playerGroup, 'ACT4');

    const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y);
    const totalDistance = 2.1;
    const steps = 10;
    const stepDistance = totalDistance / steps;
    const dashDamage = Math.round(BASE_DAMAGE * 1.20);

    let currentStep = 0;
    let hitTargets = new Set();

    const dashInterval = setInterval(() => {
        currentStep++;
        
        playerGroup.position.add(forwardDir.clone().multiplyScalar(stepDistance));

        if (typeof applyMapBounds === 'function') {
            const isGroundedState = typeof isGrounded !== 'undefined' ? isGrounded : true;
            applyMapBounds(playerGroup, isGroundedState);
        }

        if (typeof dummyMesh !== 'undefined' && dummyMesh && !hitTargets.has(dummyMesh.id)) {
            if (playerGroup.position.distanceTo(dummyMesh.position) < 1.5) {
                applySkillDamage(dashDamage);
                hitTargets.add(dummyMesh.id);
            }
        }

        if (currentStep >= steps) {
            clearInterval(dashInterval);
        }
    }, 15);
}

// --- EFECTOS Y AUXILIARES ---
function createExplosionEffect(position, targetScene, radius = 2.5) {
    const activeScene = targetScene || window.scene;
    if (!activeScene) return;

    const expGeo = new THREE.SphereGeometry(radius * 0.2, 16, 16);
    const expMat = KAI_SKILL_MAT.clone();
    const expMesh = new THREE.Mesh(expGeo, expMat);
    expMesh.position.copy(position);
    activeScene.add(expMesh);

    let scale = 1;
    const expInterval = setInterval(() => {
        scale += 0.3;
        expMesh.scale.set(scale, scale, scale);
        expMat.opacity -= 0.15;

        if (expMat.opacity <= 0) {
            clearInterval(expInterval);
            activeScene.remove(expMesh);
            expGeo.dispose();
            expMat.dispose();
        }
    }, 30);
}

function applySkillDamage(amount) {
    if (typeof dummyHealth !== 'undefined' && dummyMesh) {
        dummyHealth -= amount;
        if (typeof addUltiCharge === 'function') addUltiCharge(15);
        if (typeof updateHealthBarVisual === 'function') updateHealthBarVisual();

        dummyMesh.traverse((child) => {
            if (child.isMesh && child.name !== "healthGreen" && child.geometry.type !== "PlaneGeometry") {
                child.material.color.setHex(0xff0000);
            }
        });

        setTimeout(() => {
            if (dummyMesh && dummyHealth > 0) {
                dummyMesh.traverse((child) => {
                    if (child.isMesh && child.name !== "healthGreen" && child.geometry.type !== "PlaneGeometry") {
                        child.material.color.setHex(0x00ff44);
                    }
                });
            }
        }, 150);

        if (dummyHealth <= 0 && typeof cleanDummy === 'function') {
            cleanDummy(window.scene);
            setTimeout(() => { if (typeof spawnDummy === 'function') spawnDummy(window.scene); }, 2000);
        }
    }
}

// BUCLE DE ACTUALIZACIÓN DE PROYECTILES (LLAMADO DESDE GAME.JS)
function updateProjectilesMovement(delta, sceneRef) {
    if (!window.activeProjectiles || window.activeProjectiles.length === 0) return;
    const currentScene = sceneRef || window.scene;

    for (let i = window.activeProjectiles.length - 1; i >= 0; i--) {
        const p = window.activeProjectiles[i];
        p.life -= delta;

        p.mesh.position.addScaledVector(p.dir, p.speed * delta);

        let hit = false;

        if (typeof dummyMesh !== 'undefined' && dummyMesh) {
            if (p.mesh.position.distanceTo(dummyMesh.position) < 1.6) {
                hit = true;
            }
        }

        if (p.isExplosive && (p.life <= 0 || hit)) {
            const expRadius = p.explosionRadius || 2.5;
            createExplosionEffect(p.mesh.position, currentScene, expRadius);

            if (typeof dummyMesh !== 'undefined' && dummyMesh) {
                if (p.mesh.position.distanceTo(dummyMesh.position) < expRadius) {
                    applySkillDamage(p.damage);
                }
            }

            if (currentScene) currentScene.remove(p.mesh);
            if (p.mesh.geometry) p.mesh.geometry.dispose();
            window.activeProjectiles.splice(i, 1);
            continue;
        }

        if (!p.isExplosive && hit) {
            applySkillDamage(p.damage);
            if (currentScene) currentScene.remove(p.mesh);
            if (p.mesh.geometry) p.mesh.geometry.dispose();
            window.activeProjectiles.splice(i, 1);
            continue;
        }

        if (p.life <= 0) {
            if (currentScene) currentScene.remove(p.mesh);
            if (p.mesh.geometry) p.mesh.geometry.dispose();
            window.activeProjectiles.splice(i, 1);
        }
    }
}

