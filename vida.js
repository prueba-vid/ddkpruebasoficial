// vida.js - Sistema de Barra de Vida GUI (inyecta su propio CSS)

(function () {
    // 1. INYECCIÓN DINÁMICA DE ESTILOS CSS
    const style = document.createElement('style');
    style.textContent = `
        /* Contenedor principal de la barra de vida HUD */
        #player-hud-health-container {
            position: absolute;
            top: 20px;
            right: 80px; /* Posicionado a la izquierda del botón #fsBtn (que está en right: 20px con ancho 50px) */
            width: 160px;
            height: 22px;
            background: rgba(0, 0, 0, 0.65);
            border: 2px solid rgba(255, 255, 255, 0.6);
            border-radius: 12px;
            overflow: hidden;
            z-index: 15;
            box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
            touch-action: none;
        }

        /* Relleno dinámico de la vida */
        #player-hud-health-fill {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            width: 100%;
            background-color: #32cd32; /* Verde Lima inicial */
            transition: width 0.2s ease-out, background-color 0.3s ease;
            border-radius: 10px 0 0 10px;
        }

        /* Texto numérico de la vida sobre la barra */
        #player-hud-health-text {
            position: relative;
            z-index: 2;
            color: #ffffff;
            font-family: sans-serif;
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 1px;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.9);
        }
    `;
    document.head.appendChild(style);

    // 2. CREACIÓN DE ELEMENTOS EN EL DOM
    let hudFill = null;
    let hudText = null;

    function createHUD() {
        if (document.getElementById('player-hud-health-container')) return;

        const container = document.createElement('div');
        container.id = 'player-hud-health-container';

        hudFill = document.createElement('div');
        hudFill.id = 'player-hud-health-fill';

        hudText = document.createElement('span');
        hudText.id = 'player-hud-health-text';
        hudText.textContent = `${typeof playerHealth !== 'undefined' ? Math.ceil(playerHealth) : 600} / ${typeof PLAYER_MAX_HEALTH !== 'undefined' ? PLAYER_MAX_HEALTH : 600}`;

        container.appendChild(hudFill);
        container.appendChild(hudText);
        document.body.appendChild(container);
    }

    // 3. ACTUALIZACIÓN Y LÓGICA DE COLORES
    window.updatePlayerHUDHealth = function () {
        if (!hudFill || !hudText) return;

        const currentHp = typeof playerHealth !== 'undefined' ? playerHealth : 600;
        const maxHp = typeof PLAYER_MAX_HEALTH !== 'undefined' ? PLAYER_MAX_HEALTH : 600;

        const pct = Math.max(0, Math.min(1, currentHp / maxHp));

        // Actualiza el ancho de la barra y el texto numérico
        hudFill.style.width = `${pct * 100}%`;
        hudText.textContent = `${Math.ceil(currentHp)} / ${maxHp}`;

        // Selección de los 3 colores específicos:
        // - Verde Lima: Mayor parte de la vida (por encima del 50%)
        // - Amarillo no tan fuerte: Mitad de vida (entre 25% y 50%)
        // - Rojo no tan fuerte: Un cuarto de vida (25% o menos)
        if (pct > 0.50) {
            hudFill.style.backgroundColor = '#32cd32'; // Verde Lima
        } else if (pct > 0.25) {
            hudFill.style.backgroundColor = '#e6c642'; // Amarillo suave / no tan fuerte
        } else {
            hudFill.style.backgroundColor = '#d9534f'; // Rojo suave / no pasión
        }
    };

    // Inicializar al cargar la página
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            createHUD();
            updatePlayerHUDHealth();
        });
    } else {
        createHUD();
        updatePlayerHUDHealth();
    }
})();
