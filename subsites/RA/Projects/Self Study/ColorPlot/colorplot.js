let canvas, mainContext;

//Event fires when the DOM is ready (calling document.getElementById before this may fail).
document.addEventListener('DOMContentLoaded', (e) => {
    //retrieve canvas refs
    canvas = document.getElementById('s1-output');
    if(!canvas.getContext) {
        canvas.innerHTML = 'Your browser does not support the canvas element; graph cannot be displayed. An equivalent table of values is provided as a fallback.';
    } else {
        mainContext = canvas.getContext('2d');
    }

    generatePlot(mainContext, 10, 250, 2);
});

function exponentialDistanceCalcFactory(exponent) {
    return (x0, y0, x1, y1) => {
        return Math.pow(Math.abs(x1 - x0), exponent) + Math.pow(Math.abs(y1 - y0), exponent);
    }
}

//https://en.wikipedia.org/wiki/Jump_flooding_algorithm
//constant on number of seeds, but more costly on image size (N^2 log N?)
function jumpFlood(imageSizeAsPo2, distanceCalculator, seedsXY) {
    let pixels = [];
    let gridSize = Math.pow(2, imageSizeAsPo2);
    for(let i = 0; i < gridSize; i++) {
        pixels[i] = new Array(gridSize);
    }
    for(let i = 0; i < seedsXY.length; i++) {
        let [sx, sy] = seedsXY[i];
        pixels[sy][sx] = [i, 0];
    }
    //duplicate run required for unknown reason or output will be extremely glitchy
    for(let n = 0; n < 2; n++) {
        for(let k = gridSize / 2; k >= 1; k /= 2) {
            for(let y = 0; y < gridSize; y++) {
                for(let x = 0; x < gridSize; x++) {
                    let here = pixels[y][x];
                    for(let j = -k; j <= k; j += k) {
                        for(let i = -k; i <= k; i += k) {
                            if(i === 0 && j === 0) continue;
                            let nx = x + i;
                            let ny = y + j;
                            if(nx >= gridSize || nx < 0) continue;
                            if(ny >= gridSize || ny < 0) continue;
                            let neighbor = pixels[ny][nx];
                            if(neighbor === here || typeof neighbor === 'undefined') continue;
                            let nseed = seedsXY[neighbor[0]];
                            let distNeighbor = distanceCalculator(x, y, nseed[0], nseed[1]);
                            if(typeof here === 'undefined') {
                                pixels[y][x] = [neighbor[0], distNeighbor];
                            } else {
                                if(here[1] > distNeighbor) {
                                    pixels[y][x] = [neighbor[0], distNeighbor];
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return pixels;
}

function generatePlot(ctx, size, seedCount, exponent) {

    ////
    // Setup & error-checking

    let sizePx = Math.pow(2, size);
    ctx.canvas.width = sizePx;
    ctx.canvas.height = sizePx;



    ////
    // Reset background

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, sizePx, sizePx);



    ////
    // Main function plot using JFA
    /*

    let seeds = [];
    let colors = [];

    for(let i = 0; i < seedCount; i++) {
        seeds[i] = [Math.floor(Math.random()*(sizePx-1)), Math.floor(Math.random()*(sizePx-1))];
        colors[i] = hslaToRgba01(Math.random(), 1, 0.5, 1);
        for(let j = 0; j < 4; j++)
            colors[i][j] = Math.floor(colors[i][j] * 255);
    }

    let pixelSeedIndices = jumpFlood(size, exponentialDistanceCalcFactory(exponent), seeds);

    ctx.strokeStyle = "#000000";

    let img = ctx.createImageData(sizePx, sizePx);
    let data = img.data;

    for(let v = 0; v < sizePx; v++) {
        for(let u = 0; u < sizePx; u++) {
            //Retrieve values -- should be 4D RGBA255 array
            let cellColorIndex = pixelSeedIndices[v][u];
            let cellColor;
            if(typeof cellColorIndex === 'undefined')
                cellColor = [0, 0, 0, 1];
            else
                cellColor = colors[cellColorIndex[0]];

            let dataIndex = (v * sizePx + u) * 4;
            data[dataIndex] = cellColor[0];
            data[dataIndex+1] = cellColor[1];
            data[dataIndex+2] = cellColor[2];
            data[dataIndex+3] = cellColor[3];
        }
    }

    ctx.putImageData(img, 0, 0);*/



    ////
    // Seed generation

    let seeds = [];

    /*for(let i = 0; i < seedCount; i++) {
        seeds[i] = {
            x:Math.floor(Math.random()*(sizePx-1)),
            y:Math.floor(Math.random()*(sizePx-1)),
            color:`hsl(${Math.random()*360}, 100%, 50%)`
        };
    }*/



    ////
    // Array operations practice
    let xCoords = [];
    let yCoords = [];
    let hues = [];

    for(let i = 0; i < seedCount; i++) {
        xCoords[i] = Math.floor(Math.random()*(sizePx-1));
        yCoords[i] = Math.floor(Math.random()*(sizePx-1));
        hues[i] = Math.random()*360;
    }

    /*
    yCoords.sort((a, b) => a - b);
    xCoords.sort((a, b) => a - b);
    hues.sort((a, b) => a / b - 1);
    */

    //move first n colors with hue>180 to start, excluding ones that were already within that range (shouldn't be any there, except in edge cases, due to prior sort)
    /*
    let toShuffle = 30;
    for(let i = 0; i < toShuffle; i++) {
        let found = hues.find((x, ind) => x > 180 && ind > toShuffle);
        if(typeof found === 'undefined') break;
        hues.splice(hues.indexOf(found), 1);
        hues.unshift(found);
    }*/

    //apply a weird modulo split to x coords -- sort of the inverse operation of shuffling?
    /*
    let modRange = 100;
    let modThresh = 50;
    xCoords = xCoords.filter(x => x % modRange > modThresh)
        .concat(xCoords.filter(x => x % modRange <= modThresh));
        //assignment operator takes place last, so all array values are accounted for
    */

    //build seed objects from components
    for(let i = 0; i < seedCount; i++) {
        seeds[i] = {x:xCoords[i], y:yCoords[i]}; //, color:`hsl(${hues[i]}, 100%, 50%)`
    }

    //change seed lightness based on x coordinate
    seeds.forEach((seed, ind) => {
        seed.color = `hsl(${hues[ind]}, 100%, ${seed.x/sizePx*100}%)`;
    });



    ////
    // Main function plot using https://github.com/gorhill/Javascript-Voronoi (MIT licensed)
    // MUCH faster than JFA on high image size; but does not allow for a custom distance function, Euclidean only!

    let voronoi = new Voronoi();
    let bounds = {xl: 0, xr: sizePx, yt: 0, yb: sizePx};
    let diagram = voronoi.compute(seeds, bounds);
    for(let cell of diagram.cells) {
        ctx.beginPath();
        let hasSetFirstPoint = false;
        for(let halfedge of cell.halfedges) {
            let pos = halfedge.getStartpoint();
            if(hasSetFirstPoint) {
                ctx.lineTo(pos.x, pos.y);
            } else {
                hasSetFirstPoint = true;
                ctx.moveTo(pos.x, pos.y);
            }
        }
        ctx.fillStyle = cell.site.color;
        ctx.fill();
        ctx.fillStyle = "#0004";
        ctx.beginPath();
        ctx.arc(cell.site.x, cell.site.y, sizePx * 0.005, 0, Math.PI * 2);
        ctx.fill();
    }
}