(function() {
    window.isGameStarted = false;

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

        // Referencias del HTML real para el modal y botón de Skins
        const menuSkinsBtn = document.getElementById('menuSkinsBtn');
        const skinsModal = document.getElementById('skinsModal');
        const btnCloseSkins = document.getElementById('btnCloseSkins');
        const skinOptionBtns = document.querySelectorAll('.skin-option-btn');

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

        // Recuperar nombre guardado temporalmente tras la recarga por cambio de skin
        const savedTempName = localStorage.getItem('tempUsername');
        if (savedTempName && usernameInput) {
            usernameInput.value = savedTempName;
            localStorage.removeItem('tempUsername');
        }

        // Inicializar skin guardada si no existe
        if (!localStorage.getItem('selectedSkin')) {
            localStorage.setItem('selectedSkin', 'clasica');
        }

        // Función para actualizar los estilos de selección de skin
        function updateSkinButtonsUI() {
            const currentSkin = localStorage.getItem('selectedSkin') || 'clasica';
            skinOptionBtns.forEach(btn => {
                if (btn.getAttribute('data-skin') === currentSkin) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        // Evento para abrir modal de skins
        if (menuSkinsBtn) {
            menuSkinsBtn.addEventListener('click', () => {
                updateSkinButtonsUI();
                if (skinsModal) {
                    skinsModal.style.display = 'flex';
                }
            });
        }

        // Evento para cerrar modal de skins
        if (btnCloseSkins) {
            btnCloseSkins.addEventListener('click', () => {
                if (skinsModal) {
                    skinsModal.style.display = 'none';
                }
            });
        }

        // Eventos para elegir cada opción de skin
        skinOptionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const chosenSkin = btn.getAttribute('data-skin');
                const currentSkin = localStorage.getItem('selectedSkin');

                if (chosenSkin !== currentSkin) {
                    localStorage.setItem('selectedSkin', chosenSkin);
                    if (usernameInput && usernameInput.value.trim()) {
                        localStorage.setItem('tempUsername', usernameInput.value.trim());
                    }
                    location.reload();
                    return;
                }

                updateSkinButtonsUI();
                if (skinsModal) {
                    skinsModal.style.display = 'none';
                }
            });
        });

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

        // 2) Jugar por sala (despliega las opciones de Crear / Unirse)
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

