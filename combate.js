// combate.js
// --- LÓGICA DE COMBATE Y SINCRONIZACIÓN EN RED ---

const attackableEntities = new Set();

function registerAttackableEntity(entity) {
    attackableEntities.add(entity);
}

function unregisterAttackableEntity(entity) {
    attackableEntities.delete(entity);
}

const _playerPos = new THREE.Vector3();
const _enemyPos = new THREE.Vector3();
const _playerForward = new THREE.Vector3();
const _toEnemy = new THREE.Vector3();
const _dirToEnemy = new THREE.Vector3();
const _scaleVec = new THREE.Vector3();

// Mapeo estructurado de habilidades por personaje
const characterSkillHandlers = {
    Arisa: {
        skills: {
            1: (p, s, act) => typeof useArisaAct1 === 'function' && useArisaAct1(p, s, act, 'Arisa'),
            2: (p, s, act) => typeof useArisaAct2 === 'function' && useArisaAct2(p, s, act, 'Arisa'),
            3: (p, s, act) => typeof useArisaAct3 === 'function' && useArisaAct3(p, s, act, 'Arisa'),
            4: (p, s, act, isPressing) => {
                if (isPressing) {
                    if (typeof holdArisaAct4 === 'function') holdArisaAct4(p, s, act, 'Arisa');
                } else {
                    if (typeof releaseArisaAct4 === 'function') releaseArisaAct4(p, s, act, 'Arisa');
                }
            }
        },
        special: (p, s, act) => typeof useArisaSpecial === 'function' && useArisaSpecial(p, act, 'Arisa')
    },
    Ryu: {
        skills: {
            1: (p, s, act) => typeof useRyuAct1 === 'function' && useRyuAct1(p, s, act, 'Ryu'),
            2: (p, s, act) => typeof useRyuAct2 === 'function' && useRyuAct2(p, s, act, 'Ryu'),
            3: (p, s, act) => typeof useRyuAct3 === 'function' && useRyuAct3(p, s, act, 'Ryu'),
            4: (p, s, act) => typeof useRyuAct4 === 'function' && useRyuAct4(p, s, act, 'Ryu')
        },
        special: (p, s, act) => typeof useRyuSpecial === 'function' && useRyuSpecial(p, s, act, 'Ryu')
    },
    Kai: {
        skills: {
            1: (p, s, act) => typeof useKaiAct1 === 'function' && useKaiAct1(p, s, act, 'Kai'),
            2: (p, s, act) => typeof useKaiAct2 === 'function' && useKaiAct2(p, s, act, 'Kai'),
            3: (p, s, act) => typeof useKaiAct3 === 'function' && useKaiAct3(p, s, act, 'Kai'),
            4: (p, s, act) => typeof useKaiAct4 === 'function' && useKaiAct4(p, s, act, 'Kai')
        },
        special: (p, s, act) => typeof useKaiSpecial === 'function' && useKaiSpecial(p, act, 'Kai')
    }
};

function getActiveCharacterName() {
    if (typeof window.currentCharacter !== 'undefined' && window.currentCharacter) {
        if (window.currentCharacter === 'Elegancia') {
            window.currentCharacter = 'Kai';
        }
        return window.currentCharacter;
    }

    const savedSkin = (localStorage.getItem('selectedSkin') || '').toLowerCase();
    if (savedSkin.includes('arisa')) return 'Arisa';
    if (savedSkin.includes('ryu')) return 'Ryu';
    
    return 'Kai';
}

