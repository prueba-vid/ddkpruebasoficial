// js/network_game.js

window.RemotePlayers = {}; // Guarda las mallas 3D de otros jugadores

// Detección de entrada de nuevos jugadores y configuración de listeners
window.setupNetworkCallbacks = function() {
    if (!window.Network) return;

    // Cuando la conexión con el rival se abre
    const onConnect = () => {
        // Al conectarse, enviamos nuestra skin actual e identidad
        window.Network.enviarDatos({
            type: 'INIT_PLAYER',
            skin: window.currentCharacter || 'Kai',
            name: window.playerUsername || 'Jugador'
        });
    };

    // Sobrescribimos el listener de datos de Network.js
    if (window.Network.conexion) {
        window.Network.conexion.on('data', window.handleNetworkData);
        window.Network.conexion.on('open', onConnect);
    }
};

// Procesador principal de paquetes recibidos
window.handleNetworkData = function(data) {
    if (!data || !data.type) return;

    switch (data.type) {
        case 'INIT_PLAYER':
            createRemotePlayer(data.skin, data.name);
            break;

        case 'UPDATE_TRANSFORM':
            updateRemotePlayerTransform(data);
            break;

        case 'DAMAGE_NPC':
            // Sincroniza el daño recibido por el NPC en este dispositivo
            if (typeof receiveDamage === 'function') {
                receiveDamage(data.amount, data.attackerPos, false, data.isFinisher);
            }
            break;

        case 'SPAWN_HITBOX':
            if (typeof window.spawnAttackHitbox === 'function' && data.pos) {
                window.spawnAttackHitbox(data.pos, data.rotY, data.width, data.height, data.reach, data.duration);
            }
            break;
    }
};

// Instancia el personaje del otro jugador en la escena local
function createRemotePlayer(skinName, username) {
    if (window.RemotePlayers['rival']) {
        window.scene.remove(window.RemotePlayers['rival']);
    }

    let remoteData;
    const name = (skinName || 'Kai').toLowerCase();

    if (name.includes('arisa') && typeof createArisaSkin === 'function') remoteData = createArisaSkin();
    else if (name.includes('itsuki') && typeof createItsukiSkin === 'function') remoteData = createItsukiSkin();
    else if (name.includes('ryu') && typeof createRyuSkin === 'function') remoteData = createRyuSkin();
    else remoteData = createKaiSkin();

    const remoteGroup = remoteData.playerGroup;
    remoteGroup.position.set(0, 1, 0);
    window.scene.add(remoteGroup);

    if (typeof NameTagSystem !== 'undefined') {
        NameTagSystem.attachToPlayer(remoteGroup, username || "Rival", 2.2);
    }

    window.RemotePlayers['rival'] = remoteGroup;
}

// Actualiza posición y rotación del rival en tiempo real
function updateRemotePlayerTransform(data) {
    let rival = window.RemotePlayers['rival'];
    if (!rival) {
        // Si nos llegan datos de un rival no instanciado, lo creamos
        createRemotePlayer(data.skin, 'Rival');
        rival = window.RemotePlayers['rival'];
    }

    if (rival) {
        rival.position.set(data.x, data.y, data.z);
        rival.rotation.y = data.rotY;
    }
}

// Envía la posición local al otro teléfono
window.broadcastLocalTransform = function(playerGroup) {
    if (window.Network && window.Network.conexion && window.Network.conexion.open && playerGroup) {
        window.Network.enviarDatos({
            type: 'UPDATE_TRANSFORM',
            x: playerGroup.position.x,
            y: playerGroup.position.y,
            z: playerGroup.position.z,
            rotY: playerGroup.rotation.y,
            skin: window.currentCharacter
        });
    }
};
