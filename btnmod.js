// js/btnmod.js - Sistema de Botones Personalizados HUD y Físicas Integradas

(function () {
    // 1. INYECCIÓN DINÁMICA DE ESTILOS CSS
    const style = document.createElement('style');
    style.textContent = `
        .hud-custom-btn {
            background: rgba(0, 0, 0, 0.65);
            border: 1.5px solid rgba(255, 255, 255, 0.6);
            color: #ffffff;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            font-size: 10px;
            font-weight: bold;
            font-family: sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
            touch-action: manipulation;
            box-shadow: 0 0 6px rgba(0, 0, 0, 0.5);
            transition: transform 0.1s ease, border-color 0.15s ease, background 0.15s ease;
            cursor: pointer;
        }

        .hud-custom-btn:active, .hud-custom-btn.active {
            transform: scale(0.90);
            border-color: #32cd32;
            background: rgba(50, 205, 50, 0.3);
        }
    `;
    document.head.appendChild(style);

    // 2. REGISTRO DE ACCIONES BITWISE
    if (window.ACTIONS) {
        window.ACTIONS.NADA = window.ACTIONS.NADA || 8192;
        window.ACTIONS.SLIDE = window.ACTIONS.SLIDE || 16384;
        window.ACTIONS.CROUCH = window.ACTIONS.CROUCH || 32768;
    }

    window.isCrouching = false;
    window.isSliding = false;

    // Configuración de animación para agacharse
    let targetYScale = 1.0;
    let targetCamYOffset = 0.0;
    let originalGroupYScale = 1.0;
    let originalCamY = null;

    // Hook de actualización de velocidad
    const originalUpdatePlayerMovement = window.updatePlayerMovement;
    window.updatePlayerMovement = function (delta, isMoving, isBlocking) {
        if (!window.playerGroup) return;

        let speedModifier = 1.0;
        if (window.isCrouching) {
            speedModifier = 0.45;
        } else if (isBlocking) {
            speedModifier = 0.5;
        }

        const currentBaseSpeed = window.moveSpeed;
        window.moveSpeed = currentBaseSpeed * speedModifier;

        if (typeof originalUpdatePlayerMovement === 'function') {
            originalUpdatePlayerMovement(delta, isMoving, isBlocking);
        }

        window.moveSpeed = currentBaseSpeed;

        // ANIMACIÓN DE AGACHADO SUAVE (LERP)
        if (window.playerGroup) {
            window.playerGroup.scale.y = THREE.MathUtils.lerp(window.playerGroup.scale.y, targetYScale, 0.15);
        }
        if (window.camera) {
            if (originalCamY === null) originalCamY = window.camera.position.y;
            const targetCamPos = originalCamY + targetCamYOffset;
            window.camera.position.y = THREE.MathUtils.lerp(window.camera.position.y, targetCamPos, 0.15);
        }
    };

    // 3. INYECCIÓN DEL HUD DINÁMICO
    window.initBtnModFromConfig = function () {
        const rightControls = document.getElementById('right-controls');
        if (!rightControls) return;

        const configs = window.ModConfigs || {};
        const showNada = !!(configs.newbtn && configs.newbtn.enabled);
        const showCrouch = !!(configs.shbtn && configs.shbtn.enabled);
        const showSlide = !!(configs.slidebtn && configs.slidebtn.enabled);

        let rowBlock = document.getElementById('row-block');
        if (!rowBlock && (showSlide || showCrouch || showNada)) {
            rowBlock = document.createElement('div');
            rowBlock.id = 'row-block';
            rightControls.insertBefore(rowBlock, rightControls.firstChild);
        }

        let rowNadaEl = document.getElementById('row-nada');
        if (!rowNadaEl && (showNada || showCrouch)) {
            rowNadaEl = document.createElement('div');
            rowNadaEl.id = 'row-nada';
            rowNadaEl.style.display = 'flex';
            rowNadaEl.style.justifyContent = 'flex-end';
            rowNadaEl.style.gap = '12px';
            rightControls.insertBefore(rowNadaEl, rowBlock);
        }

        // Botón NADA
        let btnNada = document.getElementById('btnNada');
        if (showNada && !btnNada && rowNadaEl) {
            btnNada = document.createElement('button');
            btnNada.id = 'btnNada';
            btnNada.className = 'hud-custom-btn';
            btnNada.textContent = 'NADA';
            btnNada.type = 'button';
            rowNadaEl.appendChild(btnNada);
            bindButtonEvents(btnNada, window.ACTIONS.NADA);
        } else if (!showNada && btnNada) {
            btnNada.remove();
        }

        // Botón DESLIZO
        let btnSlide = document.getElementById('btnSlide');
        if (showSlide && !btnSlide && rowBlock) {
            btnSlide = document.createElement('button');
            btnSlide.id = 'btnSlide';
            btnSlide.className = 'hud-custom-btn';
            btnSlide.textContent = 'DESLIZO';
            btnSlide.type = 'button';
            rowBlock.insertBefore(btnSlide, rowBlock.firstChild);
            bindButtonEvents(btnSlide, window.ACTIONS.SLIDE, triggerSlide);
        } else if (!showSlide && btnSlide) {
            btnSlide.remove();
        }

        // Botón AGACHÓ
        let btnCrouch = document.getElementById('btnCrouch');
        if (showCrouch && !btnCrouch && rowNadaEl) {
            btnCrouch = document.createElement('button');
            btnCrouch.id = 'btnCrouch';
            btnCrouch.className = 'hud-custom-btn';
            btnCrouch.textContent = 'AGACHÓ';
            btnCrouch.type = 'button';
            rowNadaEl.insertBefore(btnCrouch, rowNadaEl.firstChild);
            bindButtonEvents(btnCrouch, window.ACTIONS.CROUCH, null, toggleCrouch);
        } else if (!showCrouch && btnCrouch) {
            btnCrouch.remove();
        }
    };

    window.destroyBtnMod = function () {
        ['btnNada', 'btnSlide', 'btnCrouch'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
    };

    // 4. LÓGICA DE ACCIONES Y EVENTOS
    function bindButtonEvents(element, actionBit, onPress, onToggle) {
        if (!element) return;

        const startAction = (e) => {
            e.preventDefault();
            element.classList.add('active');
            if (actionBit && window.setAction) window.setAction(actionBit, true);
            if (onPress) onPress();
            if (onToggle) onToggle(true);
        };

        const stopAction = (e) => {
            e.preventDefault();
            element.classList.remove('active');
            if (actionBit && window.setAction) window.setAction(actionBit, false);
            if (onToggle) onToggle(false);
        };

        if (window.bindEvents) {
            window.bindEvents(element, startAction, stopAction);
        } else {
            element.addEventListener('pointerdown', startAction);
            element.addEventListener('pointerup', stopAction);
            element.addEventListener('pointerleave', stopAction);
        }
    }

    function triggerSlide() {
        const isMoving = !!(window.activeActions & window.ACTIONS.JOYSTICK);
        if (!isMoving || !window.isGrounded || window.isSliding) return;

        const inputX = window.touchState?.inputX || 0;
        const inputY = window.touchState?.inputY || 0;
        const camThetaVal = window.touchState?.camTheta || 0;

        const forward = new THREE.Vector3(Math.sin(camThetaVal), 0, Math.cos(camThetaVal)).normalize();
        const right = new THREE.Vector3(Math.cos(camThetaVal), 0, -Math.sin(camThetaVal)).normalize();

        const slideDir = new THREE.Vector3();
        slideDir.addScaledVector(forward, inputY);
        slideDir.addScaledVector(right, inputX);

        if (slideDir.lengthSq() > 0) {
            slideDir.normalize();
            window.isSliding = true;

            if (window.camera) window.camera.position.y -= 0.6;

            const duration = 500;
            const baseForce = 20;
            const startTime = performance.now();
            let lastTime = startTime;

            const slideInterval = setInterval(() => {
                const now = performance.now();
                const delta = (now - lastTime) / 1000;
                lastTime = now;

                const elapsed = now - startTime;
                const progress = elapsed / duration;

                if (progress >= 1.0 || !window.isGrounded) {
                    window.isSliding = false;
                    if (window.camera) window.camera.position.y += 0.6;
                    clearInterval(slideInterval);
                } else if (window.playerGroup) {
                    const currentSpeed = baseForce * (1 - Math.pow(progress, 2));
                    window.playerGroup.position.x += slideDir.x * currentSpeed * delta;
                    window.playerGroup.position.z += slideDir.z * currentSpeed * delta;
                }
            }, 16);
        }
    }

    function toggleCrouch(enable) {
        if (window.isSliding) return;

        window.isCrouching = enable;
        if (enable) {
            targetYScale = 0.55;       // Se comprime el modelo a un 55% de su altura
            targetCamYOffset = -0.45;  // Baje de visión de la cámara
        } else {
            targetYScale = 1.0;
            targetCamYOffset = 0.0;
        }
    }

    // 5. CONTROL Y POLLING DE ESTADO
    function checkModState() {
        const configs = window.ModConfigs || {};
        const isActive = (configs.newbtn && configs.newbtn.enabled) ||
                         (configs.shbtn && configs.shbtn.enabled) ||
                         (configs.slidebtn && configs.slidebtn.enabled);

        if (isActive) {
            window.initBtnModFromConfig();
        } else {
            window.destroyBtnMod();
        }
    }

    window.addEventListener('DOMContentLoaded', checkModState);

    setInterval(() => {
        checkModState();
    }, 500);
})();