// SISTEMA DE HITBOX FRONTAL Y SINCRONIZACIÓN DE DAÑO AL NPC
function checkHitArea(playerGroup, scene, map, grid, maxRadius = 1.3, maxAngleDegrees = 80, isFinisher = false) {
    if (!playerGroup) return false;

    playerGroup.getWorldPosition(_playerPos);
    playerGroup.getWorldDirection(_playerForward);
    _playerForward.y = 0; 
    _playerForward.normalize();

    const maxHalfAngleRad = ((maxAngleDegrees / 2) * Math.PI) / 180;
    let hitConfirmed = false;

    let targets = [];
    if (attackableEntities.size > 0) {
        targets = Array.from(attackableEntities);
    } else {
        const activeScene = scene || window.scene || playerGroup.parent;
        if (activeScene) {
            activeScene.traverse(obj => {
                if (obj.userData?.isDummy || obj.name === 'Dummy' || obj.isDummy) {
                    targets.push(obj);
                }
            });
        }
    }

    for (let i = 0; i < targets.length; i++) {
        const obj = targets[i];
        if (!obj || obj === playerGroup) continue;

        obj.getWorldPosition(_enemyPos);
        _toEnemy.subVectors(_enemyPos, _playerPos);
        _toEnemy.y = 0; 
        
        const rawDistance = _toEnemy.length();

        let objectRadius = 0;
        if (obj.geometry) {
            if (!obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere();
            obj.getWorldScale(_scaleVec);
            const maxScale = Math.max(_scaleVec.x, _scaleVec.y, _scaleVec.z);
            objectRadius = obj.geometry.boundingSphere.radius * maxScale;
        }

        const surfaceDistance = Math.max(0, rawDistance - objectRadius);

        if (rawDistance > 0.05 && surfaceDistance <= maxRadius) {
            _dirToEnemy.copy(_toEnemy).normalize();
            const angleBetween = _playerForward.angleTo(_dirToEnemy);

            if (angleBetween <= maxHalfAngleRad) {
                const damageAmount = (typeof consumeHitDamage === 'function') ? consumeHitDamage() : 25;

                if (obj.userData?.isDummy || obj.name === 'Dummy' || obj.isDummy) {
                    if (typeof receiveDamage === 'function') {
                        receiveDamage(damageAmount, _playerPos, true, isFinisher);
                    }

                    // Transmitir daño al Dummy a través de la red
                    if (window.Network && window.Network.conexion && window.Network.conexion.open) {
                        window.Network.enviarDatos({
                            type: 'DAMAGE_NPC',
                            amount: damageAmount,
                            attackerPos: { x: _playerPos.x, y: _playerPos.y, z: _playerPos.z },
                            isFinisher: isFinisher
                        });
                    }
                } else if (typeof onEntityHit === 'function') {
                    onEntityHit(obj, _enemyPos, isFinisher);
                }

                if (isFinisher && typeof applyRagdoll === 'function') {
                    applyRagdoll(obj, _playerForward);
                }
                
                hitConfirmed = true;
            }
        }
    }

    if (hitConfirmed && typeof addUltiCharge === 'function') {
        addUltiCharge(15);
    }

    return hitConfirmed;
}

function triggerAttack(playerGroup, scene, map, grid, combatState) {
    if (!combatState) return;

    const baseCooldown = combatState.HIT_COOLDOWN || 300;
    // Cooldown ajustado a 1500 ms (1.5 segundos) tras el cuarto golpe
    const finisherCooldown = combatState.FINISHER_COOLDOWN || 1500;
    const comboWindow = combatState.COMBO_WINDOW || 1200;

    if (!combatState.canHit) {
        const currentDelay = combatState._isLastHitFinisher ? finisherCooldown : baseCooldown;
        if (!combatState._lastHitTime || (performance.now() - combatState._lastHitTime > currentDelay + 200)) {
            combatState.canHit = true;
            if (typeof setAction === 'function' && typeof ACTIONS !== 'undefined') setAction(ACTIONS.GOLPEAR, false);
        } else {
            return;
        }
    }

    if (typeof activeActions !== 'undefined' && typeof ACTIONS !== 'undefined' && (activeActions & ACTIONS.BLOQUEAR)) return;

    if (combatState._cooldownTimer) {
        clearTimeout(combatState._cooldownTimer);
        combatState._cooldownTimer = null;
    }

    const now = performance.now();
    if (!combatState.comboCount || (now - (combatState._lastSwingTime || 0) > comboWindow)) {
        combatState.comboCount = 1;
    } else {
        combatState.comboCount++;
    }

    const isFinisher = (combatState.comboCount >= 4);
    if (isFinisher) {
        combatState.comboCount = 0;
    }

    combatState.canHit = false; 
    combatState._lastHitTime = now;
    combatState._lastSwingTime = now;

    if (typeof setAction === 'function' && typeof ACTIONS !== 'undefined') setAction(ACTIONS.GOLPEAR, true); 
    if (typeof triggerHitAnimation === 'function') triggerHitAnimation(playerGroup);
    
    // Transmitir animación de ataque al otro jugador por red
    if (window.Network && window.Network.conexion && window.Network.conexion.open) {
        window.Network.enviarDatos({
            type: 'PLAYER_ATTACK_ANIM'
        });
    }

    checkHitArea(playerGroup, scene, map, grid, 1.3, 80, isFinisher);
    
    combatState._isLastHitFinisher = isFinisher;
    const effectiveCooldown = isFinisher ? finisherCooldown : baseCooldown;

    combatState._cooldownTimer = setTimeout(() => { 
        combatState.canHit = true; 
        combatState._isLastHitFinisher = false;
        combatState._cooldownTimer = null;
        if (typeof setAction === 'function' && typeof ACTIONS !== 'undefined') setAction(ACTIONS.GOLPEAR, false); 
    }, effectiveCooldown);
}

function executeCharacterSkill(skillIndex, isPressing, playerGroup, scene) {
    const charName = getActiveCharacterName();

    const handler = characterSkillHandlers[charName];
    if (handler && handler.skills && handler.skills[skillIndex]) {
        handler.skills[skillIndex](playerGroup, scene || window.scene, typeof activeActions !== 'undefined' ? activeActions : null, isPressing);
    }
}

function executeCharacterSpecial(playerGroup, scene) {
    const charName = getActiveCharacterName();

    const activeScene = scene || window.scene || (typeof window.scene !== 'undefined' ? window.scene : playerGroup?.parent);
    const handler = characterSkillHandlers[charName];

    if (handler && handler.special) {
        handler.special(playerGroup, activeScene, typeof activeActions !== 'undefined' ? activeActions : null);
    }
}

