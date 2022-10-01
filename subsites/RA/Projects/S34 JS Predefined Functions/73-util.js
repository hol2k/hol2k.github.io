function formatNumericArrayAsVectorField2D(ctx, table, headX, headY, width, height, bord, pad, scale, normalize, prec) {

    ////
    // Setup & error-checking

    //Save canvas style settings & transform
    ctx.save();
    let [lenX, lenY, err] = tryGet2DTableAndHeaderSize(table, headX, headY);
    if(err !== null) {
        ctx.font = "30px sans-serif";
        ctx.fillText("Error during plot! " + err, 30, 30);
        //Revert to default canvas style/transform
        ctx.restore();
        return;
    }



    ////
    // Reset background

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(bord, bord, width - bord * 2, height - bord * 2);



    ////
    // Gridlines

    ctx.strokeStyle = "#cccccc";
    for(let v = 0; v < lenY; v++) {
        let vNorm = v / (lenY - 1);
        let y = lerp(pad + bord, height - (pad + bord), vNorm);

        ctx.beginPath();
        ctx.moveTo(pad + bord, y);
        ctx.lineTo(width - (pad + bord), y);
        ctx.stroke();
    }

    for(let u = 0; u < lenX; u++) {
        let uNorm = u / (lenX - 1);
        let x = lerp(pad + bord, height - (pad + bord), uNorm);

        ctx.beginPath();
        ctx.moveTo(x, pad + bord);
        ctx.lineTo(x, height - (pad + bord));
        ctx.stroke();
    }



    ////
    // Axes

    ctx.strokeStyle = "#777777";

    //lines
    ctx.beginPath();
    ctx.moveTo(pad + bord, pad + bord);
    ctx.lineTo(pad + bord, height - pad - bord);
    ctx.lineTo(width - pad - bord, height - pad - bord);
    ctx.stroke();

    //primary labels
    ctx.fillStyle = "#000000";
    ctx.font = `${pad/2}px serif`;
    ctx.textAlign = "start";
    ctx.fillText('y\u2080', bord + 2, height / 2);
    ctx.textAlign = "center";
    ctx.fillText('x\u2080', width / 2, height - bord - 2);
    ctx.fillText('(x\u2081, y\u2081)', width / 2, bord + pad / 2);
    ctx.textAlign = "end";
    ctx.font = `${pad/4}px serif`;
    ctx.textBaseline = 'middle';

    //value labels
    for(let v = 0; v < lenY; v++) {
        let vNorm = 1 - v / (lenY - 1);
        let y = lerp(pad + bord, height - (pad + bord), vNorm);

        ctx.fillText(headY[v].toFixed(prec), bord + pad * 0.9, y);
    }

    for(let u = 0; u < lenX; u++) {
        let uNorm = u / (lenX - 1);
        let x = lerp(pad + bord, height - (pad + bord), uNorm);

        ctx.save();
        ctx.translate(x, height - bord - pad * 0.9);
        ctx.rotate(-Math.PI/2);
        ctx.fillText(headX[u].toFixed(prec), 0, 0);
        ctx.restore();
    }



    ////
    // Main function plot

    ctx.strokeStyle = "#000000";
    for(let v = 0; v < lenY; v++) {
        //Invert Y (canvas has +Y down, standard cartesian coordinate display usually has +Y up)
        let vNorm = 1 - v / (lenY - 1);
        let y0Disp = lerp(pad + bord, height - (pad + bord), vNorm);

        for(let u = 0; u < lenX; u++) {
            let uNorm = u / (lenX - 1);
            let x0Disp = lerp(pad + bord, height - (pad + bord), uNorm);
            
            //Retrieve values
            let x0 = headX[u];
            let y0 = headY[v];
            let [x1, y1] = table[v][u];

            //Other part of Y inversion
            y0 = -y0;
            y1 = -y1;

            //Function-space magnitude
            let mag = Math.sqrt(x1 * x1 + y1 * y1);

            //Calculate display coordinates from function values and scale/normalize options
            let x1Disp, y1Disp;

            if(normalize && mag > 0) {
                x1Disp = x0Disp + x1 * scale / mag;
                y1Disp = y0Disp + y1 * scale / mag;
            } else {
                x1Disp = x0Disp + x1 * scale;
                y1Disp = y0Disp + y1 * scale;
            }

            //Display-space magnitude
            let dxDisp = x1Disp - x0Disp;
            let dyDisp = y1Disp - y0Disp;
            let magDisp = Math.sqrt(dxDisp * dxDisp + dyDisp * dyDisp);

            //Draw arrow (or circle if magnitude is less than epsilon)
            ctx.beginPath();
            if(magDisp <= 0) {
                ctx.arc(x0Disp, y0Disp, scale/4, 0, Math.PI*2);
            } else {
                let thetaDisp = Math.atan2(dyDisp, dxDisp);
                let arrowThetaP = thetaDisp + Math.PI / 4;
                let arrowThetaM = thetaDisp - Math.PI / 4;
                let arrowMag = magDisp / 4;

                ctx.moveTo(x0Disp, y0Disp);
                ctx.lineTo(x1Disp, y1Disp);
                ctx.moveTo(x1Disp, y1Disp);
                ctx.lineTo(x1Disp - arrowMag * Math.cos(arrowThetaP), y1Disp - arrowMag * Math.sin(arrowThetaP));
                ctx.moveTo(x1Disp, y1Disp);
                ctx.lineTo(x1Disp - arrowMag * Math.cos(arrowThetaM), y1Disp - arrowMag * Math.sin(arrowThetaM));
            }
            ctx.stroke();
        }
    }
    ctx.restore();
}

