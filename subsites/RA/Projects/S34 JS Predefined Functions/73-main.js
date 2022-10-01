//// TODO ////
// - Make another class for parameters -- valid range, display text, etc.
// - Change 'normalize' checkbox to a mode toggle: 1:1, local normalize (normalize to 1), global normalize (scale based on largest value present in table)
// - Improve CSS styling on controls
// - Color arrows based on input and/or output
// - Use same principles to make a color and/or contour plot -- if necessary, split some existing functions into chunks with higher reusability
// - Maybe make plot and table swappable instead of displaying both at once?

let canvas, mainContext, canvas2, mainContext2;

//Event fires when the DOM is ready (calling document.getElementById before this may fail).
document.addEventListener('DOMContentLoaded', (e) => {
    //retrieve canvas refs
    canvas = document.getElementById('s-table-og');
    if(!canvas.getContext) {
        canvas.innerHTML = 'Your browser does not support the canvas element; graph cannot be displayed. An equivalent table of values is provided as a fallback.';
    } else {
        mainContext = canvas.getContext('2d');
    }
    canvas2 = document.getElementById('s2-table-og');
    if(!canvas2.getContext) {
        canvas2.innerHTML = 'Your browser does not support the canvas element; graph cannot be displayed. An equivalent table of values is provided as a fallback.';
    } else {
        mainContext2 = canvas2.getContext('2d');
    }
    //populate type selection
    let sel = document.getElementById('s-table-itype');
    sel.innerHTML = "";
    for(let i = 0; i < allVFFIs.length; i++) {
        var vffi = allVFFIs[i];
        sel.innerHTML += `<option ${i == 0 ? 'selected ' : ''}value=${vffi.name}>${vffi.description}</option>`
    }
    let sel2 = document.getElementById('s2-table-itype');
    sel2.innerHTML = "";
    for(let i = 0; i < allCVFFIs.length; i++) {
        var vffi = allCVFFIs[i];
        sel2.innerHTML += `<option ${i == 0 ? 'selected ' : ''}value=${vffi.name}>${vffi.description}</option>`
    }
    //automatically generate parameter inputs when selected function type changes, and also once on document load
    sel.addEventListener('change', populateParams);
    populateParams();
    sel2.addEventListener('change', populateParams2);
    populateParams2();
});

function populateParams(e) {
    let paramsContainer = document.getElementById('s-table-iparams-container');
    let sel = document.getElementById('s-table-itype');
    let params = allVFFIs.find(x => x.name == sel.value).defaultParams;
    paramsContainer.innerHTML = "";
    if(params.length == 0)
        paramsContainer.innerHTML = "None";
    for(let i = 0; i < params.length; i++) {
        paramsContainer.innerHTML += `<input type='number' value='${params[i]}' id='s-table-iparam${i}'>`;
    }
}

function populateParams2(e) {
    let paramsContainer = document.getElementById('s2-table-iparams-container');
    let sel = document.getElementById('s2-table-itype');
    let params = allCVFFIs.find(x => x.name == sel.value).defaultParams;
    paramsContainer.innerHTML = "";
    if(params.length == 0)
        paramsContainer.innerHTML = "None";
    for(let i = 0; i < params.length; i++) {
        paramsContainer.innerHTML += `<input type='number' value='${params[i]}' id='s2-table-iparam${i}'>`;
    }
}

function mathFormulaTemplate2D(xPart, yPart) {
    return `x<sub>1</sub>(x<sub>0</sub>,y<sub>0</sub>)=${xPart} ; y<sub>1</sub>(x<sub>0</sub>,y<sub>0</sub>)=${yPart}`;
}

let vffiGenerateRandomPoints = (userParams, xFrom, xTo, xRes, yFrom, yTo, yRes) => {
    let points = [];
    for(let i = 0; i < userParams[0]; i++) {
        points[i] = new Vector2(
            lerp(xFrom, xTo, Math.random()),
            lerp(yFrom, yTo, Math.random()),
        );
    }
    return points;
};
let vffiGenerateRandomColorPoints = (userParams, xFrom, xTo, xRes, yFrom, yTo, yRes) => {
    let points = [];
    for(let i = 0; i < userParams[0]; i++) {
        let randomColor = hslaToRgba01(Math.random(), 1, 0.5, 1);
        randomColor[0] *= 255;
        randomColor[1] *= 255;
        randomColor[2] *= 255;
        randomColor[3] *= 255;

        points[i] = [new Vector2(
            lerp(xFrom, xTo, Math.random()),
            lerp(yFrom, yTo, Math.random()),
        ), randomColor]
    }
    return points;
};

