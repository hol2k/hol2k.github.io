//TODO//
//Extrapolate unknown radii from existing values
//Find a way to maintain average bond distance while applying repulsive force
//Restore functionality of standard keybinds (e.g. ctrl-w)
//revamp force calculation? RK4 integration
//Add a perspective projection mode
//Store molecule data on individual atoms instead of using a search function; entries only need to be changed when bonds are added/removed
//Formal charge gravitates towards 0; formal charge rule: FC = 0, can be obeyed instead of octet rule?
//Add charge brackets
//Make GetMolecule speedier; implement atom.Molecule and copy-paste
//Allow selection of bonds with LMB
//Allow selection of multiple objects (ctrl-click?); treat as 'secondary selection', with different highlight color and no special behavior
//Implement 'bond groups' to help with fractional order?
//Allow balancing of selected bonds, 'floor bond' (detect other partial bonds on the selected atom and redistribute to them) key, etc.
//Implement partial force for partial bonds - (electrons present in pair)/2?
//Stop recreating entire nonbonded position list whenever atom is changed
//Do something with electron configuration; add bonded electrons to electron configuration
//Find alternate appearance for ionic bonds
//Dampen position changes somehow?
//Remove normal component of electron forces to avoid interference with bond force
//Radial tool selector?
//ESC: cancel secondary selection, then primary
//Begin keeping undo history for CTRL-Z/CTRL-R

////////////////////
//PROGRAM SETTINGS//
////////////////////

//var permittivity = 0.000008854187817;
var permittivity = 0.000008854187817;

var bForce = 0.2;
var nForce = 0.3;
var repulsiveQI = 0;
var repulsiveInverse = 500; //non-rk4: 500
var repulsiveConst = 0;
var repulsiveLinear = 0;
var repulsiveQuadratic = 0;
var repulsiveScalar = 1;
var repulsiveMinimumDistance = 10;

var bondQI = 0;
var bondInverse = 0;
var bondConst = 0; //non-RK4: 1
var bondLinear = 100; //non-RK4: 0
var bondQuadratic = 0;

var dampening = 10;
var turbulent = 100;

var useRK4 = false;
var RK4Timescale = 3;

var forceBondLengths = false;
var useBondLengths = true;
var rubberBonds = true;
var bondForce = 10;
var attractiveInverseQuad = 0.55;
var attractiveLinear = 0;

var useFixedTimestep = true;
var maxTimestep = 5/60;
var tStep = 1/60;


/////////////////////
//EMPTIES AND SETUP//
/////////////////////
var resizeFlag = true;
var source, gcontext, canvas, sketchProc, processingInstance, mWid, mHei, iFont, sFont;

var selected = null;
var selectionType = 0; //0: none, 1: atom, 2: bond
var grabbed = false, displayAngles = false, displayAnglesSelected = false, ctrlShown = false, displayRadii = false, simpleRender = false;
var BoxOfAtoms = [], keys = [], keyCodes = [], mb = [], storedMolecule = [], secondarySelection = [], undoHistory = [];
var tCurr = 0, tPrev = 0, zoom = 1/5, mScrX=0, mScrY=0, scrX=0, scrY=0, mWinX=0, mWinY=0, mStoredScrX=0, mStoredScrY = 0, mStoredScrZ = 0, mStoredWinX = 0, mStoredWinY = 0, mGlobX=0, mGlobY=0, tAccum=0, tSim=0;
var ctrlX = -600;
var elementAdd = "";
var bbForce = bForce * 2;
var bnForce = bForce + nForce;
var nnForce = nForce * 2;

///////////
//SUPPORT//
///////////
var lerp = function(a,b,x) {
	return a + x * (b - a);
}
var strGetWords = function(str) {
	return str.match(/[A-Z ]?[^A-Z ]*/g).slice(0,-1);
}
if (!Array.prototype.includes) Array.prototype.includes = function(searchElement /*, fromIndex*/ ) {
	'use strict';
	var O = Object(this);
	var len = parseInt(O.length) || 0;
	if (len === 0) return false;
	var n = parseInt(arguments[1]) || 0;
	var k;
	if (n >= 0) k = n;
	else {
		k = len + n;
		if (k < 0) {k = 0;}
	}
	var currentElement;
	while (k < len) {
		currentElement = O[k];
		if (searchElement === currentElement || (searchElement !== searchElement && currentElement !== currentElement)) return true;
		k++;
	}
	return false;
};
PVector.prototype.clone = function() {
	return new PVector(this.x, this.y, this.z);
}
PVector.prototype.impress = function(v) {
	this.x = v.x;
	this.y = v.y;
	this.z = v.z;
	return this;
}
PVector.prototype.getMult = function(s) {
	return new PVector(this.x*s, this.y*s, this.z*s);
}
PVector.prototype.getAdd = function(s) {
	return new PVector(this.x+s.x, this.y+s.y, this.z+s.z);
}
PVector.prototype.max = function(m) {
	if(this.x < m.x) this.x = m.x;
	if(this.y < m.y) this.y = m.y;
	if(this.z < m.z) this.z = m.z;
	return this;
}
PVector.prototype.min = function(m) {
	if(this.x > m.x) this.x = m.x;
	if(this.y > m.y) this.y = m.y;
	if(this.z > m.z) this.z = m.z;
	return this;
}

/////////////
//RK4 CLASS//
/////////////
var RK4 = {};
RK4.ObjectState = function(p, m, v, t) {
	this.Position = p;
	this.Momentum = m;
	this.Velocity = v;
	this.vPrev = v.clone();
	this.Acceleration = new PVector(0, 0, 0);
	this.Force = new PVector(0, 0, 0);
	this.Parent = t;
	this.forcePosition = false;
}
RK4.ObjectState.prototype.Recalculate = function() {
	this.vPrev.impress(this.Velocity);
	this.Velocity.impress(this.Momentum).mult(this.Parent.InverseMass);
	this.Acceleration.impress(this.Velocity).sub(this.vPrev);
}
RK4.ObjectDerivative = function(v, f) {
	this.Velocity = v;
	this.Force = f;
}

RK4.Evaluate = function(iState, t, dt, iDeriv, forceFunc) {
	var state = new RK4.ObjectState(
		iState.Position.clone().getAdd(iDeriv.Velocity.getMult(dt)),
		iState.Momentum.clone().getAdd(iDeriv.Force.getMult(dt)),
		new PVector(0, 0, 0), iState.Parent
	);
	state.Recalculate();
	var output = new RK4.ObjectDerivative(state.Velocity.clone(), new PVector(0, 0, 0));
	var of = forceFunc.call(this, iState, iDeriv, t, dt);
	state.Force.impress(of);
	iState.Force.impress(of);
	output.Force.impress(of);
	return output;
}
RK4.ObjectState.prototype.Integrate = function(t, dt, forceFunc) {
	var a, b, c, d;
	var initDer = new RK4.ObjectDerivative(new PVector(0, 0, 0), new PVector(0, 0, 0));
	a = RK4.Evaluate(this, t, 0.0, initDer, forceFunc);
	b = RK4.Evaluate(this, t, dt * 0.5, a, forceFunc);
	c = RK4.Evaluate(this, t, dt * 0.5, b, forceFunc);
	d = RK4.Evaluate(this, t, dt, c, forceFunc);
	var dvdt = b.Velocity.clone();
	dvdt.add(c.Velocity);
	dvdt.mult(2);
	dvdt.add(a.Velocity);
	dvdt.add(d.Velocity);
	dvdt.mult(dt/6);
	
	var dfdt = b.Force.clone();
	dfdt.add(c.Force);
	dfdt.mult(2);
	dfdt.add(a.Force);
	dfdt.add(d.Force);
	dfdt.mult(dt/6);
	
	this.Position.add(dvdt);
	this.Momentum.add(dfdt);
	this.Recalculate();
	
	return dfdt;
}
RK4.ObjectState.prototype.clone = function() {
	return new RK4.ObjectState(
		this.Position.clone(),
		this.Momentum.clone(),
		this.Velocity.clone(),
		this.Parent
	);
}

//////////////////
//MOLECULE CLASS//
//////////////////
var Molecule = function(initialMembers) {
	this.Members = initialMembers;
	this.Edges = [];
	this.BoundingBox = [new PVector(0, 0, 0), new PVector(0, 0, 0)];
	this.UpdateGraph();
	this.Update();
}
//http://stackoverflow.com/questions/19113189/detecting-cycles-in-a-graph-using-dfs-2-different-approaches-and-whats-the-dif
var DetectCycles_Visit = function(node, marked, tmarked) {
	if(tmarked[node.molecid]) return -1; //???
	else if(marked[node.molecid]) return 1; //???
	tmarked[node.molecid] = true;
	var r;
	for(var i = 0; i < node.Bonds.length; i++) {
		r = DetectCycles_Visit(node.Bonds[i], marked, tmarked);
		if(r == 1) return r;
	}
	tmarked[node.molecid] = false;
	marked[node.molecid] = true;
	return 0;
}
Molecule.prototype.DetectCycles = function() {
	var marked = [];
	var tmarked = [];
	for(var i = 0; i < this.Members.length; i++) {marked[i] = 0;this.Members[i].molecid = i;}
	var s = 0;
	this.Cyclic = false;
	var o = false;
	while((o = marked.indexOf(0)) > -1) {
		
	}
	marked[v] = true;
}
Molecule.prototype.Update = function() {
	this.Cyclic = false;
	if(this.Members.length == 0) return;
	
	//PASS 1: Build graph
	
	//PASS 2: Bounding box
	this.BoundingBox[0].impress(this.Members[0].Position);
	this.BoundingBox[1].impress(this.Members[0].Position);
	for(var i = 0; i < this.Members.length; i++) {
		this.updateBoundingBox(this.Members[i]);
		this.Members[i].UMVisited = false;
	}
	
	//PASS 3: Cycle detection (depth-first search)
	for(var i = 0; i < this.Members.length; i++) {
		
	}
	
	//PASS 4 (skipped if cyclic): Longest member detection
	
	
	
}
Molecule.prototype.updateBoundingBox = function(newElement) {
	this.BoundingBox[1].min(newElement.Position);
	this.BoundingBox[0].max(newElement.Position);
}

