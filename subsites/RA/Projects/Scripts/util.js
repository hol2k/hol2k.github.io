//Returns an array containing all integers in the range [from, to] that match a filter function.
function filterIntegers(from, to, filter) {
    var retv = [];
    for(let i = from; i <= to; i++) {
        if(filter(i))
            retv.push(i);
    }
    return retv;
}

//Returns an array containing the results of iterating a callback function, which is passed the iteration index and a list of previous states. Number of values in history is controlled by the number of initial values in state.
//  `state`: an array containing the initial state of the function.
//  `totalValues`: the desired number of return values. Will contain and count initial values in `state`.
//  `callback`: the function to iterate. Will be passed a. the current iteration index, starting with 0; and b. `state`.
//      Whenever `callback` is called: its return value will be pushed to the results and to `state`, and the first/oldest value of `state` will be removed.
//  RETURNS: the array built by the process described above.
function iterateWithState(state, totalValues, callback) {
    let retv = [];
    for(let i = 0; i < state.length && totalValues > 0; i++) {
        retv[i] = state[i];
        totalValues--;
    }
    for(let i = 0; i < totalValues; i++) {
        let nv = callback(i, state);
        state.shift(); //remove first element from array
        state.push(nv); //add new value to end of array
        retv.push(nv); //and also to the results
    }
    return retv;
}

//Returns the result of Number.toFixed (`num`.toFixed(`prec`)) with trailing zeroes removed.
function numToFixedNoTrail(num, prec) {
    return String(Number(num.toFixed(prec)));
}

//Returns an HTML table containing the results of a callback function executed on the natural numbers [1, rows] and [1, cols]. titleSym is displayed in the upper left cell.
function generateNaturalFunctionTable(rows, cols, callback, titleSym = '?', caption = '') {
    let retv = `<table>`;
    if(caption != '') retv += `<caption>${caption}</caption>`;
    retv += `<thead><tr><th rowspan='2' colspan='2' class='numtable-corner-label'>${titleSym}</th><th colspan='${cols}' class='numtable-top-label'>x</th></tr><tr>`;
    for(let j = 1; j <= cols; j++) {
        retv += `<th>${(j)}</th>`;
    }
    retv += '</tr></thead><tbody>';
    for(let i = 1; i <= rows; i++) {
        retv += `<tr>`;
        if(i == 1)
            retv += `<th rowspan='${rows}' class='numtable-side-label'>y</th>`;
        retv += `<th class='numtable-side-header'>${(i)}</th>`;
        for(let j = 1; j <= cols; j++) {
            retv += `<td>${callback(j, i)}</td>`;
        }
        retv += '</tr>';
    }
    retv += '</tbody></table>';
    return retv;
}

//Returns the number which is a fraction `x` of the way between `a` and `b`.
function lerp(a, b, x) {
    return a + x * (b - a);
}

//Returns how far between `a` and `b` the number `y` is (= 0 at `y`=`a`, = 1 at `y`=`b`).
function inverseLerp(a, b, y) {
    return (y-a)/(b-a);
}

//Remaps a number `y` from the range [`minFrom`, `maxFrom`] to the range [`minTo`, `maxTo`]. Equivalent to chaining the InverseLerp and Lerp operations.
function remap(y, minFrom, maxFrom, minTo, maxTo) {
    return minTo + (maxTo - minTo) * ((y - minFrom) / (maxFrom - minFrom));
}

//Prints an equality comparison of an array `toTest`'s contents to the browser console. If `strict` is true, uses strict equality; uses weak equality otherwise. Row/column names can be overridden with an optional third `names` parameter, which must be an array of equal length to `toTest`.
function printEqualityTable(strict, toTest, names = null) {
    if(!Array.isArray(toTest)) {
        console.error('Could not print equality table: provided objects list was not an array. Debug params (objects, names) follow:');
        console.debug(toTest);
        console.debug(names);
        return;
    }
    if(names !== null && (!Array.isArray(names) || names.length != toTest.length)) {
        console.error('Could not print equality table: invalid names array was provided (must be null, or an array equal in length to objects array). Debug params (objects, names) follow:');
        console.debug(toTest);
        console.debug(names);
        return;
    }
    //auto-generate names if they aren't provided
    if(names === null) {
        names = [];
        for(let i = 0; i < toTest.length; i++)
            names[i] = `(${(typeof toTest[i]).substring(0, 3)}) ${toTest[i]}`;
    }
    let table = {};
    for(let i = 0; i < toTest.length; i++) {
        let row = {};
        for(let j = 0; j < toTest.length; j++) {
            let isEq;
            if(strict)
                isEq = toTest[i] === toTest[j];
            else
                isEq = toTest[i] == toTest[j];
            //entities are not rendered, must use direct unicode characters here
            //duplicate names will override, so append index as a GUID
            row[`${j+1}:${names[j]}`] = isEq ? '✔' : '❌';

        }
        table[`${i+1}:${names[i]}`] = row;
    }
    console.log(`${strict ? 'Strict' : 'Weak'} equality table on ${toTest.length} objects:`);
    console.table(table);
}

