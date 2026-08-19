// network_game.js

window.RemotePlayers = {};

window.setupNetworkCallbacks = function() {
    if (!window.Network || !window.Network.conexion) return;

    // Enviar datos del personaje local
    window.Network.enviarDatos({
        type: 'INIT_PLAYER',
        skin: window.currentCharacter || 'Kai',
        name: window.playerUsername || 'Jugador'
    });
};

window.handleNetworkData = function(data) {
    if (!data || !data.type) return;

    switch (data.type) {
        case 'INIT_PLAYER':
            createRemotePlayer(data.skin, data.name);
            // Responder confirmación para sincronizar ambos lados
            window.Network.enviarDatos({
                type: 'SYNC_RESPONSE',
                skin: window.currentCharacter || 'Kai',
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
    }
};

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

