// Network.js
(function() {
    // Configuración con Servidores STUN públicos para atravesar NAT/4G/Móviles
    const PEER_CONFIG = {
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        }
    };

    window.Network = {
        peer: null,
        conexion: null,

        generarCodigo: function() {
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < 5; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        },

        iniciarHost: function() {
            const self = this;
            const codigo = this.generarCodigo();
            this.peer = new Peer(codigo, PEER_CONFIG);

            this.peer.on('open', (id) => { 
                alert("Sala creada. Tu código es: " + id); 
            });

            this.peer.on('connection', (conn) => {
                self.conexion = conn;
                self.configurarEventosConexion();

                self.conexion.on('open', () => {
                    alert("¡Un rival se ha conectado!");
                    if (typeof window.setupNetworkCallbacks === 'function') {
                        window.setupNetworkCallbacks();
                    }
                });
            });

            this.peer.on('error', (err) => {
                if (err.type === 'unavailable-id') {
                    self.iniciarHost();
                } else {
                    console.error("Error Peer Host:", err);
                }
            });
        },

        unirseASala: function(codigo) {
            const self = this;
            this.peer = new Peer(PEER_CONFIG);

            this.peer.on('open', () => {
                const codLimpio = codigo.trim().toLowerCase();
                self.conexion = self.peer.connect(codLimpio, { reliable: true });

                self.configurarEventosConexion();

                self.conexion.on('open', () => {
                    alert("¡Conectado con éxito a la sala!");
                    if (typeof window.setupNetworkCallbacks === 'function') {
                        window.setupNetworkCallbacks();
                    }
                });
            });

            this.peer.on('error', (err) => {
                alert("Error al conectar: " + err.type);
            });
        },

        configurarEventosConexion: function() {
            if (!this.conexion) return;

            this.conexion.on('data', (data) => {
                if (typeof window.handleNetworkData === 'function') {
                    window.handleNetworkData(data);
                }
            });

            this.conexion.on('close', () => {
                alert("El rival se ha desconectado.");
                if (window.RemotePlayers && window.RemotePlayers['rival']) {
                    if (window.scene) window.scene.remove(window.RemotePlayers['rival']);
                    delete window.RemotePlayers['rival'];
                }
            });
        },

        enviarDatos: function(data) {
            if (this.conexion && this.conexion.open) {
                this.conexion.send(data);
            }
        }
    };
})();

