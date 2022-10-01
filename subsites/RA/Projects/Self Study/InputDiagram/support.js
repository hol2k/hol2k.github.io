//Makes an element absolute, but retains its position relative to its parent.
function makeAbsoluteNoMove(elem) {
    let origOffsetX = elem.offsetLeft;
    let origOffsetY = elem.offsetTop;
    elem.style.position = 'absolute';
    elem.style.top = (origOffsetY) + 'px';
    elem.style.left = (origOffsetX) + 'px';
}

//Animates an element along a parabolic trajectory via CSS transform.
//  elem: the element to animate.
//  vx, vy: initial velocity (px/sec by default).
//  ax, ay: acceleration (px/sec/sec by default).
//  tf: final time (sec).
//  scale: scales pixel units in the final result.
//  resolution: number of keyframes to generate (one extra will be generated for initial state).
//  opts: if non-null, overrides animation options object.
//  getAdditionalKeyframes: if non-null, should be a function that takes parameters (tFrac 0 to 1, t sec, x px, y px) and returns a keyframe object which will be merged with an existing keyframe.
//  getAdditionalTransform: if non-null, should be a function that takes parameters (tFrac 0 to 1, t sec, x px, y px) and returns a string containing additional content to add to the generated 'transform' keyframe values (need not provide a leading space).
//  x0, y0: initial position. Defaults to current position of element.
function animateTrajectory(elem, vx, vy, ax, ay, tf, scale, resolution, opts = null, getAdditionalKeyframes = null, getAdditionalTransform = null, x0 = 0, y0 = 0) {
    if(opts == null)
        opts = {duration: tf * 1000, easing: 'linear'};

    let xOfT = (t) => ax/2 * t * t + vx * t + x0;
    //let xOfTDeriv = (t) => ax * t + vx;

    let yOfT = (t) => ay/2 * t * t + vy * t + y0;
    //let yOfTDeriv = (t) => ay * t + vy;

    let keyframes = [];
    for(let i = 0; i <= resolution; i++) {
        let tFrac = i/resolution;
        let t = tFrac * tf;
        let akf = {};
        let x = xOfT(t);
        let y = yOfT(t);
        if(typeof getAdditionalKeyframes === 'function')
            akf = getAdditionalKeyframes(tFrac, t, x, y);
        let tsf = `translate(${x}px, ${y}px)`;
        if(typeof getAdditionalTransform === 'function')
            tsf += ' ' + getAdditionalTransform(tFrac, t, x, y);
        keyframes.push({
            transform: tsf,
            ...akf
        });
    }

    return elem.animate(keyframes, opts);
}