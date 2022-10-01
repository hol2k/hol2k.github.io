const NEIGHBORHOODS = {
    vonNeumann: [
        {x: 1, y: 0},
        {x: -1, y: 0},
        {x: 0, y: 1},
        {x: 0, y: -1}
    ],
    vNCross: [
        {x: 1, y: 0},
        {x: -1, y: 0},
        {x: 0, y: 1},
        {x: 0, y: -1},
        {x: 2, y: 0},
        {x: -2, y: 0},
        {x: 0, y: 2},
        {x: 0, y: -2}
    ],
    moore: [
        {x: 1, y: 0},
        {x: -1, y: 0},
        {x: 0, y: 1},
        {x: 0, y: -1},
        {x: 1, y: 1},
        {x: -1, y: 1},
        {x: 1, y: -1},
        {x: -1, y: -1}
    ],
    mooreCross: [
        {x: 1, y: 0},
        {x: -1, y: 0},
        {x: 0, y: 1},
        {x: 0, y: -1},
        {x: 1, y: 1},
        {x: -1, y: 1},
        {x: 1, y: -1},
        {x: -1, y: -1},
        {x: 2, y: 0},
        {x: -2, y: 0},
        {x: 0, y: 2},
        {x: 0, y: -2}
    ]
}

const DEC2HEX = '0123456789ABCDEF';

class CAGrid {
    constructor(size, initialState = 0, neighborhood = 'moore', rule = '3/23', borderType = 'torus', borderFillState = 0) {
        this.size = size;

        this.grid = new Array(size * size); //interleaved, row-major
        this.grid.fill(initialState);
        this.deltaBuffer = new Array(size * size);
        this.deltaBuffer.fill(initialState);

        this.borderType = borderType;
        this.borderFillState = borderFillState;

        this.rule = rule;
        this.neighborhood = neighborhood;

        this.generation = 0n;

        this.evaluateRule();
    }

    evaluateRule(newRule = null) {
        if(newRule != null) this.rule = newRule;
        if(!/0?1?2?3?4?5?6?7?8?9?a?b?c?d?e?f?\/0?1?2?3?4?5?6?7?8?9?a?b?c?d?e?f?(\/[1-9][0-9]*)?/i.test(this.rule)) {
            throw new SyntaxError(`CAGrid was provided an unparseable rule '${this.rule}', expected format 'B/C' or 'B/C/D' where B and C are strings of unique ascending hexadecimal digits and D is any integer above 0`);
        }

        let splitRule = this.rule.split('/');

        this.birthRule = [];
        for(let i = 0; i < 16; i++) {
            this.birthRule[i] = splitRule[0].includes(DEC2HEX[i]);
        }

        this.continueRule = [];
        for(let i = 0; i < 16; i++) {
            this.continueRule[i] = splitRule[1].includes(DEC2HEX[i]);
        }

        if(splitRule.length == 3) {
            this.deathStages = Number(splitRule[2]);
        } else {
            this.deathStages = 0;
        }
    }

    getState(x, y) {
        if(x < this.size && x >= 0 && y < this.size && y >= 0) //in bounds
            return this.grid[x + y * this.size];
        switch(this.borderType) { //out of bounds, use border logic
            case 'fill':
                return this.borderFillState;
            case 'torus':
                return this.getState(
                    (x % this.size + this.size) % this.size, //double modulo and add sets lower bound as 0 instead of -size
                    (y % this.size + this.size) % this.size);
        }
    }

    setState(x, y, v) {
        if(x < this.size && x >= 0 && y < this.size && y >= 0) { //in bounds
            this.deltaBuffer[x + y * this.size] = v;
            return;
        }
        switch(this.borderType) { //out of bounds, use border logic
            case 'fill':
                return; //no-op
            case 'torus':
                return this.setState(
                    (x % this.size + this.size) % this.size, //double modulo and add sets lower bound as 0 instead of -size
                    (y % this.size + this.size) % this.size);
        }
    }

