/**
 * Live demo: https://mavon.ie/demos/rapierjs-ragdoll
 */

import { DRACOLoader, GLTFLoader, OrbitControls} from 'three/examples/jsm/Addons.js';
import './style.css';

import RAPIER, { World } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { RapierDebugRenderer } from './DebugRenderer';
import { StiffBody } from './StiffBody';
import { Character } from './Character';
import { Ragdoll} from './Ragdoll';
import { Timer } from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement);

const hint = document.createElement('div')
hint.id = 'hint'
hint.textContent = 'Click / press on ragdoll to interact'
document.body.appendChild(hint)

const orbitControls = new OrbitControls(camera, renderer.domElement)
orbitControls.minDistance = 2; // Prevent zooming inside center objects
orbitControls.maxDistance = 5; // Prevent zooming outside the outer walls
orbitControls.minPolarAngle = 0.1; // Prevent rotating through the cieling
orbitControls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent rotating through the floor 
orbitControls.enablePan = false;

const floor = new THREE.PlaneGeometry(10, 10, 1)
const floorMesh = new THREE.Mesh(floor, new THREE.MeshStandardMaterial({ color: 'lightgray', side: THREE.DoubleSide}))
floorMesh.rotateX(-Math.PI / 2)
floorMesh.receiveShadow = true
scene.add(floorMesh)

const ceiling = new THREE.PlaneGeometry(10, 10, 1)
const ceilingMesh = new THREE.Mesh(ceiling, new THREE.MeshStandardMaterial({ color: 'lightgray', side: THREE.DoubleSide}))
ceilingMesh.geometry.rotateX(THREE.MathUtils.degToRad(-270))
ceilingMesh.geometry.translate(0, 5, 0)
ceilingMesh.receiveShadow = true
scene.add(ceilingMesh)

const walls: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
    const wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 5, 1), new THREE.MeshStandardMaterial({ color: 'lightgray', side: THREE.DoubleSide}));
    const angle = THREE.MathUtils.degToRad(i * 90);
    wallMesh.geometry.rotateY(angle);
    wallMesh.geometry.translate(Math.sin(angle) * 5, 2.5, Math.cos(angle) * 5);
    wallMesh.receiveShadow = true;
    scene.add(wallMesh);
    walls.push(wallMesh);
}

const ambient = new THREE.AmbientLight()
ambient.intensity = 2

const pointLight = new THREE.PointLight('white', 60, 30, 2);
pointLight.position.set(0, 5, 0); // Pointlight set at center position at cieling of the room
pointLight.castShadow = true
pointLight.lookAt(new THREE.Vector3(0, 0, 0))

scene.add(ambient, pointLight);
camera.position.set(0, 2, 3);

const PARAMS = {
  gravity: -9.81,
  debugPhysics: true,
  rigidBodyCount: 0,
  ragdollsCount: 0
}

await RAPIER.init()
const world = new World({ x: 0, y: PARAMS.gravity, z: 0 })
const rapierDebugRender = new RapierDebugRenderer(scene, world, PARAMS.debugPhysics)

// Create the colliders for the room
const floorPlane = RAPIER.ColliderDesc.cuboid(5, 0.2, 5);
const cielingPlane = RAPIER.ColliderDesc.cuboid(5, 0.2, 5);
cielingPlane.setTranslation(0, 5, 0);

const wallPlane1 = RAPIER.ColliderDesc.cuboid(0.1, 2.5, 5);
wallPlane1.setTranslation(5, 2.5, 0);
const wallPlane2 = RAPIER.ColliderDesc.cuboid(0.1, 2.5, 5);
wallPlane2.setTranslation(-5, 2.5, 0);
const wallPlane3 = RAPIER.ColliderDesc.cuboid(5, 2.5, 0.1);
wallPlane3.setTranslation(0, 2.5, 5);
const wallPlane4 = RAPIER.ColliderDesc.cuboid(5, 2.5, 0.1);
wallPlane4.setTranslation(0, 2.5, -5);

const physicsPlaneDesc = RAPIER.RigidBodyDesc.fixed();
const physicsPlaneRigidBody = world.createRigidBody(physicsPlaneDesc);
physicsPlaneRigidBody.setTranslation({ x: 0, y: -.2, z: 0 }, false)

world.createCollider(floorPlane, physicsPlaneRigidBody);
world.createCollider(cielingPlane, physicsPlaneRigidBody);
world.createCollider(wallPlane1, physicsPlaneRigidBody);
world.createCollider(wallPlane2, physicsPlaneRigidBody);
world.createCollider(wallPlane3, physicsPlaneRigidBody);
world.createCollider(wallPlane4, physicsPlaneRigidBody);

const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://raw.githubusercontent.com/google/draco/refs/heads/main/javascript/');
loader.setDRACOLoader(dracoLoader);

const ragdolls = [new Character(world, scene, loader)]
const timer = new Timer;rapierDebugRender.toggleVisible(true)
rapierDebugRender.update()

var stats = new Stats();
stats.showPanel(0); 
// 0: fps, 1: ms, 2: mb, 3+: custom

document.body.appendChild(stats.dom);

const raycaster = new THREE.Raycaster()

const windowSize = {
  width: window.innerWidth,
  height: window.innerHeight
}

let cursor = new THREE.Vector2()
let prevX = 0;
let prevY = 0;

function updateCursor(clientX: number, clientY: number) {
// Given an X and Y-position, updates the user's cursor 
  cursor.setX(clientX / windowSize.width * 2 - 1)
  cursor.setY(-(clientY / windowSize.height * 2 - 1))
}

// When the mouse moves updat the cursor's location to copy mouse's
document.addEventListener('mousemove', (ev) => updateCursor(ev.clientX, ev.clientY))

