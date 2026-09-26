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
        // CREACIÓN DEL MODAL DE MODS
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
        btnCloseMods.addEventListener('mouseover', () => btnCloseMods.style.color = '#fff');
        btnCloseMods.addEventListener('mouseout', () => btnCloseMods.style.color = '#aaa');

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
                    if (isDuplicate) {
                        alert(`El archivo "${file.name}" ya ha sido cargado.`);
                    } else {
                        let parsedConfig = { hotbar: { enabled: false, value: 9 } };
                        if (window.ModReader) {
                            try {
                                parsedConfig = await window.ModReader.readModFile(file);
                            } catch (err) {
                                console.error("Error al leer el archivo .ddkmod", err);
                            }
                        }
                        loadedMods.push({ 
                            name: file.name, 
                            size: file.size, 
                            active: false,
                            config: parsedConfig 
                        });
                        renderModsList();
                    }
                    modFileInput.value = '';
                } else {
                    alert("Por favor, selecciona un archivo válido con extensión .ddkmod");
                }
            }
        });

        // ==========================================
        // MULTIJUGADOR Y LÓGICA DE LISTA DE SALAS
        // ==========================================
        const btnMultiplayerMenu = document.getElementById('btn-multiplayer-menu');
        const multiplayerModal = document.getElementById('multiplayerModal');
        const btnCloseMultiplayer = document.getElementById('btnCloseMultiplayer');
        const btnRoomMode = document.getElementById('btn-room-mode');
        const btnPublicServer = document.getElementById('btn-public-server');

        const multiplayerUI = document.getElementById('multiplayer-ui');
        const btnCrear = document.getElementById('btn-crear-partida');
        const btnUnir = document.getElementById('btn-unirse-partida');
        const inputCodigo = document.getElementById('input-codigo');

        // Construir Lista Dinámica de Salas
        const lanListContainer = document.createElement('div');
        lanListContainer.id = 'lan-list-container';
        Object.assign(lanListContainer.style, {
            width: '100%',
            maxHeight: '180px',
            overflowY: 'auto',
            backgroundColor: '#111116',
            border: '1px solid #333',
            borderRadius: '6px',
            marginTop: '10px',
            padding: '8px'
        });

        const btnRefreshLan = document.createElement('button');
        btnRefreshLan.textContent = '🔄 Buscar Salas Activas';
        Object.assign(btnRefreshLan.style, {
            width: '100%',
            padding: '8px',
            marginTop: '8px',
            backgroundColor: '#333344',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px'
        });
        btnRefreshLan.addEventListener('click', cargarSalasLAN);

        if (multiplayerUI) {
            multiplayerUI.appendChild(btnRefreshLan);
            multiplayerUI.appendChild(lanListContainer);
        }

        function cargarSalasLAN() {
            lanListContainer.innerHTML = '<div style="color:#aaa; text-align:center; font-size:13px; padding: 10px;">Buscando salas disponibles...</div>';
            
            if (window.Network && window.Network.escaneoSalasLAN) {
                window.Network.escaneoSalasLAN((salas) => {
                    lanListContainer.innerHTML = '';
                    if (!salas || salas.length === 0) {
                        lanListContainer.innerHTML = '<div style="color:#888; text-align:center; font-size:13px; padding: 10px;">No se encontraron salas activas</div>';
                        return;
                    }

                    salas.forEach(sala => {
                        const item = document.createElement('div');
                        Object.assign(item.style, {
                            padding: '8px',
                            marginBottom: '6px',
                            backgroundColor: '#22222d',
                            borderRadius: '4px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        });

                        item.innerHTML = `
                            <div>
                                <strong style="color:#fff; display:block; font-size:14px;">${sala.nombre}</strong>
                                <small style="color:#aaa;">Código: ${sala.codigo}</small>
                            </div>
                            <button style="padding: 6px 12px; background: #2563eb; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Unirse</button>
                        `;

                        item.querySelector('button').addEventListener('click', () => {
                            if (inputCodigo) inputCodigo.value = sala.codigo;
                            const nombreValido = validarNombreLocal();
                            if (nombreValido && window.Network) {
                                window.Network.unirseASala(sala.codigo).then(() => {
                                    startGame(nombreValido);
                                });
                            }
                        });

                        lanListContainer.appendChild(item);
                    });
                });
            }
        }

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
                if (typeof window.NameSystem.isDuplicate === 'function' && window.NameSystem.isDuplicate(rawName)) {
                    showError("Ese nombre ya está en uso");
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

            if (typeof window.updateNameTagsVisibility === 'function') {
                window.updateNameTagsVisibility();
            }

            if (mainMenu) mainMenu.style.display = 'none';
            if (multiplayerModal) multiplayerModal.style.display = 'none';
            modsModal.style.display = 'none';
            
            window.isGameStarted = true;
        }

        if (btnPlay) {
            btnPlay.addEventListener('click', () => {
                const nombreValido = validarNombreLocal();
                if (nombreValido) startGame(nombreValido);
            });
        }

        if (btnMultiplayerMenu && multiplayerModal) {
            btnMultiplayerMenu.addEventListener('click', () => {
                if (hasActiveMods()) {
                    alert("El modo multijugador está desactivado porque tienes mods activos. Desactívalos para jugar en línea.");
                    return;
                }
                multiplayerModal.style.display = 'flex';
            });
        }

        if (btnCloseMultiplayer && multiplayerModal) {
            btnCloseMultiplayer.addEventListener('click', () => {
                multiplayerModal.style.display = 'none';
                if (multiplayerUI) multiplayerUI.style.display = 'none';
            });
        }

        if (btnRoomMode && multiplayerUI) {
            btnRoomMode.addEventListener('click', () => {
                if (hasActiveMods()) {
                    alert("El modo multijugador está desactivado mientras uses mods.");
                    return;
                }
                const isVisible = multiplayerUI.style.display === 'flex';
                multiplayerUI.style.display = isVisible ? 'none' : 'flex';
                if (!isVisible) {
                    cargarSalasLAN();
                }
            });
        }

        if (btnPublicServer) {
            btnPublicServer.addEventListener('click', () => {
                if (hasActiveMods()) {
                    alert("El modo multijugador está desactivado mientras uses mods.");
                    return;
                }
                if (btnRoomMode) btnRoomMode.click();
            });
        }

        if (btnCrear) {
            btnCrear.addEventListener('click', () => {
                if (hasActiveMods()) {
                    alert("No puedes crear una partida multijugador con mods activos.");
                    return;
                }
                const nombreValido = validarNombreLocal();
                if (nombreValido) {
                    if (window.Network) {
                        window.Network.iniciarHost().then((codigo) => {
                            startGame(nombreValido);
                        });
                    } else {
                        alert("Error: El sistema de red no está cargado.");
                    }
                }
            });
        }

        if (btnUnir) {
            btnUnir.addEventListener('click', () => {
                if (hasActiveMods()) {
                    alert("No puedes unirte a una partida multijugador con mods activos.");
                    return;
                }
                const codigo = inputCodigo ? inputCodigo.value.trim().toUpperCase() : "";
                if (!codigo) {
                    showError("Ingresa el código de 5 caracteres");
                    return;
                }

                const nombreValido = validarNombreLocal();
                if (nombreValido) {
                    if (window.Network) {
                        window.Network.unirseASala(codigo).then(() => {
                            startGame(nombreValido);
                        });
                    } else {
                        alert("Error: El sistema de red no está cargado.");
                    }
                }
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
