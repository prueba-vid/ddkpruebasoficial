// ==========================================
// UIPC.JS - CONTROLES PARA PC (VISTA DE CÁMARA)
// ==========================================

// --- 1. ACCIONES BITWISE Y ESTADO GLOBAL DE UI ---
window.ACTIONS = { 
    JOYSTICK: 1, SALTAR: 2, GOLPEAR: 4, ACT1: 8, ACT2: 16, 
    ACT3: 32, ACT4: 64, MINIMIZAR: 128, LISTADE_LISTA: 256, 
    DASH: 512, BLOQUEAR: 1024, ULTI: 2048, ESPECIAL: 4096 
};

window.activeActions = 0;
window.ultiCharge = 0;

function getSavedCharacterName() {
    const savedSkin = (localStorage.getItem('selectedSkin') || 'clasica').toLowerCase();
    if (savedSkin.includes('arisa')) return 'Arisa';
    if (savedSkin.includes('itsuki')) return 'Itsuki';
    if (savedSkin.includes('ryu')) return 'Ryu';
    if (savedSkin.includes('elegancia')) return 'Elegancia';
    return 'Kai';
}

window.currentCharacter = getSavedCharacterName();

window.setAction = (bit, active) => {
    window.activeActions = active ? (window.activeActions | bit) : (window.activeActions & ~bit);
};

// --- ESTADO DE CÁMARA Y ENTRADA DE PC ---
window.touchState = {
    inputX: 0,
    inputY: 0,
    camTheta: 0,
    camPhi: Math.PI / 2.5
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

        this.intervals[overlayId] = setInterval(() => {
            timeLeft -= 0.1;
            if (timeLeft <= 0) {
                clearInterval(this.intervals[overlayId]);
                delete this.intervals[overlayId];
                overlay.style.display = 'none';
                overlay.textContent = '';
                if (typeof onComplete === 'function') onComplete();
            } else {
                overlay.textContent = timeLeft.toFixed(1);
            }
        }, 100);
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
    get warn() { return window.$('warn'); },
    get fpsCounter() { return window.$('fpsCounter'); }
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

// Emulación de bindEvents para mantener compatibilidad con playercontrol.js
window.bindEvents = (el, startFn, endFn) => {
    if (!el) return;
    el.addEventListener('mousedown', e => {
        if (!window.GameConfig?.hudEditing) startFn(e);
    });
    el.addEventListener('mouseup', e => {
        if (!window.GameConfig?.hudEditing) endFn(e);
    });
};

// --- 4. CONTROL DE PANTALLA COMPLETA ---
function toggleFullscreen() {
    const activeFS = !document.fullscreenElement && !document.webkitFullscreenElement; 
    window.setAction(window.ACTIONS.MINIMIZAR, activeFS); 
    const doc = document.documentElement; 
    if (activeFS) {
        (doc.requestFullscreen || doc.webkitRequestFullscreen).call(doc); 
    } else {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document); 
    }
}

// --- 5. LÓGICA DE TECLADO (INTENCIÓN DE MOVIMIENTO) ---
const keysPressed = {};

function updatePCMovement() {
    let x = 0;
    let y = 0;

    // W es intencionalmente ADELANTE (+1), S es RETROCEDER (-1)
    if (keysPressed['w'] || keysPressed['W']) y += 1;  
    if (keysPressed['s'] || keysPressed['S']) y -= 1;  
    if (keysPressed['a'] || keysPressed['A']) x -= 1;  // Izquierda
    if (keysPressed['d'] || keysPressed['D']) x += 1;  // Derecha

    // Normalizar vector en diagonales
    if (x !== 0 && y !== 0) {
        x *= 0.7071;
        y *= 0.7071;
    }

    window.touchState.inputX = x;
    window.touchState.inputY = y;

    const isMoving = (x !== 0 || y !== 0);
    window.setAction(window.ACTIONS.JOYSTICK, isMoving);
}

// Eventos KeyDown
window.addEventListener('keydown', e => {
    if (e.repeat) return;
    const key = e.key.toLowerCase();

    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

    keysPressed[e.key] = true;

    switch (key) {
        case 'w': case 'a': case 's': case 'd':
            updatePCMovement();
            break;
        case ' ':
            window.setAction(window.ACTIONS.SALTAR, true);
            if (window.isGrounded && typeof window.velocityY !== 'undefined') {
                window.velocityY = window.jumpForce || 10;
                window.isGrounded = false;
            }
            break;
        case '1':
            window.setAction(window.ACTIONS.ACT1, true);
            if (typeof triggerSkillAction === 'function') triggerSkillAction(1, true);
            break;
        case '2':
            window.setAction(window.ACTIONS.ACT2, true);
            if (typeof triggerSkillAction === 'function') triggerSkillAction(2, true);
            break;
        case '3':
            window.setAction(window.ACTIONS.ACT3, true);
            if (typeof triggerSkillAction === 'function') triggerSkillAction(3, true);
            break;
        case '4':
            window.setAction(window.ACTIONS.ACT4, true);
            if (typeof triggerSkillAction === 'function') triggerSkillAction(4, true);
            break;
        case 'f':
            window.setAction(window.ACTIONS.ESPECIAL, true);
            if (typeof triggerSpecialAction === 'function') triggerSpecialAction();
            break;
        case 'r':
            if (typeof DOM.dashBtn !== 'undefined' && DOM.dashBtn) {
                DOM.dashBtn.dispatchEvent(new Event('mousedown'));
            } else {
                window.setAction(window.ACTIONS.DASH, true);
            }
            break;
        case 'e':
            if (!(window.activeActions & window.ACTIONS.BLOQUEAR) && window.ultiCharge >= 100) {
                window.setAction(window.ACTIONS.ULTI, true);
                if (typeof resetUltiCharge === 'function') resetUltiCharge();
                if (typeof window.spawnAttackHitbox === 'function' && typeof playerGroup !== 'undefined') {
                    window.spawnAttackHitbox(playerGroup.position, playerGroup.rotation.y, 3.5, 2.5, 4.0, 500);
                }
            }
            break;
        case 'p':
        case 'f12':
            e.preventDefault();
            toggleFullscreen();
            break;
        case 'o':
            const settingsModal = window.$('settingsModal');
            if (settingsModal) {
                const isOpen = settingsModal.style.display === 'flex';
                settingsModal.style.display = isOpen ? 'none' : 'flex';
            }
            break;
        case 'l':
            const charDropdownEl = window.DOM.charDropdown;
            if (charDropdownEl) {
                const isClosed = charDropdownEl.style.display !== 'flex';
                charDropdownEl.style.display = isClosed ? 'flex' : 'none';
                window.setAction(window.ACTIONS.LISTADE_LISTA, isClosed);
            }
            break;
        case 'c':
            const chatInput = window.$('chatInput') || window.$('chat');
            if (chatInput) {
                e.preventDefault();
                chatInput.focus();
            }
            break;
    }
});