//////////////
//ATOM CLASS//
//////////////
var Atom = function(id, px, py, pz) {
	this.AtomicNumber = id;
	this.Radius = AtomicRadii[id];
	this.Mass = AtomicMasses[id];
	this.InverseMass = 1/this.Mass;
	this.NuclearCharge = (this.AtomicNumber+1) * (0.1602176620898);
	this.Position = new PVector(px, py, pz);
	this.DeltaP = new PVector(0, 0, 0);
	this.Bonds = [];
	this.Molecule = [this];
	this.bondSelected = 0;
	this.Electrons = id;
	this.Valence = (ValenceElectrons[id] < 0 ? 0 : ValenceElectrons[id]);
		if(ValenceElectrons[id] == -1) this.NoValence = true;
	this.eBonded = 0;
	this.eNonBonded = this.Valence;
	this.Charge = 0;
	this.ENeg = Electronegativity[id];
	this.recalcPairs();
	
	this.RK4Current = new RK4.ObjectState(this.Position.clone(), new PVector(0, 0, 0), new PVector(0, 0, 0), this);
	this.RK4Prev = new RK4.ObjectState(this.Position.clone(), new PVector(0, 0, 0), new PVector(0, 0, 0), this);
}
var masterForceFunc = function(state, deriv, t, dt) {
	var f = new PVector(0, 0, 0);
	var fLocal = new PVector(0, 0, 0);
	for(var i = 0; i < BoxOfAtoms.length; i++) {
		if(BoxOfAtoms[i] == state.Parent) continue;
		fLocal.set(0, 0, 0);
		fLocal.add(BoxOfAtoms[i].RK4Prev.Position);
		fLocal.sub(state.Parent.RK4Prev.Position);
		var m = fLocal.mag();
		if(isNaN(m)) m = 0;
		if(m < 100) m = 100;
	//	if(state.Parent.GetLocalBondIndex(BoxOfAtoms[i]) > -1) {
//			fLocal.mult(bondForce);
		//}
		fLocal.normalize();
		//var sc = -(repulsiveQI/m/m + repulsiveInverse/m + repulsiveConst + repulsiveLinear*m + repulsiveQuadratic*m*m);
		var combinedCharge = state.Parent.NuclearCharge * BoxOfAtoms[i].NuclearCharge;
		var sc = -combinedCharge / 4 / Math.PI / permittivity / m / m;
		if(m == 0) sc = 0;
		var bi = state.Parent.GetLocalBondIndex(BoxOfAtoms[i]);
		if(bi > -1) {
			//if(useBondLengths) m /= state.Parent.Bonds[bi].LocalRadius;
			//sc += (bi > -1 ? (bondQI/m/m + bondInverse/m + bondConst + bondLinear*m + bondQuadratic*m*m) : 0);
			var distFromRadius = m - (state.Parent.Bonds[bi].LocalRadius + state.Parent.Bonds[bi].RemoteRadius);
			sc += distFromRadius/100 * combinedCharge / 4 / Math.PI / permittivity;
			
			//WHEN m = [bond radius],
			//q1q2 / 4pi e_0 m^2 = x m^2
			//x = q1q2 / 4pi e_0
			//WHEN m > [bond radius], x > q1q2 / 4pi e_0
			//WHEN m < [bond radius], x < q1q2 / 4pi e_0
			
		}
		fLocal.mult(sc);
		f.add(fLocal);
	}
	//if(state.Parent.AtomicNumber == 0) f.mult(0.1);
	f.mult(state.Parent.Mass);
	f.add(state.Velocity.clone().getMult(-dampening*state.Velocity.mag()));
	f.mult(RK4Timescale);
	f.add(Math.random() * turbulent - turbulent/2 , Math.random() * turbulent - turbulent/2, Math.random() * turbulent - turbulent/2);
	return f;
}

// http://stackoverflow.com/questions/9600801/evenly-distributing-n-points-on-a-sphere
Atom.prototype.recalcPairs = function() {
	this.nonBondedPositions = [];
	this.nonBondedDeltaP = [];
	var o = Math.ceil(this.eNonBonded/2);
	//var step = Math.PI * 2 / o;
	var offset = 2/o;
	var increment = Math.PI*(3 - Math.sqrt(5));
	var y, r, phi;
	for(var i = 0; i < o; i++) {
		y = ((i * offset) - 1) + offset / 2;
		r = Math.sqrt(1 - y*y);
		phi = ((i + 1) % o) * increment;
		x = Math.cos(phi) * r;
		z = Math.sin(phi) * r;
		this.nonBondedPositions.push(new PVector(x, y, z));
		this.nonBondedDeltaP.push(new PVector(0, 0, 0));
	}
}
Atom.prototype.getElectronConfig = function() {
	var s = "";
	var eRemaining = this.Electrons - this.Charge;
	for(var i = 0; i < Orbitals.length; i+=3) {
		if(eRemaining < Orbitals[i+2]) {
			s += Orbitals[i] + Orbitals[i+1] + toSuperscript(""+eRemaining);
			return s;
		} else {
			s += Orbitals[i] + Orbitals[i+1] + toSuperscript(""+Orbitals[i+2]);
			eRemaining -= Orbitals[i+2];
		}
	}
	return s;
}
Atom.prototype.getCondensedConfig = function() {
	var s = this.getElectronConfig();
	for(var i = 0; i < nobleGasConfigs.length; i+=2) {
		if(s == nobleGasConfigs[i+1]) s = nobleGasConfigs[i];
		else s.replace(nobleGasConfigs[i+1], nobleGasConfigs[i] + " ");
	}
	return s;
}
Atom.prototype.calculateFormalCharge = function() {
	return this.Valence - this.eNonBonded - this.eBonded / 2 + this.Charge;
}
Atom.prototype.calculateDipoleMoment = function() {
	var netDipole = new PVector(0, 0, 0);
	for(var i = 0; i < this.Bonds.length; i++) {
		netDipole.add(this.calculateBondDipole(i));
	}
	return netDipole;
}
Atom.prototype.calculateBondDipole = function(bondID) {
	var netDipole = new PVector(0, 0, 0);
	netDipole.add(this.Bonds[bondID].Target.Position);
	netDipole.sub(this.Position);
	netDipole.mult(this.Bonds[bondID].Target.ENeg - this.ENeg);
	return netDipole;
}
Atom.prototype.calculateMoleculeDipole = function() {
	var netDipole = new PVector(0, 0, 0);
	for(var i = 0; i < this.Molecule.length; i++) {
		netDipole.add(this.Molecule[i].calculateDipoleMoment());
	}
	return netDipole;
}

