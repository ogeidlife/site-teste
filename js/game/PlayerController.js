// PlayerController.js (Fase 2)
// Move o player a partir do InputManager, aplica aceleração/velocidade/corrida
// vindos do project.json (nada hardcoded), gira o modelo na direção do
// movimento e troca a animação (Idle/Walk/Run) quando o GLB tiver os clipes.
// Colisão: Fase 2 usa checagem simples de caixa contra objetos marcados
// collision=true (ver CollisionSystem.js) — física completa não é o objetivo.

import * as THREE from 'three';

export class PlayerController {
  constructor({ object3D, mixer, clips, config, input, collisionSystem }) {
    this.object3D = object3D;
    this.mixer = mixer;
    this.clips = clips || [];
    this.config = config; // player config do project.json
    this.input = input;
    this.collisionSystem = collisionSystem;

    this.velocity = new THREE.Vector3();
    this.actions = {};
    this.currentAction = null;

    if (mixer && clips?.length) {
      const findClip = (name) => clips.find((c) => c.name?.toLowerCase() === name?.toLowerCase());
      for (const key of ['idle', 'walk', 'run', 'spray']) {
        const clipName = config.animations?.[key];
        const clip = clipName && findClip(clipName);
        if (clip) this.actions[key] = mixer.clipAction(clip);
      }
      this._play('idle');
    }
  }

  _play(name) {
    const next = this.actions[name];
    if (!next || this.currentAction === next) return;
    if (this.currentAction) this.currentAction.fadeOut(0.2);
    next.reset().fadeIn(0.2).play();
    this.currentAction = next;
  }

  update(dt) {
    const move = this.input.getMoveVector();
    const running = this.input.isRunning();
    const targetSpeed = running ? this.config.runSpeed : this.config.speed;

    const moveDir = new THREE.Vector3(move.x, 0, move.z);
    const targetVel = moveDir.multiplyScalar(targetSpeed);

    // aceleração suave em vez de start/stop instantâneo
    this.velocity.lerp(targetVel, Math.min(1, (this.config.acceleration || 10) * dt));

    if (this.velocity.lengthSq() > 0.0001) {
      const proposed = this.object3D.position.clone().addScaledVector(this.velocity, dt);
      const allowed = this.collisionSystem ? this.collisionSystem.resolve(this.object3D.position, proposed) : proposed;
      this.object3D.position.copy(allowed);

      const targetAngle = Math.atan2(this.velocity.x, this.velocity.z);
      const currentAngle = this.object3D.rotation.y;
      const rotSpeed = (this.config.rotationSpeed || 10) * dt;
      this.object3D.rotation.y = THREE.MathUtils.lerp(
        currentAngle,
        currentAngle + THREE.MathUtils.euclideanModulo(targetAngle - currentAngle + Math.PI, Math.PI * 2) - Math.PI,
        Math.min(1, rotSpeed)
      );

      this._play(running ? 'run' : 'walk');
    } else {
      this._play('idle');
    }

    this.mixer?.update(dt);
  }
}
