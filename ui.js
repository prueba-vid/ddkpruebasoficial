// --- PREVENCIÓN DE GESTOS MULTITÁCTILES EN CHROME ---
['gesturestart', 'gesturechange', 'gestureend'].forEach(evt => {
    document.addEventListener(evt, e => e.preventDefault(), { passive: false });
});

// --- 1. ESTADO GLOBAL Y ACCIONES (BITWISE) ---
window.ACTIONS = { 
    JOYSTICK: 1, SALTAR: 2, GOLPEAR: 4, ACT1: 8, ACT2: 16, 
    ACT3: 32, ACT4: 64, MINIMIZAR: 128, LISTADE_LISTA: 256, 
    DASH: 512, BLOQUEAR: 1024, ULTI: 2048, ESPECIAL: 4096 
};

window.activeActions = 0;
window.ultiCharge = 0;
window.isDpadMode = false;

function getSavedCharacterName() {
    const savedSkin = (localStorage.getItem('selectedSkin') || 'clasica').toLowerCase();
    if (savedSkin.includes('funetsu')) return 'Funetsu';
    if (savedSkin.includes('arisa')) return 'Arisa';
    if (savedSkin.includes('itsuki')) return 'Itsuki';
    if (savedSkin.includes('ryu')) return 'Ryu';
    if (savedSkin.includes('kenji')) return 'Kenji';
    if (savedSkin.includes('elegancia')) return 'Elegancia';
    return 'Kai';
}

window.currentCharacter = getSavedCharacterName();

window.setAction = (bit, active) => {
    window.activeActions = active ? (window.activeActions | bit) : (window.activeActions & ~bit);
};

// --- SISTEMA DE COOLDOWN VISUAL ---
window.Cooldowns = {
    intervals: {},
    triggerCooldown: function(overlayId, durationSeconds, onComplete) {
        const overlay = document.getElementById(overlayId);
        if (!overlay) return;

        if (this.intervals[overlayId]) {
            clearInterval(this.intervals[overlayId]);
        }

        let timeLeft = durationSeconds;
        overlay.style.display = 'flex';
        overlay.textContent = timeLeft.toFixed(1);

        const startTime = Date.now();
        const endTime = startTime + (durationSeconds * 1000);

        this.intervals[overlayId] = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, (endTime - now) / 1000);
            
            if (remaining <= 0) {
                clearInterval(this.intervals[overlayId]);
                delete this.intervals[overlayId];
                overlay.style.display = 'none';
                overlay.textContent = '';
                if (typeof onComplete === 'function') onComplete();
            } else {
                overlay.textContent = remaining.toFixed(1);
            }
        }, 50);
    }
};

// --- 2. REFERENCIAS DOM Y UTILIDADES ---
window.$ = id => document.getElementById(id);

window.DOM = { 
    get ultiFill() { return window.$('ultiBarFill'); },
    get ultiBtn() { return window.$('ultiBtn'); },
    get hitBtn() { return window.$('hitBtn'); },
    get jumpBtn() { return window.$('jumpBtn'); },
    get blockBtn() { return window.$('blockBtn'); },
    get dashBtn() { return window.$('dashBtn'); },
    get specBtn() { return window.$('specBtn'); },
    get charLabel() { return window.$('charLabel'); },
    get charDropdown() { return window.$('charDropdown'); },
    get fsBtn() { return window.$('fsBtn'); },
    get joystick() { return window.$('joystick'); },
    get knob() { return window.$('knob'); },
    get warn() { return window.$('warn'); },
    get fpsCounter() { return window.$('fpsCounter'); },
    get toggleDpadBtn() { return window.$('toggleDpadBtn'); },
    get dpadContainer() { return window.$('dpad-container'); }
};

// --- 3. MANEJO DE ULTIMATE ---
window.addUltiCharge = function(amount) {
    if (window.ultiCharge >= 100) return;
    window.ultiCharge = Math.min(100, window.ultiCharge + amount);
    
    const fillEl = window.DOM.ultiFill;
    const btnEl = window.DOM.ultiBtn;

    if (fillEl) fillEl.style.width = `${window.ultiCharge}%`;
    if (window.ultiCharge >= 100 && btnEl) btnEl.classList.add('ready');
};

