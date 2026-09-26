// menu.js
(function() {
    window.isGameStarted = false;

    let loadedMods = []; 
    let confirmedActiveMods = new Set(); 
    let html5QrCodeScanner = null;

    function hasActiveMods() {
        return confirmedActiveMods.size > 0;
    }

    window.addEventListener('DOMContentLoaded', () => {
        const btnPlay = document.getElementById('btn-play');
        const mainMenu = document.getElementById('main-menu');
        const usernameInput = document.getElementById('usernameInput');
        const usernameError = document.getElementById('usernameError');

        const secretModal = document.getElementById('secretCodeModal');
        const secretCodeInput = document.getElementById('secretCodeInput');
        const secretCodeError = document.getElementById('secretCodeError');
        const btnConfirmCode = document.getElementById('btnConfirmCode');
        const btnCancelCode = document.getElementById('btnCancelCode');

        const menuModsBtn = document.getElementById('menuSkinsBtn') || document.getElementById('menuModsBtn');
        if (menuModsBtn) menuModsBtn.textContent = 'Mods';

        // ==========================================
        // GESTOR DE MODS
        // ==========================================
        const modsModal = document.createElement('div');
        modsModal.id = 'modsModal';
        Object.assign(modsModal.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'none',
            justifyContent: 'center', alignItems: 'center', zIndex: '1000'
        });

        const modsModalContent = document.createElement('div');
        Object.assign(modsModalContent.style, {
            backgroundColor: '#1a1a1a', border: '2px solid #444', borderRadius: '10px',
            padding: '20px', width: '90%', maxWidth: '400px', boxShadow: '0 0 15px rgba(0,0,0,0.8)',
            position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
            color: '#ffffff', fontFamily: 'sans-serif'
        });

        const btnCloseMods = document.createElement('span');
        btnCloseMods.innerHTML = '&times;';
        Object.assign(btnCloseMods.style, {
            position: 'absolute', top: '10px', right: '15px', fontSize: '24px',
            fontWeight: 'bold', color: '#aaa', cursor: 'pointer'
        });

        const title = document.createElement('h2');
        title.textContent = 'Gestor de Mods';
        title.style.margin = '0 0 20px 0';

        const modFileInput = document.createElement('input');
        modFileInput.type = 'file';
        modFileInput.accept = '.ddkmod';
        modFileInput.style.display = 'none';

        const btnSearchMod = document.createElement('button');
        btnSearchMod.textContent = 'Buscar archivo (.ddkmod)';
        Object.assign(btnSearchMod.style, {
            width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff',
            border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
        });

        const btnConfirmMods = document.createElement('button');
        btnConfirmMods.textContent = 'Listo';
        Object.assign(btnConfirmMods.style, {
            width: '100%', padding: '12px', marginTop: '10px', backgroundColor: '#16a34a',
            color: '#fff', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
        });

        const modsList = document.createElement('ul');
        Object.assign(modsList.style, {
            listStyle: 'none', padding: '0', marginTop: '15px', width: '100%',
            maxHeight: '200px', overflowY: 'auto'
        });

        modsModalContent.append(btnCloseMods, title, btnSearchMod, btnConfirmMods, modFileInput, modsList);
        modsModal.appendChild(modsModalContent);
        document.body.appendChild(modsModal);

        function renderModsList() {
            modsList.innerHTML = '';
            if (loadedMods.length === 0) {
                const emptyMsg = document.createElement('li');
                Object.assign(emptyMsg.style, { textAlign: 'center', color: '#888', fontSize: '14px', marginTop: '10px' });
                emptyMsg.textContent = 'No hay mods cargados';
                modsList.appendChild(emptyMsg);
                return;
            }

            loadedMods.forEach((mod, index) => {
                const li = document.createElement('li');
                Object.assign(li.style, {
                    padding: '10px', marginTop: '8px', backgroundColor: '#2a2a2a',
                    border: '1px solid #444', borderRadius: '5px', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between'
                });

                const label = document.createElement('label');
                Object.assign(label.style, { display: 'flex', alignItems: 'center', cursor: 'pointer', width: '100%', wordBreak: 'break-all', fontSize: '14px' });

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = mod.active;
                checkbox.style.marginRight = '10px';
                checkbox.addEventListener('change', (e) => loadedMods[index].active = e.target.checked);

                const textSpan = document.createElement('span');
                textSpan.textContent = `📄 ${mod.name}`;

                label.append(checkbox, textSpan);
                li.appendChild(label);
                modsList.appendChild(li);
            });
        }

        function closeAndRevertMods() {
            loadedMods.forEach(mod => mod.active = confirmedActiveMods.has(mod.name));
            if (window.ModReader) {
                window.ModReader.applyActiveMods(loadedMods.filter(m => m.active));
            }
            modsModal.style.display = 'none';
        }

        if (menuModsBtn) {
            menuModsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                closeAndRevertMods(); 
                renderModsList();
                modsModal.style.display = 'flex';
            });
        }

        btnCloseMods.addEventListener('click', closeAndRevertMods);

        btnConfirmMods.addEventListener('click', () => {
            confirmedActiveMods.clear();
            loadedMods.forEach(mod => {
                if (mod.active) confirmedActiveMods.add(mod.name);
            });
            const activeList = loadedMods.filter(m => m.active);
            window.activeModsList = activeList;
            
            if (window.ModReader) {
                window.ModReader.applyActiveMods(activeList);
            }

            modsModal.style.display = 'none';
        });

        btnSearchMod.addEventListener('click', () => modFileInput.click());

        modFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.name.endsWith('.ddkmod')) {
                    const isDuplicate = loadedMods.some(mod => mod.name === file.name && mod.size === file.size);
                    if (!isDuplicate) {
                        let parsedConfig = { hotbar: { enabled: false, value: 9 } };
                        if (window.ModReader) {
                            try { parsedConfig = await window.ModReader.readModFile(file); } catch (err) {}
                        }
                        loadedMods.push({ name: file.name, size: file.size, active: false, config: parsedConfig });
                        renderModsList();
                    }
                    modFileInput.value = '';
                }
            }
        });

        // ==========================================
        // MULTIJUGADOR SERVERLESS (WEBRTC + QR)
        // ==========================================
        const btnMultiplayerMenu = document.getElementById('btn-multiplayer-menu');
        const multiplayerModal = document.getElementById('multiplayerModal');
        const btnCloseMultiplayer = document.getElementById('btnCloseMultiplayer');

        const p2pPanel = document.getElementById('p2p-panel');
        const p2pStatus = document.getElementById('p2p-status');
        const qrContainer = document.getElementById('qr-container');
        const readerContainer = document.getElementById('reader-container');
        const btnToggleManual = document.getElementById('btn-toggle-manual');
        const manualInputArea = document.getElementById('manual-input-area');
        const p2pTextOut = document.getElementById('p2p-text-out');
        const p2pTextIn = document.getElementById('p2p-text-in');
        const btnSubmitManual = document.getElementById('btn-submit-manual');

        const btnCrear = document.getElementById('btn-crear-partida');
        const btnUnir = document.getElementById('btn-unirse-partida');

        let pendingUsername = "";

        function showError(msg) {
            if (usernameError) {
                usernameError.textContent = msg;
                usernameError.style.display = 'block';
            }
        }

        function hideError() {
            if (usernameError) usernameError.style.display = 'none';
        }

        function validarNombreLocal() {
            hideError();
            const rawName = usernameInput ? usernameInput.value.trim() : "";

            if (!rawName) {
                showError("Escribe un nombre para jugar");
                return null;
            }

            if (window.NameSystem) {
                if (typeof window.NameSystem.isValidFormat === 'function' && !window.NameSystem.isValidFormat(rawName)) {
                    showError("Solo se permiten letras y números");
                    return null;
                }
                if (typeof window.NameSystem.containsBannedWords === 'function' && window.NameSystem.containsBannedWords(rawName)) {
                    showError("Nombre no permitido");
                    return null;
                }
                if (typeof window.NameSystem.isVidMC3Variant === 'function' && window.NameSystem.isVidMC3Variant(rawName)) {
                    showError("Nombre no disponible / reservado");
                    return null;
                }
                if (typeof window.NameSystem.isExactVidMC3 === 'function' && window.NameSystem.isExactVidMC3(rawName)) {
                    pendingUsername = rawName;
                    if (secretCodeInput) secretCodeInput.value = "";
                    if (secretCodeError) secretCodeError.style.display = 'none';
                    if (secretModal) secretModal.style.display = 'flex';
                    return null;
                }
            }

            return rawName;
        }

        function startGame(name) {
            window.playerUsername = name;

            if (window.NameSystem?.registerName) {
                window.NameSystem.registerName(name);
            }

            if (typeof NameTagSystem !== 'undefined' && typeof playerGroup !== 'undefined') {
                NameTagSystem.attachToPlayer(playerGroup, window.playerUsername, 2.2);
            }

            if (mainMenu) mainMenu.style.display = 'none';
            if (multiplayerModal) multiplayerModal.style.display = 'none';
            detenerEscanerCamara();

            window.isGameStarted = true;
            if (typeof window.setupNetworkCallbacks === 'function') {
                window.setupNetworkCallbacks();
            }
        }

        function mostrarQR(texto) {
            qrContainer.innerHTML = "";
            qrContainer.style.display = "block";
            new QRCode(qrContainer, {
                text: texto,
                width: 200,
                height: 200
            });
            p2pTextOut.value = texto;
        }

        function iniciarEscanerCamara(onScanSuccess) {
            readerContainer.style.display = "block";
            html5QrCodeScanner = new Html5Qrcode("reader");
            html5QrCodeScanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: 220 },
                (decodedText) => {
                    detenerEscanerCamara();
                    onScanSuccess(decodedText);
                },
                () => {}
            ).catch(() => {
                p2pStatus.textContent = "Camara no disponible. Usa el método manual.";
                manualInputArea.style.display = "flex";
            });
        }

        function detenerEscanerCamara() {
            if (html5QrCodeScanner) {
                html5QrCodeScanner.stop().then(() => {
                    html5QrCodeScanner.clear();
                    html5QrCodeScanner = null;
                    readerContainer.style.display = "none";
                }).catch(() => {});
            }
        }

        if (btnMultiplayerMenu && multiplayerModal) {
            btnMultiplayerMenu.addEventListener('click', () => {
                if (hasActiveMods()) {
                    alert("El modo multijugador está desactivado porque tienes mods activos.");
                    return;
                }
                multiplayerModal.style.display = 'flex';
                p2pPanel.style.display = 'none';
            });
        }

        if (btnCloseMultiplayer && multiplayerModal) {
            btnCloseMultiplayer.addEventListener('click', () => {
                multiplayerModal.style.display = 'none';
                p2pPanel.style.display = 'none';
                detenerEscanerCamara();
            });
        }

        if (btnToggleManual) {
            btnToggleManual.addEventListener('click', () => {
                const isHidden = manualInputArea.style.display === 'none' || manualInputArea.style.display === '';
                manualInputArea.style.display = isHidden ? 'flex' : 'none';
            });
        }

        // 1. EVENTO CREAR SALA (HOST)
        if (btnCrear) {
            btnCrear.addEventListener('click', () => {
                if (hasActiveMods()) return;
                const nombreValido = validarNombreLocal();
                if (!nombreValido) return;

                p2pPanel.style.display = 'flex';
                p2pStatus.textContent = "1) Generando QR de Sala...";

                window.Network.onConnectedCallback = () => {
                    p2pStatus.textContent = "¡Conectado! Entrando al juego...";
                    setTimeout(() => startGame(nombreValido), 500);
                };

                window.Network.iniciarHost((offerText) => {
                    p2pStatus.textContent = "1) Muestra este QR al Jugador 2:";
                    mostrarQR(offerText);

                    // Una vez que muestra el QR, abre la cámara para recibir la respuesta del cliente
                    iniciarEscanerCamara((answerText) => {
                        p2pStatus.textContent = "Estableciendo conexión P2P...";
                        window.Network.completarConexionHost(answerText).catch(err => {
                            alert(err);
                        });
                    });
                });
            });
        }

        // 2. EVENTO UNIRSE A SALA (CLIENTE)
        if (btnUnir) {
            btnUnir.addEventListener('click', () => {
                if (hasActiveMods()) return;
                const nombreValido = validarNombreLocal();
                if (!nombreValido) return;

                p2pPanel.style.display = 'flex';
                p2pStatus.textContent = "Escanea el QR de la PC (Host)...";
                qrContainer.style.display = "none";

                window.Network.onConnectedCallback = () => {
                    p2pStatus.textContent = "¡Conectado! Entrando al juego...";
                    setTimeout(() => startGame(nombreValido), 500);
                };

                iniciarEscanerCamara((offerText) => {
                    p2pStatus.textContent = "Generando QR de Respuesta...";
                    window.Network.procesarOfertaYResponder(offerText, (answerText) => {
                        p2pStatus.textContent = "Muestra este QR a la pantalla de la PC:";
                        mostrarQR(answerText);
                    }).catch(err => {
                        alert(err);
                    });
                });
            });
        }

        // ENLACE MANUAL RESPALDO
        if (btnSubmitManual) {
            btnSubmitManual.addEventListener('click', () => {
                const inputText = p2pTextIn.value.trim();
                const nombreValido = validarNombreLocal();
                if (!inputText || !nombreValido) return;

                if (window.Network.isHost) {
                    window.Network.completarConexionHost(inputText).catch(err => alert(err));
                } else {
                    window.Network.procesarOfertaYResponder(inputText, (answerText) => {
                        mostrarQR(answerText);
                        p2pStatus.textContent = "Entrega este código de respuesta al Host.";
                    }).catch(err => alert(err));
                }
            });
        }

        if (btnPlay) {
            btnPlay.addEventListener('click', () => {
                const nombreValido = validarNombreLocal();
                if (nombreValido) startGame(nombreValido);
            });
        }

        if (btnConfirmCode) {
            btnConfirmCode.addEventListener('click', () => {
                const code = secretCodeInput ? secretCodeInput.value.trim() : "";
                if (window.NameSystem?.verifySecretCode) {
                    if (window.NameSystem.verifySecretCode(code)) {
                        if (secretModal) secretModal.style.display = 'none';
                        startGame(pendingUsername);
                    } else if (secretCodeError) {
                        secretCodeError.style.display = 'block';
                    }
                }
            });
        }

        if (btnCancelCode) {
            btnCancelCode.addEventListener('click', () => {
                if (secretModal) secretModal.style.display = 'none';
                pendingUsername = "";
            });
        }
    });
})();

