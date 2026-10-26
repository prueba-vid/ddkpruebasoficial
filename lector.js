window.ModReader = (function() {
    // Almacena las configuraciones globales leídas de los mods activos
    window.ModConfigs = {
        hotbar: { enabled: false, value: 9 },
        newbtn: { enabled: false },
        shbtn: { enabled: false },
        slidebtn: { enabled: false }
    };

    /**
     * Parsea la sintaxis del archivo .ddkmod sin usar JSON.
     * Espera líneas como: 
     * - Hotbar = true = 9
     * - newbtn = true
     * - shbtn = true
     * - slidebtn = true
     */
    function parseDDKMod(text) {
        const lines = text.split(/\r?\n/);
        const config = {
            hotbar: { enabled: false, value: 9 },
            newbtn: { enabled: false },
            shbtn: { enabled: false },
            slidebtn: { enabled: false }
        };

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

            const parts = trimmed.split('=').map(p => p.trim());
            const varName = parts[0].toLowerCase();

            // Hotbar = boolean = número
            if (parts.length >= 3 && varName === 'hotbar') {
                const isTrue = parts[1].toLowerCase() === 'true';
                let numVal = parseInt(parts[2], 10);
                if (isNaN(numVal)) numVal = 9;
                numVal = Math.max(1, Math.min(20, numVal));

                config.hotbar = { enabled: isTrue, value: numVal };
            } 
            // Botón NADA
            else if (parts.length >= 2 && varName === 'newbtn') {
                config.newbtn = { enabled: parts[1].toLowerCase() === 'true' };
            }
            // Botón AGACHÓ ( Crouch )
            else if (parts.length >= 2 && varName === 'shbtn') {
                config.shbtn = { enabled: parts[1].toLowerCase() === 'true' };
            }
            // Botón DESLIZO ( Slide )
            else if (parts.length >= 2 && varName === 'slidebtn') {
                config.slidebtn = { enabled: parts[1].toLowerCase() === 'true' };
            }
        });

        return config;
    }

    function readModFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(parseDDKMod(e.target.result));
            reader.onerror = (err) => reject(err);
            reader.readAsText(file);
        });
    }

    function applyActiveMods(activeModsList) {
        // Reset a false por defecto
        window.ModConfigs.hotbar = { enabled: false, value: 9 };
        window.ModConfigs.newbtn = { enabled: false };
        window.ModConfigs.shbtn = { enabled: false };
        window.ModConfigs.slidebtn = { enabled: false };

        activeModsList.forEach(mod => {
            if (mod.config) {
                if (mod.config.hotbar && mod.config.hotbar.enabled) {
                    window.ModConfigs.hotbar = mod.config.hotbar;
                }
                if (mod.config.newbtn && mod.config.newbtn.enabled) {
                    window.ModConfigs.newbtn = mod.config.newbtn;
                }
                if (mod.config.shbtn && mod.config.shbtn.enabled) {
                    window.ModConfigs.shbtn = mod.config.shbtn;
                }
                if (mod.config.slidebtn && mod.config.slidebtn.enabled) {
                    window.ModConfigs.slidebtn = mod.config.slidebtn;
                }
            }
        });
    }

    return {
        readModFile,
        applyActiveMods
    };
})();

