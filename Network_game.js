// network_game.js

window.RemotePlayers = {};

window.setupNetworkCallbacks = function() {
    // Transmitir inmediatamente mis datos de jugador al conectarme
    sendMyPlayerData();

    // Reintento de handshake preventivo por si la red tuvo lag inicial
    setTimeout(sendMyPlayerData, 1000);
};

function sendMyPlayerData() {
    if (!window.Network || !window.Network.conexion || !window.Network.conexion.open) return;

    const skinGuardada = localStorage.getItem('selectedSkin') || 'clasica';
    const skinActual = window.currentCharacter || skinGuardada;

    window.Network.enviarDatos({
        type: 'INIT_PLAYER',
        skin: skinActual,
        name: window.playerUsername || 'Jugador'
    });
}

window.handleNetworkData = function(data) {
    if (!data || !data.type) return;

    switch (data.type) {
        case 'INIT_PLAYER':
            createRemotePlayer(data.skin, data.name);
            // Responder al rival para confirmarle mi presencia y mi skin
            const skinGuardada = localStorage.getItem('selectedSkin') || 'clasica';
            window.Network.enviarDatos({
                type: 'SYNC_RESPONSE',
                skin: window.currentCharacter || skinGuardada,
                name: window.playerUsername || 'Jugador'
            });
            break;

        case 'SYNC_RESPONSE':
            createRemotePlayer(data.skin, data.name);
            break;

        case 'UPDATE_TRANSFORM':
            updateRemotePlayerTransform(data);
            break;

        case 'DAMAGE_NPC':
            if (typeof receiveDamage === 'function') {
                receiveDamage(data.amount, data.attackerPos, false, data.isFinisher);
            }
            break;

        case 'SPAWN_HITBOX':
            if (typeof window.spawnAttackHitbox === 'function' && data.pos) {
                window.spawnAttackHitbox(data.pos, data.rotY, data.width, data.height, data.reach, data.duration);
            }
            break;

        case 'PLAYER_ATTACK_ANIM':
            if (window.RemotePlayers['rival'] && typeof triggerHitAnimation === 'function') {
                triggerHitAnimation(window.RemotePlayers['rival']);
            }
            break;

        case 'USE_SKILL':
            const rival = window.RemotePlayers['rival'];
            if (rival && typeof executeCharacterSkill === 'function') {
                if (data.origin) {
                    rival.position.set(data.origin.x, data.origin.y, data.origin.z);
                    rival.rotation.y = data.rotY;
                }
                executeCharacterSkill(data.skillIndex, data.isPressing, rival, window.scene);
            }
            break;
    }
};

function createRemotePlayer(skinName, username) {
    if (!window.scene) return;

    if (window.RemotePlayers['rival']) {
        window.scene.remove(window.RemotePlayers['rival']);
    }

    let remoteData = null;
    const name = (skinName || 'clasica').toLowerCase();

    // Detección e instanciación del modelo 3D
    try {
        if (name.includes('arisa') && typeof createArisaSkin === 'function') {
            remoteData = createArisaSkin();
        } else if (name.includes('itsuki') && typeof createItsukiSkin === 'function') {
            remoteData = createItsukiSkin();
        } else if (name.includes('ryu') && typeof createRyuSkin === 'function') {
            remoteData = createRyuSkin();
        } else if (name.includes('funetsu') && typeof createFunetsuSkin === 'function') {
            remoteData = createFunetsuSkin();
        } else if (name.includes('kenji') && typeof createKenjiSkin === 'function') {
            remoteData = createKenjiSkin();
        } else if (typeof createKaiSkin === 'function') {
            remoteData = createKaiSkin();
        } else if (typeof window.loadPlayerSkin === 'function') {
            remoteData = window.loadPlayerSkin(skinName);
        }
    } catch(e) {
        console.error("Error cargando skin remota:", e);
    }

    let remoteGroup;

    // Si la función skin retornó un grupo válido, lo usa
    if (remoteData && remoteData.playerGroup) {
        remoteGroup = remoteData.playerGroup;
    } else {
        // FALLBACK VISIBLE: Si la función no existía o falló, crea una skin roja
        remoteGroup = new THREE.Group();
        const geo = new THREE.BoxGeometry(0.8, 1.8, 0.8);
        const mat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0.9;
        remoteGroup.add(mesh);
    }

    remoteGroup.position.set(0, 1, 0);
    window.scene.add(remoteGroup);

    if (typeof NameTagSystem !== 'undefined') {
        NameTagSystem.attachToPlayer(remoteGroup, username || "Rival", 2.2);
    }

    window.RemotePlayers['rival'] = remoteGroup;
}

function updateRemotePlayerTransform(data) {
    let rival = window.RemotePlayers['rival'];
    if (!rival) {
        createRemotePlayer(data.skin || 'clasica', data.name || 'Rival');
        rival = window.RemotePlayers['rival'];
    }
    if (rival) {
        rival.position.set(data.x, data.y, data.z);
        rival.rotation.y = data.rotY;
    }
}

window.broadcastLocalTransform = function(playerGroup) {
    if (window.Network && window.Network.conexion && window.Network.conexion.open && playerGroup) {
        const skinGuardada = localStorage.getItem('selectedSkin') || 'clasica';
        window.Network.enviarDatos({
            type: 'UPDATE_TRANSFORM',
            x: playerGroup.position.x,
            y: playerGroup.position.y,
            z: playerGroup.position.z,
            rotY: playerGroup.rotation.y,
            skin: window.currentCharacter || skinGuardada
        });
    }
};

