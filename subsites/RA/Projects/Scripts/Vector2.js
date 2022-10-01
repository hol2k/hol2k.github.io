class Vector2 {
    constructor(x, y) {
        this._x = x;
        this._y = y;
    }
    //no-op setter, makes this similar to a C# struct (immutable: x and y are readonly)
    set x(value) {console.error("Attempt to set readonly property 'x' of vector2");} 
    set y(value) {console.error("Attempt to set readonly property 'y' of vector2");}
    get x() {return this._x;}
    get y() {return this._y;}

    //Overrides
    toString() {
        return `(${this.x}, ${this.y})`;
    }
    toFixed(prec) {
        return `(${this.x.toFixed(prec)}, ${this.y.toFixed(prec)})`;
    }

    //Statics
    static zero = new Vector2(0, 0);
    static one = new Vector2(1, 1);
    static up = new Vector2(1, 0);
    static right = new Vector2(0, 1);
    static down = new Vector2(-1, 0);
    static left = new Vector2(0, -1);

    //Unary operators (Vector2)
    sqrMagnitude = () => this.x * this.x + this.y * this.y;
    magnitude = () => Math.sqrt(this.sqrMagnitude);
    normalize = () => {
        if(this.x === 0 && this.y === 0) 
            return new Vector2(this.x, this.y);
        return this.scale(1 / this.magnitude);
    }
    transpose = () => new Vector2(this.y, this.x);
    invert = () => new Vector2(1/this.x, 1/this.y);
    toPolar = () => {
        return new Vector2(this.magnitude, Math.atan2(this.y, this.x));
    }
    toCartesian = () => {
        return new Vector2(this.x * Math.cos(this.y), this.x * Math.sin(this.y));
    }
    toArray = () => [this.x, this.y];

    //Binary operators (Vector2, Number)
    scale = (scalar) => new Vector2(this.x * scalar, this.y * scalar);
    
    //Binary operators (Vector2, Vector2)
    add = (addend) => new Vector2(this.x + addend.x, this.y + addend.y);
    subtract = (subtrahend) => new Vector2(this.x - subtrahend.x, this.y - subtrahend.y);
    multiply = (multiplier) => new Vector2(this.x * multiplier.x, this.y * multiplier.y);
    divide = (divisor) => new Vector2(this.x / divisor.x, this.y / divisor.y);
    distance = (other) => this.subtract(other).magnitude();
    sqrDistance = (other) => this.subtract(other).sqrMagnitude();
    manhattanDistance = (other) => Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
    dot = (a, b) => a.x * b.x + a.y * b.y;
}