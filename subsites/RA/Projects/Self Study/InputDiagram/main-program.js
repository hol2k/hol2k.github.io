let mainSvg = document.getElementById('main-svg');
let inpEcho = document.getElementById('input-echo');
let keySize = 20;
let isShifted = false;
let removableEchoKeys = [[]];
const LINE_LIMIT = 60;

inpEcho.style.width = (LINE_LIMIT/2) + 'em';

lookupDisplayByNormal['Enter'].onInput = (e, self) => {
    let newBr = document.createElement('br');
    newBr.textContent = '\xa0';
    removableEchoKeys.push([newBr]);
    inpEcho.appendChild(newBr);
    let newBrAnimator = document.createElement('span');
    newBrAnimator.textContent = '\u23CE';
    inpEcho.appendChild(newBrAnimator);
    makeAbsoluteNoMove(newBrAnimator);
    let newBrAnimation = newBrAnimator.animate([
        {backgroundColor: '#020'},
        {backgroundColor: '#0f0'},
        {backgroundColor: '#020'},
        {backgroundColor: '#0f0'},
        {backgroundColor: '#020'}
    ], {
        duration: 500, easing: 'ease'
    });
    newBrAnimation.addEventListener('finish', (e) => {e.currentTarget.effect.target.remove();});
    inpEcho.appendChild(inpEcho.querySelector('.input-cursor'));
};
lookupDisplayByNormal['Backspace'].onInput = (e, self) => {
    let currentLine = removableEchoKeys[removableEchoKeys.length - 1];
    if(currentLine.length <= 0) return;
    let lastLabel = currentLine.pop();
    makeAbsoluteNoMove(lastLabel);
    let oldPos = lastLabel.getBoundingClientRect();
    let rx = 15 - Math.random() * 30;
    let ry = 15 - Math.random() * 30;
    let rr = 90 - Math.random() * 180;
    if(lastLabel.nodeName === 'BR') {
        let newBrAnimator = document.createElement('span');
        newBrAnimator.textContent = '\u23CE';
        inpEcho.appendChild(newBrAnimator);
        inpEcho.appendChild(inpEcho.querySelector('.input-cursor'));
        makeAbsoluteNoMove(newBrAnimator);
        let newBrAnimation = newBrAnimator.animate([
            {backgroundColor: '#020'},
            {backgroundColor: '#f00'},
            {backgroundColor: '#020'}
        ], {
            duration: 300, easing: 'ease'
        });
        newBrAnimation.addEventListener('finish', (e) => {e.currentTarget.effect.target.remove();});
        lastLabel.remove();
        removableEchoKeys.pop();
    } else {
        let fadeAnim = animateTrajectory(
            lastLabel,
            rx*10, -Math.abs(ry)*10, //vel (px/sec)
            0, 1000, //accel (px/sec2)
            1, //time (sec)
            1, 10, null, //scale, resolution, options
            (tFrac, t, x, y) => { //additional keyframe values
                return {
                    opacity: `${1 - tFrac}`
                };
            }, (tFrac, t, x, y) => { //additional transforms per keyframe
                return `rotate(${rr*tFrac}deg)`;
            });
        fadeAnim.addEventListener('finish', (e) => {e.currentTarget.effect.target.remove();});
    }
};
lookupDisplayByNormal['Tab'].onInput = (e, self) => {
    printKey(self, '\u2003');
};
lookupDisplayByNormal['Shift'].onInput = (e, self) => {
    
};
lookupDisplayByNormal['CapsLock'].onInput = (e, self) => {
    
};

function updateShiftState(e) {
    let isCapsed = e.getModifierState('CapsLock');
    isShifted = e.shiftKey != isCapsed;

    if(isCapsed) {
        lookupDisplayByNormal['CapsLock'].svgBox.style.stroke = 'yellow';
        lookupDisplayByNormal['CapsLock'].svgBox.style.strokeWidth = '4px';
    } else {
        lookupDisplayByNormal['CapsLock'].svgBox.style.stroke = 'black';
        lookupDisplayByNormal['CapsLock'].svgBox.style.strokeWidth = '0px';
    }
    for(let i = 0; i < keyMap.length; i++) {
        for(let key of keyMap[i]) {
            key.svgText.textContent = isShifted ? (key.overrideShifted || key.shiftedKey) : (key.overrideNormal || key.normalKey);
        }
    }
}