let allVFFIs = [
    new VectorFieldFunctionInfo(
        'constval', 'c', 'Constant', //names: internal, short display, and long display
        mathFormulaTemplate2D('p<sub>0</sub>','p<sub>1</sub>'), //mathematical formula display text
        (x, y, genParams, userParams) => [ //callback function
            genParams[0],
            genParams[1]
        ],
        (userParams) => userParams, //parameter pre-transform function -- used to e.g. generate a certain number of random points before running the loop
        0, 0), //parameters
    new VectorFieldFunctionInfo(
        'sine', 'sine', 'Coordinate Sine',
        mathFormulaTemplate2D('sin(x<sub>0</sub>)', 'sin(y<sub>0</sub>)'),
        (x, y, genParams, userParams) => [
            Math.sin(x),
            Math.sin(y)
        ],
        (userParams) => userParams),
    new VectorFieldFunctionInfo(
        'tspsine', 'tspsine', 'Transpose and Sine',
        mathFormulaTemplate2D('sin(y<sub>0</sub>)', 'sin(x<sub>0</sub>)'),
        (x, y, genParams, userParams) => [
            Math.sin(y),
            Math.sin(x)
        ],
        (userParams) => userParams),
    new VectorFieldFunctionInfo(
        'rng', '?', 'Uniform Random',
        mathFormulaTemplate2D('~U(p<sub>0</sub>,p<sub>1</sub>)', '~U(p<sub>2</sub>,p<sub>3</sub>)'),
        (x, y, genParams, userParams) => [
            lerp(genParams[0], genParams[1], Math.random()),
            lerp(genParams[2], genParams[3], Math.random())
        ],
        (userParams) => userParams,
        -1, 1, -1, 1),
    new VectorFieldFunctionInfo(
        'voronoi', '?V', 'Voronoi Nearest Point (p0 points)',
        'Voronoi(x, y, p<sub>0</sub>)',
        (x, y, genParams, userParams) => {
            let here = new Vector2(x, y);
            let closest = genParams[0];
            let closestDistSqr = closest.sqrDistance(here);
            for(let i = 1; i < genParams.length; i++) {
                var distSqr = genParams[i].sqrDistance(here);
                if(distSqr < closestDistSqr) {
                    closestDistSqr = distSqr;
                    closest = genParams[i];
                }
            }
            return closest.subtract(here).toArray();
        },
        vffiGenerateRandomPoints,
        //params: # of points
        10),
    new VectorFieldFunctionInfo(
        'voronoimh', '?V mht', 'Voronoi Nearest Point Manhattan (p0 points)',
        'VoronoiManhattan(x, y, p<sub>0</sub>)',
        (x, y, genParams, userParams) => {
            let here = new Vector2(x, y);
            let closest = genParams[0];
            let closestDistMh = closest.manhattanDistance(here);
            for(let i = 1; i < genParams.length; i++) {
                var distMh = genParams[i].manhattanDistance(here);
                if(distMh < closestDistMh) {
                    closestDistMh = distMh;
                    closest = genParams[i];
                }
            }
            return closest.subtract(here).toArray();
        },
        vffiGenerateRandomPoints,
        10),
    new VectorFieldFunctionInfo(
        'voronoi2', '?V2', 'Voronoi Second Nearest Point (p0 points)',
        'Voronoi2(x, y, p<sub>0</sub>)',
        (x, y, genParams, userParams) => {
            let here = new Vector2(x, y);
            let distances = [];
            for(let i = 0; i < genParams.length; i++) {
                distances[i] = [genParams[i].sqrDistance(here), genParams[i]];
            }
            distances.sort((a, b) => a[0] - b[0]);
            return distances[1][1].subtract(here).toArray();
        },
        vffiGenerateRandomPoints,
        10)
];
let allCVFFIs = [
    new VectorFieldFunctionInfo(
        'voronoi', '?V', 'Voronoi Nearest Point (p0 points)',
        'Voronoi(x, y, p<sub>0</sub>)',
        (x, y, genParams, userParams) => {
            let here = new Vector2(x, y);
            let closest = genParams[0];
            let closestDistSqr = closest[0].sqrDistance(here);
            for(let i = 1; i < genParams.length; i++) {
                var distSqr = genParams[i][0].sqrDistance(here);
                if(distSqr < closestDistSqr) {
                    closestDistSqr = distSqr;
                    closest = genParams[i];
                }
            }
            return closest[1];
        },
        vffiGenerateRandomColorPoints,
        //params: # of points
        10)
];