// Tracks if the mouse is at the body and is pulling the body
document.addEventListener('touchmove', (ev) => {
  if (!pulling) return
  ev.preventDefault()
  updateCursor(ev.touches[0].clientX, ev.touches[0].clientY)
}, { passive: false })

const axisHelper = new THREE.AxesHelper(2)
const mouseHelper = new THREE.SphereGeometry(0.1, 16, 16)
const mouseHelperMesh = new THREE.Mesh(mouseHelper, new THREE.MeshBasicMaterial({
  color: "yellow",
  opacity: 0.6,
  transparent: true
}))

mouseHelperMesh.visible = false
mouseHelperMesh.position.set(0, 0, 0)
scene.add(mouseHelperMesh, axisHelper)

let activeCharacter: Character | null = null
let activeRagdoll: Ragdoll | null = null
let pulling = false
let pullingBody: ReturnType<Ragdoll['findClosestBody']> = null

function startPull() {
// Sets 'pulling', which represents mouse pulling body, as true
  pulling = true
}

function endPull() {
// Resets character to act as its own object without user influence
  pulling = false
  pullingBody = null
  // activeRagdoll = null
  // activeCharacter = null
}

window.addEventListener('mousedown', ev => { if (ev.button === 0) startPull() })
window.addEventListener('mouseup', endPull)

window.addEventListener('touchstart', (ev) => {
  if (ev.target !== renderer.domElement) return
  ev.preventDefault()
  updateCursor(ev.touches[0].clientX, ev.touches[0].clientY)
  startPull()
}, { passive: false })

window.addEventListener('touchend', (ev) => {
  if (ev.target !== renderer.domElement) return
  endPull()
})

function animate() {
// Is what sets the whole program so that when the user is interacting with the character body,
// it moves according to the cursor's pull. When the user interacts with the character, it 
// switches to use ragdoll physics. When the body is at rest and the user is not interacting with
// it, it switches to a stiff body.
  timer.update()
  stats.begin()

  PARAMS.rigidBodyCount = world.bodies.len()
  PARAMS.ragdollsCount = ragdolls.length

  world.gravity = new RAPIER.Vector3(0, PARAMS.gravity, 0);
  world.step()
  if (activeRagdoll) {
    ragdolls.forEach(ragdollBody => ragdollBody.ragdoll.update(timer.getDelta()))
  }
  rapierDebugRender.update()
  orbitControls.update()

  renderer.render(scene, camera);
  raycaster.setFromCamera(cursor, camera)

  const { origin, direction } = raycaster.ray
  const rapierRay = new RAPIER.Ray({ x: origin.x, y: origin.y, z: origin.z }, { x: direction.x, y: direction.y, z: direction.z })
  const rayHit = world.castRay(rapierRay, 100, true)

  let collisionPoint: THREE.Vector3 | undefined
  const hitRagdoll = rayHit ? ragdolls.find(d => d.ownsRigidBody(rayHit.collider.parent())) : null

  if (hitRagdoll) {
  // If the cursor is on a character, set character as the current active character
    activeRagdoll = hitRagdoll.ragdoll
    activeCharacter = hitRagdoll
    const toi = rayHit!.timeOfImpact
    collisionPoint = new THREE.Vector3(origin.x + direction.x * toi, origin.y + direction.y * toi, origin.z + direction.z * toi)
    mouseHelperMesh.visible = true
    axisHelper.visible = true
    mouseHelperMesh.position.copy(collisionPoint)
    axisHelper.position.copy(collisionPoint)
    prevX = cursor.x
    prevY = cursor.y
    orbitControls.enableRotate = false 
  } else {
    axisHelper.visible = false
    mouseHelperMesh.visible = false
    orbitControls.enableRotate = true
  }

  const angle = orbitControls.getAzimuthalAngle(); 
  const xPullBase = (cursor.x - prevX) * 0.0205;
  const zPullBase = -(cursor.y - prevY) * 0.0205;

  const xPull = xPullBase * Math.cos(angle) + zPullBase * Math.sin(angle);
  const zPull = -xPullBase * Math.sin(angle) + zPullBase * Math.cos(angle);
  // Gets the current angle of the camera and pulls the character according to the user's view.
  // Intensity of the character movement adjusts to how hard the user pulls.

  if (activeCharacter && pulling) {
  // If the user is pulling on a body, switch to have character use ragdoll physics 
  // and apply the impulse.
    physicsPlaneRigidBody.wakeUp()
    activeCharacter.switchToRagdoll()
    console.log("----")
    console.log("Body is RAGDOLL:" + activeCharacter.ragdollCreated)
    console.log("Body is KINEMATIC:" + activeCharacter.stiffBodyCreated)
    if (activeRagdoll && !pullingBody) {
      pullingBody = activeRagdoll.findClosestBody(collisionPoint!)
    }

    if(activeRagdoll){
      pullingBody?.applyImpulse({ x: xPull, y: 0.0205, z: zPull }, true)
    }
  }

  if(activeCharacter && activeRagdoll && !pulling){
    if(!activeCharacter.inMotion(activeRagdoll)){
    // If the current active character is no longer being pulled and is no longer moving
    // as an effect of the ragdoll physics, switch character back to using kinematic 
    // physics where the body can only be altered through adjusting its movement. 
      physicsPlaneRigidBody.sleep()
      activeCharacter.switchToStiffBody()
      console.log("----")
      console.log("Body is RAGDOLL:" + activeCharacter.ragdollCreated)
      console.log("Body is KINEMATIC:" + activeCharacter.stiffBodyCreated)
      activeRagdoll = null;
    }
  }

  stats.end()
}

renderer.setAnimationLoop(animate);