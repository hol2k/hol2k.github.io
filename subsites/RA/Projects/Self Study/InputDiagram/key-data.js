class DisplayKey {
    constructor(normalKey, shiftedKey, widthFrac = 1, isRawInput = true, overrideNormal = null, overrideShifted = null, overrideSpecialPredicate = null) {
        this.normalKey = normalKey;
        this.shiftedKey = shiftedKey;
        this.widthFrac = widthFrac;
        this.shouldInput = isRawInput;
        this.overrideNormal = overrideNormal;
        this.overrideShifted = overrideShifted;
        this.overrideSpecialPredicate = overrideSpecialPredicate;
        this.svgBox = null;
        this.svgText = null;
    }
}

let keyMap = [
    [
        new DisplayKey('`', '~'),
        new DisplayKey('1', '!'),
        new DisplayKey('2', '@'),
        new DisplayKey('3', '#'),
        new DisplayKey('4', '$'),
        new DisplayKey('5', '%'),
        new DisplayKey('6', '^'),
        new DisplayKey('7', '&'),
        new DisplayKey('8', '*'),
        new DisplayKey('9', '('),
        new DisplayKey('0', ')'),
        new DisplayKey('-', '_'),
        new DisplayKey('=', '+'),
        new DisplayKey('Backspace', 'Backspace', 2, false, 'Bksp', 'Bksp')
    ],
    [
        new DisplayKey('Tab', 'Tab', 1.5, false, 'Tab', 'Tab'),
        new DisplayKey('q', 'Q'),
        new DisplayKey('w', 'W'),
        new DisplayKey('e', 'E'),
        new DisplayKey('r', 'R'),
        new DisplayKey('t', 'T'),
        new DisplayKey('y', 'Y'),
        new DisplayKey('u', 'U'),
        new DisplayKey('i', 'I'),
        new DisplayKey('o', 'O'),
        new DisplayKey('p', 'P'),
        new DisplayKey('[', '{'),
        new DisplayKey(']', '}'),
        new DisplayKey('\\', '|', 1.5)
    ],
    [
        new DisplayKey('CapsLock', 'CapsLock', 1.75, false, 'Caps', 'Caps'),
        new DisplayKey('a', 'A'),
        new DisplayKey('s', 'S'),
        new DisplayKey('d', 'D'),
        new DisplayKey('f', 'F'),
        new DisplayKey('g', 'G'),
        new DisplayKey('h', 'H'),
        new DisplayKey('j', 'J'),
        new DisplayKey('k', 'K'),
        new DisplayKey('l', 'L'),
        new DisplayKey(';', ':'),
        new DisplayKey("'", '"'),
        new DisplayKey('Enter', 'Enter', 2.35, false)
    ],
    [
        new DisplayKey('Shift', 'Shift', 2.25, false, 'LShift', 'LShift',
            (e) => e.key == 'Shift' && e.location !== KeyboardEvent.DOM_KEY_LOCATION_RIGHT),
        new DisplayKey('z', 'Z'),
        new DisplayKey('x', 'X'),
        new DisplayKey('c', 'C'),
        new DisplayKey('v', 'V'),
        new DisplayKey('b', 'B'),
        new DisplayKey('n', 'N'),
        new DisplayKey('m', 'M'),
        new DisplayKey(',', '<'),
        new DisplayKey('.', '>'),
        new DisplayKey('/', '?'),
        new DisplayKey('Shift', 'Shift', 2.95, false, 'RShift', 'RShift',
            (e) => e.key == 'Shift' && e.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT)
    ],
    [
        new DisplayKey('Control', 'Control', 1.55, false, 'LCtrl', 'LCtrl',
            (e) =>e.key == 'Control' && e.location !== KeyboardEvent.DOM_KEY_LOCATION_RIGHT),
        new DisplayKey('Meta', 'Meta', 1, false),
        new DisplayKey('Alt', 'Alt', 1.5, false, 'LAlt', 'LAlt',
            (e) => e.key == 'Alt' && e.location !== KeyboardEvent.DOM_KEY_LOCATION_RIGHT),
        new DisplayKey(' ', ' ', 6.5, true, '\xa0', '\xa0'),
        new DisplayKey('Alt', 'Alt', 1.5, false, 'RAlt', 'RAlt',
            (e) => e.key == 'Alt' && e.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT),
        new DisplayKey('Fn', 'Fn', 1, false),
        new DisplayKey('ContextMenu', 'ContextMenu', 1, false, "Ctx", "Ctx"),
        new DisplayKey('Control', 'Control', 1.55, false, 'RCtrl', 'RCtrl',
            (e) => e.key == 'Control' && e.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT)
    ]
];

let lookupDisplayByNormal = keyMap.flat().reduce((accum, displayKey) => {
    accum[displayKey.normalKey] = displayKey;
    return accum;
}, {});
let lookupDisplayByNormalOverride = keyMap.flat().reduce((accum, displayKey) => {
    accum[displayKey.overrideNormal] = displayKey;
    return accum;
}, {});
let lookupDisplayByShifted = keyMap.flat().reduce((accum, displayKey) => {
    accum[displayKey.shiftedKey] = displayKey;
    return accum;
}, {});

function createKeyMapDOM(targetContainer) {
    for(let i = 0; i < keyMap.length; i++) {
        let o = 0;
        let j = 0;
        for(let key of keyMap[i]) {
            let newKeyDiagram = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            newKeyDiagram.setAttribute('width', keySize * key.widthFrac);
            newKeyDiagram.setAttribute('height', keySize);
            newKeyDiagram.setAttribute('rx', keySize / 5);
            newKeyDiagram.setAttribute('x', o * keySize + j * keySize * 0.1);
            newKeyDiagram.setAttribute('y', i * keySize * 1.1);
            newKeyDiagram.addEventListener('mouseover', (e) => {
                newKeyDiagram.style.outline = '3px solid orange';
            });
            newKeyDiagram.addEventListener('mouseout', (e) => {
                newKeyDiagram.style.outline = 'none';
            });
            newKeyDiagram.addEventListener('mousedown', (e) => {
                document.getElementById('main-input').dispatchEvent(new KeyboardEvent('keydown', {'key': key.normalKey}));
            });
            newKeyDiagram.addEventListener('mouseup', (e) => {
                document.getElementById('main-input').dispatchEvent(new KeyboardEvent('keyup', {'key': key.normalKey}));
            });
            newKeyDiagram.dataset.key = key.normalKey;
            newKeyDiagram.dataset.shiftkey = key.shiftedKey;
            targetContainer.appendChild(newKeyDiagram);
            let newKeyText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            let keyText = key.overrideNormal || key.normalKey;
            newKeyText.textContent = keyText;
            newKeyText.setAttribute('fill', '#fff');
            newKeyText.setAttribute('text-anchor', 'middle');
            newKeyText.setAttribute('dominant-baseline', 'middle');
            newKeyText.style.userSelect = 'none';
            newKeyText.style.pointerEvents = 'none';
            newKeyText.setAttribute('x', (o + key.widthFrac * 0.5) * keySize + j * keySize * 0.1);
            newKeyText.setAttribute('y', (i + 0.5) * keySize * 1.1);
            newKeyText.setAttribute('font-size', `${Math.min(80*(key.widthFrac+1)/keyText.length,80)}%`);
            targetContainer.appendChild(newKeyText);
            key.svgBox = newKeyDiagram;
            key.svgText = newKeyText;
            o += key.widthFrac;
            j++;
        }
    }
}