// Eventos KeyUp
window.addEventListener('keyup', e => {
    const key = e.key.toLowerCase();
    delete keysPressed[e.key];

    switch (key) {
        case 'w': case 'a': case 's': case 'd':
            updatePCMovement();
            break;
        case ' ':
            window.setAction(window.ACTIONS.SALTAR, false);
            break;
        case '1':
            window.setAction(window.ACTIONS.ACT1, false);
            if (typeof triggerSkillAction === 'function') triggerSkillAction(1, false);
            break;
        case '2':
            window.setAction(window.ACTIONS.ACT2, false);
            if (typeof triggerSkillAction === 'function') triggerSkillAction(2, false);
            break;
        case '3':
            window.setAction(window.ACTIONS.ACT3, false);
            if (typeof triggerSkillAction === 'function') triggerSkillAction(3, false);
            break;
        case '4':
            window.setAction(window.ACTIONS.ACT4, false);
            if (typeof triggerSkillAction === 'function') triggerSkillAction(4, false);
            break;
        case 'f':
            window.setAction(window.ACTIONS.ESPECIAL, false);
            break;
        case 'r':
            window.setAction(window.ACTIONS.DASH, false);
            break;
        case 'e':
            window.setAction(window.ACTIONS.ULTI, false);
            break;
    }
});

// --- 6. ACCIONES DE RATÓN (HIT Y BLOCK) ---
window.addEventListener('mousedown', e => {
    if (e.target.closest('#settingsModal, #charDropdown, #top-left-bar, input, .modal-overlay')) return;

    if (e.button === 0) { // Clic Izquierdo = HIT
        window.setAction(window.ACTIONS.GOLPEAR, true);
        if (typeof executePlayerAttack === 'function') {
            executePlayerAttack();
        }
    } else if (e.button === 2) { // Clic Derecho = BLOCK
        window.setAction(window.ACTIONS.BLOQUEAR, true);
    }
});

window.addEventListener('mouseup', e => {
    if (e.button === 0) {
        window.setAction(window.ACTIONS.GOLPEAR, false);
    } else if (e.button === 2) {
        window.setAction(window.ACTIONS.BLOQUEAR, false);
    }
});

window.addEventListener('contextmenu', e => e.preventDefault());

// --- 7. MOVIMIENTO LIBRE DE CÁMARA CON EL RATÓN ---
document.addEventListener('click', e => {
    if (e.target.closest('#settingsModal, #charDropdown, #top-left-bar, input, button, .modal-overlay')) return;
    
    if (document.pointerLockElement !== document.body) {
        const reqLock = document.body.requestPointerLock || document.body.mozRequestPointerLock || document.body.webkitRequestPointerLock;
        if (reqLock) reqLock.call(document.body);
    }
});

window.addEventListener('mousemove', e => {
    const sens = window.GameConfig?.camSensitivity || 1.0;
    
    const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
    const movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

    if (movementX !== 0 || movementY !== 0) {
        window.touchState.camTheta -= movementX * 0.0025 * sens;
        window.touchState.camPhi -= movementY * 0.002 * sens;

        const minPhi = 0.1;
        const maxPhi = Math.PI / 2.05;
        window.touchState.camPhi = Math.max(minPhi, Math.min(maxPhi, window.touchState.camPhi));
    }
});

// --- 8. INICIALIZACIÓN DE INTERFAZ ---
document.addEventListener('DOMContentLoaded', () => {
    const charLabelEl = window.DOM.charLabel;
    const charDropdownEl = window.DOM.charDropdown;

    if (charLabelEl) {
        charLabelEl.textContent = window.currentCharacter;
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
        fsBtnEl.addEventListener('click', toggleFullscreen);
    }
});

// --- HELPER OPCIONAL PARA USAR EN TU SCRIPT PRINCIPAL ---
// Calcula el vector de movimiento 3D considerando la rotación actual de la cámara
window.getMovementVector = function() {
    const x = window.touchState.inputX;
    const y = window.touchState.inputY;
    const theta = window.touchState.camTheta;

    if (x === 0 && y === 0) return { dirX: 0, dirZ: 0 };

    // Traducir dirección según el ángulo de la cámara
    const dirX = x * Math.cos(theta) - y * Math.sin(theta);
    const dirZ = -x * Math.sin(theta) - y * Math.cos(theta);

    return { dirX, dirZ };
};

