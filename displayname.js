// js/Displayname.js
(function() {
    window.NameTagSystem = {
        // Almacena el listado de sprites y si corresponden al jugador local o no
        registeredTags: [],

        /**
         * Lee la posición del slider (0, 1, 2, 3) y devuelve si se debe mostrar la etiqueta.
         */
        shouldShow: function(isLocal) {
            const slider = document.getElementById('nameVisibilitySlider');
            const mode = slider ? parseInt(slider.value, 10) : 0;

            // Modo 0: Mostrar todos
            if (mode === 0) return true;

            // Modo 1: Ocultar solo mi nombre (Ajustado para la posición de tu slider)
            if (mode === 1) return isLocal;

            // Modo 2: Ocultar todos
            if (mode === 2) return false;

            // Modo 3: Ocultar solo demás (Ajustado para la posición de tu slider)
            if (mode === 3) return !isLocal;

            return true;
        },

        /**
         * Re-evalúa la visibilidad de todas las etiquetas activas en la escena.
         */
        updateAllVisibilities: function() {
            this.registeredTags.forEach(item => {
                if (item.sprite && item.sprite.parent) {
                    item.sprite.visible = this.shouldShow(item.isLocal);
                }
            });
        },

        /**
         * Genera una textura 2D en Canvas con el nombre y estilo correspondientes.
         */
        createNameTexture: function(username) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 512;
            canvas.height = 128;
            
            const isVidMC3 = (username.toLowerCase() === 'vidmc3');
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const fontSize = 42;
            ctx.font = `bold ${fontSize}px sans-serif, Arial`;

            if (isVidMC3) {
                // --- DIBUJAR INSIGNIA DORADA VECTORIAL ---
                const textWidth = ctx.measureText(username).width;
                const badgeRadius = 18;
                const gap = 12;
                const totalWidth = textWidth + (badgeRadius * 2) + gap;
                
                const startX = (canvas.width - totalWidth) / 2 + badgeRadius;
                const centerY = canvas.height / 2;

                const badgeGrad = ctx.createLinearGradient(
                    startX - badgeRadius, centerY - badgeRadius, 
                    startX + badgeRadius, centerY + badgeRadius
                );
                badgeGrad.addColorStop(0, '#FFE066');
                badgeGrad.addColorStop(0.5, '#FFD700');
                badgeGrad.addColorStop(1, '#B8860B');

                ctx.beginPath();
                ctx.arc(startX, centerY, badgeRadius, 0, Math.PI * 2);
                ctx.fillStyle = badgeGrad;
                ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
                ctx.shadowBlur = 10;
                ctx.fill();

                ctx.lineWidth = 2;
                ctx.strokeStyle = '#5c4300';
                ctx.stroke();

                // Checkmark (✓)
                ctx.beginPath();
                ctx.moveTo(startX - 6, centerY);
                ctx.lineTo(startX - 1, centerY + 5);
                ctx.lineTo(startX + 7, centerY - 5);
                ctx.lineWidth = 4;
                ctx.strokeStyle = '#14141f';
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.shadowBlur = 0;
                ctx.stroke();

                // --- DIBUJAR TEXTO DORADO ---
                const textX = startX + badgeRadius + gap + (textWidth / 2);
                const textGrad = ctx.createLinearGradient(0, centerY - 20, 0, centerY + 20);
                textGrad.addColorStop(0, '#FFF5C0');
                textGrad.addColorStop(0.3, '#FFD700');
                textGrad.addColorStop(1, '#DAA520');

                ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
                ctx.shadowBlur = 6;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;

                ctx.fillStyle = textGrad;
                ctx.fillText(username, textX, centerY);
                
                ctx.lineWidth = 1;
                ctx.strokeStyle = '#5c4300';
                ctx.strokeText(username, textX, centerY);

            } else {
                // --- DIBUJAR TEXTO NORMAL (BLANCO) ---
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;

                ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
                ctx.shadowBlur = 6;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;

                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(username, centerX, centerY);
            }

            return new THREE.CanvasTexture(canvas);
        },

        /**
         * Crea un Sprite 3D listo para adjuntar a la cabeza del personaje o NPC.
         */
        createNameSprite: function(username) {
            const texture = this.createNameTexture(username);
            const spriteMaterial = new THREE.SpriteMaterial({ 
                map: texture, 
                transparent: true,
                depthTest: false
            });
            
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(3, 0.75, 1);
            
            return sprite;
        },

        /**
         * Asigna una etiqueta de nombre sobre la cabeza de un objeto 3D.
         */
        attachToPlayer: function(playerMesh, username, offsetY = 2.2, isLocal = false) {
            const oldTag = playerMesh.getObjectByName("nameTagSprite");
            if (oldTag) {
                playerMesh.remove(oldTag);
                this.registeredTags = this.registeredTags.filter(t => t.sprite !== oldTag);
            }

            const nameSprite = this.createNameSprite(username);
            nameSprite.name = "nameTagSprite";
            nameSprite.position.set(0, offsetY, 0);
            
            nameSprite.visible = this.shouldShow(isLocal);

            playerMesh.add(nameSprite);

            this.registeredTags.push({
                sprite: nameSprite,
                isLocal: isLocal
            });

            return nameSprite;
        }
    };

    window.addEventListener('DOMContentLoaded', function() {
        const slider = document.getElementById('nameVisibilitySlider');
        if (slider) {
            slider.addEventListener('input', function() {
                window.NameTagSystem.updateAllVisibilities();
            });
        }
    });
})();

