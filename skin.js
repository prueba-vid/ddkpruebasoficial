function createKaiSkin() {
    const Box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
    const Mat = (color, roughness = 0.5, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

    // Proporciones equilibradas (Atlético / Estilizado)
    const GEOMS = { 
        torso: Box(0.38, 0.54, 0.22), 
        strap: Box(0.05, 0.55, 0.03), 
        belt: Box(0.39, 0.08, 0.23), 
        head: Box(0.35, 0.35, 0.35), 
        eye: Box(0.07, 0.09, 0.01), 
        pupil: Box(0.03, 0.04, 0.02), 
        earring: new THREE.TorusGeometry(0.03, 0.01, 8, 16), 
        hairBase: Box(0.37, 0.18, 0.37), 
        hairSpike: new THREE.ConeGeometry(0.06, 0.2, 4), 
        shoulderPad: Box(0.16, 0.1, 0.16), 
        armUpper: Box(0.13, 0.26, 0.13), 
        armFore: Box(0.14, 0.26, 0.14), 
        armBand: Box(0.15, 0.03, 0.15), 
        legMain: Box(0.15, 0.36, 0.15), 
        bootMain: Box(0.16, 0.12, 0.2) 
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
    
    // Torso Base
    const torso = new THREE.Mesh(GEOMS.torso, MATS.clothes); 
    torso.position.y = 0.82; 
    playerGroup.add(torso);

    // Cinturón y Straps
    const belt = new THREE.Mesh(GEOMS.belt, MATS.detail); 
    belt.position.y = -0.23; 
    belt.add(new THREE.Mesh(Box(0.1, 0.1, 0.25), MATS.gold)); 
    torso.add(belt);

    [-0.09, 0.09].forEach(x => { 
        const strap = new THREE.Mesh(GEOMS.strap, MATS.detail); 
        strap.position.set(x, 0, 0.105); 
        torso.add(strap); 
    });

    // Cabeza
    const headGroup = new THREE.Group(); 
    headGroup.position.y = 0.44; 
    headGroup.add(new THREE.Mesh(GEOMS.head, MATS.skin));

    // Ojos
    [-0.08, 0.08].forEach(x => { 
        const eye = new THREE.Mesh(GEOMS.eye, MATS.eye); 
        eye.position.set(x, 0, 0.178); 
        const pupil = new THREE.Mesh(GEOMS.pupil, MATS.pupil); 
        pupil.position.z = 0.005; 
        eye.add(pupil); 
        headGroup.add(eye); 
    });

    // Pendiente
    const earring = new THREE.Mesh(GEOMS.earring, MATS.gold); 
    earring.position.set(0.18, -0.04, 0); 
    earring.rotation.y = Math.PI / 2; 
    headGroup.add(earring);

    // Cabello
    const hairBase = new THREE.Mesh(GEOMS.hairBase, MATS.hair); 
    hairBase.position.y = 0.1; 
    headGroup.add(hairBase);

    [[-0.08, -0.15], [0.08, 0.15], [0, 0]].forEach(([x, rotZ]) => { 
        const spike = new THREE.Mesh(GEOMS.hairSpike, MATS.hair); 
        spike.position.set(x, 0.17, 0.04); 
        spike.rotation.z = rotZ; 
        headGroup.add(spike); 
    });
    torso.add(headGroup);

    // Brazos
    const createArmMesh = () => {
        const armGroup = new THREE.Group();
        const upperArm = new THREE.Mesh(GEOMS.armUpper, MATS.skin);
        const forearm = new THREE.Mesh(GEOMS.armFore, MATS.armor);
        const band = new THREE.Mesh(GEOMS.armBand, MATS.detail);
        
        upperArm.position.y = -0.13; 
        forearm.position.y = -0.26; 
        band.position.y = 0.03; 
        
        forearm.add(band); 
        upperArm.add(forearm); 
        armGroup.add(new THREE.Mesh(GEOMS.shoulderPad, MATS.armor), upperArm); 
        return armGroup;
    };

    const leftArm = createArmMesh();
    const rightArm = createArmMesh(); 
    leftArm.position.set(-0.25, 0.2, 0); 
    rightArm.position.set(0.25, 0.2, 0); 
    torso.add(leftArm, rightArm);

    // Piernas
    const createLegMesh = () => {
        const legGroup = new THREE.Group();
        const leg = new THREE.Mesh(GEOMS.legMain, MATS.clothes);
        const boot = new THREE.Mesh(GEOMS.bootMain, MATS.armor);
        
        leg.position.y = -0.18; 
        boot.position.set(0, -0.2, 0.025); 
        leg.add(boot); 
        legGroup.add(leg); 
        return legGroup;
    };

    const leftLeg = createLegMesh();
    const rightLeg = createLegMesh(); 
    leftLeg.position.set(-0.11, -0.27, 0); 
    rightLeg.position.set(0.11, -0.27, 0); 
    torso.add(leftLeg, rightLeg);

    return { playerGroup, torso, leftArm, rightArm, headGroup };
}

