// js/personaje.js

// Reglas y creadores asignados por personaje
const CHARACTER_REGISTRY = {
    funetsu: {
        name: 'Funetsu',
        create: () => (typeof createFunetsuSkin === 'function' ? createFunetsuSkin() : createKaiSkin()),
        reset: (scene, group) => typeof resetFunetsuState === 'function' && resetFunetsuState(scene, group),
        processSkills: (group, scene, actions) => {
            if (actions & ACTIONS.ESPECIAL) typeof useFunetsuSpecial === 'function' && useFunetsuSpecial(group, actions);
            if (actions & ACTIONS.ACT1) typeof useFunetsuAct1 === 'function' && useFunetsuAct1(group, scene, actions);
            if (actions & ACTIONS.ACT2) typeof useFunetsuAct2 === 'function' && useFunetsuAct2(group, scene, actions);
            if (actions & ACTIONS.ACT3) typeof useFunetsuAct3 === 'function' && useFunetsuAct3(group, scene, actions);
            if (actions & ACTIONS.ACT4) typeof useFunetsuAct4 === 'function' && useFunetsuAct4(group, scene, actions);
        }
    },
    arisa: {
        name: 'Arisa',
        create: () => (typeof createArisaSkin === 'function' ? createArisaSkin() : createKaiSkin()),
        reset: (scene, group) => typeof resetArisaState === 'function' && resetArisaState(scene, group),
        processSkills: (group, scene, actions) => {
            if (actions & ACTIONS.ESPECIAL) typeof useArisaSpecial === 'function' && useArisaSpecial(group, actions);
            if (actions & ACTIONS.ACT1) typeof useArisaAct1 === 'function' && useArisaAct1(group, scene, actions);
            if (actions & ACTIONS.ACT2) typeof useArisaAct2 === 'function' && useArisaAct2(group, scene, actions);
            if (actions & ACTIONS.ACT3) typeof useArisaAct3 === 'function' && useArisaAct3(group, scene, actions);
            if (actions & ACTIONS.ACT4) typeof holdArisaAct4 === 'function' && holdArisaAct4(group, scene, actions);
        }
    },
    itsuki: {
        name: 'Itsuki',
        create: () => createItsukiSkin(),
        reset: (scene, group) => typeof resetItsukiState === 'function' && resetItsukiState(scene, group),
        processSkills: (group, scene, actions) => {
            if (actions & ACTIONS.ESPECIAL) typeof useItsukiSpecial === 'function' && useItsukiSpecial(group, actions);
            if (actions & ACTIONS.ACT1) typeof useItsukiAct1 === 'function' && useItsukiAct1(group, scene, actions);
            if (actions & ACTIONS.ACT2) typeof useItsukiAct2 === 'function' && useItsukiAct2(group, scene, actions);
            if (actions & ACTIONS.ACT3) typeof useItsukiAct3 === 'function' && useItsukiAct3(group, scene, actions);
            if (actions & ACTIONS.ACT4) typeof useItsukiAct4 === 'function' && useItsukiAct4(group, scene, actions);
        }
    },
    kenji: {
        name: 'Kenji',
        create: () => (typeof createKenjiSkin === 'function' ? createKenjiSkin() : createKaiSkin()),
        reset: (scene, group) => typeof resetKenjiState === 'function' && resetKenjiState(scene, group),
        processSkills: (group, scene, actions) => {
            if (actions & ACTIONS.ESPECIAL) typeof useKenjiSpecial === 'function' && useKenjiSpecial(group, actions);
            if (actions & ACTIONS.ACT1) typeof useKenjiAct1 === 'function' && useKenjiAct1(group, scene, actions);
            if (actions & ACTIONS.ACT2) typeof useKenjiAct2 === 'function' && useKenjiAct2(group, scene, actions);
            if (actions & ACTIONS.ACT3) typeof useKenjiAct3 === 'function' && useKenjiAct3(group, scene, actions);
            if (actions & ACTIONS.ACT4) typeof useKenjiAct4 === 'function' && useKenjiAct4(group, scene, actions);
        }
    },
    ryu: {
        name: 'Ryu',
        create: () => (typeof createRyuSkin === 'function' ? createRyuSkin() : createKaiSkin()),
        reset: () => {},
        processSkills: () => {}
    },
    kai: {
        name: 'Kai',
        create: () => (typeof createKaiSkin === 'function' ? createKaiSkin() : { playerGroup: new THREE.Group() }),
        reset: () => {},
        processSkills: () => {}
    }
};

// Creador helper para Itsuki manteniendo compatibilidad
function createItsukiSkin() {
    if (typeof createItsukiMaterial === 'function') {
        const base = typeof createKaiSkin === 'function' ? createKaiSkin() : { playerGroup: new THREE.Group() };
        const mat = createItsukiMaterial();
        base.playerGroup.traverse(child => {
            if (child.isMesh) child.material = mat;
        });
        return base;
    }
    return typeof createKaiSkin === 'function' ? createKaiSkin() : { playerGroup: new THREE.Group() };
}

// Resuelve la skin seleccionada a una clave válida
function resolveSkinKey(skinName) {
    const skin = (skinName || '').toLowerCase();
    for (const key of Object.keys(CHARACTER_REGISTRY)) {
        if (skin.includes(key)) return key;
    }
    return 'kai';
}

// Carga la skin actual y actualiza variables globales
window.loadPlayerSkin = function() {
    const savedSkin = localStorage.getItem('selectedSkin') || 'clasica';
    const skinKey = resolveSkinKey(savedSkin);
    const config = CHARACTER_REGISTRY[skinKey];

    window.currentCharacterKey = skinKey;
    window.currentCharacter = config.name;

    return config.create();
};

// Procesa las habilidades continuas invocando el handler del personaje actual
window.processContinuousSkills = function(delta, currentScene) {
    const key = window.currentCharacterKey || 'kai';
    const config = CHARACTER_REGISTRY[key];
    if (config && typeof config.processSkills === 'function') {
        config.processSkills(window.playerGroup, currentScene, window.activeActions);
    }
};

// Resetea los estados específicos del personaje activo
window.resetCharacterStateCustom = function(scene, playerGroup) {
    const key = window.currentCharacterKey || 'kai';
    const config = CHARACTER_REGISTRY[key];
    if (config && typeof config.reset === 'function') {
        config.reset(scene, playerGroup);
    }
};