//executed by several event systems to print a non-special key
function printKey(matchedKey, text) {
    //failure case: line limit
    if(removableEchoKeys[removableEchoKeys.length-1].filter(x => x.nodeName !== 'BR').length >= LINE_LIMIT) {
        statusBar.animate([
            {color: '#f00'},
            {color: '#000'}
        ], {duration: 200});
        for(const char of removableEchoKeys[removableEchoKeys.length - 1]) {
            char.animate([
                {transform: `rotate(${Math.random() * 45 - 22.5}deg) translate(${Math.random() * -100}%,${Math.random() * 25 - 12.5}%)`},
                {transform: 'rotate(0) translate(0, 0)'}
            ], {duration: 200});
        }
        return;
    }

    //failure case: restricted keys
    //will not apply to special characters, which are already filtered out by the DisplayKey system! some have behavior applied which this does not prevent, e.g. enter inserting linebreaks.
    //use \xa0 instead of space -- DisplayKey uses non-breaking spaces internally
    //let validChars = /[a-zA-Z\xa0]/i;
    /*
    let validChars = /[0-9+\-\xa0]/i;
    if(!validChars.test(text)) {
        let origText = matchedKey.svgText.textContent;
        matchedKey.svgText.textContent = '\u20E0' + origText;
        matchedKey.svgText.animate([
            {transform: 'translateX(0)'},
            {transform: 'translateX(-0.1em)'},
            {transform: 'translateX(0.1em)'},
            {transform: 'translateX(-0.1em)'},
            {transform: 'translateX(0.1em)'},
            {transform: 'translateX(0)'}
        ], {
            duration: 200   
        });
        return;
    }
    */
    
    //all OK, print character
    let echoLabel = document.createElement('span');
    echoLabel.textContent = text;
    inpEcho.appendChild(echoLabel);
    let posIn = matchedKey.svgText.getBoundingClientRect();
    let posOut = echoLabel.getBoundingClientRect();
    echoLabel.style.display = 'inline-block';
    echoLabel.animate(
        [
            {transform: `translate(${posIn.x-posOut.x}px, ${posIn.y-posOut.y}px)`, backgroundColor: '#000'},
            {transform: 'translate(0, 0)', backgroundColor: '#020'}
        ], {
            duration: 500,
            easing: 'ease'
        }
    );
    removableEchoKeys[removableEchoKeys.length - 1].push(echoLabel);
    //re-appending moves the element to the last-child position
    inpEcho.appendChild(inpEcho.querySelector('.input-cursor'));
}

createKeyMapDOM(mainSvg);

document.getElementById('main-input').addEventListener('keydown', (e) => {
    updateShiftState(e);
    let matchedKey = keyMap.flat().find(k => typeof k.overrideSpecialPredicate === 'function' && k.overrideSpecialPredicate(e));
    if(typeof matchedKey === 'undefined')
        //matchedKey = isShifted ? lookupDisplayByShifted[e.key] : lookupDisplayByNormal[e.key]; //fails on some keys
        matchedKey = lookupDisplayByNormal[e.key];
    if(typeof matchedKey === 'undefined')
        matchedKey = lookupDisplayByShifted[e.key];

    if(typeof matchedKey !== 'undefined') {
        if(e.repeat) {
            matchedKey.svgBox.animate([
                    {strokeWidth:'10px', stroke:'#f007'},
                    {strokeWidth:'0px', stroke: '#f000'},
                ], {duration: 50}
                );
        } else {
            matchedKey.svgBox.style.fill = '#f00';
        }

        if(matchedKey.shouldInput) {
            //todo: better shift logic -- caps lock shouldn't apply to some keys
            let echoText = isShifted ? (matchedKey.overrideShifted || matchedKey.shiftedKey) : (matchedKey.overrideNormal || matchedKey.normalKey);

            printKey(matchedKey, echoText);
        }

        if(typeof matchedKey.onInput === 'function') {
            matchedKey.onInput(e, matchedKey);
        }

        e.preventDefault();
    }

    updateStatus();
});

