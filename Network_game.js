// network_game.js

window.RemotePlayers = {};

// Se llama automáticamente cuando la red se abre
window.setupNetworkCallbacks = function() {
    if (!window.Network || !window.Network.conexion) return;

    // Saludo inicial
    window.Network.enviarDatos({
        type: 'INIT_PLAYER',
        skin: window.currentCharacter || 'Kai',
        name: window.playerUsername || 'Jugador'
    });
};

// Manejo de mensajes recibidos
window.handleNetworkData = function(data) {
    if (!data || !data.type) return;

    switch (data.type) {
        case 'INIT_PLAYER':
            // Recibí a alguien, lo creo y le respondo mis datos
            createRemotePlayer(data.skin, data.name);
            window.Network.enviarDatos({
                type: 'SYNC_RESPONSE',
                skin: window.currentCharacter || 'Kai',
                name: window.playerUsername || 'Jugador'
            });
            break;

        case 'SYNC_RESPONSE':
            // Recibí respuesta, creo al rival
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
    }
};

// Crear la skin del rival
function createRemotePlayer(skinName, username) {
    if (!window.scene) return;

    if (window.RemotePlayers['rival']) {
        window.scene.remove(window.RemotePlayers['rival']);
    }

    let remoteData;
    const name = (skinName || 'Kai').toLowerCase();

    if (name.includes('arisa') && typeof createArisaSkin === 'function') remoteData = createArisaSkin();
    else if (name.includes('itsuki') && typeof createItsukiSkin === 'function') remoteData = createItsukiSkin();
    else if (name.includes('ryu') && typeof createRyuSkin === 'function') remoteData = createRyuSkin();
    else if (typeof createKaiSkin === 'function') remoteData = createKaiSkin();
    else remoteData = { playerGroup: new THREE.Group() };

    const remoteGroup = remoteData.playerGroup;
    remoteGroup.position.set(0, 1, 0);
    window.scene.add(remoteGroup);

    if (typeof NameTagSystem !== 'undefined') {
        NameTagSystem.attachToPlayer(remoteGroup, username || "Rival", 2.2);
    }

    window.RemotePlayers['rival'] = remoteGroup;
}

// Actualización de posición
function updateRemotePlayerTransform(data) {
    let rival = window.RemotePlayers['rival'];
    if (!rival) {
        createRemotePlayer(data.skin || 'Kai', 'Rival');
        rival = window.RemotePlayers['rival'];
    }
    if (rival) {
        rival.position.set(data.x, data.y, data.z);
        rival.rotation.y = data.rotY;
    }
}

// Función que llama tu game.js (no tocar el game.js, esta función lo conecta todo)
window.broadcastLocalTransform = function(playerGroup) {
    if (window.Network && window.Network.conexion && window.Network.conexion.open && playerGroup) {
        window.Network.enviarDatos({
            type: 'UPDATE_TRANSFORM',
            x: playerGroup.position.x,
            y: playerGroup.position.y,
            z: playerGroup.position.z,
            rotY: playerGroup.rotation.y,
            skin: window.currentCharacter || 'Kai'
        });
    }
};

