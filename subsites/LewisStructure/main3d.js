//TODO//
//Extrapolate unknown radii from existing values
//Find a way to maintain average bond distance while applying repulsive force
//Restore functionality of standard keybinds (e.g. ctrl-w)
//revamp force calculation?
//Add a perspective projection mode
//Store molecule data on individual atoms instead of using a search function; entries only need to be changed when bonds are added/removed
//Formal charge gravitates towards 0; formal charge rule: FC = 0, can be obeyed instead of octet rule?
//FORCE PRIORITY: Lone pair-lone pair > lone pair-bonding pair > bonding pair-bonding pair

////////////////////
//PROGRAM SETTINGS//
////////////////////
var bForce = 4;
var nForce = 6;
var bbForce = bForce * 2;
var bnForce = bForce + nForce;
var nnForce = nForce * 2;
var repulsiveInverseQuad = 0.65;
var repulsiveLinear = 0;
var repulsiveQuadratic = 0;
var fIterations = 10;

/////////////////////
//EMPTIES AND SETUP//
/////////////////////
var resizeFlag = true;
var source, gcontext, canvas, sketchProc, processingInstance, mWid, mHei, iFont, sFont;

var selected = null;
var grabbed = false, displayAngles = false, displayAnglesSelected = false, ctrlShown = false;
var BoxOfAtoms = [], keys = [], keyCodes = [], mb = [];
var cTime = 0, lTime = 0, dTime = 0, zoom = 1/5, mScrX=0, mScrY=0, scrX=0, scrY=0, mWinX=0, mWinY=0, mStoredScrX=0, mStoredScrY = 0, mStoredScrZ = 0, mStoredWinX = 0, mStoredWinY = 0, mGlobX=0, mGlobY=0;
var ctrlX = -600;
var elementAdd = "";

///////////
//SUPPORT//
///////////
var lerp = function(a,b,x) {
	return a + x * (b - a);
}
var strGetWords = function(str) {
	return str.match(/[A-Z ]?[^A-Z ]*/g).slice(0,-1);
}
PVector.prototype.toSpherical = function() {
	var rad = this.mag();
	var theta = Math.atan2(this.y, this.x);
	var pitch = Math.acos(this.z/rad);
	this.set(theta, pitch, rad);
}
PVector.prototype.toCartesian = function() {
	var st = Math.sin(this.x), ct=Math.cos(this.x), sp=Math.sin(this.y),cp=Math.cos(this.y);
	var nx = this.z * ct * sp;
	var ny = this.z * st * sp;
	var nz = this.z *      cp;
	this.set(nx, ny, nz);
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

//////////////
//ATOM CLASS//
//////////////
var Atom = function(id, px, py, pz) {
	this.AtomicNumber = id;
	this.Radius = AtomicRadii[id];
	this.Position = new PVector(px, py, pz);
	this.Bonds = [];
	//this.Molecule = [this];
	this.bondSelected = 0;
	this.Electrons = id;
	this.Valence = (ValenceElectrons[id] < 0 ? 0 : ValenceElectrons[id]);
		if(ValenceElectrons[id] == -1) this.NoValence = true;
	this.eBonded = 0;
	this.eNonBonded = this.Valence;
	this.nonBondedPositions = [];
	var o = Math.ceil(this.eNonBonded/2);
	var step = Math.PI * 2 / o;
	for(var i = 0; i < o; i++) {
		this.nonBondedPositions.push(new PVector(Math.cos(i*step), Math.sin(i*step), 0));
	}
	this.Charge = 0;
	this.ENeg = Electronegativity[id];
}
//http://stackoverflow.com/questions/9600801/evenly-distributing-n-points-on-a-sphere
Atom.prototype.recalcPairs = function() {
	this.nonBondedPositions = [];
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
		netDipole.add(this.Molecule[i].calculateDipoleMoment);
	}
	return netDipole;
}

