// 1. Instanciar geometrías Y materiales UNA sola vez fuera de la función
const KAI_GEOMS = {
    torso: new THREE.BoxGeometry(0.38, 0.54, 0.22),
    chestPlate: new THREE.BoxGeometry(0.39, 0.28, 0.04),
    strap: new THREE.BoxGeometry(0.06, 0.56, 0.04),
    belt: new THREE.BoxGeometry(0.40, 0.08, 0.24),
    beltBuckle: new THREE.BoxGeometry(0.11, 0.11, 0.26),
    head: new THREE.BoxGeometry(0.35, 0.35, 0.35),
    eye: new THREE.BoxGeometry(0.07, 0.09, 0.02),
    pupil: new THREE.BoxGeometry(0.03, 0.04, 0.025),
    earring: new THREE.TorusGeometry(0.035, 0.012, 8, 16),
    hairBase: new THREE.BoxGeometry(0.38, 0.19, 0.38),
    hairSpike: new THREE.ConeGeometry(0.065, 0.22, 4),
    hairFringe: new THREE.BoxGeometry(0.36, 0.08, 0.05),
    shoulderPad: new THREE.BoxGeometry(0.18, 0.12, 0.18),
    armUpper: new THREE.BoxGeometry(0.13, 0.26, 0.13),
    armFore: new THREE.BoxGeometry(0.145, 0.26, 0.145),
    armBand: new THREE.BoxGeometry(0.16, 0.04, 0.16),
    legMain: new THREE.BoxGeometry(0.15, 0.36, 0.15),
    kneePad: new THREE.BoxGeometry(0.16, 0.08, 0.04),
    bootMain: new THREE.BoxGeometry(0.17, 0.13, 0.21)
};

const KAI_MATS = {
    skin: new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.6, metalness: 0.0 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x3d2320, roughness: 0.8, metalness: 0.0 }),
    eye: new THREE.MeshStandardMaterial({ color: 0xff1a1a, roughness: 0.1, metalness: 0.1, emissive: 0x550000, emissiveIntensity: 0.4 }),
    pupil: new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.2, metalness: 0.0 }),
    clothes: new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.7, metalness: 0.0 }),
    detail: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.1 }),
    armor: new THREE.MeshStandardMaterial({ color: 0x2b1e19, roughness: 0.3, metalness: 0.2 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.9 })
};

// Auxiliares estáticos
function createArmMesh() {
    const armGroup = new THREE.Group();
    const upperArm = new THREE.Mesh(KAI_GEOMS.armUpper, KAI_MATS.skin);
    const forearm = new THREE.Mesh(KAI_GEOMS.armFore, KAI_MATS.armor);
    const band = new THREE.Mesh(KAI_GEOMS.armBand, KAI_MATS.detail);
    
    upperArm.position.y = -0.13; 
    forearm.position.y = -0.26; 
    band.position.y = 0.03; 
    
    forearm.add(band); 
    upperArm.add(forearm); 
    armGroup.add(new THREE.Mesh(KAI_GEOMS.shoulderPad, KAI_MATS.armor), upperArm); 
    return armGroup;
}

function createLegMesh() {
    const legGroup = new THREE.Group();
    const leg = new THREE.Mesh(KAI_GEOMS.legMain, KAI_MATS.clothes);
    const kneePad = new THREE.Mesh(KAI_GEOMS.kneePad, KAI_MATS.armor);
    const boot = new THREE.Mesh(KAI_GEOMS.bootMain, KAI_MATS.armor);
    
    leg.position.y = -0.18; 
    kneePad.position.set(0, 0, 0.065);
    boot.position.set(0, -0.2, 0.025); 
    
    leg.add(kneePad);
    leg.add(boot); 
    legGroup.add(leg); 
    return legGroup;
}

// 2. Función limpia y ligera
function createKaiSkin() {
    const playerGroup = new THREE.Group(); 
    
    const torso = new THREE.Mesh(KAI_GEOMS.torso, KAI_MATS.clothes); 
    torso.position.y = 0.82; 
    playerGroup.add(torso);

    const chestPlate = new THREE.Mesh(KAI_GEOMS.chestPlate, KAI_MATS.clothes);
    chestPlate.position.set(0, 0.1, 0.10);
    torso.add(chestPlate);

    const belt = new THREE.Mesh(KAI_GEOMS.belt, KAI_MATS.detail); 
    belt.position.y = -0.23; 
    const buckle = new THREE.Mesh(KAI_GEOMS.beltBuckle, KAI_MATS.gold);
    belt.add(buckle); 
    torso.add(belt);

    [-0.09, 0.09].forEach(x => { 
        const strap = new THREE.Mesh(KAI_GEOMS.strap, KAI_MATS.detail); 
        strap.position.set(x, 0, 0.11); 
        torso.add(strap); 
    });

    const headGroup = new THREE.Group(); 
    headGroup.position.y = 0.44; 
    headGroup.add(new THREE.Mesh(KAI_GEOMS.head, KAI_MATS.skin));

    [-0.08, 0.08].forEach(x => { 
        const eye = new THREE.Mesh(KAI_GEOMS.eye, KAI_MATS.eye); 
        eye.position.set(x, 0, 0.178); 
        const pupil = new THREE.Mesh(KAI_GEOMS.pupil, KAI_MATS.pupil); 
        pupil.position.z = 0.005; 
        eye.add(pupil); 
        headGroup.add(eye); 
    });

    const earring = new THREE.Mesh(KAI_GEOMS.earring, KAI_MATS.gold); 
    earring.position.set(0.185, -0.04, 0); 
    earring.rotation.y = Math.PI / 2; 
    headGroup.add(earring);

    const hairBase = new THREE.Mesh(KAI_GEOMS.hairBase, KAI_MATS.hair); 
    hairBase.position.y = 0.1; 
    headGroup.add(hairBase);

    const hairFringe = new THREE.Mesh(KAI_GEOMS.hairFringe, KAI_MATS.hair);
    hairFringe.position.set(0, 0.15, 0.17);
    headGroup.add(hairFringe);

    [[-0.08, -0.15], [0.08, 0.15], [0, 0]].forEach(([x, rotZ]) => { 
        const spike = new THREE.Mesh(KAI_GEOMS.hairSpike, KAI_MATS.hair); 
        spike.position.set(x, 0.18, 0.04); 
        spike.rotation.z = rotZ; 
        headGroup.add(spike); 
    });
    torso.add(headGroup);

    const leftArm = createArmMesh();
    const rightArm = createArmMesh(); 
    leftArm.position.set(-0.26, 0.2, 0); 
    rightArm.position.set(0.26, 0.2, 0); 
    torso.add(leftArm, rightArm);

    const leftLeg = createLegMesh();
    const rightLeg = createLegMesh(); 
    leftLeg.position.set(-0.11, -0.27, 0); 
    rightLeg.position.set(0.11, -0.27, 0); 
    torso.add(leftLeg, rightLeg);

    return { playerGroup, torso, leftArm, rightArm, headGroup };
}

