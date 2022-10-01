//very barebones ECM-like wrapper for THREE.js

class LWCGEInstance {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(90, 1, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.stats = new Stats();
        this.resizeObserver = new ResizeObserver(this.calculateSize.bind(this));
        this.stats.showPanel(0);
        this.scene.add(this.camera);
        this.sceneTime = {
            prev: performance.now(),
            curr: performance.now(),
            prevFixed: 0,
            currFixed: 0,
            dt: 0,
            dtFixed: 1/30,
            accum: 0
        };

        this.globalUpdate();
    }

    attach(node) {
        if(typeof this.parentNode !== 'undefined')
            this.resizeObserver.unobserve(this.parentNode);
        this.parentNode = node;
        node.appendChild(this.renderer.domElement);
        node.appendChild(this.stats.dom);
        this.resizeObserver.observe(node);
        this.calculateSize();
    }

    calculateSize() {
        if(!(this.parentNode instanceof HTMLElement)) {
            throw new Error('Attempt to update size of an orphaned LWCGEInstance -- use .attach(node) first');
        }
        let vw = this.parentNode.offsetWidth;
        let vh = this.parentNode.offsetHeight;
        this.renderer.setSize(vw, vh);
        this.camera.aspect = vw/vh;
        this.camera.updateProjectionMatrix();
    }
    
    globalUpdate() {
        this.stats.begin();
        this.sceneTime.prev = this.sceneTime.curr;
        this.sceneTime.curr = performance.now();
        this.sceneTime.dt = this.sceneTime.curr - this.sceneTime.prev;
        this.sceneTime.accum += this.sceneTime.dt;
        this.renderUpdate();
        let safetyIters = 0;
        while(this.sceneTime.accum >= this.sceneTime.dtFixed && safetyIters < 10) {
            safetyIters++;
            this.sceneTime.accum -= this.sceneTime.dtFixed;
            this.sceneTime.prevFixed = this.sceneTime.currFixed;
            this.sceneTime.currFixed += this.sceneTime.dtFixed;
            this.fixedUpdate();
        }
        this.stats.end();
    
        requestAnimationFrame(this.globalUpdate.bind(this));
    }

    fixedUpdate() {
        this.scene.traverse(obj => {
            if(Array.isArray(obj.LWCGEComponents)) {
                for(const cpt of obj.LWCGEComponents) {
                    if(cpt.enabled)
                        cpt.onFixedUpdate(this);
                }
            }
        });
    }

    renderUpdate() {
        this.scene.traverse(obj => {
            if(Array.isArray(obj.LWCGEComponents)) {
                for(const cpt of obj.LWCGEComponents) {
                    if(cpt.enabled)
                        cpt.onUpdate(this);
                }
            }
        });
        this.renderer.render(this.scene, this.camera);
    }
}

class LWCGEComponent {
    #enabled = true;
    #enabledEver = false;
    constructor() {
        if(this.constructor == LWCGEComponent)
            throw new Error("LWGCEComponent is abstract; use extends keyword to create a new inheriting class.");
    }

    get enabled() {
        return this.#enabled;
    }
    set enabled(val) {
        if(val == this.#enabled) return;
        this.#enabled = val;
        if(val) this.onEnable();
        else this.onDisable();
    }

    onUpdate() {

    }

    onFixedUpdate() {
        if(this.#enabled && !this.#enabledEver) {
            this.#enabledEver = true;
            this.onFirstEnable();
        }
    }

    onEnable() {

    }

    onDisable() {

    }

    onFirstEnable() {

    }
}