Atom.prototype.renderElectrons = function(ctx) {
	ctx.noStroke();
	ctx.fill(255, 0, 0);
	for(var i = 0; i < this.nonBondedPositions.length; i++) {
		if(this.nonBondedPositions[i].z < 0 && Math.sqrt(this.nonBondedPositions[i].x*this.nonBondedPositions[i].x+this.nonBondedPositions[i].y*this.nonBondedPositions[i].y) < 0.75) continue;
		var vPerp = new PVector(-this.nonBondedPositions[i].y, this.nonBondedPositions[i].x, 0);
		ctx.ellipse(this.nonBondedPositions[i].x*this.Radius*0.75+Math.random()-0.5+vPerp.x*3, this.nonBondedPositions[i].y*this.Radius*0.75+Math.random()-0.5+vPerp.y*3, 5, 5);
		if(i*2 < this.eNonBonded-1) ctx.ellipse(this.nonBondedPositions[i].x*this.Radius*0.75+Math.random()-0.5-vPerp.x*3, this.nonBondedPositions[i].y*this.Radius*0.75+Math.random()-0.5-vPerp.y*3, 5, 5);
	}
}
Atom.prototype.renderOuterShell = function(ctx) {
	ctx.noFill();
	ctx.stroke(255, 125, 0);	
	ctx.strokeWeight(1);
	ctx.ellipse(0, 0, this.Radius*2, this.Radius*2);
}
Atom.prototype.calculateMissingElectrons = function() {
	return (this.AtomicNumber < 2 ? 2 : (this.AtomicNumber < 4 && this.AtomicNumber > 1 ? 4 : (this.AtomicNumber == 4 ? 6 : 8))) - this.eBonded - this.eNonBonded;
}
Atom.prototype.renderSimple = function(ctx) {
	if(this.Bonds.length > 0 && this.AtomicNumber == 0 && !this.selected) return;
	ctx.strokeWeight(this.selected ? 5 : 2);
	if(this.AtomicNumber != 5 || this.selected) {
		ctx.stroke(CPKComplimentary[this.AtomicNumber]);
		ctx.fill(CPKElementColors[this.AtomicNumber]);
		ctx.ellipse(0, 0, this.Radius, this.Radius);
		ctx.fill(CPKComplimentary[this.AtomicNumber]);
		ctx.textSize(20);
		ctx.text(ElementSymbols[this.AtomicNumber], 0, 0);
	}
	ctx.stroke(255, 0, 255);
	for(var i = 0; i < this.Bonds.length; i++) {
		if(this.Position.z > this.Bonds[i].Target.Position.z || this.Bonds[i].Target.AtomicNumber == 0) continue;
		ctx.strokeWeight(2 * this.Bonds[i].Order);
		ctx.line(0, 0, this.Bonds[i].Target.Position.x-this.Position.x, this.Bonds[i].Target.Position.y-this.Position.y);
	}
}
Atom.prototype.renderBackground = function(ctx) {
	ctx.strokeWeight(4);
	if(this.eBonded + this.eNonBonded == 8 || this.AtomicNumber < 2 && this.eBonded + this.eNonBonded == 2 || this.AtomicNumber < 4 && this.AtomicNumber > 1 && this.eBonded + this.eNonBonded == 4 || this.AtomicNumber == 4 && this.eBonded + this.eNonBonded == 6) {
		ctx.stroke(this.selected ? (grabbed ? Math.cos(tCurr*6)*125/2+125 : 255) : 0, 255, this.selected ? 70 : 0);
	} else {
		ctx.stroke(255, this.selected ? (grabbed ? Math.cos(tCurr*6)*125/2+125 : 0) : 0, this.selected ? 255 : 0);
	}
	//if(this.NoValence) ctx.fill(170); else ctx.fill(255);
	ctx.fill(CPKElementColors[this.AtomicNumber]);
	if(this.selected && grabbed) ctx.rotate(tCurr*3);
	ctx.ellipse(0, 0, this.Radius * ((this.selected && grabbed) ? 1.1 : 1), this.Radius / ((this.selected && grabbed) ? 1.1 : 1));
	if(this.selected && grabbed) ctx.rotate(-tCurr*3);
}
Atom.prototype.renderInnerShell = function(ctx) {
	ctx.fill(0);
	var tr = 1/zoom;
	ctx.textSize(20);
	ctx.text(ElementSymbols[this.AtomicNumber], 0, tr-3);
	ctx.text(ElementSymbols[this.AtomicNumber], 0, -tr-3);
	ctx.text(ElementSymbols[this.AtomicNumber], tr, -3);
	ctx.text(ElementSymbols[this.AtomicNumber], -tr, -3);
	ctx.textSize(8);
	ctx.text(ElementNames[this.AtomicNumber], 0, 6+tr);
	ctx.text(ElementNames[this.AtomicNumber], 0, 6-tr);
	ctx.text(ElementNames[this.AtomicNumber], tr, 6);
	ctx.text(ElementNames[this.AtomicNumber], -tr, 6);
	ctx.fill(255);
	ctx.textSize(20);
	ctx.text(ElementSymbols[this.AtomicNumber], 0, -3);
	ctx.textSize(8);
	ctx.text(ElementNames[this.AtomicNumber], 0, 6);
	var w = ctx.textWidth(ElementSymbols[this.AtomicNumber]);
	ctx.fill(0);
	if(!this.NoValence) {
		ctx.text((this.eNonBonded + this.eBonded) + " VE", 0, 14+tr);
		ctx.text((this.eNonBonded + this.eBonded) + " VE", 0, 14-tr);
		ctx.text((this.eNonBonded + this.eBonded) + " VE", tr, 14);
		ctx.text((this.eNonBonded + this.eBonded) + " VE", -tr, 14);
		ctx.fill(255);
		ctx.text((this.eNonBonded + this.eBonded) + " VE", 0, 14);
	} else {
		ctx.text("??? VE", 0, 14+tr);
		ctx.text("??? VE", 0, 14-tr);
		ctx.text("??? VE", tr, 14);
		ctx.text("??? VE", -tr, 14);
		ctx.fill(255);
		ctx.text("??? VE", 0, 14);
	}
	ctx.fill(0);
	if(this.Charge > 0) {
		var str = "+" + (this.Charge == 1 ? "" : this.Charge);
		ctx.text(str, w/2 + ctx.textWidth(str)/2 + tr, -10);
		ctx.text(str, w/2 + ctx.textWidth(str)/2 - tr, -10);
		ctx.text(str, w/2 + ctx.textWidth(str)/2, tr-10);
		ctx.text(str, w/2 + ctx.textWidth(str)/2, -tr-10);
		ctx.fill(255);
		ctx.text(str, w/2 + ctx.textWidth(str)/2, -10);
	} else if(this.Charge < 0) {
		var str = (this.Charge == -1 ? "-" : this.Charge);
		ctx.text(str, w/2 + ctx.textWidth(str)/2 + tr, -10);
		ctx.text(str, w/2 + ctx.textWidth(str)/2 - tr, -10);
		ctx.text(str, w/2 + ctx.textWidth(str)/2, -10+tr);
		ctx.text(str, w/2 + ctx.textWidth(str)/2, -10-tr);
		ctx.fill(255);
		ctx.text(str, w/2 + ctx.textWidth(str)/2, -10);
	}
	var fc = this.calculateFormalCharge();
	if(fc != 0) {
		ctx.fill(255, 15, 15);
		ctx.text((fc > 0 ? "δ+" : "δ") + fc, 0, this.Radius/2 + 10);
	}
}
Atom.prototype.renderBonds = function(ctx, useDipole) {
	for(var i = 0; i < this.Bonds.length; i++) {
		if(this.Position.z < this.Bonds[i].Target.Position.z) continue;
		var nzt = new PVector(this.Position.x, this.Position.y, 0);
		var nzo = new PVector(this.Bonds[i].Target.Position.x, this.Bonds[i].Target.Position.y, 0);
		if(this.Position.z > this.Bonds[i].Target.Position.z && nzt.dist(nzo) < this.Radius/2+16 || this.Position.z < this.Bonds[i].Target.Position.z && nzt.dist(nzo) < this.Bonds[i].Target.Radius/2+16) continue;
		
		var vBond = new PVector(0, 0, 0);
		vBond.add(this.Bonds[i].Target.Position);
		vBond.sub(this.Position);
		vBond.normalize();
		vPerpend = new PVector(this.Position.y-this.Bonds[i].Target.Position.y, this.Bonds[i].Target.Position.x - this.Position.x, 0);
		vPerpend.normalize();
		var vDist = new PVector(0, 0, 0);
		vDist.add(this.Bonds[i].Target.Position);
		vDist.sub(this.Position);
		var vStart = new PVector(0, 0, 0);
		vStart.add(vBond);
		vStart.mult(this.Radius/2+1);
		vStart.add(this.Position);
		if(this.Position.z > vStart.z) {
			vStart.sub(this.Position);
			vStart.normalize();
			vStart.z = 0;
			vStart.normalize();
			vStart.mult(this.Radius/2+1);
			vStart.add(this.Position);
		}
		var vEnd = new PVector(0, 0, 0);
		vEnd.sub(vBond);
		vEnd.mult(this.Bonds[i].Target.Radius/2+1);
		vEnd.add(this.Bonds[i].Target.Position);
		if(this.Bonds[i].Target.Position.z > vEnd.z) {
			vEnd.sub(this.Bonds[i].Target.Position);
			vEnd.normalize();
			vEnd.z = 0;
			vEnd.normalize();
			vEnd.mult(this.Bonds[i].Target.Radius/2+1);
			vEnd.add(this.Bonds[i].Target.Position);
		}
		
		ctx.stroke(255, 0, 255);
		var b = Math.ceil(this.Bonds[i].Order);
		ctx.strokeWeight(3/b);
		var ofs;
		for(var j = 0; j < b; j++) {
			ofs = (j - (b-1)/2)*15/b;
			if(j == b && this.Bonds[i].Order % 2 > 0) {
				ctx.stroke(255, 0, 0);
				ctx.fill(255);
				ctx.text(this.Bonds[i].Order,vStart.x/2+vEnd.x/2-this.Position.x+vPerpend.x*ofs, vStart.y/2+vEnd.y/2-this.Position.y+vPerpend.y*ofs);
			}
			ctx.line(vStart.x-this.Position.x+vPerpend.x*ofs, vStart.y-this.Position.y+vPerpend.y*ofs, vEnd.x-this.Position.x+vPerpend.x*ofs, vEnd.y-this.Position.y+vPerpend.y*ofs);
		}
		if(useDipole) {
			ctx.stroke(0, 255, 255);
			ctx.strokeWeight(1);
			var dipole = this.calculateBondDipole(i);
			if(dipole.dot(vDist) > 0) {
				ctx.line(vStart.x-this.Position.x+vPerpend.x*(ofs+10), vStart.y-this.Position.y+vPerpend.y*(ofs+10), vEnd.x-this.Position.x+vPerpend.x*(ofs+10), vEnd.y-this.Position.y+vPerpend.y*(ofs+10));
				ctx.line(
					vStart.x-this.Position.x+vDist.x*0.1+vPerpend.x*20,
					vStart.y-this.Position.y+vDist.y*0.1+vPerpend.y*20,
					vStart.x-this.Position.x+vDist.x*0.1-vPerpend.x*0,
					vStart.y-this.Position.y+vDist.y*0.1-vPerpend.y*0
				);
			} else if(dipole.dot(vDist) < 0) {
				ctx.line(vStart.x-this.Position.x-vPerpend.x*(ofs+10), vStart.y-this.Position.y-vPerpend.y*(ofs+10), vEnd.x-this.Position.x-vPerpend.x*(ofs+10), vEnd.y-this.Position.y-vPerpend.y*(ofs+10));
				ctx.line(
					vEnd.x-this.Position.x-vDist.x*0.1+vPerpend.x*0,
					vEnd.y-this.Position.y-vDist.y*0.1+vPerpend.y*0,
					vEnd.x-this.Position.x-vDist.x*0.1-vPerpend.x*20,
					vEnd.y-this.Position.y-vDist.y*0.1-vPerpend.y*20
				);
			}
		}
	}
}
Atom.prototype.renderBondAngles = function(ctx) {
	var endpointA = new PVector(), endpointB = new PVector(), midpoint = new PVector(), mprot = new PVector();
	for(var i = 0; i < this.Bonds.length; i++) {
		for(var j = 0; j < this.Bonds.length; j++) {
			if(i == j) continue;
			endpointA.set(0, 0, 0);
			endpointB.set(0, 0, 0);
			midpoint.set(0, 0, 0);
			endpointA.add(this.Bonds[i].Target.Position);
			endpointA.sub(this.Position);
			endpointB.add(this.Bonds[j].Target.Position);
			endpointB.sub(this.Position);
			midpoint.add(endpointA);
			midpoint.add(endpointB);
			midpoint.mult(0.5);
			mprot.add(endpointB);
			mprot.sub(endpointA);
			ctx.stroke(255, 255, 255);
			ctx.strokeWeight(1);
			ctx.fill(255, 255, 255);
			ctx.line(endpointA.x, endpointA.y, endpointB.x, endpointB.y);
			ctx.translate(midpoint.x, midpoint.y);
			ctx.text((PVector.angleBetween(endpointA, endpointB) * 180 / Math.PI).toFixed(2) + "°", 0, 10);
			ctx.translate(-midpoint.x, -midpoint.y);
		}
	}
}
Atom.prototype.Render = function(ctx) {
	ctx.translate(this.Position.x, this.Position.y); //move to atom's frame of reference
	if(simpleRender) {
		this.renderSimple(ctx);
	} else {
		this.renderBackground(ctx);
		this.renderInnerShell(ctx);
		this.renderElectrons(ctx);
		this.renderBonds(ctx, keyCodes[ctx.SHIFT]);
	}
	if(displayRadii) this.renderOuterShell(ctx)
	if(displayAngles && (this.selected || displayAnglesSelected)) this.renderBondAngles(ctx);
	ctx.translate(-this.Position.x, -this.Position.y);
}
Atom.prototype.GetBondCount = function(target) {
	for(var i = 0; i < this.Bonds.length; i++) {
		if(this.Bonds[i].Target == target) {
			return this.Bonds[i].fromSelf+this.Bonds[i].fromOther;
		}
	}
	return 0;
}
Atom.prototype.GetLocalBondIndex = function(target) {
	for(var i = 0; i < this.Bonds.length; i++) {
		if(this.Bonds[i].Target == target) {
			return i;
		}
	}
	return -1;
}
Atom.prototype.GetRemoteBondIndex = function(target) {
	for(var i = 0; i < target.Bonds.length; i++) {
		if(target.Bonds[i].Target == this) {
			return i;
		}
	}
	return -1;
}
Atom.prototype.BreakBonds = function(target) {
	var el = this;
	for(var i = 0; i < this.Bonds.length; i++) {
		if(this.Bonds[i].Target == target) {
			if(this.Bonds[i].Type == "Covalent") {
				this.eNonBonded += this.Bonds[i].Order;
				this.Bonds[i].Target.eNonBonded += this.Bonds[i].Order;
				this.eBonded -= this.Bonds[i].Order*2;
				this.Bonds[i].Target.eBonded -= this.Bonds[i].Order*2;
				this.Bonds[i].Target.Bonds = this.Bonds[i].Target.Bonds.filter(function(e) {return e.Target != el;});
			} else if(this.Bonds[i].Type == "Ionic") {
				if(this.Bonds[i].Cation) {
					this.eNonBonded += this.Bonds[i].Order;
					this.Bonds[i].Target.eNonBonded -= this.Bonds[i].Order;
					this.Charge --;
					this.Bonds[i].Target.Charge ++;
				} else {
					this.Bonds[i].Target.eNonBonded += this.Bonds[i].Order;
					this.eNonBonded -= this.Bonds[i].Order;
					this.Charge ++;
					this.Bonds[i].Target.Charge --;
				}
			}
		}
	}
	this.Bonds = this.Bonds.filter(function(e) {return e.Target != target;});
	this.recalcPairs();
	target.recalcPairs();
	
	var m = this.GetMolecule();
	this.Molecule = m;
	for(var i = 0; i < this.Molecule.length; i++) {
		this.Molecule[i].Molecule = m;
	}
}
Atom.prototype.FormCovalentBond = function(target, order) {
	this.BreakBonds(target); //ensure no other bonds exist to this target
	if(order == 0) return;
	var bondRadLocal, bondRadRemote;
	var bondPartial = order % 1;
	if(order < 1) {
		bondRadLocal = AtomicRadii[this.AtomicNumber];
		bondRadRemote = AtomicRadii[target.AtomicNumber];
	}
	else if(order < 2) {
		bondRadLocal = SingleCovalentRadii[this.AtomicNumber];
		bondRadRemote = SingleCovalentRadii[target.AtomicNumber];
	} else if(order < 3) {
		bondRadLocal = DoubleCovalentRadii[this.AtomicNumber];
		bondRadRemote = DoubleCovalentRadii[target.AtomicNumber];
	} else if(order < 4) {
		bondRadLocal = TripleCovalentRadii[this.AtomicNumber];
		bondRadRemote = TripleCovalentRadii[target.AtomicNumber];
	} else {
		bondRadLocal = AR_DFT;
		bondRadRemote = AR_DFT;
	}
	this.Bonds.push({Target: target, Order: order, LocalRadius: bondRadLocal, RemoteRadius: bondRadRemote, Type: "Covalent"});
	target.Bonds.push({Target: this, Order: order, LocalRadius: bondRadRemote, RemoteRadius: bondRadLocal, Type: "Covalent"});
	
	this.eNonBonded -= order;
	target.eNonBonded -= order;
	this.eBonded += order * 2;
	target.eBonded += order * 2;
	this.recalcPairs();
	target.recalcPairs();
	
	var m = this.GetMolecule();
	this.Molecule = m;
	for(var i = 0; i < this.Molecule.length; i++) {
		this.Molecule[i].Molecule = m;
	}
}
Atom.prototype.AddCovalentBond = function(target) {
	var b = target.Bonds[this.GetRemoteBondIndex(target)];
	if(b == undefined) this.FormCovalentBond(target, 1);
	else this.FormCovalentBond(target, b.Order + 1);
}
Atom.prototype.SubtractCovalentBond = function(target) {
	if(this.GetRemoteBondIndex(target) == -1) return;
	var b = target.Bonds[this.GetRemoteBondIndex(target)];
	this.FormCovalentBond(target, b.Order - 1);
}
Atom.prototype.Destroy = function() {
	//remove self from master list
	var el = this;
	BoxOfAtoms = BoxOfAtoms.filter(function(e) {return e != el;});
	//unselect self
	if(selected == this) {
		selected = null;
		if(grabbed) grabbed = false;
	}
	//remove self from all bonds
	for(var i = 0; i < BoxOfAtoms.length; i++) {
		this.BreakBonds(BoxOfAtoms[i]);
	}
}
Atom.prototype.DestroyAllConnected = function() {
	if(this.MarkedForDestroy) return;
	this.MarkedForDestroy = true;
	var toDelete = [];
	for(var i = 0; i < this.Bonds.length; i++) {
		toDelete.push(this.Bonds[i].Target);
	}
	for(var i = 0; i < toDelete.length; i++) {
		toDelete[i].DestroyAllConnected();
	}
	this.Destroy();
}
Atom.prototype.Select = function() {
	this.selected = true;
	if(selected != null) selected.selected = false;
	selected = this;
}
Atom.prototype.ToggleHighlight = function() {
	var th = this;
	th.highlighted = !th.highlighted;
	if(this.highlighted) HighlightedAtoms.push(th);
	else HighlightedAtoms = HighlightedAtoms.filter(function(e) {return e != th;});
}
Atom.prototype.GetMolecule = function(arr) {
	if(arr === undefined) arr = [];
	if(!arr.includes(this)) {
		arr.push(this);
		for(var i = 0; i < this.Bonds.length; i++) {
			arr = this.Bonds[i].Target.GetMolecule(arr);
		}
	}
	return arr;
}
Atom.prototype.GetMoleculeComposition = function(arr) {
	if(arr === undefined) arr = this.GetMolecule();
	var counts = [];
	for(var i = 0; i < arr.length; i++) {
		if(counts[arr[i].AtomicNumber] == undefined) counts[arr[i].AtomicNumber] = 0;
		counts[arr[i].AtomicNumber]++;
	}
	return counts;
}
var MolCompToString = function(counts) {
	var strs = [];
	for(var i = 0; i < counts.length; i++) {
		if(counts[i] > 1) strs.push(ElementSymbols[i] + toSubscript(""+counts[i]));
		else if(counts[i] > 0) strs.push(ElementSymbols[i]);
	}
	return strs.sort(function(a,b){
		if(a<b) return -1;
		if(a>b) return 1;
		return 0;
	}).join("");
}
Atom.prototype.GetMoleculeAABB = function(arr) {
	if(arr === undefined) arr = this.GetMolecule();
	var minX = arr[0].Position.x;
	var minY = arr[0].Position.y;
	var minZ = arr[0].Position.z;
	var maxX = arr[0].Position.x;
	var maxY = arr[0].Position.y;
	var maxZ = arr[0].Position.z;
	for(var i = 0; i < arr.length; i++) {
		if(arr[i].Position.x+arr[i].Radius > maxX) maxX = arr[i].Position.x+arr[i].Radius;
		if(arr[i].Position.x-arr[i].Radius < minX) minX = arr[i].Position.x-arr[i].Radius;
		if(arr[i].Position.y+arr[i].Radius > maxY) maxY = arr[i].Position.y+arr[i].Radius;
		if(arr[i].Position.y-arr[i].Radius < minY) minY = arr[i].Position.y-arr[i].Radius;
		if(arr[i].Position.Z+arr[i].Radius > maxZ) maxZ = arr[i].Position.Z+arr[i].Radius;
		if(arr[i].Position.Z-arr[i].Radius < minZ) minZ = arr[i].Position.Z-arr[i].Radius;
	}
	return [new PVector(minX, minY, minZ), new PVector(maxX, maxY, maxZ), arr];
}

