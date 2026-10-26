// menu.js
(function() {
    window.isGameStarted = false;

    let loadedMods = []; 
    let confirmedActiveMods = new Set(); 

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
        // MULTIJUGADOR POR IP Y PUERTO
        // ==========================================
        const btnMultiplayerMenu = document.getElementById('btn-multiplayer-menu');
        const multiplayerModal = document.getElementById('multiplayerModal');
        const btnCloseMultiplayer = document.getElementById('btnCloseMultiplayer');

        // Contenedor principal dentro del modal de multijugador
        const multiplayerContent = multiplayerModal ? multiplayerModal.querySelector('div') : null;

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

            window.isGameStarted = true;
            if (typeof window.setupNetworkCallbacks === 'function') {
                window.setupNetworkCallbacks();
            }
        }

        // Modificar contenido del Modal Multijugador para colocar el botón "Buscar server"
        if (multiplayerModal && multiplayerContent) {
            // Limpiar elementos anteriores (Host/Cliente/QR)
            multiplayerContent.innerHTML = '';
            
            const btnCloseCustom = document.createElement('span');
            btnCloseCustom.innerHTML = '&times;';
            Object.assign(btnCloseCustom.style, {
                position: 'absolute', top: '10px', right: '15px', fontSize: '24px',
                fontWeight: 'bold', color: '#aaa', cursor: 'pointer'
            });
            btnCloseCustom.addEventListener('click', () => {
                multiplayerModal.style.display = 'none';
            });

            const mpTitle = document.createElement('h2');
            mpTitle.textContent = 'Multijugador';
            mpTitle.style.margin = '0 0 20px 0';
            mpTitle.style.color = '#ffffff';

            const btnSearchServer = document.createElement('button');
            btnSearchServer.textContent = 'Buscar server';
            Object.assign(btnSearchServer.style, {
                width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff',
                border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
            });

            multiplayerContent.style.position = 'relative';
            multiplayerContent.append(btnCloseCustom, mpTitle, btnSearchServer);

            // Submenú / Panel flotante para IP y Puerto
            const serverPanel = document.createElement('div');
            Object.assign(serverPanel.style, {
                display: 'none', flexDirection: 'column', width: '100%', marginTop: '15px', gap: '10px'
            });

            const ipInput = document.createElement('input');
            ipInput.type = 'text';
            ipInput.placeholder = 'IP del Servidor (ej. 127.0.0.1)';
            Object.assign(ipInput.style, { padding: '10px', borderRadius: '5px', border: '1px solid #444', backgroundColor: '#2a2a2a', color: '#fff' });

            const portInput = document.createElement('input');
            portInput.type = 'text';
            portInput.placeholder = 'Puerto (ej. 8080)';
            Object.assign(portInput.style, { padding: '10px', borderRadius: '5px', border: '1px solid #444', backgroundColor: '#2a2a2a', color: '#fff' });

            const btnConnectServer = document.createElement('button');
            btnConnectServer.textContent = 'Conectar';
            Object.assign(btnConnectServer.style, {
                padding: '10px', backgroundColor: '#16a34a', color: '#fff',
                border: 'none', borderRadius: '5px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer'
            });

            const statusText = document.createElement('div');
            statusText.style.fontSize = '13px';
            statusText.style.color = '#aaa';
            statusText.style.textAlign = 'center';

            serverPanel.append(ipInput, portInput, btnConnectServer, statusText);
            multiplayerContent.appendChild(serverPanel);

            btnSearchServer.addEventListener('click', () => {
                const isHidden = serverPanel.style.display === 'none';
                serverPanel.style.display = isHidden ? 'flex' : 'none';
            });

            btnConnectServer.addEventListener('click', () => {
                if (hasActiveMods()) return;
                const nombreValido = validarNombreLocal();
                if (!nombreValido) return;

                const ip = ipInput.value.trim();
                const port = portInput.value.trim();

                if (!ip || !port) {
                    statusText.textContent = "Por favor ingresa la IP y el Puerto.";
                    statusText.style.color = '#ef4444';
                    return;
                }

                statusText.textContent = "Conectando al servidor...";
                statusText.style.color = '#eab308';

                window.Network.conectarAServidor(ip, port, () => {
                    statusText.textContent = "¡Conectado! Entrando...";
                    statusText.style.color = '#22c55e';
                    setTimeout(() => startGame(nombreValido), 500);
                }, (err) => {
                    statusText.textContent = "Error de conexión: " + err;
                    statusText.style.color = '#ef4444';
                });
            });
        }

        if (btnMultiplayerMenu && multiplayerModal) {
            btnMultiplayerMenu.addEventListener('click', () => {
                if (hasActiveMods()) {
                    alert("El modo multijugador está desactivado porque tienes mods activos.");
                    return;
                }
                multiplayerModal.style.display = 'flex';
            });
        }

        if (btnCloseMultiplayer && multiplayerModal) {
            btnCloseMultiplayer.addEventListener('click', () => {
                multiplayerModal.style.display = 'none';
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