    countNeighbors(x, y, neighborhood) {
        let relCoords = NEIGHBORHOODS[neighborhood];
        let count = 0;
        for(const relCoord of relCoords) {
            if(this.getState(x+relCoord.x, y+relCoord.y) == 1)
                count++;
        }

        return count;
    }

    advanceDeltaBuffer(countChanges = false) {
        if(countChanges) {
            let changes = 0;
            for(let i = 0; i < this.size * this.size; i++) {
                if(this.grid[i] != this.deltaBuffer[i]) {
                    changes++;
                    this.grid[i] = this.deltaBuffer[i];
                }
            }
            return changes;
        } else {
            this.grid = this.deltaBuffer.slice(0);
        }
    }

    iterate(countChanges = false) {
        for(let x = 0; x < this.size; x++) {
            for(let y = 0; y < this.size; y++) {
                let here = this.getState(x, y);
                let neighbors = this.countNeighbors(x, y, this.neighborhood);
                if(here == 1) { //cell is alive, use continue rule
                    if(!this.continueRule[neighbors])
                        this.setState(x, y, this.deathStages > 0 ? 2 : 0);
                } else if(here == 0) { //cell is dead, use birth rule
                    if(this.birthRule[neighbors])
                        this.setState(x, y, 1);
                } else { //cell is dying, advance state by 1 and reset to 0 if out of dying states
                    let newState = here + 1;
                    if(newState > this.deathStages) newState = 0;
                    this.setState(x, y, newState);
                }
            }
        }

        this.generation++;

        return this.advanceDeltaBuffer(countChanges);
    }

    render(ctx, pxPerCell, occlusionRegion = null) {
        let imgSize = this.size * pxPerCell;

        let imgWidth = imgSize;
        let imgHeight = imgSize;
        if(occlusionRegion != null) {
            imgWidth = occlusionRegion.right - occlusionRegion.left;
            imgHeight = occlusionRegion.bottom - occlusionRegion.top;
        }
        let img = ctx.createImageData(imgWidth, imgHeight);
        let data = img.data;

        let borderColor = [125, 125, 125, 255];

        //infill cells -- using direct pixel manipulation and occlusion calculation for performance reasons
        for(let x = 0; x < this.size; x++) {
            let xp = x * pxPerCell;
            if(occlusionRegion != null && (xp < occlusionRegion.left || xp > occlusionRegion.right))
                continue;
            for(let y = 0; y < this.size; y++) {
                let yp = y * pxPerCell;

                if(occlusionRegion != null && (yp < occlusionRegion.top || yp > occlusionRegion.bottom))
                    continue;

                let here = this.getState(x, y);

                let cellColor;
                if(here == 1)
                    cellColor = 255;
                else if(here == 0)
                    cellColor = 0;
                else {
                    cellColor = 255 * (1 - (here - 1) / this.deathStages);
                }

                for(let v = yp - occlusionRegion.top; v < (y+1) * pxPerCell - occlusionRegion.top; v++) {
                    if(v >= imgHeight) continue;
                    for(let u = xp - occlusionRegion.left; u < (x+1) * pxPerCell - occlusionRegion.left; u++) {
                        if(u >= imgWidth) continue;
                        let dataIndex = (v * imgWidth + u) * 4;
                        data[dataIndex] = cellColor;
                        data[dataIndex+1] = cellColor;
                        data[dataIndex+2] = cellColor;
                        data[dataIndex+3] = 255;
                    }
                }
            }
        }

        ctx.putImageData(img, occlusionRegion.left, occlusionRegion.top);

        //draw borders
        ctx.fillStyle = '#777';
        if(pxPerCell > 3) {
            for(let n = 0; n < this.size; n++) {
                ctx.fillRect(0, n*pxPerCell, imgSize, 1);
                ctx.fillRect(n*pxPerCell, 0, 1, imgSize);
            }
        }
    }
}