//Returns an HTML table containing the results of a callback function executed on the numbers [`fromX`, `toX`] and [`fromY`, `toY`] with a constant step of `stepX`/`stepY`.
//    - Numeric precision of the headers is controlled by `precX`/`precY`. Headers are automatically given the classes "numtable-side-header" or "numtable-top-header".
//    - `titleSym` is displayed in the upper left cell. This cell is given the class "numtable-corner-label".
//    - If non-empty, `caption` is added to the table as a caption element's content.
//    - If non-empty, `xCap`/`yCap` will be displayed as full-span header labels, with classes "numtable-top-label"/"numtable-side-label".
function generateLinearFunctionTable(fromX, toX, stepX, precX, fromY, toY, stepY, precY, callback, titleSym = '?', caption = '', xcap = 'x', ycap = 'y') {

    ////
    //Handle swapped from/to order and negative/zero step size

    if(stepX == 0) {
        console.warn('generateLinearFunctionTable received a stepX of 0, would result in infinite loop! Defaulting to 1.');
        stepX = 1;
    }
    if(stepY == 0) {
        console.warn('generateLinearFunctionTable received a stepY of 0, would result in infinite loop! Defaulting to 1.');
        stepY = 1;
    }
    let invertX = false;
    if(toX < fromX) {
        let swap = toX;
        toX = fromX;
        fromX = swap;
        invertX = true;
    }
    if(stepX < 0) {
        stepX = -stepX;
        invertX = !invertX;
    }
    let invertY = false;
    if(toY < fromY) {
        let swap = toY;
        toY = fromY;
        fromY = swap;
        invertY = true;
    }
    if(stepY < 0) {
        stepY = -stepY;
        invertY = !invertY;
    }



    ////
    //Precalculate the total number of rows and columns for use in rowspan/colspan attributes

    let cols = 0;
    let rows = 0;
    for(let j = fromX; j <= toX; j += stepX)
        cols++;
    for(let i = fromY; i <= toY; i += stepY)
        rows++;



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
        retv += `<th colspan='${cols}' class='numtable-top-label'>${xcap}</th></tr>`;
        retv += '<tr>';
    }

    //Top header
    for(let j = fromX; j <= toX; j += stepX) {
        //Calculate x from for loop index j (may have been reversed earlier)
        let xcb = j;
        if(invertX)
            xcb = remap(xcb, toX, fromX, fromX, toX); //TODO: check if this behaves correctly when for loop terminates with a remainder

        //Top header cell
        retv += `<th class='numtable-top-header'>${numToFixedNoTrail(xcb, precX)}</th>`;
    }

    retv += '</tr>';
    retv += '</thead>';



    ////
    //Table body

    retv += '<tbody>';
    for(let i = fromY; i <= toY; i += stepY) {
        retv += `<tr>`;

        //Side label (first row only)
        if(i == fromY && ycap != '')
            retv += `<th rowspan='${rows}' class='numtable-side-label'>${ycap}</th>`;

        //Calculate y from index i
        let ycb = i;
        if(invertY)
            ycb = remap(ycb, toY, fromY, fromY, toY);
        
        //Side header cell (1 per row)
        retv += `<th class='numtable-side-header'>${numToFixedNoTrail(ycb, precY)}</th>`;
        
        //Main table content
        for(let j = fromX; j <= toX; j += stepX) {
            //Calculate x from index j
            let xcb = j;
            if(invertX)
                xcb = remap(xcb, toX, fromX, fromX, toX);

            //Main cell content
            retv += `<td>${callback(xcb,ycb)}</td>`;
        }

        retv += '</tr>';
    }
    retv += '</tbody></table>';

    return retv;
}

function rgbaToHsla01(r, g, b, a) {
    let hue, sat, lgh;

    let minCh = Math.min(r,g,b), maxCh = Math.max(r,g,b);
    let deltaCh = maxCh - minCh;
    lgh = (maxCh + minCh) / 2;

    if(deltaCh === 0) {
        hue = 0;
        sat = 0;
    } else {
        if(maxCh === r) hue = ((g - b) / deltaCh) + 0;
        else if(maxCh === g) hue = ((b - r) / deltaCh) + 2;
        else hue = ((r - g) / deltaCh) + 4;
        hue = ((hue + 6) % 6) / 6;
        sat = deltaCh / (1 - Math.abs(2 * lgh - 1));
    }

    return [hue, sat, lgh, a];
}

function hslaToRgba01(h, s, l, a) {
    let chroma = (1 - Math.abs(2 * l - 1)) * s;
    let slc = chroma * (1 - Math.abs((h * 6) % 2 - 1));
    let add = l - chroma / 2;
    let r, g, b;
    
    if(h > 5/6) {
        r = chroma; g = 0; b = slc;
    } else if(h > 4/6) {
        r = slc; g = 0; b = chroma;
    } else if(h > 3/6) {
        r = 0; g = slc; b = chroma;
    } else if(h > 2/6) {
        r = 0; g = chroma; b = slc;
    } else if(h > 1/6) {
        r = slc; g = chroma; b = 0;
    } else {
        r = chroma; g = slc; b = 0;
    }

    return [r + add, g + add, b + add, a];
}

const dayNames = Object.freeze(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);

function getDayNameFromDate(date) {
    let dayIndex;
    if(!(date instanceof Date) || isNaN(dayIndex = date.getDay()))
        return 'Invalid Day';
    return dayNames[dayIndex];
}