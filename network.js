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
                    // Reintenta generar otro código si colisiona
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
                alert("Conexión establecida con éxito.");
            });

            this.conexion.on('data', (data) => {
                console.log("Datos recibidos:", data);
                // Aquí procesas lo que te mande el otro jugador
            });

            this.conexion.on('close', () => {
                alert("El otro jugador se ha desconectado.");
            });
        },

        enviarDatos: function(data) {
            if (this.conexion && this.conexion.open) {
                this.conexion.send(data);
            } else {
                console.warn("No hay una conexión activa para enviar datos.");
            }
        }
    };
})();

