// --- js/resolution.js ---

window.ResolutionManager = {
    resLabels: {
        "0.25": "144p",
        "0.5": "360p",
        "0.75": "720p",
        "1": "1080p",
        "1.25": "1440p",
        "1.5": "2K",
        "1.75": "2K+",
        "2": "4K"
    },

    /**
     * Devuelve el texto formateado según el valor de escala de resolución
     * @param {number} scale 
     * @returns {string}
     */
    getResolutionLabel(scale) {
        const key = scale.toString();
        const label = this.resLabels[key] || `${Math.round(scale * 100)}%`;
        return `${Math.round(scale * 100)}% (${label})`;
    },

    /**
     * Aplica el valor de resolución al estado global y ejecuta el callback correspondiente
     * @param {number} val 
     * @param {HTMLElement} resValueEl 
     */
    setResolution(val, resValueEl) {
        if (window.GameConfig) {
            window.GameConfig.resolutionScale = val;
        }
        
        if (resValueEl) {
            resValueEl.textContent = this.getResolutionLabel(val);
        }

        if (typeof window.applyResolutionSettings === 'function') {
            window.applyResolutionSettings(val);
        }
    },

    /**
     * Inicializa los listeners de UI para la resolución
     */
    init() {
        const resSlider = document.getElementById('resSlider');
        const resValue = document.getElementById('resValue');

        if (resSlider && resValue) {
            resSlider.addEventListener('input', e => {
                const val = parseFloat(e.target.value);
                this.setResolution(val, resValue);
            });
        }
    }
};

// Se ejecuta al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    window.ResolutionManager.init();
});
