// --- js/fpscontrol.js ---

window.FPSControl = {
    lastFrameTime: performance.now(),

    /**
     * Evalúa si el frame actual debe procesarse o saltarse según la configuración.
     * @param {number} currentTime Tiempo actual proveniente de requestAnimationFrame.
     * @returns {boolean} true si se debe renderizar, false si se debe omitir el frame.
     */
    shouldRenderFrame(currentTime) {
        if (!window.GameConfig || !window.GameConfig.limitFPS) {
            return true;
        }

        const target = window.GameConfig.targetFPS || 60;
        const interval = 1000 / target;
        const delta = currentTime - this.lastFrameTime;

        if (delta >= interval) {
            this.lastFrameTime = currentTime - (delta % interval);
            return true;
        }

        return false;
    }
};
