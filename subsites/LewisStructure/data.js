var keyMap = [ "", "",
	"",
	"",
	"",
	"",
	"",
	"",
	"BKSP",
	"TAB",
	"ENTER",
	"",
	"",
	"SHIFT+ENTER",
	"",
	"",
	"",
	"",
	"",
	"",
	"",
	"",
	"",
	"",
	"",
	"",
	"",
	"ESCAPE",
	"",
	"",
	"",
	"",
	" ",
	"!",
	"\"",
	"#",
	"$",
	"%",
	"&",
	"'",
	"(",
	")",
	"*",
	"+",
	",",
	"-",
	".",
	"",
	"0",
	"1",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	":",
	";",
	"<",
	"=",
	">",
	"",
	"@",
	"A",
	"B",
	"C",
	"D",
	"E",
	"F",
	"G",
	"H",
	"I",
	"J",
	"K",
	"L",
	"M",
	"N",
	"O",
	"P",
	"Q",
	"R",
	"S",
	"T",
	"U",
	"V",
	"W",
	"X",
	"Y",
	"Z",
	"[",
	"\\",
	"]",
	"^",
	"_",
	"`",
	"a",
	"b",
	"c",
	"d",
	"e",
	"f",
	"g",
	"h",
	"i",
	"j",
	"k",
	"l",
	"m",
	"n",
	"o",
	"p",
	"q",
	"r",
	"s",
	"t",
	"u",
	"v",
	"w",
	"x",
	"y",
	"z",
	"{",
	"|",
	"}",
	"~",
	"DELETE",
	"",
	"",
	"",
	"",
];
var ElementSymbols = [
	"H", "He",
	"Li", "Be",
	"B", "C", "N", "O", "F", "Ne",
	"Na", "Mg",
	"Al", "Si", "P", "S", "Cl", "Ar",
	"K", "Ca",
	"Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn",
	"Ga", "Ge", "As", "Se", "Br", "Kr",
	"Rb", "Sr",
	"Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd",
	"In", "Sn", "Sb", "Te", "I", "Xe",
	"Cs", "Ba",
	"La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb",
	"Lu", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg",
	"Ti", "Pb", "Bi", "Po", "At", "Rn",
	"Fr", "Ra",
	"Ac", "Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No",
	"Lr", "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn",
	"Uut", "Fl", "Uup", "Lv", "Uus", "Uuo"
];
var ElementNames = [
	"Hydrogen", "Helium",
	"Lithium", "Beryllium",
	"Boron", "Carbon", "Nitrogen", "Oxygen", "Fluorine", "Neon",
	"Sodium", "Magnesium",
	"Aluminium", "Silicon", "Phosphorus", "Sulfur", "Chlorine", "Argon",
	"Potassium", "Calcium",
	"Scandium", "Titanium", "Vanadium", "Chromium", "Manganese", "Iron", "Cobalt", "Nickel", "Copper", "Zinc",
	"Gallium", "Germanium", "Arsenic", "Selenium", "Bromine", "Krypton",
	"Rubidium", "Strontium",
	"Yttrium", "Zirconium", "Niobium", "Molybdenum", "Technetium", "Ruthenium", "Rhodium", "Palladium", "Silver", "Cadmium",
	"Indium", "Tin", "Antimony", "Tellurium", "Iodine", "Xenon",
	"Caesium", "Barium",
	"Lanthanum", "Cerium", "Praseodymium", "Neodymium", "Promethium", "Samarium", "Europium", "Gadolinium", "Terbium", "Dysprosium", "Holmium", "Erbium", "Thulium", "Ytterbium",
	"Lutetium", "Hafnium", "Tantalum", "Tungsten", "Rhenium", "Osmium", "Iridium", "Platinum", "Gold", "Mercury",
	"Thallium", "Lead", "Bismuth", "Polonium", "Astatine", "Radon",
	"Francium", "Radium",
	"Actinium", "Thorium", "Protactinium", "Uranium", "Neptunium", "Plutonium", "Americium", "Curium", "Berkelium", "Californium", "Einsteinium", "Fermium", "Mendelevium", "Nobelium",
	"Lawrencium", "Rutherfordium", "Dubnium", "Seaborgium", "Borhium", "Hassium", "Meitnerium", "Darmstadtium", "Roentgenium", "Copernicium",
	"Ununtrium", "Flerovium", "Ununpentium", "Livermorium", "Ununseptium", "Ununoctium"
];
var AtomicMasses = [
	1.008, 4.002602,
	6.94, 9.01218,
	10.81, 12.011, 14.007, 15.999, 18.9984, 20.1797,
	22.9897, 24.305,
	26.9815, 28.05, 30.9737, 32.06, 35.45, 39.948,
	39.0983, 40.078,
	44.9559, 47.867, 50.9415, 51.9961, 54.9380, 55.845, 58.9331, 58.6934, 63.546, 65.38,
	69.723, 72.63, 74.9215, 78.971, 79.904, 83.798,
	85.4678, 87.62, 88.9058, 91.224, 92.9063, 95.95, 98, 101.07, 102.905, 106.42, 107.8682, 112.414,
	114.818, 118.710, 121.760, 127.60, 126.904, 131.293,
	132.905, 137.327,
	138.905, 140.116, 140.907, 144.242, 145, 150.36, 151.964, 157.25, 158.925, 162.500, 164.930, 167.259, 168.934, 173.054,
	174.9668, 178.49, 180.947, 183.84, 186.207, 190.23, 192.217, 195.084, 196.9665, 200.59,
	204.38, 207.2, 208.980, 209, 210, 222,
	223, 226,
	227, 232.037, 231.035, 238.0289, 237, 244, 243, 247, 247, 251, 252, 257, 258, 259,
	262, 267, 268, 271, 272, 270, 276, 281, 280, 285,
	284, 289, 293, 294, 294
];
var ElementGroups = [
	1, 18,
	1, 2,
	13, 14, 15, 16, 17, 18,
	1, 2,
	13, 14, 15, 16, 17, 18,
	1, 2,
	3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
	13, 14, 15, 16, 17, 18,
	1, 2,
	3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
	13, 14, 15, 16, 17, 18,
	1, 2,
	-1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12, -13, -14,
	3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
	13, 14, 15, 16, 17, 18,
	1, 2,
	-1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12, -13, -14,
	3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
	13, 14, 15, 16, 17, 18
];
var CPK_ALKALI = 0xFF9400D3;
var CPK_ALKALINE = 0xFFAFAFAF;
var CPK_NOBLE = 0xFF00CCFF;
var CPK_TRANSITION = 0xFFE5906D;

