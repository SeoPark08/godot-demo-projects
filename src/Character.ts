import RAPIER, { World } from "@dimforge/rapier3d-compat";
import { Group, Mesh, MeshNormalMaterial, MeshStandardMaterial, Object3D, Object3DEventMap, Quaternion, Scene, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { Ragdoll } from "./Ragdoll";
import { StiffBody } from "./StiffBody";

// This class represents the body of the character. It manages its current state
// (whether it is kinematic or dynamic / rigid or ragdoll) in the scene.

type RagdollParts = 'head' | 'torso' | 'armUpperRight' | 'armLowerRight' | 'armUpperLeft' | 'armLowerLeft' | 'thighRight' | 'shinRight' | 'thighLeft' | 'shinLeft';

export class Character extends Object3D {
    world: World;
    scene: Scene;
    loader: GLTFLoader;
    ragdoll!: Ragdoll;
    rigidBody!: StiffBody;


    head!: RAPIER.RigidBody;
    torso!: RAPIER.RigidBody;
    armUpperRight!: RAPIER.RigidBody;
    armLowerRight!: RAPIER.RigidBody;
    armUpperLeft!: RAPIER.RigidBody;
    armLowerLeft!: RAPIER.RigidBody;
    thighRight!: RAPIER.RigidBody;
    shinRight!: RAPIER.RigidBody;
    thighLeft!: RAPIER.RigidBody;
    shinLeft!: RAPIER.RigidBody;

    mesh: Group<Object3DEventMap> | null = null;

    private static readonly torsoHeight = 0.55;

    private static readonly boneMapping = {
        head: 'head',
        torso: 'spine',
        armUpperLeft: 'upperArml',
        armUpperRight: 'upperArmr',
        armLowerLeft: 'lowerArml',
        armLowerRight: 'lowerArmr',
        thighLeft: 'hipl',
        thighRight: 'hipr',
        shinLeft: 'shinl',
        shinRight: 'shinr'
    };

    public initialBoneWorldQuaternions: Map<string, Quaternion> = new Map();
    public ragdollCreated: boolean = false;
    public stiffBodyCreated: boolean = true;
    
    constructor(world: World, scene: Scene, loader: GLTFLoader) {
        super()

        this.world = world;
        this.scene = scene;
        this.loader = loader;


        // Load a glTF resource
        loader.load(
            '/character.glb',
            (glTF) => {
                glTF.scene.traverse(o => {
                    if (o instanceof Mesh) {
                        const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
                        const randomColor = colors[Math.floor(Math.random() * colors.length)];
                        o.material = Math.random() > 0.5 ? new MeshNormalMaterial() : new MeshStandardMaterial({ color: randomColor });

                        o.castShadow = true
                        o.receiveShadow = true
                        o.frustumCulled = false
                    }
                })

                this.mesh = glTF.scene
                this.mesh.position.set(0, 10, 0)
                scene.add(this.mesh)

                /**
                 * Store initial bone orientation from the blender mesh
                 * This is very important otherwise your mesh will be twisted
                 */
                const boneNames = new Set(Object.values(Character.boneMapping));

                const traverseAndMapBones = (object: Object3D) => {

                    // Lets see what we can find in the mesh and match it up with our mapping above
                    console.log(object)

                    if (boneNames.has(object.name)) {
                        const quat = new Quaternion();
                        object.getWorldQuaternion(quat);
                        this.initialBoneWorldQuaternions.set(object.name, quat);
                    }
                    for (const child of object.children) {
                        traverseAndMapBones(child);
                    }
                };

                const initialSpawn = new Vector3(0, 1, 0)

                traverseAndMapBones(this.mesh);
                this.rigidBody = new StiffBody(this.world, this.scene, this.loader, this, initialSpawn);
                // this.ragdoll = new Ragdoll(world, scene, loader, this);
            },


            // called while loading is progressing
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            function (error) {
                console.log('An error happened:', error);
            }
        );
    }

    public ownsRigidBody(body: RAPIER.RigidBody | null): boolean {
    // Given a rigid body, returns true if the given body is the body of this class.
        if (!body) return false;
        if (this.stiffBodyCreated && this.rigidBody) {
            return this.rigidBody.ownsRigidBody(body);
        }
        else if (this.ragdollCreated && this.ragdoll) {
            return this.ragdoll.ownsRigidBody(body);
        }
        return false;
    }

    private getBonePositions(body: StiffBody | Ragdoll){
    // Define the dictionary with RagdollParts keys and [Vector3, Quaternion] values
        const bonePositioning: Record<RagdollParts, [Vector3, Quaternion]> = {} as Record<RagdollParts, [Vector3, Quaternion]>; 

        if (body) { 
            for (const part of Object.keys(Ragdoll.boneMapping) as RagdollParts[]) { 
                const bodyPart = body[part]; 
                if (bodyPart) { 
                // Assign the tuple directly to the part key
                bonePositioning[part] = [
                    new Vector3(
                    bodyPart.translation().x, 
                    bodyPart.translation().y, 
                    bodyPart.translation().z
                    ),
                    new Quaternion(
                    bodyPart.rotation().x, 
                    bodyPart.rotation().y, 
                    bodyPart.rotation().z, 
                    bodyPart.rotation().w
                    )
                ];
                } 
            } 
            return bonePositioning; 
        }
    }

    public getRagdollBones(){
    // Given that the current state of the character is a ragdoll. returns the current state
    // (position and rotation) of its bones. 
        if(this.ragdollCreated){
            return this.getBonePositions(this.ragdoll);
        }
    }

    public getStiffBones(){
    // Given that the current state of the character is stiff body. returns the current state
    // (position and rotation) of its bones. 
        if(this.stiffBodyCreated){
            return this.getBonePositions(this.rigidBody);
        }
    }

    public switchToRagdoll() {
    // Switches the body of the character from stiff body to ragdoll. 
        if (this.mesh && !this.ragdollCreated) {
            const initialSpawn = this.rigidBody.position
            this.ragdoll = new Ragdoll(this.world, this.scene, this.loader, this, initialSpawn);
            this.ragdollCreated = true;
            this.removeBody(this.rigidBody);
            this.rigidBody = null as any;
            this.stiffBodyCreated = false;
            }
    }

    public switchToStiffBody() {
    // Switches the body of the character from ragdoll to stiff body. 
        if (this.mesh && !this.stiffBodyCreated) {
            const initialSpawn = this.ragdoll.position
            this.rigidBody = new StiffBody(this.world, this.scene, this.loader, this, initialSpawn);
            this.stiffBodyCreated = true;
            this.removeBody(this.ragdoll)
            this.ragdoll = null as any;
            this.ragdollCreated = false;
        }
    }

    public inMotion(body: Ragdoll): boolean {
    // Returns true if the character body is in motion.
        for (const key of Object.keys(Character.boneMapping) as RagdollParts[]) {
            if (body[key].isMoving()) return true;
        }
        return false;
    }

    public removeBody(body: StiffBody | Ragdoll) {
    // Given either a stiff body or ragdoll, removes its bones and joints
    // from the scene completely. 
        for (const part of Object.keys(Character.boneMapping) as RagdollParts[]) {
            const bodyPart = body[part];
            this.world.removeRigidBody(bodyPart);
        }
    }
}