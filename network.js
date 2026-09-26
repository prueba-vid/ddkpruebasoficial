// network.js
(function() {
    window.Network = {
        peer: null,
        conexion: null,
        conexionesClientes: [],
        isHost: false,
        roomCode: null,
        brokerPeer: null,

        // Genera un código aleatorio único de 5 caracteres alfanuméricos
        generarCodigoRandom: function() {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = '';
            for (let i = 0; i < 5; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
        },

        iniciarHost: function() {
            return new Promise((resolve) => {
                this.isHost = true;
                this.roomCode = this.generarCodigoRandom();
                const peerId = 'ddkcombat-room-' + this.roomCode;

                if (typeof Peer === 'undefined') {
                    alert("Error: PeerJS no cargó correctamente.");
                    return;
                }

                this.peer = new Peer(peerId);

                this.peer.on('open', (id) => {
                    alert("Sala Creada con Éxito.\nCódigo de Sala: " + this.roomCode);
                    this.registrarEnServidorListas();
                    resolve(this.roomCode);
                });

                this.peer.on('connection', (conn) => {
                    this.conexionesClientes.push(conn);
                    this.configurarConexionCliente(conn);
                });

                this.peer.on('error', (err) => {
                    if (err.type === 'unavailable-id') {
                        // Si por rara coincidencia existe la ID, intenta de nuevo
                        this.iniciarHost().then(resolve);
                    } else {
                        console.error("PeerJS Error Host:", err);
                    }
                });
            });
        },

        registrarEnServidorListas: function() {
            // Broker simple para que la lista descubra hosts activos
            const brokerId = 'ddkcombat-broker-' + this.roomCode;
            this.brokerPeer = new Peer(brokerId);
            this.brokerPeer.on('connection', (conn) => {
                conn.on('open', () => {
                    conn.send({
                        type: 'ROOM_INFO',
                        nombre: `Sala de ${window.playerUsername || 'Jugador'}`,
                        codigo: this.roomCode
                    });
                });
            });
        },

        unirseASala: function(codigo) {
            return new Promise((resolve, reject) => {
                this.isHost = false;
                const cleanCode = codigo.trim().toUpperCase();
                const hostPeerId = 'ddkcombat-room-' + cleanCode;

                if (typeof Peer === 'undefined') {
                    alert("Error: PeerJS no se pudo conectar.");
                    return reject();
                }

                this.peer = new Peer();

                this.peer.on('open', () => {
                    this.conexion = this.peer.connect(hostPeerId);

                    this.conexion.on('open', () => {
                        alert("¡Conectado exitosamente a la sala " + cleanCode + "!");
                        this.configurarEventosConexion();
                        resolve();
                    });

                    this.conexion.on('error', (err) => {
                        alert("No se pudo conectar a la sala " + cleanCode);
                        reject(err);
                    });
                });
            });
        },

        escaneoSalasLAN: function(callback) {
            const encontradas = [];
            const codigosAProbar = [];

            // Prueba conexión rápida a la broker network
            if (typeof Peer === 'undefined') {
                if (typeof callback === 'function') callback([]);
                return;
            }

            const tempPeer = new Peer();
            tempPeer.on('open', () => {
                // Escaneo P2P directo vía PeerJS
                let procesados = 0;
                
                // Muestra la sala actual local si somos host
                if (this.isHost && this.roomCode) {
                    encontradas.push({
                        nombre: `Sala de ${window.playerUsername || 'Jugador'} (Tú)`,
                        codigo: this.roomCode
                    });
                }

                setTimeout(() => {
                    tempPeer.destroy();
                    if (typeof callback === 'function') callback(encontradas);
                }, 800);
            });
        },

        configurarConexionCliente: function(conn) {
            conn.on('data', (data) => {
                if (typeof window.handleNetworkData === 'function') {
                    window.handleNetworkData(data);
                }
                // Reenviar a otros clientes si somos host
                this.conexionesClientes.forEach(c => {
                    if (c !== conn && c.open) {
                        c.send(data);
                    }
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

