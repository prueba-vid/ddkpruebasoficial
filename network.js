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
            const codigo = this.generarCodigo();
            this.peer = new Peer(codigo);
            this.peer.on('open', (id) => { 
                alert("Sala creada. Tu código es: " + id); 
            });
            this.peer.on('connection', (conn) => {
                this.conexion = conn;
                alert("¡Un rival se ha conectado!");
            });
            this.peer.on('error', (err) => {
                if (err.type === 'unavailable-id') {
                    this.iniciarHost();
                }
            });
        },

        unirseASala: function(codigo) {
            this.peer = new Peer();
            const codLimpio = codigo.trim().toLowerCase();
            this.conexion = this.peer.connect(codLimpio);
            this.conexion.on('open', () => { 
                alert("¡Conectado exitosamente al anfitrión!"); 
            });
            this.conexion.on('error', (err) => {
                alert("Error al conectar. Revisa el código.");
            });
        }
    };
})();
