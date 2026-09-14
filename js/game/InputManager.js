// InputManager.js (Fase 2)
// Unifica teclado (WASD/setas, Shift, E, Space) e joystick virtual mobile
// numa única interface: getMoveVector(), isRunning(), consumeInteract(),
// consumeAction(). Os controllers de gameplay não sabem se o input veio
// do teclado ou do dedo na tela.

export class InputManager {
  constructor({ mobileRoot }) {
    this.keys = new Set();
    this._interactQueued = false;
    this._actionQueued = false;
    this.joystick = { active: false, dx: 0, dy: 0 };

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      if (e.key.toLowerCase() === 'e') this._interactQueued = true;
      if (e.code === 'Space') this._actionQueued = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));

    if (this._isTouchDevice()) this._buildVirtualJoystick(mobileRoot);
  }

  _isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  _buildVirtualJoystick(root) {
    root.innerHTML += `
      <div id="mobile-controls">
        <div id="joystick-base"><div id="joystick-knob"></div></div>
        <div id="mobile-actions">
          <button id="btn-run" class="mobile-btn">RUN</button>
          <button id="btn-interact" class="mobile-btn">E</button>
          <button id="btn-spray" class="mobile-btn primary">SPRAY</button>
        </div>
      </div>
    `;
    const base = root.querySelector('#joystick-base');
    const knob = root.querySelector('#joystick-knob');
    const maxRadius = 42;
    let originX = 0, originY = 0, touchId = null;

    const start = (x, y, id) => {
      touchId = id;
      originX = x; originY = y;
      this.joystick.active = true;
    };
    const move = (x, y) => {
      let dx = x - originX, dy = y - originY;
      const dist = Math.min(Math.hypot(dx, dy), maxRadius);
      const ang = Math.atan2(dy, dx);
      dx = Math.cos(ang) * dist; dy = Math.sin(ang) * dist;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joystick.dx = dx / maxRadius;
      this.joystick.dy = dy / maxRadius;
    };
    const end = () => {
      touchId = null;
      this.joystick.active = false;
      this.joystick.dx = 0; this.joystick.dy = 0;
      knob.style.transform = `translate(0,0)`;
    };

    base.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      start(t.clientX, t.clientY, t.identifier);
    });
    window.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) if (t.identifier === touchId) move(t.clientX, t.clientY);
    });
    window.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) if (t.identifier === touchId) end();
    });

    root.querySelector('#btn-run').addEventListener('touchstart', () => this.keys.add('shift'));
    root.querySelector('#btn-run').addEventListener('touchend', () => this.keys.delete('shift'));
    root.querySelector('#btn-interact').addEventListener('touchstart', () => (this._interactQueued = true));
    root.querySelector('#btn-spray').addEventListener('touchstart', () => (this._actionQueued = true));
  }

  /** Retorna {x,z} normalizado (-1..1) combinando teclado + joystick. */
  getMoveVector() {
    let x = 0, z = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) z -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) z += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;

    if (this.joystick.active) {
      x += this.joystick.dx;
      z += this.joystick.dy;
    }

    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    return { x, z };
  }

  isRunning() {
    return this.keys.has('shift');
  }

  consumeInteract() {
    const v = this._interactQueued;
    this._interactQueued = false;
    return v;
  }

  consumeAction() {
    const v = this._actionQueued;
    this._actionQueued = false;
    return v;
  }
}
