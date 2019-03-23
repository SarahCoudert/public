var current_step_id = 0;
var FPS_RATE = 45;
var BALL_BOUND = 15;

var ballForce = {
  xspeed: 0,
  yspeed: 0,
  xforce: 0,
  yforce: 0,
  mass: 20
};
var FRICTION_FORCE = 2;

var points = [];

var mouse = {
  x: 0,
  y: 0
};

var is_falling = true, get_up = true, speed = 3;

var container,
  scene,
  camera,
  renderer,
  mouseLight,
  ball,
  light,
  vectorMouse = new THREE.Vector3(0, 0, 20),
  visualPointLight;

init();
animate();

function init() {
  // Gerono's curve
  var j = 2 * Math.PI;
  var k = Math.PI / 100;
  var scale = 2;
  var linegeometry = new THREE.Geometry();

  for (var t = 0; t < j; t += k) {
    var x = (scale * Math.cos(t)/1.3) - 40;
    var y = (scale * Math.sin(t)*1.4) + 10;
   
   vec = new THREE.Vector3(x, y , 0)
    points.push(vec);
    linegeometry.vertices.push(vec);
  }
  
  points.push(points[0]);
  linegeometry.vertices.push(points[0]);

  //create scene
  scene = new THREE.Scene();

  //set camera position
  camera = new THREE.PerspectiveCamera(
    20,
    window.innerWidth / window.innerHeight,
    10,
    200
  );
  camera.position.set(0, 0, 200);
  scene.add(camera);

  //create ambient light
  var ambientLight = new THREE.AmbientLight(0xffffff, 0.4, 2);
  scene.add(ambientLight);
  
  var linematerial = new THREE.LineBasicMaterial({
    color: 0x0000ff
  });

  var line = new THREE.Line( linegeometry, linematerial );

  /***************************/
  /****** LINE DRAWING ******/
  /*************************/
//  scene.add(line);

  // create mouse light
  light = new THREE.PointLight(0xffffff, 1.9, 100, 2);
  light.position.set(0, 0, 20);
  scene.add(light);
  
  // create point light above ball to add 3D effect
  pointLight = new THREE.PointLight(0xcccccc, 1.3);
  pointLight.position.set(0, 0, 250);
  scene.add(pointLight);

  // create visual cursor

 
var material = new THREE.MeshPhongMaterial({
    color: 0x470082,
    shininess: 30
  });

  // create ball alias "bouboule"
  ball = new THREE.Mesh(new THREE.SphereBufferGeometry(10, 64, 64), material);
  ball.position.set(points[0].x, 140, 0);
  ball.name = "bouboule";
  scene.add(ball);
 
  // generate renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  //place scene in container
  container = document.getElementById("threejs-container");
  container.appendChild(renderer.domElement);

  // When the mouse moves, call the given function
  document.addEventListener("mousemove", onMouseMove, false);
  // When window resize, resize all
  window.addEventListener("resize", onWindowResize, false);
}

// Follows the mouse event
function onMouseMove(event) {
  event.preventDefault();
  mouse.x = event.clientX / window.innerWidth * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Make the sphere follow the mouse
  var vector = new THREE.Vector3(mouse.x, mouse.y, 100);
  vector.unproject(camera);
  var dir = vector.sub(camera.position).normalize();
  var distance = -camera.position.z / dir.z;
  var pos = camera.position.clone().add(dir.multiplyScalar(distance));
  vectorMouse = pos;
  //position of light and yellow circle is equal mouse vector
  light.position.copy(pos);
  // light and yellow circle are above the ball
  light.translateZ(15);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
//
function animate() {
  //Frame per second handler
  setTimeout(function() {
    requestAnimationFrame(animate);
  }, 1000 / FPS_RATE);

  render();
}

function render() {
  camera.lookAt(scene.position);
  scene.traverse(function(object) {
    if (object.name == "bouboule") {
      if (is_falling) {
        var vec = new THREE.Vector3(0, object.position.y - (speed + 10), 0);
        if (isInScreen(vec)) {
          is_falling = false;
          get_up = true;
          speed = 0;
          resetAllForces();
        }
        object.position.y += -speed;
      }
      else {
        applyMagnetForce();
        getSpringForce();
        applyFriction();
        applyAllForces();
        resetAllForces();
      }
      if (get_up) {
          get_up = (current_step_id == points.length - 1) ? false : true;
      }
      console.log(get_up);
      console.log(current_step_id);
    }
  });
  renderer.autoClear = false;
  renderer.clear();
  renderer.render(scene, camera);
}

function applyMagnetForce() {
  var dx = (vectorMouse.x - ball.position.x) * 1.2;
  var dy = (vectorMouse.y - ball.position.y) * 1.2;
  var distance = Math.sqrt(dx * dx + dy * dy);
  var force = 20 / (distance);
  //Make sure the simulation doesn't explode
  if (force > 3) {
    force = 3;
  }
  //Find the horizontal and vertical components of the force
  var xforce = force * (dx / distance);
  var yforce = force * (dy / distance);
  //Apply forces to particles
  ballForce.xforce += -xforce;
  ballForce.yforce += -yforce;
}

function getSpringForce() {
  var current_point = points[current_step_id];
  if (get_up) { current_point = points[0] }
  var dx = ball.position.x - current_point.x;
  var dy = ball.position.y - current_point.y;
  var distance = Math.sqrt(dx * dx + dy * dy);
  var force = 0.55 * (distance);
  //Find the horizontal and vertical components of the force
  if (distance == 0) return;
  var xforce = - force * (dx / distance);
  var yforce = - force * (dy / distance);
  //Apply forces to particles
  ballForce.xforce += xforce;
  ballForce.yforce += yforce;
  current_step_id = (current_step_id == points.length - 1) ? 0 : current_step_id + 1;
}

function getFloatingForce() {
  var dx = ball.position.x - points[current_step_id].x;
  var dy = ball.position.y - points[current_step_id].y;
  var distance = Math.sqrt(dx * dx + dy * dy);
  var force = 2;

  //Find the horizontal and vertical components of the force
  var xforce = force * (dx / distance);
  var yforce = force * (dy / distance);
  //Apply forces to particles
  ballForce.xforce = -xforce;
  ballForce.yforce = -yforce
}

function applyFriction() {
  var s = Math.sqrt(ballForce.xspeed * ballForce.xspeed + ballForce.yspeed * ballForce.yspeed);
  var force = FRICTION_FORCE * s;
  if (s == 0) return;
  //Find the horizontal and vertical components of the force
  var xforce = -force * (ballForce.xspeed / s);
  var yforce = -force * (ballForce.yspeed / s);
  //Apply forces to particles
  
  ballForce.xforce += xforce;
  ballForce.yforce += yforce;
}

function applyAllForces() {
  ballForce.xspeed += ballForce.xforce / ballForce.mass;
  ballForce.yspeed += ballForce.yforce / ballForce.mass;
  ball.position.x += ballForce.xspeed;
  ball.position.y += ballForce.yspeed;
}

function resetAllForces() {
  ballForce.xforce = 0;
  ballForce.yforce = 0;
}

function resetAll() {
  resetAllForces();
  ballForce.xspeed = 0;
  ballForce.yspeed = 0;
}

function isInScreen(vec) {
  camera.updateMatrix();
  camera.updateMatrixWorld();
  var frustum = new THREE.Frustum();
  frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));  

  // Your 3d point to check
  if (frustum.containsPoint(vec)) { return true; } 
  else { return false; }
}