//Atom.prototype.

function RepulsiveForce(A, B, scalar) {
	if(A.GetBondCount(B) > 0 || A == B) return new PVector(0, 0, 0);
	var v = new PVector(0, 0, 0);
	v.add(A.Position);
	v.sub(B.Position);
	var m = v.mag();
	if(m > (A.Radius + B.Radius) * 10) return new PVector(0, 0, 0);
	if(m < repulsiveMinimumDistance) m = repulsiveMinimumDistance;
	v.normalize();
	v.mult((1/m/m*repulsiveQI + 1/m*repulsiveInverse + repulsiveConst +  m*repulsiveLinear + m*m*repulsiveQuadratic)*scalar);
	return v;
}
Atom.prototype.applyElectronForces = function(scalar) {
	var v = new PVector(0, 0, 0);
	var vIncrement = new PVector(0, 0, 0);
	for(var i = 0; i < this.nonBondedPositions.length; i++) {
		/*if(this.eNonBonded % 2 == 1 && i == this.nonBondedPositions.length - 1) {
			this.nonBondedPositions[i].add(new PVector(Math.random() / 20*scalar - 0.025*scalar, Math.random() / 20*scalar - 0.025*scalar, Math.random() / 20*scalar - 0.025*scalar));
			this.nonBondedPositions[i].normalize();
			continue; //move single electrons around randomly
		}*/
		for(var j = i+1; j < this.nonBondedPositions.length; j++) {
			//if(i == j || (this.eNonBonded % 2 == 1 && j == this.nonBondedPositions.length - 1)) continue;
			vIncrement.set(0, 0, 0);
			vIncrement.add(this.nonBondedPositions[i]);
			vIncrement.sub(this.nonBondedPositions[j]);
			if(vIncrement.mag() > 0) vIncrement.mult(nnForce/vIncrement.mag()*scalar/2);
			this.nonBondedPositions[i].add(vIncrement);
			this.nonBondedPositions[j].sub(vIncrement);
			this.nonBondedPositions[i].normalize();
			this.nonBondedPositions[j].normalize();
		}
		for(var j = 0; j < this.Bonds.length; j++) {
			vIncrement.set(0, 0, 0);
			vIncrement.add(this.nonBondedPositions[i]);
			var vDist = new PVector(0, 0, 0);
			vDist.add(this.Bonds[j].Target.Position);
			vDist.sub(this.Position);
			vIncrement.normalize();
			vIncrement.mult(vDist.mag());
			vIncrement.sub(this.Position);
			vIncrement.add(this.Bonds[j].Target.Position);
			vIncrement.mult(bnForce*scalar/2);
			this.Bonds[j].Target.Position.sub(vIncrement);
			this.Position.add(vIncrement);
			
			vIncrement.normalize();
			vIncrement.mult(bnForce*scalar/2);
			this.nonBondedPositions[i].sub(vIncrement);
			this.nonBondedPositions[i].normalize();
		}
	}
	for(var i = 0; i < this.Bonds.length; i++) {
		for(var j = i+1; j < this.Bonds.length; j++) {
			//if(i == j) continue;
			vIncrement.set(0, 0, 0);
			vIncrement.add(this.Bonds[i].Target.Position);
			vIncrement.sub(this.Bonds[j].Target.Position);
			vIncrement.normalize();
			if(vIncrement.mag() > 0) vIncrement.mult(bbForce*scalar);
			vIncrement.mult(this.Radius);
			//vIncrement.mult(this.Bonds[i].LocalRadius + this.Bonds[i].RemoteRadius);
			this.Bonds[i].Target.Position.add(vIncrement);
			//vIncrement.mult(1/(this.Bonds[i].LocalRadius + this.Bonds[i].RemoteRadius));
			//vIncrement.mult(this.Bonds[j].LocalRadius + this.Bonds[j].RemoteRadius);
			this.Bonds[j].Target.Position.sub(vIncrement);
		}
	}
	
	
	
	for(var j = 0; j < this.Bonds.length; j++) {
		if(forceBondLengths) {
			vIncrement.set(0, 0, 0);
			vIncrement.add(this.Bonds[j].Target.Position);
			vIncrement.mult(this.Bonds[j].Target.Radius);
			vIncrement.add(this.Position);
			vIncrement.sub(this.Bonds[j].Target.Position);
			if(vIncrement.mag() > 0) vIncrement.mult(bnForce*scalar/2);
			var oldp = new PVector(0, 0, 0);
			oldp.add(this.Bonds[j].Target.Position);
			this.Bonds[j].Target.Position.sub(vIncrement);
			this.Bonds[j].Target.Position.sub(this.Position);
			this.Bonds[j].Target.Position.normalize();
			this.Bonds[j].Target.Position.mult(this.Bonds[j].LocalRadius + this.Bonds[j].RemoteRadius);
			this.Bonds[j].Target.Position.add(this.Position);
			var deltap = new PVector(0, 0, 0);
			deltap.add(this.Bonds[j].Target.Position);
			deltap.sub(oldp);
			deltap.mult(0.5);
			this.Bonds[j].Target.Position.set(oldp);
			this.Position.sub(deltap);
			this.Bonds[j].Target.Position.add(deltap);
		} else {
			if(useBondLengths) {
				vIncrement.set(0, 0, 0);
				vIncrement.add(this.Position);
				vIncrement.sub(this.Bonds[j].Target.Position);
				vIncrement.normalize();
				vIncrement.mult(this.Bonds[j].LocalRadius + this.Bonds[j].RemoteRadius);
				var vDelta = new PVector(0, 0, 0);
				vDelta.add(this.Bonds[j].Target.Position);
				vDelta.sub(this.Position);
				vDelta.add(vIncrement);
				var m = vDelta.mag();
				vDelta.normalize();
				vDelta.mult(Math.min(bondForce * rubberBonds ? m : 1, m)/2);
				this.Bonds[j].Target.Position.sub(vDelta);
				this.Position.add(vDelta);
			} else {
				
			}
		}
	}
}
function TurbulentForce(scalar) {
	var v = new PVector(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1);
	v.normalize();
	v.mult(scalar/100);
	return v;
}
function SnapWithOffset(x, o, s) {
	return Math.floor(x + o / s) * s - o;
}

