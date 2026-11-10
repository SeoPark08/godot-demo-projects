import RAPIER, { World } from "@dimforge/rapier3d-compat";
import { Group, Mesh, MeshNormalMaterial, MeshStandardMaterial, Object3D, Object3DEventMap, Quaternion, Scene, Vector3 } from "three";
import { DebugEnvironment, GLTFLoader } from "three/examples/jsm/Addons.js";
import { Ragdoll } from "./Ragdoll";
import { Character } from "./Character";

type RagdollParts = 'head' | 'torso' | 'armUpperRight' | 'armLowerRight' | 'armUpperLeft' | 'armLowerLeft' | 'thighRight' | 'shinRight' | 'thighLeft' | 'shinLeft';

export class StiffBody extends Object3D {
    world: World;
    scene: Scene;
    loader: GLTFLoader;
    ragdoll!: Ragdoll;


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

    public static readonly boneMapping = {
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
    // public ragdoll: Ragdoll = new Ragdoll(new World({ x: 0, y: 0, z: 0 }), new Scene(), new GLTFLoader(), this); 
    
    constructor(world: World, scene: Scene, loader: GLTFLoader, char: Character, initialSpawn: Vector3) {
        super()
        this.mesh = char.mesh
        // if (this.mesh) {scene.add(this.mesh)}
        this.initialBoneWorldQuaternions = char.initialBoneWorldQuaternions
        this.world = world
        this.scene = scene
        this.loader = loader
        this.createCharacter(initialSpawn, char)
    }

    private createCharacter(initialSpawn: Vector3, char: Character) {
    
        // Adjust this to make it more flexible
        const stiffness = 0.03
        const density = 0.16

        //Taken from blender bone lengths
        const torsoWidth = 0.4
        const thighLength = .38 - (stiffness * 2) // Remove the extra length added from the stiffness gap
        const shinLength = .43 - (stiffness * 2)
        const upperArmLength = .3 - (stiffness * 2)
        const lowerArmLength = .42 - (stiffness * 2)

        // const initialSpawn = new Vector3(0, 10, 0)

        const torsoDesc = RAPIER.ColliderDesc.cuboid(torsoWidth / 2, StiffBody.torsoHeight / 2, 0.1);
        const torsoBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(...initialSpawn.toArray())
        this.torso = this.world.createRigidBody(torsoBodyDesc);
        this.world.createCollider(torsoDesc, this.torso);

        const headSize = 0.2;
        const headDesc = RAPIER.ColliderDesc.cuboid(headSize / 2, headSize / 2, headSize / 2);
        const headBodyDesc = RAPIER.RigidBodyDesc
            .kinematicPositionBased()
            .setTranslation(0, this.torso.translation().y + headSize / 2 + StiffBody.torsoHeight / 2 + stiffness, 0)
        this.head = this.world.createRigidBody(headBodyDesc);
        this.world.createCollider(headDesc, this.head).setDensity(density)

        const armThickness = 0.15

        const armUpperRDesc = RAPIER.ColliderDesc.cuboid(upperArmLength / 2, armThickness / 2, armThickness / 2);
        const armUpperRBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(torsoWidth + stiffness, this.torso.translation().y + 0.1, 0);
        this.armUpperRight = this.world.createRigidBody(armUpperRBodyDesc);
        this.world.createCollider(armUpperRDesc, this.armUpperRight).setDensity(density)

        const armLowerRDesc = RAPIER.ColliderDesc.cuboid(lowerArmLength / 2, armThickness / 2, armThickness / 2);
        const armLowerRBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(torsoWidth + lowerArmLength + stiffness * 2, this.torso.translation().y + 0.1, 0)
        this.armLowerRight = this.world.createRigidBody(armLowerRBodyDesc);
        this.world.createCollider(armLowerRDesc, this.armLowerRight).setDensity(density)

        const armUpperLDesc = RAPIER.ColliderDesc.cuboid(upperArmLength / 2, armThickness / 2, armThickness / 2);
        const armUpperLBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(-torsoWidth - stiffness, this.torso.translation().y + 0.1, 0)
        this.armUpperLeft = this.world.createRigidBody(armUpperLBodyDesc);
        this.world.createCollider(armUpperLDesc, this.armUpperLeft).setDensity(density)

        const armLowerLDesc = RAPIER.ColliderDesc.cuboid(lowerArmLength / 2, armThickness / 2, armThickness / 2);
        const armLowerLBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(-torsoWidth - lowerArmLength - stiffness * 2, this.torso.translation().y + 0.1, 0)
        this.armLowerLeft = this.world.createRigidBody(armLowerLBodyDesc);
        this.world.createCollider(armLowerLDesc, this.armLowerLeft).setDensity(density)

        const legthickness = 0.18

        const legUpperRDesc = RAPIER.ColliderDesc.cuboid(legthickness / 2, thighLength /2, legthickness / 2)
        const legUpperRBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(torsoWidth / 2 - 0.1, torsoBodyDesc.translation.y - StiffBody.torsoHeight / 2 - thighLength / 2 - stiffness, 0)
        this.thighRight = this.world.createRigidBody(legUpperRBodyDesc)
        this.world.createCollider(legUpperRDesc, this.thighRight).setDensity(density)

        const legLowerRDesc = RAPIER.ColliderDesc.cuboid(legthickness / 2, shinLength / 2, legthickness / 2)
        const legLowerRBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(legUpperRBodyDesc.translation.x, legUpperRBodyDesc.translation.y - shinLength - stiffness, 0)
        this.shinRight = this.world.createRigidBody(legLowerRBodyDesc)
        this.world.createCollider(legLowerRDesc, this.shinRight).setDensity(density)

        const legUpperLDesc = RAPIER.ColliderDesc.cuboid(legthickness / 2, thighLength / 2, legthickness / 2)
        const legUpperLBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(-torsoWidth / 2 + 0.1, torsoBodyDesc.translation.y - StiffBody.torsoHeight / 2 - thighLength / 2 - stiffness, 0)
        this.thighLeft = this.world.createRigidBody(legUpperLBodyDesc)
        this.world.createCollider(legUpperLDesc, this.thighLeft).setDensity(density)

        const legLowerLDesc = RAPIER.ColliderDesc.cuboid(legthickness / 2, shinLength / 2, legthickness / 2)
        const legLowerLBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(legUpperLBodyDesc.translation.x, legUpperRBodyDesc.translation.y - shinLength - stiffness, 0)
        this.shinLeft = this.world.createRigidBody(legLowerLBodyDesc)
        this.world.createCollider(legLowerLDesc, this.shinLeft).setDensity(density)

        const localAnchorHead = { x: 0, y: -headSize / 2 - stiffness, z: 0 };
        const localAnchorNeck = { x: 0, y: StiffBody.torsoHeight / 2, z: 0 };

        const localAnchorRTorso = { x: (torsoWidth / 2) + stiffness, y: torsoWidth / 2, z: 0 };
        const localAnchorRArm = { x: -upperArmLength / 2, y: 0, z: 0 };

        const localAnchorRArmBottom = { x: (upperArmLength / 2) + stiffness, y: 0, z: 0.0 };
        const localAnchorRArmLower = { x: -lowerArmLength / 2, y: 0, z: 0 };

        const localAnchorLTorso = { x: -(torsoWidth / 2) - stiffness, y: torsoWidth / 2, z: 0 };
        const localAnchorLArm = { x: upperArmLength / 2, y: 0, z: 0 };

        const localAnchorLArmBottom = { x: -(upperArmLength / 2) - stiffness, y: 0, z: 0.0 };
        const localAnchorLArmLower = { x: lowerArmLength / 2, y: 0, z: 0 };

        const localAnchorRTorsoBottom = { x: (torsoWidth / 2) - legthickness / 2, y: -StiffBody.torsoHeight / 2 - stiffness, z: 0 };
        const localAnchorRLegUpper = { x: 0, y: thighLength / 2, z: 0 };

        const localAnchorLTorsoBottom = { x: -(torsoWidth / 2) + legthickness / 2, y: -StiffBody.torsoHeight / 2 - stiffness, z: 0 };
        const localAnchorLLegUpper = { x: 0, y: thighLength / 2, z: 0 };

        const localAnchorRLegUpperLower = { x: 0, y: -shinLength / 2 - stiffness, z: 0 };
        const localAnchorRLegLowerTop = { x: 0, y: shinLength / 2, z: 0 };

        const localAnchorLLegUpperLower = { x: 0, y: -shinLength / 2 - stiffness, z: 0 };
        const localAnchorLLegLowerTop = { x: 0, y: shinLength / 2, z: 0 };

        const createJoint = (anchor1: RAPIER.Vector, anchor2: RAPIER.Vector, parent1: RAPIER.RigidBody, parent2: RAPIER.RigidBody) => {
            const joint = RAPIER.JointData.spherical(anchor1, anchor2);
            this.world.createImpulseJoint(joint, parent1, parent2, true);
        }

        // For debuging you can disable this to freeze it and see joints in initial state
        // const enabled = true

        // for (const [key, _] of Object.entries(Ragdoll.boneMapping)) {
        //     this[key as RagdollParts].setEnabled(enabled)
        //     this[key as RagdollParts].lockTranslations(true, true);
        //     this[key as RagdollParts].lockRotations(true, true);
        // }

        if (char.ragdollCreated){
            const bonePositions = char.getRagdollBones()
            if(bonePositions){
                for (const part of Object.keys(Ragdoll.boneMapping) as RagdollParts[]) {
                    if(part in bonePositions){
                        const translation = bonePositions[part][0];
                        const rotation = bonePositions[part][1];

                        const body = this[part];
                        body.setTranslation(translation, true)
                        body.setRotation(rotation, true)
                    }
                }
            }
        }
        createJoint(localAnchorHead, localAnchorNeck, this.head, this.torso)                                // Neck Joint
        createJoint(localAnchorRTorso, localAnchorRArm, this.torso, this.armUpperRight)                     // Shoulder Joint Right
        createJoint(localAnchorRArmBottom, localAnchorRArmLower, this.armUpperRight, this.armLowerRight)    // Elbow Joint right
        createJoint(localAnchorLTorso, localAnchorLArm, this.torso, this.armUpperLeft)                      // Shoulder Joint Left
        createJoint(localAnchorLArmBottom, localAnchorLArmLower, this.armUpperLeft, this.armLowerLeft)      // Elbow joint left
        createJoint(localAnchorLTorsoBottom, localAnchorLLegUpper, this.torso, this.thighLeft)              // hip joint left
        createJoint(localAnchorRTorsoBottom, localAnchorRLegUpper, this.torso, this.thighRight)             // hip joint right
        createJoint(localAnchorRLegUpperLower, localAnchorRLegLowerTop, this.thighRight, this.shinRight)    // knee joint right
        createJoint(localAnchorLLegUpperLower, localAnchorLLegLowerTop, this.thighLeft, this.shinLeft)      // knee joint left
    }

    public ownsRigidBody(body: RAPIER.RigidBody | null): boolean {
        if (!body) return false;
        for (const key of Object.keys(StiffBody.boneMapping) as RagdollParts[]) {
            if (this[key]?.handle === body.handle) return true;
        }
        return false;
    }

    public findClosestBody(point: Vector3): RAPIER.RigidBody | null {
        if(!point) return null
        
        let closest: RAPIER.RigidBody | null = null;
        let minDist = Infinity;

        for (const part of Object.keys(StiffBody.boneMapping) as RagdollParts[]) {
            const body = this[part];
            const pos = body.translation();
            const dist = point.distanceTo(new Vector3(pos.x, pos.y, pos.z));

            if (dist < minDist) {
                minDist = dist;
                closest = body;
            }
        }

        return closest;
    }
}