window.resetUltiCharge = function() {
    window.ultiCharge = 0;
    const fillEl = window.DOM.ultiFill;
    const btnEl = window.DOM.ultiBtn;

    if (fillEl) fillEl.style.width = '0%';
    if (btnEl) btnEl.classList.remove('ready');
};

// --- 4. BINDING DE EVENTOS TÁCTILES / RATÓN ---
window.bindEvents = (el, startFn, endFn) => {
    if (!el) return;
    const handle = (fn, e) => { 
        if (!window.GameConfig?.hudEditing) { 
            e.preventDefault?.(); 
            fn(e); 
        } 
    };
    ['touchstart', 'mousedown'].forEach(evt => el.addEventListener(evt, e => handle(startFn, e), { passive: false }));
    ['touchend', 'mouseup'].forEach(evt => el.addEventListener(evt, e => handle(endFn, e)));
};

// --- 5. ENTRADAS: TÁCTIL, RATÓN Y JOYSTICK ---
window.touchState = {
    inputX: 0,
    inputY: 0,
    camTheta: 0,
    camPhi: Math.PI / 2.5,
    joystickTouchId: null,
    cameraTouchId: null,
    lastCamX: 0,
    lastCamY: 0,
    isMouseDown: false,
    joystickRect: null
};

const dpadKeysPressed = { up: false, down: false, left: false, right: false };

function updateDpadMovement() {
    let x = 0;
    let y = 0;

    if (dpadKeysPressed.up) y -= 1;
    if (dpadKeysPressed.down) y += 1;
    if (dpadKeysPressed.left) x -= 1;
    if (dpadKeysPressed.right) x += 1;

    window.touchState.inputX = x;
    window.touchState.inputY = y;
    window.setAction(window.ACTIONS.JOYSTICK, (x !== 0 || y !== 0));
}

const resetJoystick = () => { 
    window.touchState.joystickTouchId = null; 
    window.touchState.inputX = 0;
    window.touchState.inputY = 0; 
    const knobEl = window.DOM.knob;
    if (knobEl) knobEl.style.transform = 'translate(0px,0px)'; 
    window.setAction(window.ACTIONS.JOYSTICK, false); 
};