Atom.prototype.prepareElectronForces = function(scalar) {
	var vIncrement = new PVector(0, 0, 0);
	for(var i = 0; i < this.nonBondedPositions.length; i++) {
		if(this.eNonBonded % 2 != 0 && i == this.nonBondedPositions.length - 1) continue;
		for(var j = i+1; j < this.nonBondedPositions.length; j++) {
			if(this.eNonBonded % 2 != 0 && j == this.nonBondedPositions.length - 1) continue;
			vIncrement.set(0, 0, 0);
			vIncrement.add(this.nonBondedPositions[i]);
			vIncrement.sub(this.nonBondedPositions[j]);
			//if(vIncrement.mag() > 0) vIncrement.mult(nnForce/vIncrement.mag()*scalar/2);
			vIncrement.normalize();
			if(vIncrement.mag() > 0) vIncrement.mult(nnForce*scalar/2);
			this.nonBondedDeltaP[i].add(vIncrement);
			this.nonBondedDeltaP[j].sub(vIncrement);
		}
		for(var j = 0; j < this.Bonds.length; j++) {
			vIncrement.set(0, 0, 0);
			vIncrement.add(this.nonBondedPositions[i]);
			var vDist = new PVector(0, 0, 0);
			vDist.add(this.Bonds[j].Target.Position);
			vDist.sub(this.Position);
			vIncrement.normalize();
			vIncrement.mult(vDist.mag());
			vIncrement.sub(this.Position);
			vIncrement.add(this.Bonds[j].Target.Position);
			//vIncrement.normalize();
			vIncrement.mult(bnForce*scalar/2);
			this.Bonds[j].Target.DeltaP.sub(vIncrement);
			this.DeltaP.add(vIncrement);
			
			vIncrement.normalize();
			vIncrement.mult(bnForce*scalar);
			this.nonBondedDeltaP[i].sub(vIncrement);
			//this.nonBondedDeltaP[i].normalize();
		}
	}
	for(var i = 0; i < this.Bonds.length; i++) {
		for(var j = i+1; j < this.Bonds.length; j++) {
			//if(i == j) continue;
			vIncrement.set(0, 0, 0);
			vIncrement.add(this.Bonds[i].Target.Position);
			vIncrement.sub(this.Bonds[j].Target.Position);
			vIncrement.normalize();
			if(vIncrement.mag() > 0) vIncrement.mult(bbForce*scalar/2);
			vIncrement.mult(this.Radius);
			//vIncrement.mult(this.Bonds[i].LocalRadius + this.Bonds[i].RemoteRadius);
			this.Bonds[i].Target.DeltaP.add(vIncrement);
			//vIncrement.mult(1/(this.Bonds[i].LocalRadius + this.Bonds[i].RemoteRadius));
			//vIncrement.mult(this.Bonds[j].LocalRadius + this.Bonds[j].RemoteRadius);
			this.Bonds[j].Target.DeltaP.sub(vIncrement);
		}
	}
	
	if(!forceBondLengths) { 
		if(useBondLengths) {
			for(var j = 0; j < this.Bonds.length; j++) {
				vIncrement.set(0, 0, 0);
				vIncrement.add(this.Position);
				vIncrement.sub(this.Bonds[j].Target.Position);
				//vIncrement.normalize();
				//vIncrement.mult(this.Bonds[j].LocalRadius + this.Bonds[j].RemoteRadius);
				//var vDelta = new PVector(0, 0, 0);
				//vDelta.add(this.Bonds[j].Target.Position);
				//vDelta.sub(this.Position);
				//vDelta.add(vIncrement);
				//var m = this.Position.dist(this.Bonds[j].Target.Position) - (this.Bonds[j].LocalRadius + this.Bonds[j].RemoteRadius);
				////m=vDelta.mag();
				//vDelta.normalize();
				//vDelta.mult(Math.min(bondForce * rubberBonds ? m : 1, m)/2*scalar);
				////this.Bonds[j].Target.Position.sub(vDelta);
				////this.Position.add(vDelta);
				//this.Bonds[j].Target.DeltaP.sub(vDelta);
				//this.DeltaP.add(vDelta);
				vIncrement.normalize();
				var m = this.Position.dist(this.Bonds[j].Target.Position) - (this.Bonds[j].LocalRadius + this.Bonds[j].RemoteRadius);
				//console.log(m);
				//vIncrement.mult(Math.min(bondForce * (rubberBonds ? Math.abs(m) : 1), Math.abs(m))/2*scalar);
				//vIncrement.mult(-Math.sign(m));
				vIncrement.mult(bondForce * m * scalar / 2);
				//this.Bonds[j].Target.DeltaP.add(vIncrement);
				this.DeltaP.sub(vIncrement);
			}
		} else {
			
		}
	}
}
Atom.prototype.updateElectronForces = function(scalar) {
	var vIncrement = new PVector(0, 0, 0);
	for(var j = 0; j < this.nonBondedPositions.length; j++) {
		this.nonBondedPositions[j].add(this.nonBondedDeltaP[j]);
		this.nonBondedDeltaP[j].set(0, 0, 0);
		this.nonBondedPositions[j].normalize();
	}
	for(var j = 0; j < this.Bonds.length; j++) {
		this.Bonds[j].Target.Position.add(this.Bonds[j].Target.DeltaP);
		this.Bonds[j].Target.DeltaP.set(0, 0, 0);
		if(forceBondLengths) {
			vIncrement.set(0, 0, 0);
			vIncrement.add(this.Bonds[j].Target.Position);
			vIncrement.mult(this.Bonds[j].Target.Radius);
			vIncrement.add(this.Position);
			vIncrement.sub(this.Bonds[j].Target.Position);
			if(vIncrement.mag() > 0) vIncrement.mult(bnForce*scalar/2);
			var oldp = new PVector(0, 0, 0);
			oldp.add(this.Bonds[j].Target.Position);
			this.Bonds[j].Target.Position.sub(vIncrement);
			this.Bonds[j].Target.Position.sub(this.Position);
			this.Bonds[j].Target.Position.normalize();
			this.Bonds[j].Target.Position.mult(this.Bonds[j].LocalRadius + this.Bonds[j].RemoteRadius);
			this.Bonds[j].Target.Position.add(this.Position);
			var deltap = new PVector(0, 0, 0);
			deltap.add(this.Bonds[j].Target.Position);
			deltap.sub(oldp);
			deltap.mult(0.5);
			this.Bonds[j].Target.Position.set(oldp);
			this.Position.sub(deltap);
			this.Bonds[j].Target.Position.add(deltap);
		} else {
			/*if(useBondLengths) {
				vIncrement.set(0, 0, 0);
				vIncrement.add(this.Position);
				vIncrement.sub(this.Bonds[j].Target.Position);
				vIncrement.normalize();
				vIncrement.mult(this.Bonds[j].LocalRadius + this.Bonds[j].RemoteRadius);
				var vDelta = new PVector(0, 0, 0);
				vDelta.add(this.Bonds[j].Target.Position);
				vDelta.sub(this.Position);
				vDelta.add(vIncrement);
				var m = vDelta.mag();
				vDelta.normalize();
				vDelta.mult(Math.min(bondForce * rubberBonds ? m : 1, m)/2);
				this.Bonds[j].Target.Position.sub(vDelta);
				this.Position.add(vDelta);
			} else {
				
			}*/
		}
	}
}	
	
	
var constructMolecule = function() {
	if(typeof storedMolecule[0] == "object") storedMolecule[0].DestroyAllConnected();
	storedMolecule = [];
	var cmd = elementAdd.slice(-4);
	if(cmd == " cap" || cmd == " clr") {
		var found = -1;
		var trg = elementAdd.substring(0, elementAdd.length - 4);
		for(var i = 0; i < ElementSymbols.length; i++) {
			if(ElementSymbols[i] == trg) {
				found = i; break;
			}
		}
		if(found == -1) {
			for(var i = 0; i < ElementNames.length; i++) {
				if(ElementNames[i] == trg) {
					found = i; break;
				}
			}
		}
		if(found != -1) {
			if(cmd == " cap") {
				for(var i = 0; i < BoxOfAtoms.length; i++) {
					var melec = BoxOfAtoms[i].calculateMissingElectrons();
					for(var n = 0; n < melec; n++) {
						var newel = new Atom(found, 0-scrX, -mHei/2/zoom-scrY, 0);
						BoxOfAtoms.push(newel);
						storedMolecule.push(newel);
						newel.AddCovalentBond(BoxOfAtoms[i]);
						newel.Position.set(BoxOfAtoms[i].Position);
						newel.Position.add(new PVector(0, 0, BoxOfAtoms[i].Radius * 2));
					}
				}
			} else if(cmd == " clr") {
				for(var i = BoxOfAtoms.length-1; i >= 0; i--) {
					if(BoxOfAtoms[i].AtomicNumber == found && BoxOfAtoms[i] !== undefined) {BoxOfAtoms[i].Destroy();}
				}
			}
		}
		elementAdd = "";
	}

	var sFull = strGetWords(elementAdd);
	var trg, trn;
	var initialEl = null;
	var lastEl = null;
	for(var n = 0; n < sFull.length; n++) {
		if(sFull[n] == " " && selected != null) {
			if(selected.Bonds.length > 0) selected.Bonds[selected.Bonds.length-1].Target.Select();
		}
		if(sFull[n] == "Ret" && initialEl != selected && initialEl != null)  {
			selected.AddCovalentBond(initialEl);
			initialEl.select();
		}
		if(sFull[n] == "Close" && initialEl != selected && initialEl != null)  {
			selected.AddCovalentBond(initialEl);
		}
		if(sFull[n] == " e" && lastEl != selected && lastEl != null)  {
			selected.AddCovalentBond(lastEl);
		}
		trg = sFull[n].replace(/[0123456789 ]/g, '');
		trn = parseInt(sFull[n].replace(/[a-zA-Z ]/g,''));
		if(!trn) trn = 1;
		var found = -1;
		for(var i = 0; i < ElementSymbols.length; i++) {
			if(ElementSymbols[i] == trg) {
				found = i; break;
			}
		}
		if(found == -1) {
			for(var i = 0; i < ElementNames.length; i++) {
				if(ElementNames[i] == trg) {
					found = i; break;
				}
			}
		}
		if(found != -1) {
			for(var nn = 0; nn < trn; nn++) {
				//mScrX = (mouseX-mWid/2-scrX*zoom)/zoom;
				//mScrY = (mouseY-mHei/2-scrY*zoom)/zoom;
				var newel;
				console.log(nn + " " + trn + " " + (nn == trn - 1));
				if(nn == trn - 1)
					newel = new Atom(found, 0-scrX, -mHei/2/zoom-scrY, 0);
				else
					newel = new Atom(found, mScrX, mScrY, 0);
				BoxOfAtoms.push(newel);
				storedMolecule.push(newel);
				if(selected == null) {newel.Select(); grabbed = true;}
				else {
					newel.AddCovalentBond(selected);
					//newel.Position.set(selected.Position);
					//newel.Position.add(new PVector(0, 0, selected.Radius * 2));
				}
				if(initialEl == null) initialEl = newel;
				lastEl = newel;
			}
		}
	}
}
	