function tryGet2DTableAndHeaderSize(table, headX, headY) {
    if(Object.prototype.toString.call(table) !== '[object Array]')
        return [null, null, "Given table was not an array."];

    let lenY = table.length;
    if(lenY < 1)
        return [null, null, "Array cannot be empty."];

    let lenX = -1;
    for(let i = 0; i < lenY; i++) {
        if(Object.prototype.toString.call(table[i]) !== '[object Array]')
            return [null, null, "Given table contained a non-array value."];
        if(table[i].length < 1)
            return [null, null, "Any child array cannot be empty."];
        if(lenX === -1)
            lenX = table[i].length;
        else if(lenX !== table[i].length)
            return [null, null, "Child array lengths must all be identical."];
    }

    if(Object.prototype.toString.call(headX) !== '[object Array]')
        return [null, null, "Given X header was not an array."];

    if(headX.length != lenX)
        return [null, null, "X header length did not match table X size."];

    if(Object.prototype.toString.call(headY) !== '[object Array]')
        return [null, null, "Given Y header was not an array."];

    if(headY.length != lenY)
        return [null, null, "Y header length did not match table Y size."];

    return [lenX, lenY, null];
}

//Expects order of table to be Y-then-X
function formatNumericArrayAsHTMLTable2D(
    table, headX, headY,
    precX, precY, precZ,
    titleSym = '?', caption = '', xcap = 'x', ycap = 'y',
    formattingCallback = (val, coords, precX, precY, precZ) => numToFixedNoTrail(val, precZ)) {

    ////
    // Error checking and storage of array size

    let [lenX, lenY, err] = tryGet2DTableAndHeaderSize(table, headX, headY);
    if(err !== null)
        return "Error during table generation! " + err;

    ////
    //Table header (begin HTML generation)
    
    let retv = '<table class="numtable">';

    if(caption != '') retv += `<caption>${caption}</caption>`;

    retv += '<thead>';
    retv += '<tr>';

    //Corner label
    retv += `<th rowspan='${(xcap != '') ? 2 : 1}' colspan='${(ycap != '') ? 2 : 1}' class='numtable-corner-label'>${titleSym}</th>`;

    //Top label
    if(xcap != '') {
        retv += `<th colspan='${lenX}' class='numtable-top-label'>${xcap}</th></tr>`;
        retv += '<tr>';
    }

    //Top header
    for(let u = 0; u < lenX; u++) {
        //Top header cell
        retv += `<th class='numtable-top-header'>${numToFixedNoTrail(headX[u], precX)}</th>`;
    }

    retv += '</tr>';
    retv += '</thead>';



    ////
    //Table body

    retv += '<tbody>';
    for(let v = 0; v < lenY; v++) {
        retv += `<tr>`;

        //Side label (first row only)
        if(v === 0 && ycap != '')
            retv += `<th rowspan='${lenY}' class='numtable-side-label'>${ycap}</th>`;
        
        //Side header cell (1 per row)
        retv += `<th class='numtable-side-header'>${numToFixedNoTrail(headY[v], precY)}</th>`;
        
        //Main table content
        for(let u = 0; u < lenX; u++) {
            //Main cell content
            retv += `<td>${formattingCallback(table[v][u], [headX[u], headY[v]], precX, precY, precZ)}</td>`;
        }

        retv += '</tr>';
    }
    retv += '</tbody></table>';

    return retv;
}