function updateJoystick(touch, rect) {
    if (window.isDpadMode || !rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let x = touch.clientX - centerX;
    let y = touch.clientY - centerY;
    
    const maxRadius = 30; 
    const distSq = (x * x) + (y * y);
    
    if (distSq > 0) {
        const dist = Math.sqrt(distSq);
        const angle = Math.atan2(y, x);
        const clampedDist = Math.min(dist, maxRadius);
        
        x = Math.cos(angle) * clampedDist;
        y = Math.sin(angle) * clampedDist;
        
        window.touchState.inputX = x / maxRadius;
        window.touchState.inputY = y / maxRadius;
    } else {
        window.touchState.inputX = 0;
        window.touchState.inputY = 0;
    }
    
    const knobEl = window.DOM.knob;
    if (knobEl) {
        knobEl.style.transform = `translate(${x}px, ${y}px)`;
    }
    
    window.setAction(window.ACTIONS.JOYSTICK, (Math.abs(window.touchState.inputX) > 0.05 || Math.abs(window.touchState.inputY) > 0.05));
}

function applyCameraRotation(deltaX, deltaY) {
    const sens = window.GameConfig?.camSensitivity || 1.0;
    window.touchState.camTheta -= deltaX * 0.003 * sens;
    window.touchState.camPhi = Math.max(0.45, Math.min(Math.PI / 1.9, window.touchState.camPhi - deltaY * 0.002 * sens));
}

// EVENTOS DE RATÓN
window.addEventListener('mousedown', e => {
    if (window.GameConfig?.hudEditing) return;
    if (e.target.closest('#right-controls, #action-bar, #top-left-bar, #fsBtn, #settingsModal, #dpad-container, #joystick, #chatBox, #main-menu, #multiplayerModal')) return;

    window.touchState.isMouseDown = true;
    window.touchState.lastCamX = e.clientX;
    window.touchState.lastCamY = e.clientY;
});

window.addEventListener('mousemove', e => {
    if (window.GameConfig?.hudEditing) return;

    if (document.pointerLockElement) {
        applyCameraRotation(e.movementX, e.movementY);
        return;
    }

    if (window.touchState.isMouseDown) {
        const deltaX = e.clientX - window.touchState.lastCamX;
        const deltaY = e.clientY - window.touchState.lastCamY;
        
        applyCameraRotation(deltaX, deltaY);
        
        window.touchState.lastCamX = e.clientX;
        window.touchState.lastCamY = e.clientY;
    }
});

window.addEventListener('mouseup', () => {
    window.touchState.isMouseDown = false;
});

// EVENTOS TÁCTILES
window.addEventListener('touchstart', e => {
    if (window.GameConfig?.hudEditing) return;
    if (e.touches.length >= 3) e.preventDefault();

    const joystickEl = window.DOM.joystick;
    if (!joystickEl) return;

    window.touchState.joystickRect = joystickEl.getBoundingClientRect();
    const rect = window.touchState.joystickRect;
    const joystickHitboxRadius = 150; 

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.target.closest('#right-controls, #action-bar, #top-left-bar, #fsBtn, #settingsModal, #dpad-container')) continue;
        
        const distX = touch.clientX - (rect.left + rect.width / 2);
        const distY = touch.clientY - (rect.top + rect.height / 2);
        const touchDistanceSq = (distX * distX) + (distY * distY);
        
        if (!window.isDpadMode && touchDistanceSq < (joystickHitboxRadius * joystickHitboxRadius) && window.touchState.joystickTouchId === null) { 
            window.touchState.joystickTouchId = touch.identifier; 
            updateJoystick(touch, rect); 
        } else if (window.touchState.cameraTouchId === null) { 
            window.touchState.cameraTouchId = touch.identifier; 
            window.touchState.lastCamX = touch.clientX; 
            window.touchState.lastCamY = touch.clientY; 
        }
    }
}, { passive: false });

window.addEventListener('touchmove', e => {
    if (window.GameConfig?.hudEditing) return;
    if (e.touches.length >= 3) e.preventDefault();

    const rect = window.touchState.joystickRect;
    
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (!window.isDpadMode && touch.identifier === window.touchState.joystickTouchId) {
            updateJoystick(touch, rect);
        } else if (touch.identifier === window.touchState.cameraTouchId) {
            const deltaX = touch.clientX - window.touchState.lastCamX;
            const deltaY = touch.clientY - window.touchState.lastCamY;
            
            applyCameraRotation(deltaX, deltaY);

            window.touchState.lastCamX = touch.clientX; 
            window.touchState.lastCamY = touch.clientY;
        }
    }
}, { passive: false });

const handleTouchEnd = e => {
    if (window.GameConfig?.hudEditing) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (!window.isDpadMode && touch.identifier === window.touchState.joystickTouchId) {
            resetJoystick();
        } else if (touch.identifier === window.touchState.cameraTouchId) {
            window.touchState.cameraTouchId = null;
        }
    }
};

window.addEventListener('touchend', handleTouchEnd); 
window.addEventListener('touchcancel', handleTouchEnd);

