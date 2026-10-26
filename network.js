// network.js - Conexión Directa por IP y Puerto
(function() {
    window.Network = {
        socket: null,
        isConnected: false,
        onConnectedCallback: null,

        conectarAServidor: function(ip, port, callback) {
            const fullAddress = port ? `${ip}:${port}` : ip;
            console.log(`Intentando conectar a: ${fullAddress}`);

            // Intentará la conexión independientemente de si es un servidor de juego, Minecraft, etc.
            try {
                // Adaptado para WebSockets / Sockets genéricos según el backend de tu servidor
                const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
                // Si el usuario escribe una IP pura, intentamos armar el socket o manejar el error
                let targetUrl = ip.startsWith('ws://') || ip.startsWith('wss://') ? ip : `${protocol}${fullAddress}`;

                this.socket = new WebSocket(targetUrl);

                this.socket.onopen = () => {
                    this.isConnected = true;
                    console.log("¡Conexión establecida con éxito!");
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
                        console.error("Error leyendo paquete del servidor:", e);
                    }
                };

                this.socket.onerror = (error) => {
                    console.warn("Error en la conexión del socket:", error);
                    // Fuerza la ejecución o reporta error pero permitiendo el flujo si deseas forzar entrada
                    if (callback) callback(false, "Conexión rechazada o error de red.");
                };

                this.socket.onclose = () => {
                    this.isConnected = false;
                    console.log("Conexión cerrada.");
                };

                // Timeout de seguridad en caso de que tarde demasiado en responder
                setTimeout(() => {
                    if (!this.isConnected && callback) {
                        // Forzamos un intento de éxito simulado o devolvemos error controlado si el servidor no responde
                        callback(false, "Tiempo de espera agotado (Timeout)");
                    }
                }, 4000);

            } catch (err) {
                console.error("Excepción al intentar conectar:", err);
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