function onGenerateButtonClick() {
    //Retrieve all control values
    let fromX = Number(document.getElementById('s-table-ifromx').value);
    let fromY = Number(document.getElementById('s-table-ifromy').value);
    let toX = Number(document.getElementById('s-table-itox').value);
    let toY = Number(document.getElementById('s-table-itoy').value);
    let stepX = Number(document.getElementById('s-table-istepx').value);
    let stepY = Number(document.getElementById('s-table-istepy').value);
    let scale = Number(document.getElementById('s-table-iscale').value);
    let pad = Number(document.getElementById('s-table-ipad').value);
    let bord = Number(document.getElementById('s-table-ibord').value);
    let prec = Number(document.getElementById('s-table-iprec').value);
    let selName = document.getElementById('s-table-itype').value;
    let norm = document.getElementById('s-table-inorm').checked;
    let vffi = allVFFIs.find(x => x.name == selName);
    let params = [];
    for(let i = 0; i < vffi.defaultParams.length; i++) {
        params[i] = Number(document.getElementById(`s-table-iparam${i}`).value);
    }

    //Evaluate the selected function
    let [table, headX, headY, caption] = vffi.evaluate(
        fromX, toX, stepX,
        fromY, toY, stepY,
        params, prec);

    //Display fallback table
    document.getElementById('s-table-o').innerHTML =
        formatNumericArrayAsHTMLTable2D(
            table, headX, headY,
            prec, prec, prec,
            vffi.symbol, '', 'x', 'y',
            (val, coords, precX, precY, precZ) => {
                let [x1, y1] = val;
                let [x0, y0] = coords;
                var mag = Math.sqrt(x1 * x1 + y1 * y1);
                var dir = Math.atan2(y1, x1) * 180 / Math.PI;
                return `(${x1.toFixed(precX)}, ${y1.toFixed(precY)})<br>${mag.toFixed(precZ)}&ang;${dir.toFixed(0)}&deg;`;
            });

    //Display plot
    formatNumericArrayAsVectorField2D(
        mainContext, table, headX, headY,
        canvas.width, canvas.height,
        bord, pad, scale, norm,
        prec);

    //Display caption
    document.getElementById('s-table-o-caption').innerHTML = caption;
}

function onGenerateButtonClick2() {
    //Retrieve all control values
    let fromX = Number(document.getElementById('s2-table-ifromx').value);
    let fromY = Number(document.getElementById('s2-table-ifromy').value);
    let toX = Number(document.getElementById('s2-table-itox').value);
    let toY = Number(document.getElementById('s2-table-itoy').value);
    let stepX = Number(document.getElementById('s2-table-istepx').value);
    let stepY = Number(document.getElementById('s2-table-istepy').value);
    let scale = Number(document.getElementById('s2-table-iscale').value);
    let pad = Number(document.getElementById('s2-table-ipad').value);
    let bord = Number(document.getElementById('s2-table-ibord').value);
    let prec = Number(document.getElementById('s2-table-iprec').value);
    let selName = document.getElementById('s2-table-itype').value;
    let norm = document.getElementById('s2-table-inorm').checked;
    let vffi = allCVFFIs.find(x => x.name == selName);
    let params = [];
    for(let i = 0; i < vffi.defaultParams.length; i++) {
        params[i] = Number(document.getElementById(`s2-table-iparam${i}`).value);
    }

    //Evaluate the selected function
    let [table, headX, headY, caption] = vffi.evaluate(
        fromX, toX, stepX,
        fromY, toY, stepY,
        params, prec);

    //Display plot
    formatNumericArrayAsColorPlot2D(
        mainContext2, table, headX, headY,
        canvas.width, canvas.height,
        bord, pad, scale, norm,
        prec);

    //Display caption
    document.getElementById('s2-table-o-caption').innerHTML = caption;
}