// --- 6. SISTEMA MULTI-TECLADO DINÁMICO (PC Y COMPATIBILIDAD) ---
function getActionFromKey(e) {
    const key = (e.key || '').toLowerCase();
    const code = e.code || '';

    // Movimiento
    if (key === 'w' || key === 'arrowup' || code === 'KeyW') return { type: 'move', dir: 'up' };
    if (key === 's' || key === 'arrowdown' || code === 'KeyS') return { type: 'move', dir: 'down' };
    if (key === 'a' || key === 'arrowleft' || code === 'KeyA') return { type: 'move', dir: 'left' };
    if (key === 'd' || key === 'arrowright' || code === 'KeyD') return { type: 'move', dir: 'right' };

    // Acciones directas
    if (key === ' ' || code === 'Space') return { type: 'bit', bit: window.ACTIONS.SALTAR };
    if (key === 'j' || key === 'c' || code === 'KeyJ' || code === 'KeyC') return { type: 'bit', bit: window.ACTIONS.GOLPEAR };
    if (key === 'k' || key === 'x' || code === 'KeyK' || code === 'KeyX') return { type: 'bit', bit: window.ACTIONS.BLOQUEAR };
    if (key === 'shift' || code === 'ShiftLeft' || code === 'ShiftRight') return { type: 'bit', bit: window.ACTIONS.DASH };
    if (key === 'q' || code === 'KeyQ') return { type: 'bit', bit: window.ACTIONS.ESPECIAL };
    if (key === 'e' || code === 'KeyE') return { type: 'bit', bit: window.ACTIONS.ULTI };

    // Habilidades 1, 2, 3, 4 (Reconocimiento independiente del personaje o distribución)
    if (key === '1' || code === 'Digit1' || code === 'Numpad1') return { type: 'bit', bit: window.ACTIONS.ACT1 };
    if (key === '2' || code === 'Digit2' || code === 'Numpad2') return { type: 'bit', bit: window.ACTIONS.ACT2 };
    if (key === '3' || code === 'Digit3' || code === 'Numpad3') return { type: 'bit', bit: window.ACTIONS.ACT3 };
    if (key === '4' || code === 'Digit4' || code === 'Numpad4') return { type: 'bit', bit: window.ACTIONS.ACT4 };

    return null;
}

window.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    const action = getActionFromKey(e);
    if (action) {
        if (action.type === 'move') {
            dpadKeysPressed[action.dir] = true;
            updateDpadMovement();
        } else if (action.type === 'bit') {
            // Permitir refrescar pulsación inmediata sin ser bloqueado por repeat
            window.setAction(action.bit, true);
        }
    }
});

window.addEventListener('keyup', e => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    const action = getActionFromKey(e);
    if (action) {
        if (action.type === 'move') {
            dpadKeysPressed[action.dir] = false;
            updateDpadMovement();
        } else if (action.type === 'bit') {
            window.setAction(action.bit, false);
        }
    }
});

// --- 7. SETUP DE BOTONES VIRTUALES ---
function setupSkillButtons() {
    const actMap = [
        { id: 'act1', bit: window.ACTIONS.ACT1 },
        { id: 'act2', bit: window.ACTIONS.ACT2 },
        { id: 'act3', bit: window.ACTIONS.ACT3 },
        { id: 'act4', bit: window.ACTIONS.ACT4 },
        { id: 'specBtn', bit: window.ACTIONS.ESPECIAL },
        { id: 'hitBtn', bit: window.ACTIONS.GOLPEAR },
        { id: 'jumpBtn', bit: window.ACTIONS.SALTAR },
        { id: 'blockBtn', bit: window.ACTIONS.BLOQUEAR },
        { id: 'dashBtn', bit: window.ACTIONS.DASH },
        { id: 'ultiBtn', bit: window.ACTIONS.ULTI }
    ];

    actMap.forEach(({ id, bit }) => {
        const btn = window.$(id);
        if (btn) {
            window.bindEvents(
                btn,
                () => window.setAction(bit, true),
                () => window.setAction(bit, false)
            );
        }
    });
}

