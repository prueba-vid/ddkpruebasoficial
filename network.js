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
                self.configurarEventosConexion();
                alert("¡Un rival se ha conectado!");
            });

            this.peer.on('error', (err) => {
                if (err.type === 'unavailable-id') {
                    self.iniciarHost();
                } else {
                    console.error("Error en Peer Host:", err);
                }
            });
        },

        unirseASala: function(codigo) {
            const self = this;
            this.peer = new Peer();

            this.peer.on('open', () => {
                const codLimpio = codigo.trim().toLowerCase();
                self.conexion = self.peer.connect(codLimpio);
                self.configurarEventosConexion();
            });

            this.peer.on('error', (err) => {
                alert("Error al intentar conectar: " + err.type);
            });
        },

        configurarEventosConexion: function() {
            if (!this.conexion) return;

            this.conexion.on('open', () => {
                if (typeof window.setupNetworkCallbacks === 'function') {
                    window.setupNetworkCallbacks();
                }
            });

            this.conexion.on('data', (data) => {
                if (typeof window.handleNetworkData === 'function') {
                    window.handleNetworkData(data);
                }
            });

            this.conexion.on('close', () => {
                alert("El otro jugador se ha desconectado.");
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

