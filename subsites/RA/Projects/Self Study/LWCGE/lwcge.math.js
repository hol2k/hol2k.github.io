class Vector3 {
    constructor(x, y, z) {
        this._x = x;
        this._y = y;
        this._z = z;
    }

    _magnitude;
    _sqrMagnitude;

    //no-op setter, makes this similar to a C# struct (immutable: x, y, and z are readonly)
    set x(value) {console.error("Attempt to set readonly property 'x' of vector3");} 
    set y(value) {console.error("Attempt to set readonly property 'y' of vector3");}
    set z(value) {console.error("Attempt to set readonly property 'z' of vector3");}
    get x() {return this._x;}
    get y() {return this._y;}
    get z() {return this._z;}

    //lazy cache -- only generated once needed, and then only once
    //possible due to immutability of vector values; would have to add a dirty flag otherwise
    get magnitude() {
        if(typeof this._magnitude === 'undefined') {
            this._magnitude = Math.sqrt(this.sqrMagnitude);
        }
        return this._magnitude;
    }
    get sqrMagnitude() {
        if(typeof this._sqrMagnitude === 'undefined') {
            this._sqrMagnitude = this.x * this.x + this.y * this.y + this.z * this.z;
        }
        return this._sqrMagnitude;
    }

    //Overrides
    toString() {
        return `(${this.x}, ${this.y}, ${this.z})`;
    }
    toFixed(prec) {
        return `(${this.x.toFixed(prec)}, ${this.y.toFixed(prec)}, ${this.z.toFixed(prec)})`;
    }

    //Statics
    static zero = new Vector3(0, 0, 0);
    static one = new Vector3(1, 1, 1);
    static right = new Vector3(1, 0, 0);
    static left = new Vector3(-1, 0, 0);
    static forward = new Vector3(0, 1, 0);
    static back = new Vector3(0, -1, 0);
    static up = new Vector3(0, 0, 1);
    static down = new Vector3(0, 0, -1);

    //Unary operators (Vector2)
    normalize = () => {
        if(this.x === 0 && this.y === 0 && this.z === 0) 
            return new Vector3(this.x, this.y, this.z);
        return this.scale(1 / this.magnitude);
    }
    invert = () => new Vector2(1/this.x, 1/this.y, 1 / this.z);
    cartesianToSpherical = () => {
        return new Vector2(this.magnitude, Math.atan2(this.y, this.x), Math.acos(this.z / this.magnitude));
    }
    sphericalToCartesian = () => {
        return new Vector2(this.x * Math.cos(this.y) * Math.sin(this.z), this.x * Math.sin(this.y) * Math.sin(this.z), this.x * Math.cos(this.z));
    }
    toArray = () => [this.x, this.y, this.z];

    //Binary operators (Vector2, Number)
    scale = (scalar) => new Vector2(this.x * scalar, this.y * scalar, this.z * scalar);
    
    //Binary operators (Vector2, Vector2)
    add = (addend) => new Vector2(this.x + addend.x, this.y + addend.y, this.z + addend.z);
    subtract = (subtrahend) => new Vector2(this.x - subtrahend.x, this.y - subtrahend.y, this.z - subtrahend.z);
    multiply = (multiplier) => new Vector2(this.x * multiplier.x, this.y * multiplier.y, this.z * multiplier.z);
    divide = (divisor) => new Vector2(this.x / divisor.x, this.y / divisor.y, this.z / divisor.z);
    distance = (other) => this.subtract(other).magnitude();
    sqrDistance = (other) => this.subtract(other).sqrMagnitude();
    manhattanDistance = (other) => Math.abs(this.x - other.x) + Math.abs(this.y - other.y) + Math.abs(this.z - other.z);
    dot = (other) => this.x * other.x + this.y * other.y + this.z * other.z;
    cross = (other) => new Vector3(
        this.y * other.z - this.z * other.y,
        this.z * other.x - this.x * other.z,
        this.x * other.y - this.y * other.x
        );
    angleTo = (other) => Math.acos(this.normalize().dot(other.normalize()));
}

class Matrix4 {
    constructor() {

    }
}

class Quaternion {
    constructor() {

    }
}