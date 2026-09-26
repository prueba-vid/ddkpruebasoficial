// network.js - Multijugador Automático Estilo Minecraft Bedrock
(function() {
    window.Network = {
        peer: null,
        conexion: null,
        conexionesClientes: [],
        isHost: false,
        roomCode: "SALA-LAN-DDK", // Nombre de sala fija local para autoreconocimiento

        // Configuración de red nativa con redundancia de conexión rápida
        peerConfig: {
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            },
            debug: 0
        },

        // El Host crea la sala en 1 segundo sin pedir nada
        iniciarHost: function() {
            return new Promise((resolve, reject) => {
                this.isHost = true;

                if (typeof Peer === 'undefined') {
                    alert("Error: No se encontró el motor de red.");
                    return reject();
                }

                // Fuerza la creación de la sala LAN estándar
                this.peer = new Peer(this.roomCode, this.peerConfig);

                this.peer.on('open', (id) => {
                    alert("¡Sala Abierta! Tu celular ya se puede unir directamente desde el menú.");
                    resolve(id);
                });

                this.peer.on('connection', (conn) => {
                    this.conexionesClientes.push(conn);
                    this.configurarConexionCliente(conn);
                });

                this.peer.on('error', (err) => {
                    if (err.type === 'unavailable-id') {
                        // Si la sala ya existe, se limpia y se reactiva
                        if (this.peer) this.peer.destroy();
                        setTimeout(() => this.iniciarHost().then(resolve).catch(reject), 500);
                    } else {
                        alert("Error creando la sala automática: " + err.type);
                        reject(err);
                    }
                });
            });
        },

        // El cliente (Celular) busca la sala automática directamente
        unirseASalaAuto: function() {
            return new Promise((resolve, reject) => {
                this.isHost = false;

                if (typeof Peer === 'undefined') {
                    alert("Error: No se encontró el motor de red.");
                    return reject();
                }

                this.peer = new Peer(this.peerConfig);

                this.peer.on('open', () => {
                    // Intenta engancharse directo a la sala abierta por el Host
                    this.conexion = this.peer.connect(this.roomCode, { reliable: true });

                    let timeout = setTimeout(() => {
                        if (!this.conexion || !this.conexion.open) {
                            alert("No se encontró ninguna partida abierta en la red. Asegúrate de presionar 'Crear Sala' primero en la PC.");
                            reject("Timeout");
                        }
                    }, 5000);

                    this.conexion.on('open', () => {
                        clearTimeout(timeout);
                        alert("¡Conectado exitosamente!");
                        this.configurarEventosConexion();
                        resolve();
                    });

                    this.conexion.on('error', (err) => {
                        clearTimeout(timeout);
                        alert("Error al conectar a la partida.");
                        reject(err);
                    });
                });

                this.peer.on('error', (err) => {
                    alert("No se encontró ninguna sala creada en este momento.");
                    reject(err);
                });
            });
        },

        configurarConexionCliente: function(conn) {
            conn.on('data', (data) => {
                if (typeof window.handleNetworkData === 'function') {
                    window.handleNetworkData(data);
                }
                this.conexionesClientes.forEach(c => {
                    if (c !== conn && c.open) c.send(data);
                });
            });
        },

        configurarEventosConexion: function() {
            if (!this.conexion) return;
            this.conexion.on('data', (data) => {
                if (typeof window.handleNetworkData === 'function') {
                    window.handleNetworkData(data);
                }
            });
        },

        enviarDatos: function(data) {
            if (this.isHost) {
                this.conexionesClientes.forEach(c => {
                    if (c.open) c.send(data);
                });
            } else if (this.conexion && this.conexion.open) {
                this.conexion.send(data);
            }
        }
    };
})();

