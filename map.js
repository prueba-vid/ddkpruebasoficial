// --- js/map.js ---

window.mapColliders = [];

/**
 * Crea la Plaza Central Limpia (Sin fuente central, libre para PVP) y la Zona Secundaria
 */
function createMap(scene) {
    const mapSize = 80;
    window.mapColliders = []; // Limpiar lista de colisiones

    // Background y Niebla
    scene.background = new THREE.Color(0x181a1f);
    scene.fog = null;

    // Luz Principal Sombra Optimizada para Móvil
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(25, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(512, 512); // Sombras fluidas sin lag
    dirLight.shadow.bias = -0.0005;

    const ambientLight = new THREE.AmbientLight(0x707885, 0.7);
    scene.add(dirLight, ambientLight);

    // Textura de Adoquines Compartida
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#32353b';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#212328';
    ctx.lineWidth = 3;

    const tileSize = 32;
    for (let y = 0; y < 256; y += tileSize) {
        for (let x = 0; x < 256; x += tileSize) {
            const offsetX = (y / tileSize) % 2 === 0 ? 0 : tileSize / 2;
            ctx.strokeRect(x + offsetX, y, tileSize, tileSize);
        }
    }

    const cobbleTexture = new THREE.CanvasTexture(canvas);
    cobbleTexture.wrapS = THREE.RepeatWrapping;
    cobbleTexture.wrapT = THREE.RepeatWrapping;
    cobbleTexture.repeat.set(16, 16);

    const mapMaterial = new THREE.MeshStandardMaterial({ 
        map: cobbleTexture,
        roughness: 0.7 
    });

    // MAPA PRINCIPAL
    const mapGeometry = new THREE.BoxGeometry(mapSize, 0.5, mapSize);
    const map = new THREE.Mesh(mapGeometry, mapMaterial);
    map.position.set(0, -0.25, 0);
    map.receiveShadow = true;
    scene.add(map);

    // Muros Perimetrales Mapa Principal
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1d2024, roughness: 0.8 });
    const wallThickness = 3;
    const wallHeight = 6;
    const halfMap = mapSize / 2;

    const mainBordersData = [
        [mapSize + wallThickness*2, wallHeight, wallThickness, 0, wallHeight/2, -halfMap - wallThickness/2],
        [mapSize + wallThickness*2, wallHeight, wallThickness, 0, wallHeight/2, halfMap + wallThickness/2],
        [wallThickness, wallHeight, mapSize, -halfMap - wallThickness/2, wallHeight/2, 0],
        [wallThickness, wallHeight, mapSize, halfMap + wallThickness/2, wallHeight/2, 0]
    ];

    mainBordersData.forEach(([w, h, d, x, y, z]) => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
        wall.position.set(x, y, z);
        wall.receiveShadow = true;
        wall.castShadow = true;
        scene.add(wall);

        wall.updateMatrixWorld(true);
        const wallBox = new THREE.Box3().setFromObject(wall);
        window.mapColliders.push(wallBox);
    });

    // Elementos perimetrales del mapa base (Bancos, Jardineras, Faroles)
    createPlazaElements(scene);

    // NUEVA ZONA SECUNDARIA (Aislada, compacta y sin decoración)
    createSecondaryZone(scene, mapMaterial, wallMat);

    return { map, dirLight };
}

function createSecondaryZone(scene, mapMaterial, wallMat) {
    const secSize = 40; // Tamaño reducido
    const offsetX = 150; // Distancia desde el mapa principal
    const offsetZ = 0;
    const wallThickness = 3;
    const wallHeight = 8; // Muros ligeramente más altos para contención
    const halfSec = secSize / 2;

    // Piso de la nueva zona
    const secGeometry = new THREE.BoxGeometry(secSize, 0.5, secSize);
    const secMap = new THREE.Mesh(secGeometry, mapMaterial);
    secMap.position.set(offsetX, -0.25, offsetZ);
    secMap.receiveShadow = true;
    scene.add(secMap);

    // Muros perimetrales cerrados de la nueva zona
    const secBordersData = [
        [secSize + wallThickness * 2, wallHeight, wallThickness, offsetX, wallHeight / 2, offsetZ - halfSec - wallThickness / 2],
        [secSize + wallThickness * 2, wallHeight, wallThickness, offsetX, wallHeight / 2, offsetZ + halfSec + wallThickness / 2],
        [wallThickness, wallHeight, secSize, offsetX - halfSec - wallThickness / 2, wallHeight / 2, offsetZ],
        [wallThickness, wallHeight, secSize, offsetX + halfSec + wallThickness / 2, wallHeight / 2, offsetZ]
    ];

    secBordersData.forEach(([w, h, d, x, y, z]) => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
        wall.position.set(x, y, z);
        wall.receiveShadow = true;
        wall.castShadow = true;
        scene.add(wall);

        // Registro de colisión para evitar que el jugador escape
        wall.updateMatrixWorld(true);
        const wallBox = new THREE.Box3().setFromObject(wall);
        window.mapColliders.push(wallBox);
    });
}

function createPlazaElements(scene) {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.7 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x121315, metalness: 0.8 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x484c54, roughness: 0.8 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e6f40, roughness: 0.9 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0xffaa33, emissive: 0xff8800, emissiveIntensity: 1.2 });

    // BANCOS DE MADERA
    const benchPositions = [
        [-14, -14, 0], [14, -14, 0], 
        [-14, 14, Math.PI], [14, 14, Math.PI]
    ];

    benchPositions.forEach(([x, z, rot]) => {
        const bench = new THREE.Group();

        const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.7), woodMat);
        seat.position.set(0, 0.45, 0);

        const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.1), woodMat);
        back.position.set(0, 0.8, -0.3);

        const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.6), ironMat);
        leg1.position.set(-1.0, 0.225, 0);
        const leg2 = leg1.clone();
        leg2.position.set(1.0, 0.225, 0);

        bench.add(seat, back, leg1, leg2);
        bench.position.set(x, 0, z);
        bench.rotation.y = rot;
        scene.add(bench);

        bench.updateMatrixWorld(true);

        const benchBox = new THREE.Box3();
        benchBox.setFromObject(bench);
        window.mapColliders.push(benchBox);
    });

    // JARDINERAS
    const planterPositions = [
        [-22, 0], [22, 0], [0, -22], [0, 22]
    ];

    planterPositions.forEach(([x, z]) => {
        const planter = new THREE.Group();

        const pot = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 2.2), stoneMat);
        pot.position.y = 0.35;

        const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 0), leafMat);
        bush.position.y = 1.1;

        planter.add(pot, bush);
        planter.position.set(x, 0, z);
        scene.add(planter);

        planter.updateMatrixWorld(true);

        const planterBox = new THREE.Box3();
        planterBox.setFromObject(planter);
        window.mapColliders.push(planterBox);
    });

    // FAROLES
    const lampPositions = [
        [-10, -20], [10, -20], [-10, 20], [10, 20]
    ];

    lampPositions.forEach(([x, z]) => {
        const lamp = new THREE.Group();

        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.5, 6), ironMat);
        base.position.y = 0.25;

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3, 6), ironMat);
        pole.position.y = 1.8;

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.6), glowMat);
        head.position.y = 3.5;

        lamp.add(base, pole, head);
        lamp.position.set(x, 0, z);
        scene.add(lamp);

        lamp.updateMatrixWorld(true);

        const lampBox = new THREE.Box3(
            new THREE.Vector3(x - 0.5, 0, z - 0.5),
            new THREE.Vector3(x + 0.5, 3.8, z + 0.5)
        );
        window.mapColliders.push(lampBox);
    });
}

