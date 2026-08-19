(function() {
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
            this.peer = new Peer(codigo);

            this.peer.on('open', (id) => { 
                alert("Sala creada. Tu código es: " + id); 
            });

            this.peer.on('connection', (conn) => {
                self.conexion = conn;
                
                // ESPERAR A QUE LA CONEXIÓN ESTÉ LISTA PARA TRANSMITIR
                self.conexion.on('open', () => {
                    alert("¡Un rival se ha conectado!");
                    if (typeof window.setupNetworkCallbacks === 'function') {
                        window.setupNetworkCallbacks();
                    }
                });

                self.configurarEventosConexion();
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
            this.peer = new Peer();

            this.peer.on('open', () => {
                const codLimpio = codigo.trim().toLowerCase();
                self.conexion = self.peer.connect(codLimpio);

                self.conexion.on('open', () => {
                    alert("¡Conectado con éxito a la sala!");
                    if (typeof window.setupNetworkCallbacks === 'function') {
                        window.setupNetworkCallbacks();
                    }
                });

                self.configurarEventosConexion();
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

