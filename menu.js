(function() {
    window.isGameStarted = false;

    // Estado de mods cargados y activos
    let loadedMods = []; // { name: string, active: boolean, size: number }
    let confirmedActiveMods = new Set(); // Guardará los nombres de los mods aceptados

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

        // Buscar el botón de mods
        const menuModsBtn = document.getElementById('menuSkinsBtn') || document.getElementById('menuModsBtn');
        if (menuModsBtn) {
            menuModsBtn.textContent = 'Mods';
        }

        // ==========================================
        // CREACIÓN Y ESTILOS DEL MODAL DE MODS
        // ==========================================
        let modsModal = document.getElementById('modsModal');
        let btnCloseMods = document.getElementById('btnCloseMods');
        let btnSearchMod = document.getElementById('btnSearchMod');
        let btnConfirmMods = document.getElementById('btnConfirmMods');
        let modFileInput = document.getElementById('modFileInput');
        let modsList = document.getElementById('modsList');

        if (!modsModal) {
            // Fondo oscuro (Overlayer)
            modsModal = document.createElement('div');
            modsModal.id = 'modsModal';
            modsModal.style.position = 'fixed';
            modsModal.style.top = '0';
            modsModal.style.left = '0';
            modsModal.style.width = '100%';
            modsModal.style.height = '100%';
            modsModal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            modsModal.style.display = 'none';
            modsModal.style.justifyContent = 'center';
            modsModal.style.alignItems = 'center';
            modsModal.style.zIndex = '1000';

            // Contenedor principal del modal (Card)
            const modsModalContent = document.createElement('div');
            modsModalContent.style.backgroundColor = '#1a1a1a';
            modsModalContent.style.border = '2px solid #444';
            modsModalContent.style.borderRadius = '10px';
            modsModalContent.style.padding = '20px';
            modsModalContent.style.width = '90%';
            modsModalContent.style.maxWidth = '400px';
            modsModalContent.style.boxShadow = '0 0 15px rgba(0,0,0,0.8)';
            modsModalContent.style.position = 'relative';
            modsModalContent.style.display = 'flex';
            modsModalContent.style.flexDirection = 'column';
            modsModalContent.style.alignItems = 'center';
            modsModalContent.style.color = '#ffffff';
            modsModalContent.style.fontFamily = 'sans-serif';

            // Botón de cerrar (X)
            btnCloseMods = document.createElement('span');
            btnCloseMods.id = 'btnCloseMods';
            btnCloseMods.innerHTML = '&times;';
            btnCloseMods.style.position = 'absolute';
            btnCloseMods.style.top = '10px';
            btnCloseMods.style.right = '15px';
            btnCloseMods.style.fontSize = '24px';
            btnCloseMods.style.fontWeight = 'bold';
            btnCloseMods.style.color = '#aaa';
            btnCloseMods.style.cursor = 'pointer';

            btnCloseMods.addEventListener('mouseover', () => btnCloseMods.style.color = '#fff');
            btnCloseMods.addEventListener('mouseout', () => btnCloseMods.style.color = '#aaa');

            // Título
            const title = document.createElement('h2');
            title.textContent = 'Gestor de Mods';
            title.style.marginTop = '0';
            title.style.marginBottom = '20px';

            // Input File (oculto)
            modFileInput = document.createElement('input');
            modFileInput.type = 'file';
            modFileInput.id = 'modFileInput';
            modFileInput.accept = '.ddkmod';
            modFileInput.style.display = 'none';

            // Botón para buscar archivos
            btnSearchMod = document.createElement('button');
            btnSearchMod.id = 'btnSearchMod';
            btnSearchMod.textContent = 'Buscar archivo (.ddkmod)';
            btnSearchMod.style.width = '100%';
            btnSearchMod.style.padding = '12px';
            btnSearchMod.style.backgroundColor = '#2563eb';
            btnSearchMod.style.color = '#ffffff';
            btnSearchMod.style.border = 'none';
            btnSearchMod.style.borderRadius = '6px';
            btnSearchMod.style.fontSize = '16px';
            btnSearchMod.style.fontWeight = 'bold';
            btnSearchMod.style.cursor = 'pointer';

            btnSearchMod.addEventListener('mouseover', () => btnSearchMod.style.backgroundColor = '#1d4ed8');
            btnSearchMod.addEventListener('mouseout', () => btnSearchMod.style.backgroundColor = '#2563eb');

            // Botón de "Listo" (Aceptar selección)
            btnConfirmMods = document.createElement('button');
            btnConfirmMods.id = 'btnConfirmMods';
            btnConfirmMods.textContent = 'Listo';
            btnConfirmMods.style.width = '100%';
            btnConfirmMods.style.padding = '12px';
            btnConfirmMods.style.marginTop = '10px';
            btnConfirmMods.style.backgroundColor = '#16a34a';
            btnConfirmMods.style.color = '#ffffff';
            btnConfirmMods.style.border = 'none';
            btnConfirmMods.style.borderRadius = '6px';
            btnConfirmMods.style.fontSize = '16px';
            btnConfirmMods.style.fontWeight = 'bold';
            btnConfirmMods.style.cursor = 'pointer';

            btnConfirmMods.addEventListener('mouseover', () => btnConfirmMods.style.backgroundColor = '#15803d');
            btnConfirmMods.addEventListener('mouseout', () => btnConfirmMods.style.backgroundColor = '#16a34a');

            // Lista de mods
            modsList = document.createElement('ul');
            modsList.id = 'modsList';
            modsList.style.listStyle = 'none';
            modsList.style.padding = '0';
            modsList.style.marginTop = '15px';
            modsList.style.width = '100%';
            modsList.style.maxHeight = '200px';
            modsList.style.overflowY = 'auto';

            // Ensamblar modal
            modsModalContent.appendChild(btnCloseMods);
            modsModalContent.appendChild(title);
            modsModalContent.appendChild(btnSearchMod);
            modsModalContent.appendChild(btnConfirmMods);
            modsModalContent.appendChild(modFileInput);
            modsModalContent.appendChild(modsList);
            modsModal.appendChild(modsModalContent);
            document.body.appendChild(modsModal);
        }

        // Función para renderizar la lista visual de mods
        function renderModsList() {
            modsList.innerHTML = '';

            if (loadedMods.length === 0) {
                const emptyMsg = document.createElement('li');
                emptyMsg.style.textAlign = 'center';
                emptyMsg.style.color = '#888';
                emptyMsg.style.fontSize = '14px';
                emptyMsg.style.marginTop = '10px';
                emptyMsg.textContent = 'No hay mods cargados';
                modsList.appendChild(emptyMsg);
                return;
            }

            loadedMods.forEach((mod, index) => {
                const li = document.createElement('li');
                li.style.padding = '10px';
                li.style.marginTop = '8px';
                li.style.backgroundColor = '#2a2a2a';
                li.style.border = '1px solid #444';
                li.style.borderRadius = '5px';
                li.style.display = 'flex';
                li.style.alignItems = 'center';
                li.style.justifyContent = 'space-between';

                const label = document.createElement('label');
                label.style.display = 'flex';
                label.style.alignItems = 'center';
                label.style.cursor = 'pointer';
                label.style.width = '100%';
                label.style.wordBreak = 'break-all';
                label.style.fontSize = '14px';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = mod.active;
                checkbox.style.marginRight = '10px';
                checkbox.style.cursor = 'pointer';

                checkbox.addEventListener('change', (e) => {
                    loadedMods[index].active = e.target.checked;
                });

                const textSpan = document.createElement('span');
                textSpan.textContent = `📄 ${mod.name}`;

                label.appendChild(checkbox);
                label.appendChild(textSpan);
                li.appendChild(label);
                modsList.appendChild(li);
            });
        }

        // Evento para abrir el modal de Mods
        if (menuModsBtn && modsModal) {
            menuModsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Sincroniza las elecciones no guardadas con el estado confirmado actual
                loadedMods.forEach(mod => {
                    mod.active = confirmedActiveMods.has(mod.name);
                });
                renderModsList();
                modsModal.style.display = 'flex';
            });
        }

        // Cancelar / Cerrar sin guardar en "Listo"
        function closeAndRevertMods() {
            // Revertir a las opciones guardadas en confirmedActiveMods
            loadedMods.forEach(mod => {
                mod.active = confirmedActiveMods.has(mod.name);
            });
            modsModal.style.display = 'none';
        }

        // Evento para cerrar el modal
        if (btnCloseMods && modsModal) {
            btnCloseMods.addEventListener('click', () => {
                closeAndRevertMods();
            });
        }

        // Evento del botón "Listo" (Aceptar selección actual)
        if (btnConfirmMods) {
            btnConfirmMods.addEventListener('click', () => {
                confirmedActiveMods.clear();
                loadedMods.forEach(mod => {
                    if (mod.active) {
                        confirmedActiveMods.add(mod.name);
                    }
                });
                window.activeModsList = loadedMods.filter(m => m.active);
                modsModal.style.display = 'none';
            });
        }

        // Abrir el explorador de archivos
        if (btnSearchMod && modFileInput) {
            btnSearchMod.addEventListener('click', () => {
                modFileInput.click();
            });
        }

        // Manejo del archivo seleccionado con detección de duplicados
        if (modFileInput && modsList) {
            modFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (file.name.endsWith('.ddkmod')) {
                        // Detector de duplicados por nombre y tamaño
                        const isDuplicate = loadedMods.some(
                            mod => mod.name === file.name && mod.size === file.size
                        );

                        if (isDuplicate) {
                            alert(`El archivo "${file.name}" ya ha sido cargado.`);
                        } else {
                            loadedMods.push({
                                name: file.name,
                                size: file.size,
                                active: false // Empieza deseleccionado hasta tocar "Listo"
                            });
                            renderModsList();
                        }

                        // Resetea el input para permitir volver a subir el mismo u otros archivos
                        modFileInput.value = '';
                    } else {
                        alert("Por favor, selecciona un archivo válido con extensión .ddkmod");
                    }
                }
            });
        }

        // Referencias para el Menú y Modal Multijugador
        const btnMultiplayerMenu = document.getElementById('btn-multiplayer-menu');
        const multiplayerModal = document.getElementById('multiplayerModal');
        const btnCloseMultiplayer = document.getElementById('btnCloseMultiplayer');
        const btnBluetooth = document.getElementById('btn-bluetooth');
        const btnRoomMode = document.getElementById('btn-room-mode');
        const btnPublicServer = document.getElementById('btn-public-server');

        // Referencias para el panel de salas
        const multiplayerUI = document.getElementById('multiplayer-ui');
        const btnCrear = document.getElementById('btn-crear-partida');
        const btnUnir = document.getElementById('btn-unirse-partida');
        const inputCodigo = document.getElementById('input-codigo');

        let pendingUsername = "";

        function showError(msg) {
            if (usernameError) {
                usernameError.textContent = msg;
                usernameError.style.display = 'block';
            }
        }

        function hideError() {
            if (usernameError) {
                usernameError.style.display = 'none';
            }
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

            if (window.NameSystem && typeof window.NameSystem.registerName === 'function') {
                window.NameSystem.registerName(name);
            }

            if (typeof NameTagSystem !== 'undefined' && typeof playerGroup !== 'undefined') {
                NameTagSystem.attachToPlayer(playerGroup, window.playerUsername, 2.2);
            }

            if (typeof window.updateNameTagsVisibility === 'function') {
                window.updateNameTagsVisibility();
            }

            if (mainMenu) {
                mainMenu.style.display = 'none';
            }
            if (multiplayerModal) {
                multiplayerModal.style.display = 'none';
            }
            if (modsModal) {
                modsModal.style.display = 'none';
            }
            window.isGameStarted = true;
        }

        // Evento del botón "Juego solitario"
        if (btnPlay) {
            btnPlay.addEventListener('click', () => {
                const nombreValido = validarNombreLocal();
                if (nombreValido) {
                    startGame(nombreValido);
                }
            });
        }

        // Abrir modal "Juego en multijugador"
        if (btnMultiplayerMenu) {
            btnMultiplayerMenu.addEventListener('click', () => {
                if (multiplayerModal) {
                    multiplayerModal.style.display = 'flex';
                }
            });
        }

        // Cerrar modal multijugador
        if (btnCloseMultiplayer) {
            btnCloseMultiplayer.addEventListener('click', () => {
                if (multiplayerModal) {
                    multiplayerModal.style.display = 'none';
                }
                if (multiplayerUI) {
                    multiplayerUI.style.display = 'none';
                }
            });
        }

        // 1) Jugar Bluetooth
        if (btnBluetooth) {
            btnBluetooth.addEventListener('click', () => {
                alert("Modo Bluetooth en desarrollo.");
            });
        }

        // 2) Jugar por sala
        if (btnRoomMode) {
            btnRoomMode.addEventListener('click', () => {
                if (multiplayerUI) {
                    multiplayerUI.style.display = multiplayerUI.style.display === 'none' ? 'flex' : 'none';
                }
            });
        }

        // 3) Server Público
        if (btnPublicServer) {
            btnPublicServer.addEventListener('click', () => {
                alert("Conectando a Server Público...");
            });
        }

        // Eventos del panel Crear/Unirse a Sala
        if (btnCrear) {
            btnCrear.addEventListener('click', () => {
                const nombreValido = validarNombreLocal();
                if (nombreValido) {
                    if (window.Network) {
                        window.Network.iniciarHost();
                        startGame(nombreValido);
                    } else {
                        alert("Error: El sistema de red no está cargado.");
                    }
                }
            });
        }

        if (btnUnir) {
            btnUnir.addEventListener('click', () => {
                const codigo = inputCodigo ? inputCodigo.value.trim().toLowerCase() : "";
                if (!codigo) {
                    showError("Ingresa el código de la sala");
                    return;
                }

                const nombreValido = validarNombreLocal();
                if (nombreValido) {
                    if (window.Network) {
                        window.Network.unirseASala(codigo);
                        startGame(nombreValido);
                    } else {
                        alert("Error: El sistema de red no está cargado.");
                    }
                }
            });
        }

        // Confirmar código reservado
        if (btnConfirmCode) {
            btnConfirmCode.addEventListener('click', () => {
                const code = secretCodeInput ? secretCodeInput.value.trim() : "";
                if (window.NameSystem && typeof window.NameSystem.verifySecretCode === 'function') {
                    if (window.NameSystem.verifySecretCode(code)) {
                        if (secretModal) secretModal.style.display = 'none';
                        startGame(pendingUsername);
                    } else {
                        if (secretCodeError) secretCodeError.style.display = 'block';
                    }
                }
            });
        }

        // Cancelar código reservado
        if (btnCancelCode) {
            btnCancelCode.addEventListener('click', () => {
                if (secretModal) secretModal.style.display = 'none';
                pendingUsername = "";
            });
        }
    });
})();
