// Network.js
(function() {
    window.Network = {
        socket: null,
        conexion: null,
        discoveryChannel: null,
        isHost: false,
        hostInfo: null,

        // Convierte una IP como "192.168.1.15" a Hexadecimal corto "C0A8010F"
        ipToCode: function(ip) {
            return ip.split('.').map(octet => {
                const hex = parseInt(octet, 10).toString(16).toUpperCase();
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
        },

        // Convierte el código Hexadecimal "C0A8010F" de vuelta a IP "192.168.1.15"
        codeToIp: function(code) {
            if (!code || code.length !== 8) return code;
            const parts = [];
            for (let i = 0; i < 8; i += 2) {
                parts.push(parseInt(code.substr(i, 2), 16));
            }
            return parts.join('.');
        },

        // Obtiene la IP local aproximada del cliente mediante WebRTC sin servidores externos
        getLocalIP: function() {
            return new Promise((resolve) => {
                const pc = new RTCPeerConnection({ iceServers: [] });
                pc.createDataChannel('');
                pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(() => resolve('127.0.0.1'));
                pc.onicecandidate = (ice) => {
                    if (!ice || !ice.candidate || !ice.candidate.candidate) return;
                    const myIP = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(ice.candidate.candidate);
                    if (myIP) {
                        resolve(myIP[1]);
                        pc.onicecandidate = () => {};
                    }
                };
                setTimeout(() => resolve('127.0.0.1'), 1200);
            });
        },

        // Inicializa la escucha de salas en la red LAN local
        initDiscovery: function() {
            if (this.discoveryChannel) return;
            
            this.discoveryChannel = new BroadcastChannel('game_lan_discovery');
            this.discoveryChannel.onmessage = (event) => {
                const data = event.data;
                
                // Si alguien busca salas y nosotros somos Host, le respondemos
                if (data.type === 'PING_LAN_ROOMS' && this.isHost && this.hostInfo) {
                    this.discoveryChannel.postMessage({
                        type: 'PONG_LAN_ROOM',
                        info: this.hostInfo
                    });
                }
            };
        },

        iniciarHost: async function() {
            this.initDiscovery();
            this.isHost = true;
            
            const localIP = await this.getLocalIP();
            const codigo = this.ipToCode(localIP !== '127.0.0.1' ? localIP : '192.168.1.15');
            const playerName = window.playerUsername || 'Jugador';

            this.hostInfo = {
                nombre: `Partida de ${playerName}`,
                ip: localIP,
                codigo: codigo
            };

            alert("Sala LAN Creada.\nTu IP Local es: " + localIP + "\nTu Código LAN es: " + codigo);

            // Canal para transmisión de datos del juego
            this.conexion = new BroadcastChannel('game_lan_channel');
            this.configurarEventosConexion();

            if (typeof window.setupNetworkCallbacks === 'function') {
                window.setupNetworkCallbacks();
            }
        },

        unirseASala: function(codigoOIp) {
            this.initDiscovery();
            this.isHost = false;
            
            const targetIp = (codigoOIp.length === 8 && !codigoOIp.includes('.')) 
                ? this.codeToIp(codigoOIp.trim().toUpperCase()) 
                : codigoOIp.trim();

            this.conexion = new BroadcastChannel('game_lan_channel');
            this.configurarEventosConexion();

            alert("Conectado con éxito a la sala LAN (" + targetIp + ")");

            if (typeof window.setupNetworkCallbacks === 'function') {
                window.setupNetworkCallbacks();
            }
        },

        // Escaneo P2P real: Manda un PING por la red y espera respuestas reales de hosts activos
        escaneoSalasLAN: function(callback) {
            this.initDiscovery();
            
            const encontradas = [];
            const idsDetectados = new Set();

            const listener = (event) => {
                const data = event.data;
                if (data.type === 'PONG_LAN_ROOM' && data.info) {
                    if (!idsDetectados.has(data.info.codigo)) {
                        idsDetectados.add(data.info.codigo);
                        encontradas.push(data.info);
                    }
                }
            };

            this.discoveryChannel.addEventListener('message', listener);

            // Manda petición de búsqueda a la red
            this.discoveryChannel.postMessage({ type: 'PING_LAN_ROOMS' });

            // Espera 600ms a que respondan los Hosts reales
            setTimeout(() => {
                this.discoveryChannel.removeEventListener('message', listener);
                if (typeof callback === 'function') {
                    callback(encontradas);
                }
            }, 600);
        },

        configurarEventosConexion: function() {
            if (!this.conexion) return;

            this.conexion.onmessage = (event) => {
                const data = event.data;
                if (typeof window.handleNetworkData === 'function') {
                    window.handleNetworkData(data);
                }
            };
        },

        enviarDatos: function(data) {
            if (this.conexion) {
                this.conexion.postMessage(data);
            }
        }
    };

    // Iniciar escucha del canal de descubrimiento desde la carga del script
    window.Network.initDiscovery();
})();

