//////////////////////////////////////
//////////////////////////////////////
//RK4.js//////////////////////////////
//////////////////////////////////////
// Physics simulation webtoy. Moves //
//spheres around according to sever-//
//  al constraint and force types,  //
// integrated with the powerful and //
//       accurate RK4 method.       //
//////////////////////////////////////
//////////////////////////////////////
//TODO:
//make Axis Selector functional
//make Tools Selector functional
//	implement object movement system
//	on camera plane?
//implement object creation system
//implement opchain editor
//allow show/hide on options menu and stats menu
//add tooltips on mouseover objects
//try to work out a way to get the cross-sectional area of any mesh based on its velocity
//	this will solve all problems with air friction forces; get it done!
//	can easily find the area by triangulating the polygon, which is done by default at some point
//	just get the cross-section somehow
//'fix' the opchain into a list, but first find out if it's even a chain


	
$('document').ready(function() {
	$('#controlsContainer').accordion({heightStyle: 'content'});
	$('#controlSelectorPanel').buttonsetv();
	$('#axisButtons').buttonsetv();
	container = document.getElementById('contentContainer');
	$('body').height(window.innerHeight);
	doThreeInit();
});

function doThreeInit() {
	renderer = new THREE.WebGLRenderer();
	container.appendChild( renderer.domElement );
	renderer.setSize($('#contentContainer').width(), $('#contentContainer').height());
	renderer.setClearColor(0x000000, 1);
	
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera( 60, $('#contentContainer').width() / $('#contentContainer').height(), 0.1, 500000 );
	scene.add(camera);
	camera.up.set(0, 0, 1);
	camera.position.z = 400;
	tracking = 1;

	controls = new THREE.OrbitControls( camera );
	
	materials[0] = new THREE.MeshLambertMaterial({
		ambient: 0x111111,
		color: 0x774422,
		//specular: 0xffffff,
		//shininess: 20.0,
		shading: THREE.SmoothShading
	});
	
	materials[1] = new THREE.MeshBasicMaterial({
		color: 0xffffff,
		wireframe: true
	});

	lights[0] = new THREE.DirectionalLight({color: 0xFFFFaa, intensity: 0.7});
	lights[0].position.set(0.1, 0.35, 0.7);
	scene.add(lights[0]);
	
	geometries[0] = new THREE.SphereGeometry(1, 32, 16);
	geometries[1] = new THREE.PlaneGeometry(128, 128, 32, 32);
	
	var direction = new THREE.Vector3(1, 1, 1).normalize();
	var startPoint = new THREE.Vector3(0, 0, 0);
	var endPoint = new THREE.Vector3(1, 1, 1);
	
	for(var i = 0; i < s_ren.length; i++) {
		meshes.push(new THREE.Mesh(geometries[0], materials[0]));
		meshes[meshes.length - 1].ObjectID = i;
		meshes[meshes.length - 1].scale.set(s_ren[i].Radius, s_ren[i].Radius, s_ren[i].Radius);
		arrows.push(new THREE.ArrowHelper(direction, startPoint, startPoint.distanceTo(endPoint), 0xFFFFFF));
		arrows.push(new THREE.ArrowHelper(direction, startPoint, startPoint.distanceTo(endPoint), 0xFF0000));
		arrows.push(new THREE.ArrowHelper(direction, startPoint, startPoint.distanceTo(endPoint), 0x00FF00));
		arrows.push(new THREE.ArrowHelper(direction, startPoint, startPoint.distanceTo(endPoint), 0x0000FF));
	}
	
	helpermeshes.push(new THREE.Mesh(geometries[0], materials[1]));
	
	helpermeshes.push(new THREE.AxisHelper(100000));
	helpermeshes.push(new THREE.AxisHelper(-100000));
	
	for(var i = 0; i < meshes.length; i++)
		scene.add(meshes[i]);
	for(var i = 0; i < helpermeshes.length; i++)
		scene.add(helpermeshes[i]);
	for(var i = 0; i < arrows.length; i++)
		scene.add(arrows[i]);
		
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	stats.domElement.style.zIndex = 100;
	document.getElementById('header').appendChild( stats.domElement );
				
	clock = new THREE.Clock();
	projector = new THREE.Projector();
				
	s_curTime = window.performance.now() / 1000;
	//renderer.render(scene, camera);
	window.addEventListener( 'resize', onWindowResize, false );
	adjustedCamOffsetVector = new THREE.Vector3(-1, -1, 0.5);
	$(container).mousemove(function(e) {	
		adjustedCamOffsetVector = new THREE.Vector3((e.offsetX/$('#contentContainer').width()) * 2 - 1, -(e.offsetY/$('#contentContainer').height())*2+1, 0.5);
	});
	$(container).mousedown(function(e) {
		//once-only controls:
		mouseFlags[e.which] = true;
	});
	$(container).mouseup(function(e) {
		if(e.which == 1) {
			var selectedTool = $("#controlSelectorPanel :radio:checked").attr('id');
			switch(selectedTool) {
				case "lc1":
					var oldtrack = tracking;
					projector.unprojectVector(adjustedCamOffsetVector, camera);
					var rc = new THREE.Raycaster(camera.position, adjustedCamOffsetVector.clone().sub(camera.position).normalize());
					var isc = rc.intersectObjects(meshes);
					if(isc.length > 0) {
						tracking = isc[0].object.ObjectID;
					}
					else tracking = -1;
					break;
				case "lc2":
					break;
			}
		}	
		mouseFlags[e.which] = false;
	});
	$('#axisButtons input[type=radio]').change(function() {
		axisType = this.id;
	});
	$(document).keydown(function(e) {
		keyDn[e.which] = true;
		console.log(e.which);
		if(e.which == 37 || e.which == 39) e.preventDefault();
	});
	$(document).keyup(function(e) {
		keyDn[e.which] = false;
		//l 37, r 39
		if(e.which == 39) {
			tracking++;
			if(tracking >= s_ren.length) tracking = 0;
		}
		if(e.which == 37) {
			tracking--;
			if(tracking < 0) tracking = s_ren.length - 1;
		}
	});
	chainGlobal(RK4.Forces.Constraints.Gravitation, [0]);
	chainGlobal(RK4.Forces.Constraints.SimpleCollision, [false]);
	$('#opchain').html(opchainToHTMLString());
	CalcLoop();
}

