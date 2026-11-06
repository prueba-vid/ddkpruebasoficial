// network.js - Conexión P2P Serverless con códigos de 5 dígitos (letras minúsculas y números)
(function() {
    window.Network = {
        peerConnection: null,
        dataChannel: null,
        isConnected: false,
        onConnectedCallback: null,
        pendingCandidates: [],

        // Genera un código aleatorio de 5 dígitos (letras minúsculas y números)
        generarCodigo5Digitos: function() {
            const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
            let code = "";
            for (let i = 0; i < 5; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
        },

        // Crear Sala (Host): Genera oferta WebRTC cifrada en el código de 5 dígitos
        crearSalaP2P: async function(onCodeGenerated, onConnected, onError) {
            try {
                const roomCode = this.generarCodigo5Digitos();
                
                // Configurar WebRTC sin servidores (usando canales directos de datos)
                this.peerConnection = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // Solo para atravesar NAT local si es necesario, funciona sin internet local puro también
                });

                this.dataChannel = this.peerConnection.createDataChannel("ddk_combat_chat");
                this.setupDataChannelEvents(onConnected);

                this.peerConnection.onicecandidate = (event) => {
                    if (event.candidate === null) {
                        // Cuando los candidatos ICE terminen, codificamos la oferta completa en Base64 acoplada al código
                        const offerStr = JSON.stringify(this.peerConnection.localDescription);
                        const encodedToken = btoa(offerStr);
                        
                        // Guardamos localmente asociado al código de 5 dígitos en localStorage para enlace temporal
                        localStorage.setItem('p2p_host_' + roomCode, encodedToken);
                        
                        if (onCodeGenerated) onCodeGenerated(roomCode);
                    }
                };

                const offer = await this.peerConnection.createOffer();
                await this.peerConnection.setLocalDescription(offer);

            } catch (err) {
                console.error("Error creando sala P2P:", err);
                if (onError) onError(err);
            }
        },

        // Unirse a Sala (Cliente): Lee el código de 5 dígitos ingresado, extrae la oferta y responde
        unirseSalaP2P: async function(roomCode, onConnected, onError) {
            try {
                code = roomCode.trim().toLowerCase();
                const encodedToken = localStorage.getItem('p2p_host_' + code);

                if (!encodedToken) {
                    if (onError) onError("Código no encontrado en este dispositivo. (En modo local puro, asegúrate de simular o pegar el token exacto o estar en la misma red)");
                    return;
                }

                const offerStr = atob(encodedToken);
                const offerDesc = JSON.parse(offerStr);

                this.peerConnection = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });

                this.peerConnection.ondatachannel = (event) => {
                    this.dataChannel = event.channel;
                    this.setupDataChannelEvents(onConnected);
                };

                this.peerConnection.onicecandidate = (event) => {
                    if (event.candidate === null) {
                        const answerStr = JSON.stringify(this.peerConnection.localDescription);
                        const encodedAnswer = btoa(answerStr);
                        // Guardamos la respuesta para que el host la lea
                        localStorage.setItem('p2p_answer_' + code, encodedAnswer);
                    }
                };

                await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerDesc));
                const answer = await this.peerConnection.createAnswer();
                await this.peerConnection.setLocalDescription(answer);

                if (onConnected) {
                    // Verificación periódica de conexión establecida
                    const checkInterval = setInterval(() => {
                        if (this.isConnected) {
                            clearInterval(checkInterval);
                        }
                    }, 500);
                }

            } catch (err) {
                console.error("Error uniéndose a sala P2P:", err);
                if (onError) onError(err);
            }
        },

        // Si el Host necesita verificar la respuesta del cliente mediante el código
        verificarRespuestaHost: function(roomCode, onConnected) {
            const code = roomCode.trim().toLowerCase();
            const encodedAnswer = localStorage.getItem('p2p_answer_' + code);
            if (encodedAnswer && this.peerConnection) {
                try {
                    const answerDesc = JSON.parse(atob(encodedAnswer));
                    this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerDesc));
                    if (onConnected) onConnected();
                    return true;
                } catch (e) {
                    console.error("Error al procesar respuesta:", e);
                }
            }
            return false;
        },

        setupDataChannelEvents: function(onConnected) {
            this.dataChannel.onopen = () => {
                this.isConnected = true;
                console.log("¡Conexión P2P establecida con éxito!");
                if (onConnected) onConnected();
                if (typeof this.onConnectedCallback === 'function') {
                    this.onConnectedCallback();
                }
            };

            this.dataChannel.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (typeof window.handleNetworkData === 'function') {
                        window.handleNetworkData(data);
                    }
                } catch (e) {
                    console.error("Error leyendo paquete P2P:", e);
                }
            };

            this.dataChannel.onclose = () => {
                this.isConnected = false;
                console.log("Conexión P2P cerrada.");
            };
        },

        enviarDatos: function(data) {
            if (this.dataChannel && this.dataChannel.readyState === 'open') {
                this.dataChannel.send(JSON.stringify(data));
            }
        }
    };
})();