// --- 8. D-PAD DE UNIFICACIÓN ---
function setupDpadToggleSystem() {
    const toggleBtn = window.DOM.toggleDpadBtn;
    const joystickEl = window.DOM.joystick;
    const dpadContainer = window.DOM.dpadContainer;

    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        window.isDpadMode = !window.isDpadMode;
        resetJoystick();
        
        Object.keys(dpadKeysPressed).forEach(k => dpadKeysPressed[k] = false);
        updateDpadMovement();

        if (window.isDpadMode) {
            toggleBtn.textContent = 'Joystick';
            if (joystickEl) joystickEl.style.display = 'none';
            if (dpadContainer) dpadContainer.style.display = 'block';
        } else {
            toggleBtn.textContent = 'D-Pad';
            if (joystickEl) joystickEl.style.display = 'block';
            if (dpadContainer) dpadContainer.style.display = 'none';
        }
    });

    const dpadButtons = [
        { id: 'dpad-up', dir: 'up' },
        { id: 'dpad-down', dir: 'down' },
        { id: 'dpad-left', dir: 'left' },
        { id: 'dpad-right', dir: 'right' }
    ];

    dpadButtons.forEach(({ id, dir }) => {
        const btn = window.$(id);
        if (btn) {
            window.bindEvents(
                btn,
                () => { dpadKeysPressed[dir] = true; updateDpadMovement(); },
                () => { dpadKeysPressed[dir] = false; updateDpadMovement(); }
            );
        }
    });
}

// --- 9. SOPORTE DE DESPLAZAMIENTO PARA EL MENÚ DESPLEGABLE ---
function setupCharDropdownScroll(dropdownEl) {
    if (!dropdownEl) return;

    let isDragging = false;
    let startY = 0;
    let startScrollTop = 0;

    dropdownEl.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) return;
        isDragging = true;
        startY = e.touches[0].pageY;
        startScrollTop = dropdownEl.scrollTop;
    }, { passive: true });

    dropdownEl.addEventListener('touchmove', e => {
        if (!isDragging || e.touches.length !== 1) return;
        const currentY = e.touches[0].pageY;
        const deltaY = startY - currentY;
        dropdownEl.scrollTop = startScrollTop + deltaY;
    }, { passive: true });

    dropdownEl.addEventListener('touchend', () => { isDragging = false; });
    dropdownEl.addEventListener('touchcancel', () => { isDragging = false; });

    dropdownEl.addEventListener('mousedown', e => {
        isDragging = true;
        startY = e.pageY;
        startScrollTop = dropdownEl.scrollTop;
    });

    window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const deltaY = startY - e.pageY;
        dropdownEl.scrollTop = startScrollTop + deltaY;
    });

    window.addEventListener('mouseup', () => { isDragging = false; });
}

// --- 10. INICIALIZACIÓN DE INTERFAZ ---
document.addEventListener('DOMContentLoaded', () => {
    setupSkillButtons();
    setupDpadToggleSystem();

    const charLabelEl = window.DOM.charLabel;
    const charDropdownEl = window.DOM.charDropdown;

    if (charLabelEl) {
        charLabelEl.textContent = window.currentCharacter;
    }

    if (charDropdownEl) {
        setupCharDropdownScroll(charDropdownEl);
    }

    if (charLabelEl && charDropdownEl) {
        charLabelEl.addEventListener('click', () => { 
            const isClosed = charDropdownEl.style.display !== 'flex'; 
            charDropdownEl.style.display = isClosed ? 'flex' : 'none'; 
            window.setAction(window.ACTIONS.LISTADE_LISTA, isClosed); 
        });

        document.querySelectorAll('.char-item').forEach(item => item.addEventListener('click', e => { 
            const shortName = e.target.getAttribute('data-short') || e.target.textContent.trim();
            const skinName = (e.target.getAttribute('data-skin') || shortName).toLowerCase();
            
            window.currentCharacter = shortName; 
            charLabelEl.textContent = window.currentCharacter; 
            charDropdownEl.style.display = 'none'; 
            window.setAction(window.ACTIONS.LISTADE_LISTA, false); 

            if (typeof window.changeCharacter === 'function') {
                window.changeCharacter(skinName);
            }
        }));
    }

    const fsBtnEl = window.DOM.fsBtn;
    if (fsBtnEl) {
        fsBtnEl.addEventListener('click', () => { 
            const activeFS = !document.fullscreenElement && !document.webkitFullscreenElement; 
            window.setAction(window.ACTIONS.MINIMIZAR, activeFS); 
            const doc = document.documentElement; 
            if (activeFS) (doc.requestFullscreen || doc.webkitRequestFullscreen).call(doc); 
            else (document.exitFullscreen || document.webkitExitFullscreen).call(document); 
        });
    }
});

