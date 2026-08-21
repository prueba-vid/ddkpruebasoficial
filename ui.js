// --- PREVENCIÓN DE GESTOS MULTITÁCTILES EN CHROME ---
document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
document.addEventListener('gestureend', e => e.preventDefault(), { passive: false });

// --- 1. ACCIONES BITWISE Y ESTADO GLOBAL DE UI ---
window.ACTIONS = { 
    JOYSTICK: 1, SALTAR: 2, GOLPEAR: 4, ACT1: 8, ACT2: 16, 
    ACT3: 32, ACT4: 64, MINIMIZAR: 128, LISTADE_LISTA: 256, 
    DASH: 512, BLOQUEAR: 1024, ULTI: 2048, ESPECIAL: 4096 
};

window.activeActions = 0;
window.ultiCharge = 0;

// Sincronizar automáticamente currentCharacter leyendo desde localStorage
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

// --- SISTEMA DE COOLDOWN VISUAL DE BOTONES ---
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
    get joystick() { return window.$('joystick'); },
    get knob() { return window.$('knob'); },
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

// --- 4. BINDING DE EVENTOS A BOTONES ---
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

// --- 5. EVENTOS TÁCTILES Y JOYSTICK ---
window.touchState = {
    inputX: 0,
    inputY: 0,
    camTheta: 0,
    camPhi: Math.PI / 2.5,
    joystickTouchId: null,
    cameraTouchId: null,
    lastCamX: 0,
    lastCamY: 0
};

const resetJoystick = () => { 
    window.touchState.joystickTouchId = null; 
    window.touchState.inputX = 0;
    window.touchState.inputY = 0; 
    const knobEl = window.DOM.knob;
    if (knobEl) knobEl.style.transform = 'translate(0px,0px)'; 
    window.setAction(window.ACTIONS.JOYSTICK, false); 
};

function updateJoystick(touch, rect) {
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

window.addEventListener('touchstart', e => {
    if (window.GameConfig?.hudEditing) return;

    // Bloquea gestos del sistema en Chrome cuando se usan 3 o más dedos
    if (e.touches.length >= 3) {
        e.preventDefault();
    }

    const joystickEl = window.DOM.joystick;
    if (!joystickEl) return;

    const joystickHitboxRadius = 150; 

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.target.closest('#right-controls, #action-bar, #top-left-bar, #fsBtn, #settingsModal')) continue;
        
        const rect = joystickEl.getBoundingClientRect();
        const distX = touch.clientX - (rect.left + rect.width / 2);
        const distY = touch.clientY - (rect.top + rect.height / 2);
        const touchDistanceSq = (distX * distX) + (distY * distY);
        
        if (touchDistanceSq < (joystickHitboxRadius * joystickHitboxRadius) && window.touchState.joystickTouchId === null) { 
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

    if (e.touches.length >= 3) {
        e.preventDefault();
    }

    const joystickEl = window.DOM.joystick;
    const rect = joystickEl?.getBoundingClientRect();
    const sens = window.GameConfig?.camSensitivity || 1.0;
    
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === window.touchState.joystickTouchId && rect) {
            updateJoystick(touch, rect);
        } else if (touch.identifier === window.touchState.cameraTouchId) {
            window.touchState.camTheta -= (touch.clientX - window.touchState.lastCamX) * 0.005 * sens;
            window.touchState.camPhi = Math.max(0.45, Math.min(Math.PI / 1.9, window.touchState.camPhi - (touch.clientY - window.touchState.lastCamY) * 0.003 * sens));
            window.touchState.lastCamX = touch.clientX; 
            window.touchState.lastCamY = touch.clientY;
        }
    }
}, { passive: false });

const handleTouchEnd = e => {
    if (window.GameConfig?.hudEditing) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === window.touchState.joystickTouchId) {
            resetJoystick();
        } else if (touch.identifier === window.touchState.cameraTouchId) {
            window.touchState.cameraTouchId = null;
        }
    }
};

window.addEventListener('touchend', handleTouchEnd); 
window.addEventListener('touchcancel', handleTouchEnd);

// --- 6. BINDING DIRECTO DE BOTONES DE ACCIÓN PARA HABILIDADES ---
function setupSkillButtons() {
    const actMap = [
        { id: 'act1', bit: window.ACTIONS.ACT1 },
        { id: 'act2', bit: window.ACTIONS.ACT2 },
        { id: 'act3', bit: window.ACTIONS.ACT3 },
        { id: 'act4', bit: window.ACTIONS.ACT4 },
        { id: 'specBtn', bit: window.ACTIONS.ESPECIAL }
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

// --- 7. SELECTOR DE PERSONAJE Y PANTALLA COMPLETA ---
document.addEventListener('DOMContentLoaded', () => {
    setupSkillButtons();

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
        fsBtnEl.addEventListener('click', () => { 
            const activeFS = !document.fullscreenElement && !document.webkitFullscreenElement; 
            window.setAction(window.ACTIONS.MINIMIZAR, activeFS); 
            const doc = document.documentElement; 
            if (activeFS) (doc.requestFullscreen || doc.webkitRequestFullscreen).call(doc); 
            else (document.exitFullscreen || document.webkitExitFullscreen).call(document); 
        });
    }
});