class VectorFieldFunctionInfo {
    constructor(name, sym, text, formula, callback, paramsCallback, ...paramsCountAndDefaults) {
        this.name = name; //The internal reference name of the function.
        this.symbol = sym; //The short symbol to display for the function (e.g. in fallback table top left cell).
        this.description = text; //Longer name of the function (for e.g. display in selection box or fallback table caption).
        this.formula = formula; //Mathematical formula text of the function (for display cases as with description).
        this.defaultParams = paramsCountAndDefaults; //Default values of parameters. Total number of values provided will be used as parameter count.
        this.callback = callback; //The function to plot. Receives: (x, y, modifiedParams, unmodifiedParams).
        this.paramsCallback = paramsCallback; //A function to run to modify the parameters before the main callback function is evaluated. Receives: (unmodifiedParams, fromX, toX, resX, fromY, toY, resY).
    }
    //Returns:
    //  1. a 2D array (in y-then-x form) containing the results of this function iterated over a specified range.
    //  2. a 1D array containing the X values used in iteration.
    //  3. a 1D array containing the Y values used in iteration.
    //  4. a caption for use with a resultant figure.
    //Function will be iterated `resX` times over the X axis with range [`fromX`, `toX`].
    //Function will be iterated `resY` times over the Y axis with range [`fromY`, `toY`].
    //`genParams` and `userParams` will be passed through to the `callback` function, following the x and y coordinate parameters. `userParams` will be unmodified; `genParams` will be modified based on a second callback function `paramsCallback` which is called before the main iteration loop.
    evaluate = function(fromX, toX, resX, fromY, toY, resY, userParams, paramDisplayPrecision = 2) {
        let retValue = [];
        let retHeadX = [];
        let retHeadY = [];
        let genParams = this.paramsCallback(userParams, fromX, toX, resX, fromY, toY, resY);
        for(let v = 0; v < resY; v++) {
            let vNorm = v / (resY - 1);
            let y = lerp(fromY, toY, vNorm);
            retHeadY[v] = y;
            let subretv = [];
            for(let u = 0; u < resX; u++) {
                let uNorm = u / (resX - 1);
                let x = lerp(fromX, toX, uNorm);
                if(v === 0)
                    retHeadX[u] = x;
                subretv[u] = this.callback(x, y, genParams, userParams);
            }
            retValue[v] = subretv;
        }
        var caption = `A 2D vector field plot of the function <code>${this.formula}</code> ("${this.description}").`
        caption += `<br>Range: <code>x<sub>0</sub>=[${fromX}, ${toX}]</code> (${resX} steps), <code>y<sub>0</sub>=[${fromY}, ${toY}]</code> (${resY} steps).`
        caption += "<br>Input parameters: ";
        if(userParams.length == 0) caption += "None.";
        else {
            for(let i = 0; i < userParams.length; i++) {
                caption += `p<sub>${i}</sub> = ${userParams[i]}`; //.toFixed(paramDisplayPrecision)
                if(i < userParams.length - 1)
                    caption += ", ";
                else
                    caption += ".";
            }
        }
        caption += "<br><details><summary>Internal parameters:</summary>";
        if(genParams.length == 0) caption += "None.</details>";
        else {
            for(let i = 0; i < genParams.length; i++) {
                caption += `n<sub>${i}</sub> = ${genParams[i]}`;
                if(i < genParams.length - 1)
                    caption += ", ";
                else
                    caption += ".</details>";
            }
        }
        return [retValue, retHeadX, retHeadY, caption];
    }
}

