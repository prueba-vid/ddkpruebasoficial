// network.js - WebRTC Serverless P2P Directo (0% Servidores Externeos)
(function() {
    window.Network = {
        pc: null,
        dataChannel: null,
        isHost: false,
        onConnectedCallback: null,

        // Configuración 100% Local (sin usar servidores STUN si estamos en la misma LAN)
        rtcConfig: {
            iceServers: []
        },

        // 1. EL HOST CREA LA SALA Y GENERA SU OFERTA SDP
        iniciarHost: function(onSignalGenerated) {
            return new Promise((resolve) => {
                this.isHost = true;
                this.crearPeerConnection();

                this.dataChannel = this.pc.createDataChannel("gameChannel");
                this.configurarDataChannel(this.dataChannel);

                this.pc.createOffer().then(offer => {
                    return this.pc.setLocalDescription(offer);
                }).then(() => {
                    // Espera a recolectar todas las rutas de la red local (ICE Candidates)
                    this.esperarICEComplete().then(() => {
                        const offerPayload = JSON.stringify(this.pc.localDescription);
                        if (onSignalGenerated) onSignalGenerated(offerPayload);
                        resolve(offerPayload);
                    });
                });
            });
        },

        // 2. EL CLIENTE ESCANEA LA OFERTA Y GENERA SU RESPUESTA SDP
        procesarOfertaYResponder: function(offerText, onSignalGenerated) {
            return new Promise((resolve, reject) => {
                this.isHost = false;
                this.crearPeerConnection();

                this.pc.ondatachannel = (event) => {
                    this.dataChannel = event.channel;
                    this.configurarDataChannel(this.dataChannel);
                };

                try {
                    const offer = JSON.parse(offerText);
                    this.pc.setRemoteDescription(new RTCSessionDescription(offer))
                        .then(() => this.pc.createAnswer())
                        .then(answer => this.pc.setLocalDescription(answer))
                        .then(() => this.esperarICEComplete())
                        .then(() => {
                            const answerPayload = JSON.stringify(this.pc.localDescription);
                            if (onSignalGenerated) onSignalGenerated(answerPayload);
                            resolve(answerPayload);
                        })
                        .catch(err => reject("Error al procesar la oferta: " + err));
                } catch (e) {
                    reject("El formato del código es inválido.");
                }
            });
        },

        // 3. EL HOST ESCANEA LA RESPUESTA DEL CLIENTE Y CIERRA EL ENLACE
        completarConexionHost: function(answerText) {
            return new Promise((resolve, reject) => {
                try {
                    const answer = JSON.parse(answerText);
                    this.pc.setRemoteDescription(new RTCSessionDescription(answer))
                        .then(() => resolve())
                        .catch(err => reject("Error confirmando enlace: " + err));
                } catch (e) {
                    reject("Respuesta SDP no válida.");
                }
            });
        },

        crearPeerConnection: function() {
            if (this.pc) this.pc.close();
            this.pc = new RTCPeerConnection(this.rtcConfig);

            this.pc.oniceconnectionstatechange = () => {
                console.log("P2P State:", this.pc.iceConnectionState);
                if (this.pc.iceConnectionState === 'connected' || this.pc.iceConnectionState === 'completed') {
                    if (typeof this.onConnectedCallback === 'function') {
                        this.onConnectedCallback();
                    }
                }
            };
        },

        esperarICEComplete: function() {
            return new Promise((resolve) => {
                if (this.pc.iceGatheringState === 'complete') {
                    resolve();
                } else {
                    const checkState = () => {
                        if (this.pc.iceGatheringState === 'complete') {
                            this.pc.removeEventListener('icegatheringstatechange', checkState);
                            resolve();
                        }
                    };
                    this.pc.addEventListener('icegatheringstatechange', checkState);
                    // Timeout de seguridad en caso de que la interfaz de red no cierre
                    setTimeout(resolve, 1500);
                }
            });
        },

        configurarDataChannel: function(channel) {
            channel.onopen = () => {
                console.log("¡Canal P2P Abierto Exitosamente!");
                if (typeof this.onConnectedCallback === 'function') {
                    this.onConnectedCallback();
                }
            };

            channel.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (typeof window.handleNetworkData === 'function') {
                        window.handleNetworkData(data);
                    }
                } catch (e) {
                    console.error("Error leyendo paquete:", e);
                }
            };
        },

        enviarDatos: function(data) {
            if (this.dataChannel && this.dataChannel.readyState === 'open') {
                this.dataChannel.send(JSON.stringify(data));
            }
        }
    };
})();

