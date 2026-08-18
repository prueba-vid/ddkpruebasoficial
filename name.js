// js/name.js
(function() {
    const SECRET_CODE = "vidkai34346421";

    const BANNED_WORDS = [
        "sexo", "sex", "porno", "porn", "pene", "vagina", "pupu", "semen", "paja", "pajero", "pajera",
        "tetas", "panocha", "cuca", "pinga", "chupa", "chupame", "putero", "scort", "prostituta", "prostituto",
        "mierda", "puto", "puta", "pendejo", "pendeja", "verga", "carajo", 
        "marico", "marica", "bastardo", "mamaguevo", "maldito", "maldita", "perra", "perro",
        "malditodesarrollador", "perradecreador", "malditocreador", "perradecreador",
        "cabron", "cabrona", "zorra", "mamon", "mamona", "culero", "culera", "culo",
        "fuck", "fack", "fuk", "fck", "phuck", "phuk", "shit", "bitch", "asshole", 
        "cunt", "bastard", "dick", "cock", "pussy"
    ];

    window.activeUsers = []; 

    function getLevenshteinDistance(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

    function normalizeName(name) {
        let clean = name.toLowerCase();
        clean = clean.replace(/1/g, 'i')
                     .replace(/0/g, 'o')
                     .replace(/5/g, 's')
                     .replace(/3/g, 'e')
                     .replace(/4/g, 'a')
                     .replace(/@/g, 'a');
                     
        if (clean.startsWith('b')) clean = 'v' + clean.slice(1);
        clean = clean.replace(/(.)\1+/g, '$1');
        return clean;
    }

    window.NameSystem = {
        isValidFormat: function(name) {
            const regex = /^[a-zA-Z0-9]+$/;
            return regex.test(name);
        },

        containsBannedWords: function(name) {
            const lower = name.toLowerCase();
            const normalized = normalizeName(name);
            const phoneticFCheck = normalized.replace(/^f[a|e|i|o]c?k/g, 'fuck');

            return BANNED_WORDS.some(word => 
                lower.includes(word) || 
                normalized.includes(word) || 
                phoneticFCheck.includes(word)
            );
        },

        isDuplicate: function(name) {
            return window.activeUsers.some(u => u.toLowerCase() === name.toLowerCase());
        },

        isExactVidMC3: function(name) {
            return name.toLowerCase() === "vidmc3";
        },

        isVidMC3Variant: function(name) {
            const cleanInput = normalizeName(name);
            const target = "vidmc3";

            if (this.isExactVidMC3(name)) return false;
            if (cleanInput.includes("vidmc") || cleanInput.includes("idmc3")) return true;

            const distance = getLevenshteinDistance(cleanInput, target);
            return distance <= 2;
        },

        verifySecretCode: function(inputCode) {
            return inputCode === SECRET_CODE;
        },

        registerName: function(name) {
            if (!this.isDuplicate(name)) {
                window.activeUsers.push(name);
                window.playerUsername = name;

                if (typeof window.checkDevHitboxOption === 'function') {
                    window.checkDevHitboxOption();
                }
                return true;
            }
            return false;
        }
    };
})();