Atom.prototype.renderElectrons = function(ctx) {
	ctx.noStroke();
	ctx.fill(255, 0, 0);
	for(var i = 0; i < this.nonBondedPositions.length; i++) {
		/*if(this.nonBondedPositions[i].z < 0 && Math.sqrt(this.nonBondedPositions[i].x*this.nonBondedPositions[i].x+this.nonBondedPositions[i].y*this.nonBondedPositions[i].y) < 0.75) continue;
		var vPerp = new PVector(-this.nonBondedPositions[i].y, this.nonBondedPositions[i].x, 0);
		ctx.ellipse(this.nonBondedPositions[i].x*this.Radius*0.75+Math.random()-0.5+vPerp.x*3, this.nonBondedPositions[i].y*this.Radius*0.75+Math.random()-0.5+vPerp.y*3, 5, 5);
		if(i*2 < this.eNonBonded-1) ctx.ellipse(this.nonBondedPositions[i].x*this.Radius*0.75+Math.random()-0.5-vPerp.x*3, this.nonBondedPositions[i].y*this.Radius*0.75+Math.random()-0.5-vPerp.y*3, 5, 5);*/
		//ctx.ellipse(ctx.screenX(this.nonBondedPositions[i].x+this.Position.x), ctx.screenY(this.nonBondedPositions[i].y+this.Position.y), 5, 5);
		translate(this.nonBondedPositions[i].x, this.nonBondedPositions[i].y, this.nonBondedPositions[i].z);
		ctx.sphere(2.5);
		translate(-this.nonBondedPositions[i].x, -this.nonBondedPositions[i].y, -this.nonBondedPositions[i].z);
	}
}
Atom.prototype.renderOuterShell = function(ctx) {
	ctx.noFill();
	ctx.stroke(255, 125, 0);	
	ctx.strokeWeight(1);
	ctx.ellipse(0, 0, this.Radius*2, this.Radius*2);
	var fc = this.calculateFormalCharge();
	if(fc != 0) {
		ctx.fill(255, 15, 15);
		ctx.text((fc > 0 ? "δ+" : "δ") + fc, 0, this.Radius + 10);
	}
}
Atom.prototype.renderInnerShell = function(ctx) {
	ctx.strokeWeight(4);
	if(this.eBonded + this.eNonBonded == 8 || this.AtomicNumber < 2 && this.eBonded + this.eNonBonded == 2 || this.AtomicNumber < 4 && this.AtomicNumber > 1 && this.eBonded + this.eNonBonded == 4 || this.AtomicNumber == 4 && this.eBonded + this.eNonBonded == 6) {
		ctx.stroke(this.selected ? (grabbed ? Math.cos(cTime*6)*125/2+125 : 255) : 0, 255, this.selected ? 70 : 0);
	} else {
		ctx.stroke(255, this.selected ? (grabbed ? Math.cos(cTime*6)*125/2+125 : 0) : 0, this.selected ? 255 : 0);
	}
	if(this.NoValence) ctx.fill(170); else ctx.fill(255);
	if(this.selected && grabbed) ctx.rotate(cTime*3);
	ctx.ellipse(0, 0, this.Radius * ((this.selected && grabbed) ? 1.1 : 1), this.Radius / ((this.selected && grabbed) ? 1.1 : 1));
	if(this.selected && grabbed) ctx.rotate(-cTime*3);
	ctx.fill(0, 0, 0);
	ctx.textSize(20);
	ctx.text(ElementSymbols[this.AtomicNumber], 0, -2);
	var w = ctx.textWidth(ElementSymbols[this.AtomicNumber]);
	ctx.textSize(8);
	ctx.text(ElementNames[this.AtomicNumber], 0, 6);
	if(!this.NoValence) ctx.text((this.eNonBonded + this.eBonded) + " VE", 0, 14);
	else ctx.text("??? VE", 0, 14);
	if(this.Charge > 0) {
		var str = "+" + (this.Charge == 1 ? "" : this.Charge);
		ctx.text(str, w/2 + ctx.textWidth(str)/2, -10);
	} else if(this.Charge < 0) {
		var str = (this.Charge == -1 ? "-" : this.Charge);
		ctx.text(str, w/2 + ctx.textWidth(str)/2, -10);
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
		var b = Math.floor((this.Bonds[i].fromSelf+this.Bonds[i].fromOther)/2);
		ctx.strokeWeight(3/b);
		var ofs;
		for(var j = 0; j < b; j++) {
			ofs = (j - (b-1)/2)*15/b;
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
			endpointA.toSpherical();
			endpointB.toSpherical();
			endpointA.z /= 2;
			endpointB.z /= 2;
			midpoint.add(endpointA);
			midpoint.add(endpointB);
			midpoint.mult(0.5);
			endpointA.toCartesian();
			endpointB.toCartesian();
			midpoint.toCartesian();
			//ctx.arc(endpointA.x, end
			//var x = midpoint.x;
			//var y = 0;
			//var z = 0;
			//var cdx = Math.cos();
			
			//mprot.x = cdx*x + sdx*(sdy*y+cdy*z);
			//mprot.y = cdy*y - sdy*z;
			//mprot.z = -sdx*x + cdx*(sdy*y+cdy*z);
			
			ctx.stroke(255, 255, 255);
			ctx.strokeWeight(1);
			ctx.noFill();
			//ctx.ellipse(0, 0, midpoint.z, midpoint.z);
			/*ctx.beginShape();
				ctx.curveVertex(endpointA.x-midpoint.x, endpointA.y-midpoint.y);
				ctx.curveVertex(endpointA.x, endpointA.y);
				ctx.curveVertex(midpoint.x, midpoint.y);
				ctx.curveVertex(endpointB.x, endpointB.y);
				ctx.curveVertex(endpointB.x-midpoint.x, endpointB.y-midpoint.y);
			ctx.endShape();*/
			ctx.ellipse(midpoint.x, midpoint.y, 10, 10);
		}
	}
}
Atom.prototype.Render = function(ctx) {
	ctx.translate(this.Position.x, this.Position.y, this.Position.z); //move to atom's frame of reference
	this.renderInnerShell(ctx);
	this.renderOuterShell(ctx);
	this.renderElectrons(ctx);
	this.renderBonds(ctx, keyCodes[ctx.SHIFT]);
	if(displayAngles && (this.selected || displayAnglesSelected)) this.renderBondAngles(ctx);
	ctx.translate(-this.Position.x, -this.Position.y, -this.Position.z);
}
Atom.prototype.ApproachBonds = function(delta) {
	var netDelta = new PVector(0, 0, 0);
	for(var i = 0; i < this.Bonds.length; i++) {
		var localDelta = new PVector(0, 0, 0);
		localDelta.add(this.Position);
		localDelta.sub(this.Bonds[i].Target.Position);
		var localDist = localDelta.mag();
		localDist -= this.Bonds[i].LocalRadius + this.Bonds[i].RemoteRadius;
		localDelta.normalize();
		localDelta.mult(localDist);
		netDelta.add(localDelta);
	}
	var ops = new PVector();
	ops.add(this.Position);
	this.Position.x = lerp(this.Position.x, this.Position.x - netDelta.x, delta);
	this.Position.y = lerp(this.Position.y, this.Position.y - netDelta.y, delta);
	this.Position.z = lerp(this.Position.z, this.Position.z - netDelta.z, delta);
	ops.sub(this.Position);
	return ops;
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
Atom.prototype.ShiftBond = function(bondIndex, delta) {
	this.eNonBonded += delta;
	this.Bonds[bondIndex].fromSelf -= delta;
	this.Bonds[bondIndex].fromOther += delta;
	
	this.Bonds[bondIndex].Target.eNonBonded -= delta;
	this.Bonds[bondIndex].Target.Bonds[this.GetRemoteBondIndex(this.Bonds[bondIndex].Target)].fromSelf += delta;
	this.Bonds[bondIndex].Target.Bonds[this.GetRemoteBondIndex(this.Bonds[bondIndex].Target)].fromOther -= delta;
	
	this.recalcPairs();
	this.Bonds[bondIndex].Target.recalcPairs();
}
Atom.prototype.BreakBonds = function(target) {
	var el = this;
	for(var i = 0; i < this.Bonds.length; i++) {
		if(this.Bonds[i].Target == target) {
			this.eNonBonded += this.Bonds[i].fromSelf;
			this.Bonds[i].Target.eNonBonded += this.Bonds[i].fromOther;
			this.eBonded -= this.Bonds[i].fromSelf+this.Bonds[i].fromOther;
			this.Bonds[i].Target.eBonded -= this.Bonds[i].fromSelf+this.Bonds[i].fromOther;
			this.Bonds[i].Target.Bonds = this.Bonds[i].Target.Bonds.filter(function(e) {return e.Target != el;});
		}
	}
	this.Bonds = this.Bonds.filter(function(e) {return e.Target != target;});
	this.recalcPairs();
	target.recalcPairs();
}
Atom.prototype.FormBond = function(target, type, fromthis, fromtarget) {
	if(fromthis === undefined) {fromthis = type; fromtarget = type;}
	else type = (fromthis + fromtarget) / 2;
	//TODO: add charge
	this.BreakBonds(target); //ensure no other bonds exist to this target
	if(fromthis == 0 && fromtarget == 0) return;
	var bondRadLocal, bondRadRemote;
	if(type < 1) {
		bondRadLocal = AtomicRadii[this.AtomicNumber]; //TODO: ionic bond radius
		bondRadRemote = AtomicRadii[target.AtomicNumber];
	}
	else if(type < 2) {
		bondRadLocal = SingleCovalentRadii[this.AtomicNumber];
		bondRadRemote = SingleCovalentRadii[target.AtomicNumber];
	} else if(type < 3) {
		bondRadLocal = DoubleCovalentRadii[this.AtomicNumber];
		bondRadRemote = DoubleCovalentRadii[target.AtomicNumber];
	} else if(type < 4) {
		bondRadLocal = TripleCovalentRadii[this.AtomicNumber];
		bondRadRemote = TripleCovalentRadii[target.AtomicNumber];
	} else {
		bondRadLocal = AR_DFT;
		bondRadRemote = AR_DFT;
	}
	this.Bonds.push({Target: target, fromSelf: fromthis, fromOther: fromtarget, LocalRadius: bondRadLocal, RemoteRadius: bondRadRemote});
	target.Bonds.push({Target: this, fromSelf: fromtarget, fromOther: fromthis, LocalRadius: bondRadRemote, RemoteRadius: bondRadLocal});
	/*if(!this.Molecule.includes(target)) {
		for(var i = 0; i < this.Molecule.length; i++) {
			this.Molecule[i].Molecule.push(target);
		}
	}
	if(!target.Molecule.includes(this)) {
		
	}*/
	this.eNonBonded -= fromthis;
	target.eNonBonded -= fromtarget;
	this.eBonded += fromthis + fromtarget;
	target.eBonded += fromthis + fromtarget;
	this.recalcPairs();
	target.recalcPairs();
}
Atom.prototype.AddBond = function(target) {
	var b = target.Bonds[this.GetRemoteBondIndex(target)];
	if(b == undefined) this.FormBond(target, 0, 1, 1);
	else this.FormBond(target, 0, b.fromOther + 1, b.fromSelf + 1);
}
Atom.prototype.SubtractBond = function(target) {
	if(this.GetRemoteBondIndex(target) == -1) return;
	var b = target.Bonds[this.GetRemoteBondIndex(target)];
	this.FormBond(target, 0, b.fromOther - 1, b.fromSelf - 1);
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
Atom.prototype.GetMolecule = function(arr) {
	if(arr === undefined) arr = [];
	if(!arr.includes(this)) {
		arr.push(this);
		for(var i = 0; i < this.Bonds.length; i++) {
			//if(!arr.includes(this.Bonds[i].Target)) 
			arr = this.Bonds[i].Target.GetMolecule(arr);
		}
	}
	return arr;
}
Atom.prototype.GetMoleculeAABB = function() {
	var arr = this.GetMolecule();
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


function RepulsiveForce(A, B, scalar) {
	if(A.GetBondCount(B) > 0 || A == B) return new PVector(0, 0, 0);
	var v = new PVector(0, 0, 0);
	v.add(A.Position);
	v.sub(B.Position);
	var m = v.mag();
	if(m > (A.Radius + B.Radius) * 10) return new PVector(0, 0, 0);
	v.normalize();
	v.mult((repulsiveLinear + Math.pow(m,repulsiveQuadratic)/Math.pow(m,repulsiveInverseQuad))*scalar);
	return v;
}
Atom.prototype.applyElectronForces = function(scalar, ctx) {
	var v = new PVector(0, 0, 0);
	var vIncrement = new PVector(0, 0, 0);
	for(var i = 0; i < this.nonBondedPositions.length; i++) {
		if(this.eNonBonded % 2 == 1 && i == this.nonBondedPositions.length - 1) {
			this.nonBondedPositions[i].add(new PVector(Math.random() / 20*scalar - 0.025*scalar, Math.random() / 20*scalar - 0.025*scalar, Math.random() / 20*scalar - 0.025*scalar));
			this.nonBondedPositions[i].normalize();
			continue; //move single electrons around randomly
		}
		for(var j = 0; j < this.nonBondedPositions.length; j++) {
			if(i == j || (this.eNonBonded % 2 == 1 && j == this.nonBondedPositions.length - 1)) continue;
			vIncrement.set(0, 0, 0);
			vIncrement.add(this.nonBondedPositions[i]);
			vIncrement.sub(this.nonBondedPositions[j]);
			if(vIncrement.mag() > 0) vIncrement.mult(nnForce/vIncrement.mag()*scalar);
			this.nonBondedPositions[i].add(vIncrement);
			this.nonBondedPositions[i].normalize();
			//this.nonBondedPositions[i].mult(this.Radius);
		}
		for(var j = 0; j < this.Bonds.length; j++) {
			vIncrement.set(0, 0, 0);
			vIncrement.add(this.nonBondedPositions[i]);
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
			
			//vIncrement.mult(0.01);
			vIncrement.normalize();
			vIncrement.mult(0.05);
			this.nonBondedPositions[i].add(vIncrement);
			this.nonBondedPositions[i].normalize();
		}
	}
	for(var i = 0; i < this.Bonds.length; i++) {
		for(var j = 0; j < this.Bonds.length; j++) {
			if(i == j) continue;
			vIncrement.set(0, 0, 0);
			vIncrement.add(this.Bonds[i].Target.Position);
			vIncrement.sub(this.Bonds[j].Target.Position);
			vIncrement.normalize();
			if(vIncrement.mag() > 0) vIncrement.mult(bbForce*scalar);
			//vIncrement.mult(0.5);
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
		}
	}
}
function TurbulentForce(scalar) {
	var v = new PVector(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1);
	v.normalize();
	v.mult(scalar);
	return v;
}
function SnapWithOffset(x, o, s) {
	return Math.floor(x + o / s) * s - o;
}
//http://stackoverflow.com/questions/27205018/multiply-2-matrices-in-javascript

////////////////
//MAIN PROGRAM//
////////////////
$(function() {
	$('#AngleTogg').prop('checked', displayAngles);
	$('#AngleToggSel').prop('checked', displayAnglesSelected);
	$(window).resize(function() {
		resizeFlag = true;
	});
	$('#AngleTogg').on("change", function() {
		displayAngles = $('#AngleTogg').prop('checked');
	});
	$('#AngleToggSel').on("change", function() {
		displayAnglesSelected = $('#AngleToggSel').prop('checked');
	});
	$(document).mousemove(function(e) {
		mGlobX = e.pageX;
		mGlobY = e.pageY;
	}).mouseover();
	function handleZoom(event) {
		var delta = event.originalEvent.detail < 0 || event.originalEvent.wheelDelta > 0 || event > 0 ? 1 : -1;
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
			canvas.height = window.innerHeight;
			mWid = canvas.width;
			mHei = canvas.height;
			size(window.innerWidth, window.innerHeight, P3D);
			strokeWeight(1);
			strokeCap(SQUARE);
			frameRate(60);
			background(0, 0, 0);
			rectMode(CORNERS);
			ellipseMode(CENTER);
			textAlign(CENTER);
			iFont = createFont("Italic", 40);
			sFont = createFont("monospace", 20);
			lTime = millis()/1000;
			cTime = lTime;
		}
		var keyPressed = function() {
			if(key == CODED) keyCodes[keyCode] = true;
			else keys[key] = true;
		}
		var keyReleased = function() {
			if(key == CODED) keyCodes[keyCode] = false;
			else keys[key.code] = false;
			
			if(key == CODED && selected != null) {
				if(keyCode == UP) {
					if(keyCodes[SHIFT]) {
						selected.Charge++;
						selected.Valence--;
						selected.eNonBonded--;
					} else if(selected.Bonds.length > 0) selected.ShiftBond(selected.bondSelected, 1);
					selected.recalcPairs();
				} else if(keyCode == DOWN) {
					if(keyCodes[SHIFT]) {
						selected.Charge--;
						selected.Valence++;
						selected.eNonBonded++;
					} else if(selected.Bonds.length > 0) selected.ShiftBond(selected.bondSelected, -1);
					selected.recalcPairs();
				} else if(keyCode == LEFT) {
					selected.bondSelected = (selected.bondSelected + selected.Bonds.length - 1) % selected.Bonds.length;
				} else if(keyCode == RIGHT) {
					selected.bondSelected = (selected.bondSelected + selected.Bonds.length + 1) % selected.Bonds.length;
				}
			}
			
			if((key.code > 64 && key.code < 91) || (key.code > 96 && key.code < 123) || (key.code > 47 && key.code < 58) || key.code == 32) elementAdd += keyMap[key.code]; //letters and numbers
			else if(keyMap[key.code] == "BKSP") elementAdd = elementAdd.slice(0, -1);
			else if(keyMap[key.code] == "ESCAPE") elementAdd = "";
			else if(keyMap[key.code] == "TAB") {
				if(selected != null && selected.Bonds.length > 0) selected.Bonds[selected.bondSelected].Target.Select();
			} else if(keyMap[key.code] == "ENTER") {
				var sFull = strGetWords(elementAdd);
				var trg, trn;
				var initialEl = null;
				var lastEl = null;
				for(var n = 0; n < sFull.length; n++) {
					if(sFull[n] == " " && selected != null) {
						if(selected.Bonds.length > 0) selected.Bonds[selected.Bonds.length-1].Target.Select();
					}
					if(sFull[n] == "Ret" && initialEl != selected && initialEl != null)  {
						selected.AddBond(initialEl);
						initialEl.select();
					}
					if(sFull[n] == "Close" && initialEl != selected && initialEl != null)  {
						selected.AddBond(initialEl);
					}
					if(sFull[n] == " e" && lastEl != selected && lastEl != null)  {
						selected.AddBond(lastEl);
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
			mScrX = (mouseX-mWid/2-scrX*zoom)/zoom;
			mScrY = (mouseY-mHei/2-scrY*zoom)/zoom;
							var newel = new Atom(found, 0-scrX, -mHei/2/zoom-scrY, 0);
							BoxOfAtoms.push(newel);
							if(selected == null) {newel.Select(); grabbed = true;}
							else {
								newel.AddBond(selected);
								newel.Position.set(selected.Position);
							}
							if(initialEl == null) initialEl = newel;
							lastEl = newel;
						}
					}
				}
				elementAdd = "";
			} else if(keyMap[key.code] == "DELETE" && selected != null) {
				if(keyCodes[SHIFT]) selected.DestroyAllConnected();
				else selected.Destroy();
			}
		}
		var mouseClicked = function() {
			if(mouseButton == LEFT) { 
				if(grabbed) {grabbed = false; return;}
				if(selected == null) {
					for(var i = 0; i < BoxOfAtoms.length; i++) {
						if(new PVector(mScrX, mScrY, BoxOfAtoms[i].Position.z).dist(BoxOfAtoms[i].Position) < BoxOfAtoms[i].Radius) {
							BoxOfAtoms[i].Select();
							return;
						}
					}
				} else {
					for(var i = 0; i < BoxOfAtoms.length; i++) {
						if(new PVector(mScrX, mScrY, BoxOfAtoms[i].Position.z).dist(BoxOfAtoms[i].Position) < BoxOfAtoms[i].Radius) {
							if(BoxOfAtoms[i].selected) {grabbed = true;}
							//else if(keyCodes[SHIFT]) selected.FormBond(BoxOfAtoms[i], 0.5, 1, -1);
							else selected.AddBond(BoxOfAtoms[i]);
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
								selected.SubtractBond(BoxOfAtoms[i]);
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
			fill(0, 0, 0, 255*dTime*20);
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
				fill(0, 255, 255, 100);
				rect(bb[0].x, bb[0].y, bb[1].x, bb[1].y);
				var dipole = selected.calculateMoleculeDipole();
				stroke(0, 0, 0);
				line((bb[0].x+bb[1].x)/2, (bb[0].y+bb[1].y)/2, (bb[0].x+bb[1].x)/2+dipole.x, (bb[0].y+bb[1].y)/2+dipole.y);
				line((bb[0].x+bb[1].x)/2+dipole.y/10, (bb[0].y+bb[1].y)/2-dipole.x/10, (bb[0].x+bb[1].x)/2-dipole.y/10, (bb[0].y+bb[1].y)/2+dipole.x/10);
				fill(0);
				textSize(8);
				text("NET DIPOLE MOMENT ≈ " + (dipole.mag()/10).toFixed(3) + " D", (bb[0].x+bb[1].x)/2, bb[0].y+10);
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
			var zAvg = 0;
			for(var i = 0; i < BoxOfAtoms.length; i++) {
				//BoxOfAtoms[i].Position.sub(netP);
				zAvg += BoxOfAtoms[i].Position.z;
			}
			zAvg = 0;
			var bb = selected == null ? null : selected.GetMoleculeAABB();
			//Rotate entire system around mouse if mmb is held, keeping average z
			if(mb[CENTER]) {
				var deltaX = (mStoredWinX - mWinX)/mWid * Math.PI*2 * dTime; //rotation around Y axis
				var deltaY = -(mStoredWinY - mWinY)/mHei * Math.PI*2 * dTime; //rotation around X axis
				var cdx = Math.cos(deltaX);
				var cdy = Math.cos(deltaY);
				var sdx = Math.sin(deltaX);
				var sdy = Math.sin(deltaY);
				//center is mScrX, mScrY
				//MATRIX: translate, rotate y, rotate x, detranslate
				var x, y, z;
				if(selected != null) {
					if(!keyCodes[SHIFT]) {
						mStoredScrX = (bb[1].x + bb[0].x)/2;
						mStoredScrY = (bb[1].y + bb[0].y)/2;
						mStoredScrZ = (bb[1].z + bb[0].z)/2;
					} else {
						mStoredScrX = selected.Position.x;
						mStoredScrY = selected.Position.y;
						mStoredScrZ = zAvg;
					}
				} else mStoredScrZ = zAvg;
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
						x=BoxOfAtoms[i].nonBondedPositions[j].x;// - BoxOfAtoms[i].Position.x;
						y=BoxOfAtoms[i].nonBondedPositions[j].y;// - BoxOfAtoms[i].Position.y;
						z=BoxOfAtoms[i].nonBondedPositions[j].z;// - BoxOfAtoms[i].Position.z;
						BoxOfAtoms[i].nonBondedPositions[j].x = cdx*x + sdx*(sdy*y+cdy*z) ;
						BoxOfAtoms[i].nonBondedPositions[j].y = cdy*y - sdy*z;
						BoxOfAtoms[i].nonBondedPositions[j].z =-sdx*x + cdx*(sdy*y+cdy*z);
						//BoxOfAtoms[i].nonBondedPositions[j].add(BoxOfAtoms[i].Position);
						BoxOfAtoms[i].nonBondedPositions[j].normalize();
					}
				}
				if(selected != null && keyCodes[SHIFT]) {
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
				var deltaX = lerp(selected.Position.x, mScrX, dTime * 4) - selected.Position.x;
				var deltaY = lerp(selected.Position.y, mScrY, dTime * 4) - selected.Position.y;
				var deltaZ = lerp(selected.Position.z, 0, dTime * 10) - selected.Position.z;
				for(var i = 0; i < bb[2].length; i++) {
					bb[2][i].Position.x += deltaX;
					bb[2][i].Position.y += deltaY;
					bb[2][i].Position.z += deltaZ;
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
			var dp;
			var netdp = new PVector(0, 0, 0);
			//Pass 1: apply bond force, turbulent force and repulsive force (multiple times to reduce linear component of repulsive force);
			for(var n = 0; n < fIterations; n++) {
				for(var i = 0; i < BoxOfAtoms.length; i++) {
					if(isNaN(BoxOfAtoms[i].Position.x)) {BoxOfAtoms[i].Destroy(); continue;}
					//if(!grabbed || BoxOfAtoms[i] != selected) 
					//netdp.add(BoxOfAtoms[i].ApproachBonds(dTime));
					BoxOfAtoms[i].applyElectronForces(dTime/fIterations, processing);
					BoxOfAtoms[i].Position.add(TurbulentForce(dTime/fIterations));
					for(var j = 0; j < BoxOfAtoms[i].nonBondedPositions.length; j++) {
						BoxOfAtoms[i].nonBondedPositions[j].add(TurbulentForce(dTime/fIterations));
					}
					for(var j = 0; j < BoxOfAtoms.length; j++) {
						var rf = RepulsiveForce(BoxOfAtoms[i], BoxOfAtoms[j], dTime * 10000 / fIterations);
						rf.mult(0.25);
						BoxOfAtoms[i].Position.add(rf);
						BoxOfAtoms[j].Position.sub(rf);
					}	
					//TODO: maintain average distance from bonds?
					/*var vecdist = new PVector(0, 0, 0);
					for(var j = 0; j < BoxOfAtoms[i].Bonds.length; j++) {
						vecdist.add(BoxOfAtoms[i].Bonds[j].Target.Position);
						vecdist.sub(BoxOfAtoms[i].Position);
					}*/
				}
			}
			var netP = new PVector(0,0,0);
			//Pass 2: collect net position, cancel net movement
			for(var i = 0; i < BoxOfAtoms.length; i++) {
				//BoxOfAtoms[i].Position.sub(netdp);
				//netP.add(BoxOfAtoms[i].Position);
				//BoxOfAtoms[i].Position.z -= Math.sign(BoxOfAtoms[i].Position.z) / 10;
				if(keyCodes[ALT]) BoxOfAtoms[i].Position.z -= BoxOfAtoms[i].Position.z * 0.99;
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
				//size(window.innerWidth, window.innerHeight);
			}
			cTime = millis()/1000;
			dTime = cTime - lTime;
			noStroke();
			backgroundLayer();
			graphLayer();
			renderLayer();
			physics();
			handleControls();
			lTime = cTime;
		};
	}};
	processingInstance = new Processing(canvas, sketchProc);
});