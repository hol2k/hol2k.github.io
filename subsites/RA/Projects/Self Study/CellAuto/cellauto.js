const NEIGHBORHOOD_NAMES = {
    vonNeumann: "von Neumann",
    vNCross: "extended von Neumann",
    moore: "Moore",
    mooreCross: "extended Moore"
}
const BORDER_NAMES = {
    torus: "toroidal",
    fill: "zero-bounded"
}

let grid;
let targetSimSpeed = 0;
let renderDirty = false;

let pxPerCell = 16;

let tAccum = 0;
let tPrev = performance.now();

let mouseDrawState = -1;

let mainCanvas, mainCtx;

function regenerateGrid() {
    grid = new CAGrid(Number($('#inp-simsize').val()));
    renderDirty = true;
}

function renderLoop() {
    let tCurr = performance.now();
    let dt = (tCurr - tPrev)/1000;
    tPrev = tCurr;

    if(targetSimSpeed > 0) {
        //store at most 2 seconds of catchup time to help deal with lag spirals
        tAccum = Math.min(tAccum + dt, 2);
        while(tAccum >= targetSimSpeed && targetSimSpeed > 0) {
            tAccum -= targetSimSpeed;
            logicLoop();
        }
    }

    if(renderDirty) {
        let pxSize = grid.size * pxPerCell;
        //jQuery width/height functions are unsuitable for canvas elements in particular
        mainCanvas[0].width = pxSize;
        mainCanvas[0].height = pxSize;
        let canvasBounds = mainCanvas[0].getBoundingClientRect();
        let parentBounds = mainCanvas[0].parentNode.getBoundingClientRect();
        let offsetTop = parentBounds.top - canvasBounds.top;
        let offsetLeft = parentBounds.left - canvasBounds.left;
        grid.render(mainCtx, pxPerCell, {
            top: Math.max(Math.floor(offsetTop) - pxPerCell * 2, 0),
            left: Math.max(Math.floor(offsetLeft) - pxPerCell * 2, 0),
            bottom: Math.min(Math.ceil(offsetTop + parentBounds.height) + pxPerCell * 2, pxSize),
            right: Math.min(Math.ceil(offsetLeft + parentBounds.width) + pxPerCell * 2, pxSize)
        });
        let splitRule = grid.rule.split('/');
        let aliveCount = grid.grid.filter(n => n == 1).length;
        $('#status').text(`${aliveCount} Cells Alive | Generation ${grid.generation}\n`
            + `B${splitRule[0]}/C${splitRule[1]}, ${NEIGHBORHOOD_NAMES[grid.neighborhood]} neighborhood, ${BORDER_NAMES[grid.borderType]} space`);

        renderDirty = false;
    }
    requestAnimationFrame(renderLoop);
}

//called with a fixed timestep and accumulator from renderLoop
function logicLoop() {
    let changes = grid.iterate(true);

    let simspeed = $('#inp-simspeed');
    let autostop = $('#inp-autostop');
    if(changes == 0 && autostop.is(':checked') && targetSimSpeed > 0) {
        simspeed.val('-1');
        onSimSpeedChange();
        autostop.parent().parent()[0].animate(
            [
                {outline: '0em solid red', transform: 'scale(1)', offset: 0},
                {outline: '0.75em solid red', offset: 0.05},
                {outline: '0.2em solid red', transform: 'scale(1.1)', offset: 0.1},
                {outline: '0.5em solid red', offset: 0.15},
                {outline: '0.1em solid red', offset: 0.2},
                {outline: '0.2em solid red', transform: 'scale(1)', offset: 0.25},
                {outline: '0.2em solid red', offset: 0.9},
                {outline: '0em solid red', offset: 1}
            ], {
                duration: 2000,
                easing: 'linear'
            }
        );
    }

    renderDirty = true;
}

function getCanvasMouseCoords(e) {
    let bounds = e.currentTarget.getBoundingClientRect();
    let xNorm = e.offsetX / bounds.width;
    let yNorm = e.offsetY / bounds.height;
    let xCoord = Math.floor(xNorm * grid.size);
    let yCoord = Math.floor(yNorm * grid.size);
    return [xCoord, yCoord];
}

function onSimSpeedChange() {
    let n = Number($('#inp-simspeed').val());
    tAccum = 0; //clear buffered time so there isn't a burst of frames when simspeed changes
    if(n >= 0)
        targetSimSpeed = 2 / Math.pow(2, n);
    else
        targetSimSpeed = 0;
}

function setLightMode() {
    let isChecked = $('#inp-darkmode').is(':checked');
    localStorage.setItem('useDarkMode', isChecked ? 'y' : 'n');
    if(isChecked) {
        document.body.classList.remove('lightmode');
    } else {
        document.body.classList.add('lightmode');
    }
}

$(() => { //jQuery init -- on document ready
    mainCanvas = $('#sim-display');
    mainCtx = mainCanvas[0].getContext('2d');
    
    if(typeof window.CanvasRenderingContext2D == 'undefined') {
        $('#canvas-errors').text("Your browser does not support 2D Canvas contexts. Canvas support is required for this application.");
    }

    mainCanvas.mousedown((e) => {
        e.preventDefault();
        if(e.button == 0) {
            let [x, y] = getCanvasMouseCoords(e);
            mouseDrawState = grid.getState(x, y) == 1 ? 0 : 1;
            grid.setState(x, y, mouseDrawState);
            grid.advanceDeltaBuffer();
            renderDirty = true;
        }
    });
    mainCanvas.mouseup((e) => {
        if(e.button == 0) {
            mouseDrawState = -1;
        }
        if(e.button == 2) {
            logicLoop();
        }
        e.preventDefault();
    });
    mainCanvas.mousemove((e) => {
        if(mouseDrawState > 0) {
            let [x, y] = getCanvasMouseCoords(e);
            grid.setState(x, y, mouseDrawState);
            grid.advanceDeltaBuffer();
            renderDirty = true;
        }
        e.preventDefault();
    });
    
    mainCanvas.on('wheel', (jqe) => {
        let e = jqe.originalEvent;
        if(e.deltaY > 0) {
            pxPerCell = Math.min(pxPerCell + 1, 32);
        } else if(e.deltaY < 0) {
            pxPerCell = Math.max(pxPerCell - 1, 1);
        }
        renderDirty = true;
        e.preventDefault();
    });
    
    mainCanvas.parent().scroll((e) => {
        renderDirty = true;
    });
    
    $('#inp-rule').change((e) => {
        try {
            grid.evaluateRule(e.currentTarget.value);
        } catch(ex) {
            e.currentTarget.animate(
                [{transform: 'translateX(0)'},
                {transform: 'translateX(-1em)'},
                {transform: 'translateX(1em)'},
                {transform: 'translateX(-1em)'},
                {transform: 'translateX(0)'}],
                {duration: 200}
            );
        }
    });

    $('#inp-simspeed').change(onSimSpeedChange);

    $('#inp-neighborhood').change((e) => {
        grid.neighborhood = e.currentTarget.value;
        renderDirty = true;
    });
    
    $('inp-border').change((e) => {
        grid.borderType = e.currentTarget.value;
        renderDirty = true;
    });

    $('#inp-darkmode').change(setLightMode);

    let udm = localStorage.getItem('useDarkMode');
    $('#inp-darkmode').attr('checked', udm == null || udm == 'y');
    setLightMode();

    regenerateGrid();
    renderLoop();
}); //closes jQuery init