window.GameConfig = {
    camDistance: 4.5,
    camSensitivity: 1.0,
    resolutionScale: 1.0,
    shadowsEnabled: false,
    shadowsPlusEnabled: false,
    shaderMode: 0, // 0: Desactivado, 1: Normal, 2: Sofisticado
    hudEditing: false,
    showFPS: false,
    limitFPS: false,
    targetFPS: 60,
    motionBlurEnabled: false,
    motionBlurQuality: 1,
    nameTagVisibility: 0,
    showHitboxes: false,
    flyEnabled: false
};

document.addEventListener('DOMContentLoaded', () => {
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    
    // --- NUEVO: UI DE MULTIJUGADOR EN AJUSTES ---
    const networkRow = document.createElement('div');
    networkRow.id = 'network-settings-container';
    networkRow.style.cssText = `margin-bottom: 20px; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid #444;`;
    
    function refreshNetworkUI() {
        const isConnected = window.Network && window.Network.peer && window.Network.peer.id;
        networkRow.innerHTML = `
            <div style="color: #ffd700; font-weight: bold; margin-bottom: 8px; font-size: 13px;">MULTIJUGADOR</div>
            ${isConnected ? `
                <div style="color: #00ff00; font-size: 14px;">Tu Sala: <b>${window.Network.peer.id}</b></div>
            ` : `
                <div style="display:flex; gap: 5px;">
                    <input type="text" id="join-room-input" placeholder="Código sala" style="background:#222; color:white; border:1px solid #555; padding:5px; border-radius:4px; width:100px; text-align:center;">
                    <button id="join-room-btn" style="background:#444; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Unirse</button>
                </div>
            `}
        `;
        
        const btn = document.getElementById('join-room-btn');
        if(btn) {
            btn.onclick = () => {
                const cod = document.getElementById('join-room-input').value.trim();
                if(cod.length === 5 && window.Network) window.Network.unirseASala(cod);
                else alert("Código inválido");
            };
        }
    }
    
    // Insertar al principio del modal
    if (settingsModal) {
        settingsModal.prepend(networkRow);
        refreshNetworkUI();
    }
    // ------------------------------------------

    // --- NUEVO: CONTROL DE SHADERS (MEJORAS VISUALES) EN CONFIGURACIÓN ---
    if (settingsModal) {
        const shaderContainer = document.createElement('div');
        shaderContainer.id = 'shader-settings-container';
        shaderContainer.style.cssText = `margin-bottom: 15px; padding: 10px; background: rgba(20, 20, 35, 0.5); border-radius: 8px; border: 1px solid #334;`;
        shaderContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="color: #00e5ff; font-weight: bold; font-size: 13px;">Shaders / Gráficos Avanzados</span>
                <input type="checkbox" id="shaderToggle" style="accent-color: #00e5ff; cursor: pointer;">
            </div>
            <div id="shaderIntensityContainer" style="display: none; flex-direction: column; gap: 6px; margin-top: 8px;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #bbb;">
                    <span>Modo de Intensidad:</span>
                    <span id="shaderIntensityValue" style="color: #00e5ff; font-weight: bold;">Normal</span>
                </div>
                <input type="range" id="shaderSlider" min="1" max="2" step="1" value="1" style="width: 100%; accent-color: #00e5ff; cursor: pointer;">
            </div>
        `;

        const targetPos = document.getElementById('network-settings-container');
        if (targetPos && targetPos.nextSibling) {
            settingsModal.insertBefore(shaderContainer, targetPos.nextSibling);
        } else {
            settingsModal.appendChild(shaderContainer);
        }

        const shaderToggle = document.getElementById('shaderToggle');
        const shaderIntensityContainer = document.getElementById('shaderIntensityContainer');
        const shaderSlider = document.getElementById('shaderSlider');
        const shaderIntensityValue = document.getElementById('shaderIntensityValue');

        const shaderModesList = { 1: "Normal", 2: "Sofisticado" };

        if (shaderToggle && shaderIntensityContainer && shaderSlider && shaderIntensityValue) {
            shaderToggle.addEventListener('change', e => {
                const isChecked = e.target.checked;
                shaderIntensityContainer.style.display = isChecked ? 'flex' : 'none';
                window.GameConfig.shaderMode = isChecked ? parseInt(shaderSlider.value) : 0;
                if (window.ShaderEngine) window.ShaderEngine.applySettings(window.GameConfig.shaderMode);
            });

            shaderSlider.addEventListener('input', e => {
                const val = parseInt(e.target.value);
                window.GameConfig.shaderMode = val;
                shaderIntensityValue.textContent = shaderModesList[val] || "Normal";
                if (window.ShaderEngine) window.ShaderEngine.applySettings(val);
            });
        }
    }
    // -------------------------------------------------------------------

    const sensSlider = document.getElementById('sensSlider');
    const sensValue = document.getElementById('sensValue');
    const fovSlider = document.getElementById('fovSlider');
    const fovValue = document.getElementById('fovValue');
    const resSlider = document.getElementById('resSlider');
    const resValue = document.getElementById('resValue');
    const shadowToggle = document.getElementById('shadowToggle');
    const shadowPlusToggle = document.getElementById('shadowPlusToggle');
    const fpsToggle = document.getElementById('fpsToggle');
    const fpsCounter = document.getElementById('fpsCounter');
    const editHudToggle = document.getElementById('editHudToggle');
    const resetHudBtn = document.getElementById('resetHudBtn');

    const fpsLimitToggle = document.getElementById('fpsLimitToggle');
    const fpsLimitContainer = document.getElementById('fpsLimitContainer');
    const fpsLimitSlider = document.getElementById('fpsLimitSlider');
    const fpsLimitValue = document.getElementById('fpsLimitValue');
    const fpsSteps = [30, 60, 120, 144, 240];

    const blurToggle = document.getElementById('blurToggle');
    const blurQualityContainer = document.getElementById('blurQualityContainer');
    const blurSlider = document.getElementById('blurSlider');
    const blurValue = document.getElementById('blurValue');

    const nameVisibilitySlider = document.getElementById('nameVisibilitySlider');
    const nameVisibilityValue = document.getElementById('nameVisibilityValue');
    const nameVisibilityLabels = {
        0: "Mostrar todos",
        1: "Ocultar mi nombre",
        2: "Ocultar todos",
        3: "Ocultar solo demás"
    };

    if (fovSlider) fovSlider.max = "8.0";

    const draggableIds = ['dashBtn', 'hitBtn', 'blockBtn', 'specBtn', 'jumpBtn'];
    const draggables = draggableIds.map(id => document.getElementById(id)).filter(Boolean);

    // --- PANEL DE CONTROL DE HUD ---
    const scaleControlPanel = document.createElement('div');
    scaleControlPanel.id = 'hudScaleControlPanel';
    scaleControlPanel.style.cssText = `
        position: fixed; top: 15px; left: 50%; transform: translateX(-50%);
        background: rgba(20, 20, 31, 0.95); border: 1px solid rgba(255, 215, 0, 0.6);
        border-radius: 10px; padding: 10px 18px; display: none; align-items: center; gap: 15px;
        z-index: 1001; color: white; font-size: 12px; font-weight: bold; box-shadow: 0 0 10px rgba(0,0,0,0.5);
    `;
    scaleControlPanel.innerHTML = `
        <div style="display:flex; align-items:center; gap:6px;">
            <span>Tamaño:</span>
            <input type="range" id="hudScaleInputSlider" min="0.5" max="2.0" step="0.05" value="1.0" style="width:80px; accent-color:#ffd700; cursor:pointer;">
            <span id="hudScaleInputVal" style="width:35px;">100%</span>
        </div>
        <div style="width:1px; height:20px; background:rgba(255,255,255,0.2);"></div>
        <div style="display:flex; align-items:center; gap:6px;">
            <span>Opacidad:</span>
            <input type="range" id="hudOpacityInputSlider" min="0.0" max="1.0" step="0.05" value="1.0" style="width:80px; accent-color:#ffd700; cursor:pointer;">
            <span id="hudOpacityInputVal" style="width:35px;">100%</span>
        </div>
    `;
    document.body.appendChild(scaleControlPanel);

    const hudScaleInputSlider = document.getElementById('hudScaleInputSlider');
    const hudScaleInputVal = document.getElementById('hudScaleInputVal');
    const hudOpacityInputSlider = document.getElementById('hudOpacityInputSlider');
    const hudOpacityInputVal = document.getElementById('hudOpacityInputVal');

    let selectedElement = null;
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    loadSavedHudPositions();

    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => {
            const isOpen = settingsModal.style.display === 'flex';
            settingsModal.style.display = isOpen ? 'none' : 'flex';
            refreshNetworkUI();
        });
    }

    if (sensSlider && sensValue) {
        sensSlider.addEventListener('input', e => {
            window.GameConfig.camSensitivity = parseFloat(e.target.value);
            sensValue.textContent = `${Math.round(window.GameConfig.camSensitivity * 100)}%`;
        });
    }

    if (fovSlider && fovValue) {
        fovSlider.addEventListener('input', e => {
            const val = parseFloat(e.target.value);
            window.GameConfig.camDistance = val;
            fovValue.textContent = val.toFixed(1);
            if (typeof window.updateCameraDistance === 'function') window.updateCameraDistance(val);
        });
    }

    if (resSlider && resValue) {
        const resLabels = { "0.25": "144p", "0.5": "360p", "0.75": "720p", "1": "1080p", "1.25": "1440p", "1.5": "2K", "1.75": "2K+", "2": "4K" };
        resSlider.addEventListener('input', e => {
            const val = parseFloat(e.target.value);
            window.GameConfig.resolutionScale = val;
            const label = resLabels[val.toString()] || `${Math.round(val * 100)}%`;
            resValue.textContent = `${Math.round(val * 100)}% (${label})`;
            if (typeof window.applyResolutionSettings === 'function') window.applyResolutionSettings(val);
        });
    }

    if (fpsLimitToggle && fpsLimitContainer && fpsLimitSlider && fpsLimitValue) {
        fpsLimitToggle.addEventListener('change', e => {
            window.GameConfig.limitFPS = e.target.checked;
            fpsLimitContainer.style.display = e.target.checked ? 'flex' : 'none';
        });

        fpsLimitSlider.addEventListener('input', e => {
            const target = fpsSteps[parseInt(e.target.value)];
            window.GameConfig.targetFPS = target;
            fpsLimitValue.textContent = `${target} FPS`;
        });
    }

    if (blurToggle && blurQualityContainer && blurSlider && blurValue) {
        blurToggle.addEventListener('change', e => {
            window.GameConfig.motionBlurEnabled = e.target.checked;
            blurQualityContainer.style.display = e.target.checked ? 'flex' : 'none';
        });

        blurSlider.addEventListener('input', e => {
            const q = parseInt(e.target.value);
            window.GameConfig.motionBlurQuality = q;
            blurValue.textContent = q === 1 ? "Baja" : "Alta";
        });
    }

    if (nameVisibilitySlider && nameVisibilityValue) {
        nameVisibilitySlider.addEventListener('input', e => {
            const mode = parseInt(e.target.value);
            window.GameConfig.nameTagVisibility = mode;
            nameVisibilityValue.textContent = nameVisibilityLabels[mode] || "Mostrar todos";
            if (typeof window.updateNameTagsVisibility === 'function') window.updateNameTagsVisibility();
        });
    }

    if (shadowToggle) {
        shadowToggle.checked = !!window.GameConfig.shadowsEnabled;
        shadowToggle.addEventListener('change', e => {
            const isChecked = e.target.checked;
            window.GameConfig.shadowsEnabled = isChecked;
            if (isChecked && shadowPlusToggle) {
                shadowPlusToggle.checked = false;
                window.GameConfig.shadowsPlusEnabled = false;
                if (typeof window.applyShadowsPlusSettings === 'function') window.applyShadowsPlusSettings(false);
            }
            if (typeof window.applyShadowSettings === 'function') window.applyShadowSettings(isChecked);
        });
    }

    if (shadowPlusToggle) {
        shadowPlusToggle.checked = !!window.GameConfig.shadowsPlusEnabled;
        shadowPlusToggle.addEventListener('change', e => {
            const isChecked = e.target.checked;
            window.GameConfig.shadowsPlusEnabled = isChecked;
            if (isChecked && shadowToggle) {
                shadowToggle.checked = false;
                window.GameConfig.shadowsEnabled = false;
                if (typeof window.applyShadowSettings === 'function') window.applyShadowSettings(isChecked);
            }
            if (typeof window.applyShadowsPlusSettings === 'function') window.applyShadowsPlusSettings(isChecked);
        });
    }

    if (fpsToggle && fpsCounter) {
        fpsToggle.addEventListener('change', e => {
            window.GameConfig.showFPS = e.target.checked;
            fpsCounter.style.display = e.target.checked ? 'block' : 'none';
        });
    }

    if (editHudToggle) {
        editHudToggle.addEventListener('change', e => {
            window.GameConfig.hudEditing = e.target.checked;
            draggables.forEach(el => el.classList.toggle('hud-editing', window.GameConfig.hudEditing));
            if (!window.GameConfig.hudEditing) {
                scaleControlPanel.style.display = 'none';
                if (selectedElement) {
                    selectedElement.style.outline = 'none';
                    selectedElement = null;
                }
            }
        });
    }

    if (resetHudBtn) {
        resetHudBtn.addEventListener('click', () => {
            draggableIds.forEach(id => localStorage.removeItem(`hud_pos_${id}`));
            draggables.forEach(el => { 
                el.style.position = ''; el.style.left = ''; el.style.top = ''; el.style.transform = ''; el.style.opacity = '1';
                el.style.removeProperty('--hud-scale'); el.dataset.scale = '1.0'; el.dataset.opacity = '1.0';
                el.style.outline = 'none';
            });
            scaleControlPanel.style.display = 'none';
            selectedElement = null;
        });
    }

    function applyElementScale(el, scale) {
        el.dataset.scale = scale;
        el.style.setProperty('--hud-scale', scale);
        el.style.transform = `scale(${scale})`;
    }

    function applyElementOpacity(el, opacity) {
        el.dataset.opacity = opacity;
        el.style.opacity = opacity;
    }

    function saveElementState(el) {
        if (!el) return;
        const data = {
            left: el.style.left,
            top: el.style.top,
            scale: el.dataset.scale || '1.0',
            opacity: el.dataset.opacity || '1.0'
        };
        localStorage.setItem(`hud_pos_${el.id}`, JSON.stringify(data));
    }

    function updateControlPanelValues(el) {
        const curScale = parseFloat(el.dataset.scale || '1.0');
        const curOpacity = parseFloat(el.dataset.opacity || '1.0');
        
        hudScaleInputSlider.value = curScale;
        hudScaleInputVal.textContent = `${Math.round(curScale * 100)}%`;
        
        hudOpacityInputSlider.value = curOpacity;
        hudOpacityInputVal.textContent = `${Math.round(curOpacity * 100)}%`;
    }

    // SLIDERS CONTROL PANEL EVENT LISTENERS
    if (hudScaleInputSlider) {
        hudScaleInputSlider.addEventListener('input', e => {
            if (!selectedElement) return;
            const val = parseFloat(e.target.value);
            applyElementScale(selectedElement, val);
            hudScaleInputVal.textContent = `${Math.round(val * 100)}%`;
            saveElementState(selectedElement);
        });
    }

    if (hudOpacityInputSlider) {
        hudOpacityInputSlider.addEventListener('input', e => {
            if (!selectedElement) return;
            const val = parseFloat(e.target.value);
            applyElementOpacity(selectedElement, val);
            hudOpacityInputVal.textContent = `${Math.round(val * 100)}%`;
            saveElementState(selectedElement);
        });
    }

    // --- ARRASTRE Y SELECCIÓN DE ELEMENTOS HUD ---
    draggables.forEach(el => {
        const startDrag = (clientX, clientY) => {
            if (!window.GameConfig.hudEditing) return;

            if (selectedElement && selectedElement !== el) {
                selectedElement.style.outline = 'none';
            }

            selectedElement = el;
            selectedElement.style.outline = '2px dashed #ffd700';
            updateControlPanelValues(selectedElement);
            scaleControlPanel.style.display = 'flex';

            const rect = el.getBoundingClientRect();
            el.style.position = 'fixed';
            el.style.margin = '0';

            dragOffsetX = clientX - rect.left;
            dragOffsetY = clientY - rect.top;
            isDragging = true;
        };

        el.addEventListener('mousedown', e => {
            if (!window.GameConfig.hudEditing) return;
            e.preventDefault();
            startDrag(e.clientX, e.clientY);
        });

        el.addEventListener('touchstart', e => {
            if (!window.GameConfig.hudEditing) return;
            if (e.touches.length > 0) {
                startDrag(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });
    });

    const onMove = (clientX, clientY) => {
        if (!isDragging || !selectedElement || !window.GameConfig.hudEditing) return;
        
        let newLeft = clientX - dragOffsetX;
        let newTop = clientY - dragOffsetY;

        const maxLeft = window.innerWidth - selectedElement.offsetWidth;
        const maxTop = window.innerHeight - selectedElement.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        selectedElement.style.left = `${newLeft}px`;
        selectedElement.style.top = `${newTop}px`;
        selectedElement.style.bottom = 'auto';
        selectedElement.style.right = 'auto';
    };

    const stopDrag = () => {
        if (isDragging && selectedElement) {
            isDragging = false;
            saveElementState(selectedElement);
        }
    };

    window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', stopDrag);

    window.addEventListener('touchmove', e => {
        if (e.touches.length > 0) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('touchend', stopDrag);

    function loadSavedHudPositions() {
        draggableIds.forEach(id => {
            const saved = localStorage.getItem(`hud_pos_${id}`);
            if (saved) {
                try {
                    const { left, top, scale, opacity } = JSON.parse(saved);
                    const el = document.getElementById(id);
                    if (el) { 
                        el.style.position = 'fixed';
                        el.style.left = left;
                        el.style.top = top;
                        el.style.bottom = 'auto';
                        el.style.right = 'auto';
                        el.style.margin = '0'
                        if (scale !== undefined) applyElementScale(el, scale);
                        if (opacity !== undefined) applyElementOpacity(el, opacity);
                    }
                } catch (e) {
                    console.error("Error al cargar la posición del HUD para:", id, e);
                }
            }
        });
    }
});

