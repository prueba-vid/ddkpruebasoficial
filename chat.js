document.addEventListener("DOMContentLoaded", () => {
    const chatBtn = document.getElementById("chatBtn");
    const chatBox = document.getElementById("chatBox");
    const closeChatBtn = document.getElementById("closeChatBtn");
    const chatInput = document.getElementById("chatInput");
    const sendChatBtn = document.getElementById("sendChatBtn");
    const chatMessages = document.getElementById("chatMessages");
    const usernameInput = document.getElementById("usernameInput");
    const settingsModal = document.getElementById("settingsModal");

    // CONTROL DE SPAM (COOLDOWN)
    let lastMessageTime = 0;
    const COOLDOWN_TIME = 5000; // 5 segundos en milisegundos

    // LISTA DE RAÍCES Y PALABRAS PROHIBIDAS (GROSERÍAS Y CONTENIDO SEXUAL)
    const badWords = [
        // Español (insultos y modismos)
        "mierd", "puta", "puto", "pendej", "verg", "caraj", "ching",
        "joder", "jodid", "coño", "maric", "culer", "culo", "bastard",
        "cabron", "mamon", "porqueri", "zorr", "perra", "perro", "estupid", 
        "stupid", "mamag", "mamah", "suci", "maldit", "maldic",
        // Contenido explícito / sexual
        "teta", "titi", "pene", "vagina", "vagin", "sexo", "sejo", "seco", "chupa", 
        "boob", "tit", "dick", "cunt", "pussy", "cock", "penis", "vagina", "sex",
        "pecho", "seno", "desnuda", "desnudo", "pene", "vagina",
        // Inglés (insultos)
        "fuck", "fack", "fak", "shit", "bitch", "asshole", "bastard",
        "crap", "motherfuck", "whore", "slut", "damn"
    ];

    // Mapeo de números escritos con letras
    const numberWordsMap = {
        "cero": "0", "uno": "1", "dos": "2", "tres": "3", "cuatro": "4",
        "cinco": "5", "seis": "6", "siete": "7", "ocho": "8", "nueve": "9",
        "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
        "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9"
    };

    // Normaliza el texto para detectar leetspeak
    function normalizeText(text) {
        let clean = text
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita tildes
            .replace(/4|@|a/g, "a")
            .replace(/3|e/g, "e")
            .replace(/1|!|i|l/g, "i")
            .replace(/0|o/g, "o")
            .replace(/5|\$|s/g, "s")
            .replace(/7|t/g, "t")
            .replace(/8|b/g, "b")
            .replace(/x|z/g, "s")
            .replace(/w|v/g, "v");

        clean = clean.replace(/[^a-z]/g, "");
        clean = clean.replace(/(.)\1+/g, "$1");
        return clean;
    }

    // 1. Detección de groserías y palabras sexuales
    function containsProfanity(text) {
        const cleanText = normalizeText(text);
        return badWords.some(word => {
            const cleanWord = normalizeText(word);
            return cleanText.includes(cleanWord);
        });
    }

    // 2. Detección de patrones de Grooming / Pedofilia
    function containsGrooming(text) {
        const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const clean = normalizeText(text);

        const minorWords = ["nina", "nino", "menor", "peque", "hijita", "hijito", "loli", "underage", "kid", "child"];
        const suspiciousActions = [
            "manda", "envia", "pasa", "foto", "pic", "camara", "video", 
            "pecho", "seno", "cuerpo", "privado", "dm", "noche", "solas", 
            "hotel", "cuarto", "hablamenoche", "escribeme"
        ];

        const containsMinor = minorWords.some(w => lower.includes(w) || clean.includes(w));
        const containsAction = suspiciousActions.some(a => lower.includes(a) || clean.includes(a));

        if (containsMinor && containsAction) return true;

        const groomingPhrases = [
            /manda(s)?\s*(una)?\s*foto/i,
            /pasa(s)?\s*(una)?\s*foto/i,
            /envia(s)?\s*(una)?\s*foto/i,
            /que\s*edad\s*tienes/i,
            /cuantos\s*anos\s*tienes/i,
            /escribe(me)?\s*en\s*la\s*noche/i,
            /habla(me)?\s*al\s*privado/i,
            /te\s*ves\s*en\s*la\s*noche/i
        ];

        return groomingPhrases.some(regex => regex.test(lower));
    }

    // 3. Detección de números de teléfono
    function containsPhoneNumber(text) {
        let tempText = text.toLowerCase();

        Object.keys(numberWordsMap).forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, "g");
            tempText = tempText.replace(regex, numberWordsMap[word]);
        });

        const digitsOnly = tempText.replace(/\D/g, "");

        if (digitsOnly.length >= 7) return true;

        const phoneRegex = /(\+?\d{1,4}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/;
        return phoneRegex.test(text);
    }

    // Alternar visibilidad del chat
    function toggleChat() {
        if (!chatBox) return;
        const isOpen = chatBox.style.display === "flex";
        
        if (isOpen) {
            closeChat();
        } else {
            if (settingsModal) settingsModal.style.display = "none";
            chatBox.style.display = "flex";
            chatInput.focus();
        }
    }

    function closeChat() {
        chatBox.style.display = "none";
        chatBox.classList.remove("keyboard-active");
        chatInput.blur();
    }

    if (chatBtn) chatBtn.addEventListener("click", toggleChat);
    if (closeChatBtn) closeChatBtn.addEventListener("click", closeChat);

    // Agregar mensaje
    function addChatMessage(sender, text, isSystem = false) {
        if (!text.trim()) return;

        const msgDiv = document.createElement("div");
        msgDiv.className = "chat-msg";

        if (isSystem) {
            msgDiv.style.color = "#ff5555";
            msgDiv.style.fontStyle = "italic";
            msgDiv.textContent = text;
        } else {
            const senderSpan = document.createElement("span");
            senderSpan.className = "sender";
            senderSpan.textContent = sender + ": ";

            const textSpan = document.createElement("span");
            textSpan.textContent = text;

            msgDiv.appendChild(senderSpan);
            msgDiv.appendChild(textSpan);
        }

        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Enviar mensaje
    function handleSend() {
        const text = chatInput.value.trim();
        if (!text) return;

        const currentTime = Date.now();
        const timePassed = currentTime - lastMessageTime;

        // Validación de Cooldown (Anti-Spam)
        if (timePassed < COOLDOWN_TIME) {
            const timeLeft = Math.ceil((COOLDOWN_TIME - timePassed) / 1000);
            addChatMessage("", `⏳ Espera ${timeLeft} segundo(s) para enviar otro mensaje.`, true);
            return;
        }

        // Validación 1: Números de teléfono
        if (containsPhoneNumber(text)) {
            chatInput.value = "";
            addChatMessage("", "⚠️ No se permite compartir números de teléfono.", true);
            chatInput.focus();
            return;
        }

        // Validación 2: Grooming y seguridad de menores
        if (containsGrooming(text)) {
            chatInput.value = "";
            addChatMessage("", "⚠️ Este mensaje viola las normas de seguridad e integridad.", true);
            chatInput.focus();
            return;
        }

        // Validación 3: Groserías y términos explícitos
        if (containsProfanity(text)) {
            chatInput.value = "";
            addChatMessage("", "⚠️ Tu mensaje contiene lenguaje no permitido.", true);
            chatInput.focus();
            return;
        }

        const senderName = (usernameInput && usernameInput.value.trim()) 
            ? usernameInput.value.trim() 
            : "Jugador";

        // Registrar la hora del mensaje si se envía con éxito
        lastMessageTime = currentTime;

        addChatMessage(senderName, text);
        chatInput.value = "";
        chatInput.focus();
    }

    if (sendChatBtn) sendChatBtn.addEventListener("click", handleSend);

    if (chatInput) {
        // Enviar con Enter
        chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                handleSend();
            }
            e.stopPropagation();
        });

        chatInput.addEventListener("keyup", (e) => {
            e.stopPropagation();
        });

        // DETECCIÓN DE TECLADO MÓVIL
        chatInput.addEventListener("focus", () => {
            chatBox.classList.add("keyboard-active");
            window.scrollTo(0, 0);
            setTimeout(() => {
                chatInput.scrollIntoView({ block: "center", behavior: "instant" });
            }, 100);
        });

        chatInput.addEventListener("blur", () => {
            chatBox.classList.remove("keyboard-active");
        });
    }
});

