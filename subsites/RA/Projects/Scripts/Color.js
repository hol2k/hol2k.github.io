//WIP! do not use
class Color {
    //https://stackoverflow.com/questions/44447847/enums-in-javascript-with-es6
    static ColorFormat = Object.freeze({
        RGBA255: Symbol("rgba255"),
        HSLA255: Symbol("hsla255"),
        HSVA255: Symbol("hsva255"),
        RGBAPct: Symbol("rgbapct"),
        HSLAPctDegr: Symbol("hslapctdegr"),
        HSVAPctDegr: Symbol("hsvapctdegr"),
        RGBA01: Symbol("rgba01"),
        HSLA01: Symbol("hsla01"),
        HSVA01: Symbol("hsva01"),
        Hex: Symbol("hex")
    });
    constructor(type, x, y, z, a = 1) {
        if(!ColorFormat.hasOwnProperty(type)) {
            throw new TypeError(`Argument 1 (type) must be a Color.ColorFormat (received '${type}' as ${typeof type}).`);
        } else if(type === ColorFormat.Hex) {
            throw new TypeError(`Argument 1 (type) cannot be ColorFormat.Hex in the 5-parameter Color constructor (type, x, y, z, a). Use the single-parameter constructor (hex) instead.`);
        }
        this.value = [x, y, z, a];
    }
    constructor(hex) {
        this.value = hex;
        this.type = ColorFormat.Hex;
    }
    Convert(newType) {
        if(!ColorFormat.hasOwnProperty(newType)) {
            throw new TypeError(`Argument 1 (newType) must be a Color.ColorFormat (received '${type}' as ${typeof type}).`);
        }
        if(newType === this.type) return;
    }

    #mult(scalar) {
        if(this.type === ColorFormat.Hex) {
            throw new TypeError(`#mult cannot be used on a Color with type of ColorFormat.Hex.`);
        }
        this.value[0] *= scalar;
        this.value[1] *= scalar;
        this.value[2] *= scalar;
        this.value[3] *= scalar;
    }
}