document.addEventListener('DOMContentLoaded', () => {

    //////
    // Initial setup

    console.clear();

    let game = new LWCGEInstance();
    game.attach(document.querySelector('#main-content'));

    //////
    // Scene population

    class SimpleSpinner extends LWCGEComponent {
        constructor(parent, rateX, rateY, rateZ) {
            super();
            this.parent = parent;
            this.rateX = rateX;
            this.rateY = rateY;
            this.rateZ = rateZ;
        }

        onFixedUpdate(gameInst) {
            this.parent.rotation.x += this.rateX * gameInst.sceneTime.dtFixed;
            this.parent.rotation.y += this.rateY * gameInst.sceneTime.dtFixed;
            this.parent.rotation.z += this.rateZ * gameInst.sceneTime.dtFixed;
        }
    }

    class CameraOrbitSpinner extends LWCGEComponent {
        constructor(parent, distance, azimuth, rate) {
            super();
            this.parent = parent;
            this.distance = distance;
            this.azimuth = azimuth;
            this.rate = rate;
            this.theta = 0;
        }

        onFixedUpdate(gameInst) {
            this.theta += gameInst.sceneTime.dtFixed * this.rate;
            this.parent.position.x = Math.cos(this.theta) * Math.sin(this.azimuth) * this.distance;
            this.parent.position.z = Math.sin(this.theta) * Math.sin(this.azimuth) * this.distance;
            this.parent.position.y = Math.cos(this.azimuth) * this.distance;
            this.parent.lookAt(0, 0, 0);
        }
    }

    let terrainObjects = [];
    let terrainMtl;
    function setupScene() {
        let testBoxMesh = new THREE.ConeGeometry(0.1, 0.4);
        let testBoxMtl = new THREE.MeshBasicMaterial({color: 0xffff00, side: THREE.DoubleSide});
        let testBox = new THREE.Mesh(testBoxMesh, testBoxMtl);
        testBox.LWCGEComponents = [
            new SimpleSpinner(testBox, 1 * Math.PI/180, 2  * Math.PI/180, 3  * Math.PI/180)
        ];
        testBox.position.y = 3;
        game.scene.add(testBox);

        let light = new THREE.PointLight(0xffffff, 0.75);
        light.name = 'Light 1';
        testBox.add(light);

        light = new THREE.RectAreaLight(0xffffff, 5, 3, 3);
        light.lookAt(0, -1, 0);
        light.name = 'Light 2';
        testBox.add(light);
        light.visible = false;

        light = new THREE.DirectionalLight(0xffffff, 1);
        light.lookAt(0, -1, 0);
        light.name = 'Light 3';
        testBox.add(light);
        light.visible = false;

        terrainMtl = new THREE.MeshStandardMaterial({color: 0x00ff00});
        updateTerrainGenInputs();

        game.camera.LWCGEComponents = [
            new CameraOrbitSpinner(game.camera, 6, Math.PI / 4, 0.5 * Math.PI/180)
        ];
    }

    function perlin2D(rng, x, y, octaves, persistence, lacunarity) {
        let retv = 0;
        let f = 1;
        let a = 1;
        let aMax = 0;
        for(let i = 0; i < octaves; i++) {
            retv += rng.noise2D(x * f, y * f) * a;
            aMax += a;
            a *= persistence;
            f *= lacunarity;
        }
        return retv / aMax;
    }

    function recalculateTerrainMesh(rngSeed, terrX, terrY, xyScale, zScale, octs, pers, lac, res) {
        let rng = openSimplexNoise(rngSeed);

        for(const obj of terrainObjects) {
            obj.geometry.dispose();
            game.scene.remove(obj);
        }
        terrainObjects = [];

        res -= 1; //will be interpolating with 1 extra row/column, so deduct it here

        //generate noise and transformed vertex coordinates
        let zNoise = [];
        let xySpace = [];
        for(let i = 0; i <= res; i++) { //generate 1 extra vs adjusted res for interpolation
            zNoise[i] = [];
            xySpace[i] = i/res - 0.5;
            for(let j = 0; j <= res; j++) {
                zNoise[i][j] = perlin2D(rng, i/res * xyScale + terrX, j/res * xyScale + terrY, octs, pers, lac) * zScale;
            }
        }

        //generate terrain meshes; need to chunk to avoid buffer overflow if res > 2^8
        let maxChunkSize = Math.floor(Math.pow(2, 32)/18)*18;
        let remainingVerts = res * res * 18;

        let x = 0;
        let y = 0;
        //while there are still remaining unchunked verts... (note: this approach only works because each face has equal vertices; would need some loop-interior logic adjustment to handle anything other than quads)
        while(remainingVerts > 0) {
            //take a chunk of vertex indices
            let currentVerts = Math.min(maxChunkSize, remainingVerts);
            remainingVerts -= currentVerts;

            //create a new THREE object to hold this chunk of geometry
            let terrainPlaneMesh = new THREE.BufferGeometry();
            let terrainPlane = new THREE.Mesh(terrainPlaneMesh, terrainMtl);
            terrainObjects.push(terrainPlane);
            terrainPlane.scale.multiplyScalar(6);
            game.scene.add(terrainPlane);
            let verts = new Float32Array(currentVerts);
            let vertexIndex = 0;

            //iterate over pregenerated coordinates to create tris
            for(let xyIter = 0; xyIter < currentVerts/18; xyIter++) {
                let vx0 = xySpace[x];
                let vy0 = xySpace[y];
                let vx1 = xySpace[x+1];
                let vy1 = xySpace[y+1];
                let vz00 = zNoise[x][y];
                let vz01 = zNoise[x][y+1];
                let vz10 = zNoise[x+1][y];
                let vz11 = zNoise[x+1][y+1];

                //tri 1 -- note XZY order, THREE is Y-up
                verts[vertexIndex++] = vx0;
                verts[vertexIndex++] = vz00;
                verts[vertexIndex++] = vy0;

                verts[vertexIndex++] = vx0;
                verts[vertexIndex++] = vz01;
                verts[vertexIndex++] = vy1;

                verts[vertexIndex++] = vx1;
                verts[vertexIndex++] = vz11;
                verts[vertexIndex++] = vy1;

                //tri 2
                verts[vertexIndex++] = vx0;
                verts[vertexIndex++] = vz00;
                verts[vertexIndex++] = vy0;

                verts[vertexIndex++] = vx1;
                verts[vertexIndex++] = vz11;
                verts[vertexIndex++] = vy1;

                verts[vertexIndex++] = vx1;
                verts[vertexIndex++] = vz10;
                verts[vertexIndex++] = vy0;

                //advance coordinate tracking indices
                y++;
                if(y>=res) {
                    y=0;
                    x++;
                }
            }

            //apply the generated tris to the new THREE object's geometry
            terrainPlaneMesh.setAttribute('position', new THREE.BufferAttribute(verts, 3));
            terrainPlaneMesh.computeVertexNormals();
        }
    }

    setupScene();

    function updateTerrainGenInputs(e) {
        if(typeof e !== 'undefined' && e.target.id == 'input-precisionmode') {
            let inputs = document.getElementById('inputgroup-terrain').querySelectorAll('input[type="number"][min][max], input[type="range"][min][max]');
            for(const input of inputs) {
                input.type = e.target.checked ? 'number' : 'range';
            }
            return;
        }
        let rngSeed = Number(document.getElementById('input-seed').value);
        let terrX = Number(document.getElementById('input-x').value);
        let terrY = Number(document.getElementById('input-y').value);
        let xyScale = Number(document.getElementById('input-xyscale').value);
        let zScale = Number(document.getElementById('input-zscale').value);
        let octs = Number(document.getElementById('input-octs').value);
        let pers = Number(document.getElementById('input-pers').value);
        let lac = Number(document.getElementById('input-lac').value);
        let res = Math.pow(2, Number(document.getElementById('input-res').value));
        recalculateTerrainMesh(rngSeed, terrX, terrY, xyScale, zScale, octs, pers, lac, res);
    }

    document.getElementById('inputgroup-terrain').addEventListener('change', updateTerrainGenInputs);

    let lightTypeInputs = document.getElementsByName('input-light-type');
    for(const lti of lightTypeInputs) {
        lti.addEventListener('change', (e) => {
            let light1 = game.scene.getObjectByName('Light 1');
            let light2 = game.scene.getObjectByName('Light 2');
            let light3 = game.scene.getObjectByName('Light 3');
            light1.visible = false;
            light2.visible = false;
            light3.visible = false;
            switch(e.currentTarget.value) {
                case '0':
                    light1.visible = true;
                    break;
                case '1':
                    light2.visible = true;
                    break;
                case '2':
                    light3.visible = true;
                    break;
            }
        });
    }

    document.addEventListener('contextmenu', (e) => {
        document.querySelector('body').animate(
            [
                {transform: 'translateX(0em)'},
                {transform: 'translateX(1em)'},
                {transform: 'translateX(-1em)'},
                {transform: 'translateX(1em)'},
                {transform: 'translateX(-1em)'},
                {transform: 'translateX(1em)'},
                {transform: 'translateX(0em)'}
            ],
            {duration: 200}
        );
        e.preventDefault();
    });
});