var CPK_BORON = 0xFFE5906D;
var CPK_HYDROGEN = 0xFFFFFFFF;
var CPK_CARBON = 0xFF000000;
var CPK_NITROGEN = 0xFF7EC0EE;
var CPK_HALOGEN_LIGHT = 0xFF55FF55;
var CPK_OXYGEN = 0xFFFF2222;
var CPK_PHOSPHORUS = 0xFFFFA500;
var CPK_SULFUR = 0xFFFFFF00;
var CPK_BROMINE = 0xFF880000;
var CPK_IODINE = 0xFFA020F0;
var CPK_TITANIUM = 0xFFAAAAAA;
var CPK_IRON = 0xFFDDAA99;

var CPK_OTHER = 0xFFFF69B4;


var CCPK_ALKALI = 0xFF00FF00;
var CCPK_ALKALINE = 0xFF000000;
var CCPK_NOBLE = 0xFFFF0000;
var CCPK_TRANSITION = 0xFF00FF00;

var CCPK_BORON = 0xFF0000FF;
var CCPK_HYDROGEN = 0xFF000000;
var CCPK_CARBON = 0xFFFFFFFF;
var CCPK_NITROGEN = 0xFFFF0000;
var CCPK_HALOGEN_LIGHT = 0xFFFF00FF;
var CCPK_OXYGEN = 0xFF00FFFF;
var CCPK_PHOSPHORUS = 0xFF00FF00;
var CCPK_SULFUR = 0xFF0000FF;
var CCPK_BROMINE = 0xFF00FFFF;
var CCPK_IODINE = 0xFF00FF00;
var CCPK_TITANIUM = 0xFF000000;
var CCPK_IRON = 0xFF000000;

var CCPK_OTHER = 0xFF000000;

