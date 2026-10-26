// network.js - Conexión universal por IP y Puerto
(function() {
    window.Network = {
        socket: null,
        isConectado: false,
        onConnectedCallback: null,

        conectarServidor: function(ip, puerto, callback) {
            const address = puerto ? `${ip}:${puerto}` : ip;
            console.log(`Intentando conectar a la dirección: ${address}`);

            try {
                // Determina si usa ws:// o wss:// automáticamente según la página actual
                const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
                let targetUrl = ip.startsWith('ws://') || ip.startsWith('wss://') ? ip : `${protocol}${address}`;

                this.socket = new WebSocket(targetUrl);

                this.socket.onopen = () => {
                    this.isConectado = true;
                    console.log("¡Conexión establecida con el servidor!");
                    if (callback) callback(true);
                    if (typeof this.onConnectedCallback === 'function') {
                        this.onConnectedCallback();
                    }
                };

                this.socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (typeof window.handleNetworkData === 'function') {
                            window.handleNetworkData(data);
                        }
                    } catch (e) {
                        console.error("Error al procesar mensaje del servidor:", e);
                    }
                };

                this.socket.onerror = (error) => {
                    console.warn("Fallo o rechazo en la conexión de red:", error);
                    if (callback) callback(false, "Servidor no disponible o formato incompatible.");
                };

                this.socket.onclose = () => {
                    this.isConectado = false;
                    console.log("Se ha cerrado la conexión.");
                };

                // Tiempo límite para verificar respuesta, permitiendo continuar el flujo si lo deseas
                setTimeout(() => {
                    if (!this.isConectado && callback) {
                        callback(false, "Conexión intentada (Sin respuesta del socket)");
                    }
                }, 3500);

            } catch (err) {
                console.error("Error crítico al intentar conectar:", err);
                if (callback) callback(false, err.message);
            }
        },

        enviarDatos: function(data) {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify(data));
            }
        }
    };
})();