document.getElementById('main-input').addEventListener('keyup', (e) => {
    updateShiftState(e);
    let matchedKey = keyMap.flat().find(k => typeof k.overrideSpecialPredicate === 'function' && k.overrideSpecialPredicate(e));
    if(typeof matchedKey === 'undefined')
        //matchedKey = isShifted ? lookupDisplayByShifted[e.key] : lookupDisplayByNormal[e.key]; //fails on some keys
        matchedKey = lookupDisplayByNormal[e.key];
    if(typeof matchedKey === 'undefined')
        matchedKey = lookupDisplayByShifted[e.key];

    if(typeof matchedKey !== 'undefined') {
        matchedKey.svgBox.style.fill = '#000';

        if(e.key === 'Shift') {
            //most (all?) browsers have weird merging behavior on second shift keyup -- holding both shifts and releasing one will NOT send a keyup event!
            //https://stackoverflow.com/questions/62683548/why-does-shiftleft-not-trigger-a-keyup-event-while-shiftright-is-held-and-vi
            lookupDisplayByNormalOverride['LShift'].svgBox.style.fill = '#000';
            lookupDisplayByNormalOverride['RShift'].svgBox.style.fill = '#000';
        }

        e.preventDefault();
    }

    updateStatus();
});

document.getElementById('main-input').addEventListener('focus', (e) => {
    for(let i = 0; i < keyMap.length; i++) {
        for(let key of keyMap[i]) {
            key.svgBox.style.transformBox = 'fill-box';
            key.svgBox.style.transformOrigin = '50% 50%';
            key.svgText.style.transformBox = 'fill-box';
            key.svgText.style.transformOrigin = '50% 50%';
            let bbox = key.svgBox.getBoundingClientRect();
            let cx = (bbox.right+bbox.left)/2;
            let cy = (bbox.top+bbox.bottom)/2;
            let kf = [
                {transform: 'scale(1)'},
                {transform: 'scale(0.75)'},
                {transform: 'scale(1)'}
            ];
            let kopt = {duration: 250,
                delay: (cx + cy * 0.5) * 0.5};
            key.svgBox.animate(kf, kopt);
            key.svgText.animate(kf, kopt);
        }
    }

    document.querySelector('.input-cursor').style.color = '#fff';
});

document.getElementById('main-input').addEventListener('blur', (e) => {
    for(let i = 0; i < keyMap.length; i++) {
        for(let key of keyMap[i]) {
            key.svgBox.style.transformBox = 'fill-box';
            key.svgBox.style.transformOrigin = '50% 50%';
            key.svgText.style.transformBox = 'fill-box';
            key.svgText.style.transformOrigin = '50% 50%';
            let bbox = key.svgBox.getBoundingClientRect();
            let cx = (bbox.right+bbox.left)/2;
            let cy = (bbox.top+bbox.bottom)/2;
            let kf = [
                {transform: 'translateX(0)'},
                {transform: 'translateX(0.1em)'},
                {transform: 'translateX(-0.1em)'},
                {transform: 'translateX(0.1em)'},
                {transform: 'translateX(0)'}
            ];
            let kopt = {duration: 150, delay: 500 - (cx + cy * 0.5) * 0.5};
            key.svgBox.animate(kf, kopt);
            key.svgText.animate(kf, kopt);
        }
    }
    
    document.querySelector('.input-cursor').style.color = '#777';
});

let statusBar = document.getElementById('status');
function updateStatus() {
    statusBar.innerText = `${removableEchoKeys.flat().filter(x => x.nodeName !== 'BR').length} total | Line ${removableEchoKeys.length}: ${removableEchoKeys[removableEchoKeys.length-1].filter(x => x.nodeName !== 'BR').length}/${LINE_LIMIT}`;
}
updateStatus();