var CPKElementColors = [
	CPK_HYDROGEN, CPK_NOBLE,
	CPK_ALKALI, CPK_ALKALINE,
	CPK_BORON, CPK_CARBON, CPK_NITROGEN, CPK_OXYGEN, CPK_HALOGEN_LIGHT, CPK_NOBLE,
	CPK_ALKALI, CPK_ALKALINE,
	CPK_OTHER, CPK_OTHER, CPK_PHOSPHORUS, CPK_SULFUR, CPK_HALOGEN_LIGHT, CPK_NOBLE,
	CPK_ALKALI, CPK_ALKALINE,
	CPK_TRANSITION, CPK_TITANIUM, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_IRON, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, 
	CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_BROMINE, CPK_NOBLE,
	CPK_ALKALI, CPK_ALKALINE, 
	CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, 
	CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_IODINE, CPK_NOBLE,
	CPK_ALKALI, CPK_ALKALINE, 
	CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, 
	CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, 
	CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_NOBLE,
	CPK_ALKALI, CPK_ALKALINE, 
	CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, 
	CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, CPK_TRANSITION, 
	CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_OTHER, CPK_NOBLE
];
var CPKComplimentary = [
	CCPK_HYDROGEN, CCPK_NOBLE,
	CCPK_ALKALI, CCPK_ALKALINE,
	CCPK_BORON, CCPK_CARBON, CCPK_NITROGEN, CCPK_OXYGEN, CCPK_HALOGEN_LIGHT, CCPK_NOBLE,
	CCPK_ALKALI, CCPK_ALKALINE,
	CCPK_OTHER, CCPK_OTHER, CCPK_PHOSPHORUS, CCPK_SULFUR, CCPK_HALOGEN_LIGHT, CCPK_NOBLE,
	CCPK_ALKALI, CCPK_ALKALINE,
	CCPK_TRANSITION, CCPK_TITANIUM, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_IRON, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, 
	CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_BROMINE, CCPK_NOBLE,
	CCPK_ALKALI, CCPK_ALKALINE, 
	CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, 
	CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_IODINE, CCPK_NOBLE,
	CCPK_ALKALI, CCPK_ALKALINE, 
	CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, 
	CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, 
	CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_NOBLE,
	CCPK_ALKALI, CCPK_ALKALINE, 
	CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, 
	CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, CCPK_TRANSITION, 
	CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_OTHER, CCPK_NOBLE
];
var Orbitals = [
	1, "s", 2,
	2, "s", 2,
	2, "p", 6,
	3, "s", 2,
	3, "p", 6,
	4, "s", 2,
	3, "d", 10,
	4, "p", 6,
	5, "s", 2,
	4, "d", 10,
	5, "p", 6,
	6, "s", 2,
	4, "f", 14,
	5, "d", 10,
	6, "p", 6,
	7, "s", 2,
	5, "f", 14,
	6, "d", 10,
	7, "p", 6
];
var NobleGasConfigs = [
	"[Uuo]", "1s²2s²2p⁶3s²3p⁶4s²3d¹⁰4p⁶5s²4d¹⁰5p⁶6s²4f¹⁴5d¹⁰6p⁶7s²5f¹⁴6d¹⁰7p⁶",
	"[Rn]", "1s²2s²2p⁶3s²3p⁶4s²3d¹⁰4p⁶5s²4d¹⁰5p⁶6s²4f¹⁴5d¹⁰6p⁶",
	"[Xe]", "1s²2s²2p⁶3s²3p⁶4s²3d¹⁰4p⁶5s²4d¹⁰5p⁶",
	"[Kr]", "1s²2s²2p⁶3s²3p⁶4s²3d¹⁰4p⁶",
	"[Ar]", "1s²2s²2p⁶3s²3p⁶",
	"[Ne]", "1s²2s²2p⁶",
	"[He]", "1s²"
];
var SuperscriptNumbers = "⁰¹²³⁴⁵⁶⁷⁸⁹";
var SubscriptNumbers = "₀₁₂₃₄₅₆₇₈₉";
var toSuperscript = function(instr) {
	var s = "";
	for(var i = 0; i < instr.length; i++) s += SuperscriptNumbers[instr[i]];
	return s;
}
var toSubscript = function(instr) {
	var s = "";
	for(var i = 0; i < instr.length; i++) s += SubscriptNumbers[instr[i]];
	return s;
}
var AR_DFT = 200;
var AtomicRadii = [ //in picometers, source http://periodictable.com/Properties/A/AtomicRadius.an.html
	53, 31,
	167, 112,
	87, 67, 56, 48, 42, 38,
	190, 145,
	118, 111, 98, 88, 79, 71,
	243, 194,
	184, 176, 171, 166, 161, 156, 152, 149, 145, 142,
	136, 125, 114, 103, 94, 88,
	265, 219,
	212, 206, 198, 190, 183, 178, 173, 169, 165, 161,
	156, 145, 133, 123, 115, 108,
	298, 253,
	AR_DFT, AR_DFT, 247, 206, 205, 238, 231, 233, 225, 228, 226, 226, 222, 222,
	217, 208, 200, 193, 188, 185, 180, 177, 174, 171,
	156, 154, 143, 135, 127, 120, 
	AR_DFT, AR_DFT,
	AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT,
	AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT
];
var Electronegativity = [
	2.20, 0,
	0.98, 1.57,
	2.04, 2.55, 3.04, 3.44, 3.98, 0,
	0.93, 1.31,
	1.61, 1.90, 2.19, 2.58, 3.16, 0,
	0.82, 1.00,
	1.36, 1.54, 1.63, 1.66, 1.55, 1.83, 1.88, 1.91, 1.90, 1.65,
	1.81, 2.01, 2.18, 2.55, 2.96, 3.00,
	0.82, 0.95,
	1.22, 1.33, 1.6, 2.16, 1.9, 2.2, 2.28, 2.20, 1.93, 1.69,
	1.78, 1.96, 2.05, 2.1, 2.65, 2.6,
	0.79, 0.89,
	1.10, 1.12, 1.13, 1.14, 1.13, 1.17, 1.2, 1.2, 1.2, 1.22, 1.23, 1.24, 1.25, 1.1,
	1.27, 1.3, 1.5, 2.36, 1.9, 2.2, 2.20, 2.28, 2.54, 2.00,
	1.62, 2.33, 2.02, 2.0, 2.2, 0,
	0.7, 0.89,
	1.1, 1.3, 1.5, 1.38, 1.36, 1.28, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0
];
var SingleCovalentRadii = [
	32, 46,
	133, 102,
	85, 75, 71, 63, 64, 67,
	155, 139,
	126, 116, 111, 103, 99, 96,
	196, 171,
	148, 136, 134, 122, 119, 116, 111, 110, 112, 118,
	124, 121, 121, 116, 114, 117,
	210, 185,
	163, 154, 147, 138, 128, 125, 125, 120, 128, 136,
	142, 140, 140, 136, 133, 131,
	232, 196,
	180, 163, 176, 174, 173, 172, 168, 169, 168, 167, 166, 165, 164, 170,
	162, 152, 146, 137, 131, 129, 122, 123, 124, 133, 144, 144, 151, 145, 147, 142,
	223, 201,
	186, 175, 169, 170, 171, 172, 166, 166, 168, 168, 165, 167, 173, 176,
	161, 157, 149, 143, 141, 134, 129, 128, 121, 122,
	136, 143, 162, 175, 165, 157
];
var DoubleCovalentRadii = [
	AR_DFT, AR_DFT,
	124, 90,
	78, 67, 60, 57, 59, 96,
	160, 132,
	113, 107, 102, 94, 95, 107,
	193, 147,
	116, 117, 112, 111, 105, 109, 103, 101, 115, 120,
	117, 111, 114, 107, 109, 121,
	202, 157,
	130, 127, 125, 121, 120, 114, 110, 117, 139, 144,
	136, 130, 133, 128, 129, 135,
	209, 161, 
	139, 137, 138, 137, 135, 134, 134, 135, 135, 133, 133, 133, 131, 129,
	131, 128, 126, 120, 119, 116, 115, 112, 121, 142,
	142, 135, 141, 135, 138, 145,
	218, 173,
	153, 143, 138, 134, 136, 135, 135, 136, 139, 140, 140, AR_DFT, 139, AR_DFT,
	141, 140, 136, 128, 128, 125, 125, 116, 116, 137,
	AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT
];
var TripleCovalentRadii = [
	AR_DFT, AR_DFT,
	AR_DFT, 85,
	73, 60, 54, 53, 53, AR_DFT,
	AR_DFT, 127,
	111, 102, 94, 95, 93, 96,
	AR_DFT, 133,
	114, 108, 106, 103, 103, 102, 96, 101, 120, AR_DFT,
	121, 114, 106, 107, 110, 108,
	AR_DFT, 139,
	124, 121, 116, 113, 110, 103, 106, 112, 137, AR_DFT,
	146, 132, 127, 121, 125, 122,
	AR_DFT, 149,
	139, 131, 128, AR_DFT, AR_DFT, AR_DFT, AR_DFT, 132, AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT,
	131, 122, 119, 115, 110, 109, 107, 110, 123, AR_DFT,
	150, 137, 135, 129, 138, 133,
	AR_DFT, 159,
	140, 136, 129, 118, 116, AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT,
	AR_DFT, 131, 126, 119, 118, 113, 112, 118, 130, AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT, AR_DFT
];
var ValenceElectrons = [
	1, 0,
	1, 2,
	3, 4, 5, 6, 7, 8,
	1, 2,
	3, 4, 5, 6, 7, 8,
	1, 2,
	-1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
	3, 4, 5, 6, 7, 8,
	1, 2,
	-1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
	3, 4, 5, 6, 7, 8,
	1, 2,
	-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
	-1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
	3, 4, 5, 6, 7, 8,
	1, 2,
	-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
	-1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
	3, 4, 5, 6, 7, 8
];