var axisType = "ac1";
var keyDn = [];
var mouseFlags = [];
var adjustedCamOffsetVector;

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize($('#contentContainer').width(), $('#contentContainer').height());
}
	
function CalcLoop() {
	requestAnimationFrame(CalcLoop);
	
    var newTime = window.performance.now() / 1000;
    var frameTime = newTime - s_curTime;
    if(frameTime > 0.25)
        frameTime = 0.25;
    s_curTime = newTime;
	accumulator += frameTime;
	
    while(accumulator >= dt) {
		for(var i = 0; i < s_pre.length; i++) {
			s_pre[i] = cloneObjectState(s_cur[i]);
			s_force[i] = s_cur[i].Integrate(t, dt);
		}
        t += dt;
        accumulator -= dt;
    }

    var alpha = accumulator / dt;

	for(var i = 0; i < s_ren.length; i++) {
		s_ren[i].Position = s_cur[i].Position.clone().multiplyScalar(alpha).add(s_pre[i].Position.clone().multiplyScalar(1.0 - alpha));
		s_ren[i].Velocity = s_cur[i].Velocity.clone().multiplyScalar(alpha).add(s_pre[i].Velocity.clone().multiplyScalar(1.0 - alpha));
		s_ren[i].Momentum = s_cur[i].Momentum.clone().multiplyScalar(alpha).add(s_pre[i].Momentum.clone().multiplyScalar(1.0 - alpha));
	}
	//do rendering here
		
	for(var j = 0; j < s_ren.length; j++) {
		var i = 0;
		var startPoint = s_ren[j].Position.clone();
		var endPoint;
		switch(axisType) {
			case "ac1":
				endPoint   = s_ren[j].Velocity.clone();
				break;
			case "ac2":
				endPoint   = s_ren[j].Acceleration.clone();
				break;
			case "ac3":
				endPoint   = s_ren[j].Momentum.clone();
				break;
			case "ac4":
				endPoint   = s_force[j].clone();
				break;
			case "ac5":
				endPoint   = s_force[j].clone().multiplyScalar(s_ren[j].InverseMass);
				break;
			case "ac6":
				endPoint   = new THREE.Vector3(0, 0, 0); //cheatsidoodles!
				break;
		}
		
		if($('#acnotglobal').is(":checked") && tracking != j)
			endPoint = new THREE.Vector3(0, 0, 0);
		
		if($('#acscale').is(":checked")) {
			endPoint.normalize().multiplyScalar(s_ren[j].Radius * 2);
		}
		
		var direction = endPoint.clone().normalize();
		arrows[i+j*4].position = startPoint;
		arrows[i+j*4].setLength(endPoint.length());
		arrows[i+j*4].setDirection(direction);
		i++;
	
		if($('#acdirections').is(":checked")) {
			var endPointN = endPoint.clone().multiply(new THREE.Vector3(1, 0, 0));
			direction = endPointN.clone().normalize();
			arrows[i+j*4].position = startPoint;
			arrows[i+j*4].setLength(endPointN.length());
			arrows[i+j*4].setDirection(direction);
			i++;
		
			endPointN = endPoint.clone().multiply(new THREE.Vector3(0, 1, 0));
			direction = endPointN.clone().normalize();
			arrows[i+j*4].position = startPoint;
			arrows[i+j*4].setLength(endPointN.length());
			arrows[i+j*4].setDirection(direction);
			i++;
		
			endPointN = endPoint.clone().multiply(new THREE.Vector3(0, 0, 1));
			direction = endPointN.clone().normalize();
			arrows[i+j*4].position = startPoint;
			arrows[i+j*4].setLength(endPointN.length());
			arrows[i+j*4].setDirection(direction);
			i++;
		} else {
			arrows[j*4+1].setLength(0);
			arrows[j*4+2].setLength(0);
			arrows[j*4+3].setLength(0);
		}
	}
	
	for(var i = 0; i < s_ren.length; i++)
		meshes[i].position.set(s_ren[i].Position.x, s_ren[i].Position.y, s_ren[i].Position.z);
	stats.update();
	controls.update(clock.getDelta());
	
		
	if(tracking > -1) {
		$('#header').html(
			"OBJECT #" + (tracking + 1) + ":<br />"+
			"Position: " + s_ren[tracking].Position.x.toFixed(3) + ", " + s_ren[tracking].Position.y.toFixed(3) + ", " + s_ren[tracking].Position.z.toFixed(3) + "<br />" +
			"Velocity: " + s_ren[tracking].Velocity.x.toFixed(3) + ", " + s_ren[tracking].Velocity.y.toFixed(3) + ", " + s_ren[tracking].Velocity.z.toFixed(3) + "<br />" +
			"Accel.  : " + s_ren[tracking].Acceleration.x.toFixed(3) + ", " + s_ren[tracking].Acceleration.y.toFixed(3) + ", " + s_ren[tracking].Acceleration.z.toFixed(3) + "<br />" +
			"Momentum: " + s_ren[tracking].Momentum.x.toFixed(3) + ", " + s_ren[tracking].Momentum.y.toFixed(3) + ", " + s_ren[tracking].Momentum.z.toFixed(3) + "<br />"
		);
		var ctarglast = controls.target.clone();
		var ctargcurr = s_ren[tracking].Position.clone();
		var blendamt = 1;
		var ctargblend = controls.target.clone().add(ctargcurr.sub(ctarglast));
		controls.target = ctargblend.clone();
		//controls.target = ctargcurr.clone();
		camera.position.add(controls.target.clone().sub(ctarglast));
	}else{
		$('#header').html(
			"OBJECT#: NOT TRACKING<br />"+
			"MIDDLE-CLICK/DRAG TO ORBIT, SCROLL TO ZOOM<br />"+
			"RIGHT-CLICK/DRAG TO PAN OR USE THE TRACK TOOL<br />"+
			"POWERED BY THREE.JS, JQUERY, AND JQUERY UI"
		);
	}
	renderer.render(scene, camera);
}