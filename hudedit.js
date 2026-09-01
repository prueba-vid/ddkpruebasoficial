// --- js/hudedit.js ---

window.HUDEditor = {
    draggableIds: ['dashBtn', 'hitBtn', 'blockBtn', 'specBtn', 'jumpBtn'],
    selectedElement: null,
    isDragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,

    init() {
        this.draggables = this.draggableIds.map(id => document.getElementById(id)).filter(Boolean);
        this.createControlPanel();
        this.bindEvents();
        this.loadSavedPositions();
    },

    createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'hudScaleControlPanel';
        panel.style.cssText = `
            position: fixed; top: 15px; left: 50%; transform: translateX(-50%);
            background: rgba(20, 20, 31, 0.95); border: 1px solid rgba(255, 215, 0, 0.6);
            border-radius: 10px; padding: 10px 18px; display: none; align-items: center; gap: 15px;
            z-index: 1001; color: white; font-size: 12px; font-weight: bold; box-shadow: 0 0 10px rgba(0,0,0,0.5);
        `;
        panel.innerHTML = `
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
        document.body.appendChild(panel);

        this.panel = panel;
        this.scaleSlider = document.getElementById('hudScaleInputSlider');
        this.scaleVal = document.getElementById('hudScaleInputVal');
        this.opacitySlider = document.getElementById('hudOpacityInputSlider');
        this.opacityVal = document.getElementById('hudOpacityInputVal');
    },

    bindEvents() {
        if (this.scaleSlider) {
            this.scaleSlider.addEventListener('input', e => {
                if (!this.selectedElement) return;
                const val = parseFloat(e.target.value);
                this.applyScale(this.selectedElement, val);
                this.scaleVal.textContent = `${Math.round(val * 100)}%`;
                this.saveState(this.selectedElement);
            });
        }

        if (this.opacitySlider) {
            this.opacitySlider.addEventListener('input', e => {
                if (!this.selectedElement) return;
                const val = parseFloat(e.target.value);
                this.applyOpacity(this.selectedElement, val);
                this.opacityVal.textContent = `${Math.round(val * 100)}%`;
                this.saveState(this.selectedElement);
            });
        }

        this.draggables.forEach(el => {
            el.addEventListener('pointerdown', e => {
                if (!window.GameConfig || !window.GameConfig.hudEditing) return;

                if (this.selectedElement && this.selectedElement !== el) {
                    this.selectedElement.style.outline = 'none';
                }

                this.selectedElement = el;
                this.selectedElement.style.outline = '2px solid #ffd700';

                this.updatePanelValues(this.selectedElement);
                this.panel.style.display = 'flex';

                this.isDragging = true;
                const rect = el.getBoundingClientRect();
                this.dragOffsetX = e.clientX - rect.left;
                this.dragOffsetY = e.clientY - rect.top;

                el.setPointerCapture(e.pointerId);
                e.stopPropagation();
            });

            el.addEventListener('pointermove', e => {
                if (!this.isDragging || this.selectedElement !== el) return;

                let newLeft = e.clientX - this.dragOffsetX;
                let newTop = e.clientY - this.dragOffsetY;

                const rect = el.getBoundingClientRect();
                newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - rect.width));
                newTop = Math.max(0, Math.min(newTop, window.innerHeight - rect.height));

                el.style.position = 'fixed';
                el.style.left = `${newLeft}px`;
                el.style.top = `${newTop}px`;
            });

            el.addEventListener('pointerup', e => {
                if (!this.isDragging || this.selectedElement !== el) return;
                this.isDragging = false;
                el.releasePointerCapture(e.pointerId);
                this.saveState(el);
            });
        });
    },

    setEditingMode(enabled) {
        this.draggables.forEach(el => el.classList.toggle('hud-editing', enabled));
        if (!enabled) {
            if (this.panel) this.panel.style.display = 'none';
            if (this.selectedElement) {
                this.selectedElement.style.outline = 'none';
                this.selectedElement = null;
            }
        }
    },

    resetHUD() {
        this.draggableIds.forEach(id => localStorage.removeItem(`hud_pos_${id}`));
        this.draggables.forEach(el => {
            el.style.position = ''; el.style.left = ''; el.style.top = ''; el.style.transform = ''; el.style.opacity = '1';
            el.style.removeProperty('--hud-scale'); el.dataset.scale = '1.0'; el.dataset.opacity = '1.0';
            el.style.outline = 'none';
        });
        if (this.panel) this.panel.style.display = 'none';
        this.selectedElement = null;
    },

    applyScale(el, scale) {
        el.dataset.scale = scale;
        el.style.setProperty('--hud-scale', scale);
        el.style.transform = `scale(${scale})`;
    },

    applyOpacity(el, opacity) {
        el.dataset.opacity = opacity;
        el.style.opacity = opacity;
    },

    saveState(el) {
        if (!el) return;
        const data = {
            left: el.style.left,
            top: el.style.top,
            scale: el.dataset.scale || '1.0',
            opacity: el.dataset.opacity || '1.0'
        };
        localStorage.setItem(`hud_pos_${el.id}`, JSON.stringify(data));
    },

    updatePanelValues(el) {
        const curScale = parseFloat(el.dataset.scale || '1.0');
        const curOpacity = parseFloat(el.dataset.opacity || '1.0');

        this.scaleSlider.value = curScale;
        this.scaleVal.textContent = `${Math.round(curScale * 100)}%`;

        this.opacitySlider.value = curOpacity;
        this.opacityVal.textContent = `${Math.round(curOpacity * 100)}%`;
    },

    loadSavedPositions() {
        this.draggableIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;

            const savedData = localStorage.getItem(`hud_pos_${id}`);
            if (savedData) {
                try {
                    const data = JSON.parse(savedData);
                    if (data.left && data.top) {
                        el.style.position = 'fixed';
                        el.style.left = data.left;
                        el.style.top = data.top;
                    }
                    if (data.scale) this.applyScale(el, parseFloat(data.scale));
                    if (data.opacity) this.applyOpacity(el, parseFloat(data.opacity));
                } catch (err) {
                    console.error("Error al cargar posición del HUD:", err);
                }
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.HUDEditor.init();
});