function formatNumericArrayAsColorPlot2D(ctx, table, headX, headY, width, height, bord, pad, scale, normalize, prec) {

    ////
    // Setup & error-checking

    //Save canvas style settings & transform
    ctx.save();
    let [lenX, lenY, err] = tryGet2DTableAndHeaderSize(table, headX, headY);
    if(err !== null) {
        ctx.font = "30px sans-serif";
        ctx.fillText("Error during plot! " + err, 30, 30);
        //Revert to default canvas style/transform
        ctx.restore();
        return;
    }



    ////
    // Reset background

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(bord, bord, width - bord * 2, height - bord * 2);



    ////
    // Axes

    ctx.strokeStyle = "#777777";

    //lines
    ctx.beginPath();
    ctx.moveTo(pad + bord, pad + bord);
    ctx.lineTo(pad + bord, height - pad - bord);
    ctx.lineTo(width - pad - bord, height - pad - bord);
    ctx.stroke();

    //primary labels
    ctx.fillStyle = "#000000";
    ctx.font = `${pad/2}px serif`;
    ctx.textAlign = "start";
    ctx.fillText('y\u2080', bord + 2, height / 2);
    ctx.textAlign = "center";
    ctx.fillText('x\u2080', width / 2, height - bord - 2);
    ctx.fillText('(x\u2081, y\u2081)', width / 2, bord + pad / 2);
    ctx.textAlign = "end";
    ctx.font = `${pad/4}px serif`;
    ctx.textBaseline = 'middle';

    //value labels
    for(let v = 0; v < lenY; v += Math.floor(lenY / 4)) {
        let vNorm = 1 - v / (lenY - 1);
        let y = lerp(pad + bord, height - (pad + bord), vNorm);

        ctx.fillText(headY[v].toFixed(prec), bord + pad * 0.9, y);
    }

    for(let u = 0; u < lenX; u += Math.floor(lenX / 4)) {
        let uNorm = u / (lenX - 1);
        let x = lerp(pad + bord, height - (pad + bord), uNorm);

        ctx.save();
        ctx.translate(x, height - bord - pad * 0.9);
        ctx.rotate(-Math.PI/2);
        ctx.fillText(headX[u].toFixed(prec), 0, 0);
        ctx.restore();
    }



    ////
    // Main function plot

    ctx.strokeStyle = "#000000";

    let img = ctx.createImageData(lenX, lenY);
    let data = img.data;

    for(let v = 0; v < lenY; v++) {
        //Invert Y (canvas has +Y down, standard cartesian coordinate display usually has +Y up)
        let vNorm = 1 - v / (lenY - 1);
        let y0Disp = lerp(pad + bord, height - (pad + bord), vNorm);
        let vNormP = 1 - (v + 1) / (lenY - 1);
        let y1Disp = lerp(pad + bord, height - (pad + bord), vNormP);

        for(let u = 0; u < lenX; u++) {
            let uNorm = u / (lenX - 1);
            let x0Disp = lerp(pad + bord, height - (pad + bord), uNorm);
            let uNormP = (u + 1) / (lenX - 1);
            let x1Disp = lerp(pad + bord, height - (pad + bord), uNormP);
            
            //Retrieve values -- should be 4D RGBA255 array
            let cellColor = table[v][u];

            /*
            ctx.fillStyle = cellColor;
            ctx.fillRect(x0Disp, y0Disp, x1Disp - x0Disp, y1Disp - y0Disp);
            */
            let dataIndex = (v * lenX + u) * 4;
            data[dataIndex] = cellColor[0];
            data[dataIndex+1] = cellColor[1];
            data[dataIndex+2] = cellColor[2];
            data[dataIndex+3] = cellColor[3];
        }
    }

    ctx.putImageData(img, pad + bord, pad + bord);

    ctx.restore();
}