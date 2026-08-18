// js/skin.js

// ==========================================
// SKIN 1: KAI
// ==========================================
function createKaiSkin() {
    const Box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
    const Mat = (color, roughness = 0.5, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

    const GEOMS = { 
        torso: Box(0.42, 0.52, 0.26), 
        strap: Box(0.06, 0.53, 0.03), 
        belt: Box(0.44, 0.08, 0.28), 
        head: Box(0.52, 0.45, 0.45), 
        eye: Box(0.1, 0.13, 0.01), 
        pupil: Box(0.04, 0.06, 0.02), 
        earring: new THREE.TorusGeometry(0.04, 0.012, 8, 16), 
        hairBase: Box(0.56, 0.26, 0.5), 
        hairSpike: new THREE.ConeGeometry(0.09, 0.28, 4), 
        shoulderPad: Box(0.18, 0.1, 0.18), 
        armUpper: Box(0.12, 0.2, 0.12), 
        armFore: Box(0.14, 0.2, 0.14), 
        armBand: Box(0.15, 0.03, 0.15), 
        legMain: Box(0.14, 0.32, 0.14), 
        bootMain: Box(0.15, 0.1, 0.2) 
    };

    const MATS = { 
        skin: Mat(0xffccaa), 
        hair: Mat(0x3d2320, 0.7), 
        eye: Mat(0xcc0000, 0.2), 
        pupil: Mat(0x000000), 
        clothes: Mat(0x5c4033, 0.6), 
        detail: Mat(0x1a1a1a, 0.8), 
        armor: Mat(0x2b1e19, 0.4, 0.2), 
        gold: Mat(0xd4af37, 0.2, 0.9) 
    };

    const playerGroup = new THREE.Group();
    
    const torso = new THREE.Mesh(GEOMS.torso, MATS.clothes); 
    torso.position.y = 0.73; 
    playerGroup.add(torso);

    const belt = new THREE.Mesh(GEOMS.belt, MATS.detail); 
    belt.position.y = -0.22; 
    belt.add(new THREE.Mesh(Box(0.1, 0.1, 0.3), MATS.gold)); 
    torso.add(belt);

    [-0.1, 0.1].forEach(x => { 
        const strap = new THREE.Mesh(GEOMS.strap, MATS.detail); 
        strap.position.set(x, 0, 0.12); 
        torso.add(strap); 
    });

    const headGroup = new THREE.Group(); 
    headGroup.position.y = 0.42; 
    headGroup.add(new THREE.Mesh(GEOMS.head, MATS.skin));

    [-0.13, 0.13].forEach(x => { 
        const eye = new THREE.Mesh(GEOMS.eye, MATS.eye); 
        eye.position.set(x, 0, 0.226); 
        const pupil = new THREE.Mesh(GEOMS.pupil, MATS.pupil); 
        pupil.position.z = 0.005; 
        eye.add(pupil); 
        headGroup.add(eye); 
    });

    const earring = new THREE.Mesh(GEOMS.earring, MATS.gold); 
    earring.position.set(0.27, -0.03, 0); 
    earring.rotation.y = Math.PI / 2; 
    headGroup.add(earring);

    const hairBase = new THREE.Mesh(GEOMS.hairBase, MATS.hair); 
    hairBase.position.y = 0.13; 
    headGroup.add(hairBase);

    [[-0.13, -0.2], [0.13, 0.2], [0, 0]].forEach(([x, rotZ]) => { 
        const spike = new THREE.Mesh(GEOMS.hairSpike, MATS.hair); 
        spike.position.set(x, 0.26, 0.1); 
        spike.rotation.z = rotZ; 
        headGroup.add(spike); 
    });
    torso.add(headGroup);

    const createArmMesh = () => {
        const armGroup = new THREE.Group();
        const upperArm = new THREE.Mesh(GEOMS.armUpper, MATS.skin);
        const forearm = new THREE.Mesh(GEOMS.armFore, MATS.armor);
        const band = new THREE.Mesh(GEOMS.armBand, MATS.detail);
        
        upperArm.position.y = -0.1; 
        forearm.position.y = -0.26; 
        band.position.y = 0.03; 
        
        forearm.add(band); 
        upperArm.add(forearm); 
        armGroup.add(new THREE.Mesh(GEOMS.shoulderPad, MATS.armor), upperArm); 
        return armGroup;
    };

    const leftArm = createArmMesh();
    const rightArm = createArmMesh(); 
    leftArm.position.set(-0.27, 0.2, 0); 
    rightArm.position.set(0.27, 0.2, 0); 
    leftArm.rotation.set(-0.6, 0, -0.3); 
    rightArm.rotation.set(-0.6, 0, 0.3); 
    torso.add(leftArm, rightArm);

    const createLegMesh = () => {
        const legGroup = new THREE.Group();
        const leg = new THREE.Mesh(GEOMS.legMain, MATS.clothes);
        const boot = new THREE.Mesh(GEOMS.bootMain, MATS.armor);
        
        leg.position.y = -0.16; 
        boot.position.set(0, -0.21, 0.03); 
        leg.add(boot); 
        legGroup.add(leg); 
        return legGroup;
    };

    const leftLeg = createLegMesh();
    const rightLeg = createLegMesh(); 
    leftLeg.position.set(-0.13, -0.26, 0); 
    rightLeg.position.set(0.13, -0.26, 0); 
    torso.add(leftLeg, rightLeg);

    return { playerGroup, torso, leftArm, rightArm };
}