////////////////
//MAIN PROGRAM//
////////////////
$(function() {
	$('#AngleTogg').prop('checked', displayAngles);
	$('#AngleToggSel').prop('checked', displayAnglesSelected);
	$('#CircleTogg').prop('checked', displayRadii);
	$('#SimpleTogg').prop('checked', displayRadii);
	$(window).resize(function() {
		resizeFlag = true;
	});
	$('#AngleTogg').on("change", function() {
		displayAngles = $('#AngleTogg').prop('checked');
	});
	$('#AngleToggSel').on("change", function() {
		displayAnglesSelected = $('#AngleToggSel').prop('checked');
	});
	$('#CircleTogg').on("change", function() {
		displayRadii = $('#CircleTogg').prop('checked');
	});
	$('#SimpleTogg').on("change", function() {
		simpleRender = $('#SimpleTogg').prop('checked');
	});
	$(document).mousemove(function(e) {
		mGlobX = e.pageX;
		mGlobY = e.pageY;
	}).mouseover();
	function handleZoom(event) {
		if(ctrlShown) return;
		var delta = 0;
		if(event == 1 || event == -1)  delta = event;
		else delta = event.originalEvent.detail < 0 || event.originalEvent.wheelDelta > 0 ? 1 : -1;
		var oz = zoom;
		if(delta >= 0) {
			zoom *= 1.1;
		} else {
			zoom /= 1.1;
		}
		//http://stackoverflow.com/questions/2916081/zoom-in-on-a-point-using-scale-and-translate
		var deltaZ = zoom - oz;
		scrX -= (mWinX-mWid/2) / oz - (mWinX-mWid/2)/zoom;
		scrY -= (mWinY-mHei/2) / oz - (mWinY-mHei/2)/zoom;
	}
	$(document).bind('mousewheel', handleZoom);
	$(document).bind('DOMMouseScroll', handleZoom); 
	
	//Processing.js setup
	canvas = document.getElementById("cvs");
	if(processingInstance !== undefined) {
		processingInstance.exit();
		delete processingInstance;
	}
	sketchProc = function(processing) {with(processing) {
		var setup = function() {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight-50;
			mWid = canvas.width;
			mHei = canvas.height;
			size(window.innerWidth, window.innerHeight-50);
			strokeWeight(1);
			strokeCap(SQUARE);
			frameRate(60);
			background(0, 0, 0);
			rectMode(CORNERS);
			ellipseMode(CENTER);
			textAlign(CENTER);
			iFont = createFont("Italic", 40);
			sFont = createFont("monospace", 20);
			tPrev = window.performance.now()/1000;
			tCurr = tPrev;
		}
		var keyPressed = function() {
			if(key == CODED) keyCodes[keyCode] = true;
			else keys[key] = true;
		}
		var keyReleased = function() {
			if(key == CODED) keyCodes[keyCode] = false;
			else keys[key.code] = false;
			
			if(key == CODED) {
				 if(keyCode == HOME) {
					handleZoom(1);
				} else if(keyCode == END) {
					handleZoom(-1);
				}
			}
			if(key == CODED && selected != null) {
				if(keyCode == UP) {
					if(keyCodes[SHIFT]) {
						selected.Charge++;
						selected.Valence--;
						selected.eNonBonded--;
					}
					selected.recalcPairs();
				} else if(keyCode == DOWN) {
					if(keyCodes[SHIFT]) {
						selected.Charge--;
						selected.Valence++;
						selected.eNonBonded++;
					}
					selected.recalcPairs();
				} else if(keyCode == LEFT) {
					selected.bondSelected = (selected.bondSelected + selected.Bonds.length - 1) % selected.Bonds.length;
				} else if(keyCode == RIGHT) {
					selected.bondSelected = (selected.bondSelected + selected.Bonds.length + 1) % selected.Bonds.length;
				}
			}
			
			///!!!!! Molecule is completely remade with every update -- can probably make more efficient !!!!!//
			if((key.code > 64 && key.code < 91) || (key.code > 96 && key.code < 123) || (key.code > 47 && key.code < 58) || key.code == 32) {
				elementAdd += keyMap[key.code]; //letters and numbers
				constructMolecule();
			}
			else if(keyMap[key.code] == "BKSP") {
				elementAdd = elementAdd.slice(0, -1);
				constructMolecule();
			}
			else if(keyMap[key.code] == "ESCAPE") {
				elementAdd = "";
				if(typeof storedMolecule[0] == "object") storedMolecule[0].DestroyAllConnected();
				storedMolecule = [];
			}
			else if(keyMap[key.code] == "TAB") {
				if(selected != null && selected.Bonds.length > 0) selected.Bonds[selected.bondSelected].Target.Select();
			} else if(keyMap[key.code] == "ENTER") {
				//constructMolecule();
				elementAdd = "";
				storedMolecule = [];
			} else if(keyMap[key.code] == "DELETE" && selected != null) {
				if(keyCodes[SHIFT]) selected.DestroyAllConnected();
				else selected.Destroy();
			}
		}
		var mouseClicked = function() {
			if(mouseButton == LEFT) { 
				if(grabbed) {grabbed = false;
					if(elementAdd != "") {
						elementAdd = "";
						storedMolecule = [];
					}
				return;}
				if(selected == null) {
					for(var i = 0; i < BoxOfAtoms.length; i++) {
						if(new PVector(mScrX, mScrY, BoxOfAtoms[i].Position.z).dist(BoxOfAtoms[i].Position) < BoxOfAtoms[i].Radius/2) {
							BoxOfAtoms[i].Select();
							return;
						}
					}
				} else {
					for(var i = 0; i < BoxOfAtoms.length; i++) {
						if(new PVector(mScrX, mScrY, BoxOfAtoms[i].Position.z).dist(BoxOfAtoms[i].Position) < BoxOfAtoms[i].Radius/2) {
							if(BoxOfAtoms[i].selected) {grabbed = true;}
							//else if(keyCodes[SHIFT]) selected.FormBond(BoxOfAtoms[i], 0.5, 1, -1);
							else selected.AddCovalentBond(BoxOfAtoms[i]);
							return;
						}
					}
					selected.selected = false;
					selected = null;
				}
			} else if(mouseButton == RIGHT) {
				if(selected != null) {
					for(var i = 0; i < BoxOfAtoms.length; i++) {
						if(new PVector(mScrX, mScrY, BoxOfAtoms[i].Position.z).dist(BoxOfAtoms[i].Position) < BoxOfAtoms[i].Radius) {
							if(!BoxOfAtoms[i].selected) {
								selected.SubtractCovalentBond(BoxOfAtoms[i]);
							}
							return;
						}
					}
				}
			} else {
			}
		}
		var mousePressed = function() {
			mb[mouseButton] = true;
			if(mouseButton == CENTER) {
				mStoredScrX = selected == null ? mScrX : selected.Position.x;
				mStoredScrY = selected == null ? mScrY : selected.Position.y;
				mStoredScrZ = selected == null ? null : selected.Position.z;
				mStoredWinX = mWinX;
				mStoredWinY = mWinY;
				
				var zAvg = 0;
				for(var i = 0; i < BoxOfAtoms.length; i++) {
					zAvg += BoxOfAtoms[i].Position.z;
				}
				zAvg /= BoxOfAtoms.length;
				for(var i = 0; i < BoxOfAtoms.length; i++) {
					BoxOfAtoms[i].Position.z -= zAvg;
				}
			}
		}
		var mouseReleased = function() {
			mb[mouseButton] = false;
		}
		var backgroundLayer = function() {
			fill(0, 0, 0, 255*tStep*20);
			rect(-mWid, -mHei, mWid, mHei);
		}
		var graphLayer = function() {
			var graphNH = Math.log10(mWid/zoom);
			var graphNV = Math.log10(mHei/zoom);
			var graphStepH = Math.pow(10, Math.floor(graphNH));
			var graphStepV = Math.pow(10, Math.floor(graphNV));
			var graphStep = max(graphStepH, graphStepV);
			stroke(255, 255, 255, 125);
			fill(255);
			textSize(16);
			var pexp, pnum, pstr;
			var lastDelta = 0;
			for(var i = -5; i <= 5; i++) {
				var lineX = SnapWithOffset(i, -scrX, graphStep)*zoom + mWid/2;
				var lineY = SnapWithOffset(i, -scrY, graphStep)*zoom + mHei/2;
				strokeWeight(1);
				line(
					0,
					lineY,
					mWid,
					lineY
				);
			
				line(
					lineX,
					0,
					lineX,
					mHei
				);
				/*line(0, lineY, 50, lineY);
				line(mWid-50, lineY, mWid, lineY);
				line(lineX, 0, lineX, 50);
				line(lineX, mHei-50, lineX, mHei);*/
				
				var gHeight = -Math.floor(i-scrY/graphStep)*graphStep/100 + " Å";
				var gLength = Math.floor(i-scrX/graphStep)*graphStep/100 + " Å";
				
				text(gHeight, textWidth(gHeight)/2, SnapWithOffset(i, -scrY, graphStep)*zoom + mHei/2);
				text(gLength, SnapWithOffset(i, -scrX, graphStep)*zoom + mWid/2, mHei-9);
			}
			resetMatrix();
			strokeWeight(1);
		}
		var renderLayer = function() {
			BoxOfAtoms.sort(function(a,b){
				return Math.sign(a.Position.z - b.Position.z);
			});
			translate(scrX*zoom + mWid/2, scrY*zoom + mHei/2);
			scale(zoom);
			for(var i = 0; i < BoxOfAtoms.length; i++) {
				BoxOfAtoms[i].Render(processing);
			}
			if(keyCodes[SHIFT] && selected != null) {
				var bb = selected.GetMoleculeAABB();
				stroke(0, 255, 255);
				strokeWeight(1/zoom);
				//fill(0, 255, 255, 100);
				noFill();
				rect(bb[0].x, bb[0].y, bb[1].x, bb[1].y);
				var dipole = selected.calculateMoleculeDipole();
				//stroke(0, 0, 0);
				stroke(255);
				line((bb[0].x+bb[1].x)/2, (bb[0].y+bb[1].y)/2, (bb[0].x+bb[1].x)/2+dipole.x, (bb[0].y+bb[1].y)/2+dipole.y);
				line((bb[0].x+bb[1].x)/2+dipole.y/10, (bb[0].y+bb[1].y)/2-dipole.x/10, (bb[0].x+bb[1].x)/2-dipole.y/10, (bb[0].y+bb[1].y)/2+dipole.x/10);
				//fill(0);
				fill(255);
				textSize(8);
				//text("NET DIPOLE MOMENT ≈ " + (dipole.mag()/10).toFixed(3) + " D", (bb[0].x+bb[1].x)/2, bb[0].y+10);
				textAlign(LEFT);
				text(MolCompToString(selected.GetMoleculeComposition()), bb[0].x+10, bb[0].y+10);
				text("NET DIPOLE MOMENT ≈ " + (dipole.mag()/10).toFixed(3) + " D", bb[0].x+10, bb[0].y+20);
				textAlign(CENTER);
			}
			resetMatrix(); //cancel out any transforms
			fill(255, 255, 0, 125);
			textFont(iFont);
			var ea = elementAdd;
			ea = ea.replace(/ e/g, "-");
			ea = ea.replace(/0/g, SubscriptNumbers[0]);
			ea = ea.replace(/1/g, SubscriptNumbers[1]);
			ea = ea.replace(/2/g, SubscriptNumbers[2]);
			ea = ea.replace(/3/g, SubscriptNumbers[3]);
			ea = ea.replace(/4/g, SubscriptNumbers[4]);
			ea = ea.replace(/5/g, SubscriptNumbers[5]);
			ea = ea.replace(/6/g, SubscriptNumbers[6]);
			ea = ea.replace(/7/g, SubscriptNumbers[7]);
			ea = ea.replace(/8/g, SubscriptNumbers[8]);
			ea = ea.replace(/9/g, SubscriptNumbers[9]);
			text(ea, mWid/2, 30);
			textFont(sFont);
		}
		var handleControls = function() {
			mWinX = mouseX;
			mWinY = mouseY;
			mScrX = (mouseX-mWid/2-scrX*zoom)/zoom;
			mScrY = (mouseY-mHei/2-scrY*zoom)/zoom;
			//Pass 3: cancel net position; collect average z
			var xAvg = 0, yAvg = 0, zAvg = 0;
			for(var i = 0; i < BoxOfAtoms.length; i++) {
				//BoxOfAtoms[i].Position.sub(netP);
				xAvg += BoxOfAtoms[i].Position.x;
				yAvg += BoxOfAtoms[i].Position.y;
				zAvg += BoxOfAtoms[i].Position.z;
			}
			//zAvg = 0;
			xAvg /= BoxOfAtoms.length;
			yAvg /= BoxOfAtoms.length;
			zAvg /= BoxOfAtoms.length;
			var bb = selected == null ? null : selected.GetMoleculeAABB();
			//Rotate entire system around mouse if mmb is held, keeping average z
			if(mb[CENTER]) {
				var deltaX = (mStoredWinX - mWinX)/mWid * Math.PI*2 * tStep; //rotation around Y axis
				var deltaY = -(mStoredWinY - mWinY)/mHei * Math.PI*2 * tStep; //rotation around X axis
				var cdx = Math.cos(deltaX);
				var cdy = Math.cos(deltaY);
				var sdx = Math.sin(deltaX);
				var sdy = Math.sin(deltaY);
				//center is mScrX, mScrY
				//MATRIX: translate, rotate y, rotate x, detranslate
				var x, y, z;
				if(selected != null) {
					if(keyCodes[SHIFT]) {
						/*mStoredScrX = (bb[1].x + bb[0].x)/2;
						mStoredScrY = (bb[1].y + bb[0].y)/2;
						mStoredScrZ = (bb[1].z + bb[0].z)/2;*/
						mStoredScrX = xAvg;
						mStoredScrY = yAvg;
						mStoredScrZ = zAvg;
					} else {
						mStoredScrX = selected.Position.x;
						mStoredScrY = selected.Position.y;
						mStoredScrZ = selected.Position.z;
					}
				} else mStoredScrZ = 0;
				var px = mStoredScrX;
				var py = mStoredScrY;
				var pz = mStoredScrZ;
				for(var i = 0; i < BoxOfAtoms.length; i++) {
					x=BoxOfAtoms[i].Position.x - px;
					y=BoxOfAtoms[i].Position.y - py;
					z=BoxOfAtoms[i].Position.z - pz;
					BoxOfAtoms[i].Position.x = cdx*x + sdx*(sdy*y+cdy*z) + px;
					BoxOfAtoms[i].Position.y = cdy*y - sdy*z + py;
					BoxOfAtoms[i].Position.z = -sdx*x + cdx*(sdy*y+cdy*z) + pz;
					for(var j = 0; j < BoxOfAtoms[i].nonBondedPositions.length; j++) {
						x=BoxOfAtoms[i].nonBondedPositions[j].x;
						y=BoxOfAtoms[i].nonBondedPositions[j].y;
						z=BoxOfAtoms[i].nonBondedPositions[j].z;
						BoxOfAtoms[i].nonBondedPositions[j].x = cdx*x + sdx*(sdy*y+cdy*z);
						BoxOfAtoms[i].nonBondedPositions[j].y = cdy*y - sdy*z;
						BoxOfAtoms[i].nonBondedPositions[j].z =-sdx*x + cdx*(sdy*y+cdy*z);
						BoxOfAtoms[i].nonBondedPositions[j].normalize();
					}
					if(useRK4) {
						BoxOfAtoms[i].RK4Current.Position.impress(BoxOfAtoms[i].Position);
					}
				}
				if(selected != null && !keyCodes[SHIFT]) {
					selected.Position.x = mStoredScrX;
					selected.Position.y = mStoredScrY;
				}
				stroke(255, 255, 0, 70);
				strokeWeight(5);
				ellipse(mStoredWinX, mStoredWinY, 50, 50);
				line(mStoredWinX-25, mStoredWinY-25, mStoredWinX+25, mStoredWinY+25);
				line(mStoredWinX+25, mStoredWinY-25, mStoredWinX-25, mStoredWinY+25);
			}
			//Force grabbed Position; strongly force element towards z=0 if grabbed
			if(grabbed) {
				var deltaX = lerp(selected.Position.x, mScrX, tStep * 4) - selected.Position.x;
				var deltaY = lerp(selected.Position.y, mScrY, tStep * 4) - selected.Position.y;
				var deltaZ = lerp(selected.Position.z, 0, tStep * 10) - selected.Position.z;
				for(var i = 0; i < bb[2].length; i++) {
					bb[2][i].Position.x += deltaX;
					bb[2][i].Position.y += deltaY;
					bb[2][i].Position.z += deltaZ;
					if(useRK4) {
						bb[2][i].RK4Current.Position.x += deltaX;
						bb[2][i].RK4Current.Position.y += deltaY;
						bb[2][i].RK4Current.Position.z += deltaZ;
					}
				}
			}
			
			if(ctrlShown) {
				if(mGlobX < window.innerWidth - 200) ctrlShown = false;
				ctrlX = lerp(ctrlX, 0, 0.6);
				$("#controls").css({right: ctrlX, top: 0});
			} else {
				if (mGlobX > window.innerWidth - 10) ctrlShown = true;
				ctrlX = lerp(ctrlX, -190, 0.25);
				$("#controls").css({right: ctrlX, top: 0});
			}
		}
		var physics = function() {
			tCurr = window.performance.now()/1000;
			tFrame = tCurr - tPrev;
			tPrev = tCurr;
			if(tFrame > maxTimestep) tFrame = maxTimestep;
			
			tAccum += tFrame;
			
			if(!useFixedTimestep) tStep = tFrame;
			
			while(tAccum >= tStep) {
				for(var i = 0; i < BoxOfAtoms.length; i++) {
					if(isNaN(BoxOfAtoms[i].Position.x)) {BoxOfAtoms[i].Destroy(); i--; continue;}
					if(useRK4) BoxOfAtoms[i].RK4Prev = BoxOfAtoms[i].RK4Current.clone();
				}
				for(var i = 0; i < BoxOfAtoms.length; i++) {
					if(useRK4) BoxOfAtoms[i].RK4Current.Integrate(tSim, tStep, masterForceFunc); else {
						//BoxOfAtoms[i].applyElectronForces(tStep);
						BoxOfAtoms[i].prepareElectronForces(tStep);
						BoxOfAtoms[i].Position.add(TurbulentForce(tStep));
						for(var j = 0; j < BoxOfAtoms[i].nonBondedPositions.length; j++) {
							//BoxOfAtoms[i].nonBondedPositions[j].add(TurbulentForce(tStep/BoxOfAtoms[i].Radius));
							BoxOfAtoms[i].nonBondedDeltaP[j].add(TurbulentForce(tStep/BoxOfAtoms[i].Radius));
						}
						for(var j = 0; j < BoxOfAtoms.length; j++) {
							var rf = RepulsiveForce(BoxOfAtoms[i], BoxOfAtoms[j], repulsiveScalar * tStep);
							//rf.mult(0.25);
							//BoxOfAtoms[i].Position.add(rf);
							//BoxOfAtoms[j].Position.sub(rf);
							BoxOfAtoms[i].DeltaP.add(rf);
							BoxOfAtoms[j].DeltaP.sub(rf);
						}
					}
				}
				if(!useRK4) {
					for(var i = 0; i < BoxOfAtoms.length; i++) {
						BoxOfAtoms[i].updateElectronForces(tStep);
					}
				}
				tAccum -= tStep;
				tSim += tStep;
			}
			if(useRK4) {
				for(var i = 0; i < BoxOfAtoms.length; i++) {
					BoxOfAtoms[i].Position.impress(BoxOfAtoms[i].RK4Current.Position);
					BoxOfAtoms[i].Position.mult(tAccum/tStep);
					BoxOfAtoms[i].Position.add(BoxOfAtoms[i].RK4Prev.Position.clone().getMult(1 - tAccum/tStep));
				}
			}
			if(keyCodes[ALT]) {
				for(var i = 0; i < BoxOfAtoms.length; i++) {
					BoxOfAtoms[i].Position.z -= BoxOfAtoms[i].Position.z * 0.99;
				}
			}
		}
		var draw = function() {
			if(resizeFlag) {
				//this really doesn't work right :(
				resizeFlag = false;
				canvas.width = window.innerWidth;
				canvas.height = window.innerHeight;
				mWid = canvas.width;
				mHei = canvas.height;
				size(window.innerWidth, window.innerHeight);
			}
			noStroke();
			backgroundLayer();
			graphLayer();
			renderLayer();
			physics();
			handleControls();
		};
	}};
	processingInstance = new Processing(canvas, sketchProc);
});