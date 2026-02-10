/**
 * Input Abstraction Layer
 * Maps raw keyboard input to game actions.
 * Supports WASD, Arrow Keys, and Space.
 */
export class InputManager {
  constructor() {
    this.actions = {
      moveLeft: false,
      moveRight: false,
      moveForward: false,
      moveBackward: false,
      jump: false,
    };

    this._jumpPressed = false;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  }

  _mapKey(code) {
    switch (code) {
      case "KeyA":
      case "ArrowLeft":
        return "moveLeft";
      case "KeyD":
      case "ArrowRight":
        return "moveRight";
      case "KeyW":
      case "ArrowUp":
        return "moveForward";
      case "KeyS":
      case "ArrowDown":
        return "moveBackward";
      case "Space":
        return "jump";
      default:
        return null;
    }
  }

  _onKeyDown(e) {
    const action = this._mapKey(e.code);
    if (action) {
      e.preventDefault();
      if (action === "jump") {
        if (!this._jumpPressed) {
          this.actions.jump = true;
          this._jumpPressed = true;
        }
      } else {
        this.actions[action] = true;
      }
    }
  }

  _onKeyUp(e) {
    const action = this._mapKey(e.code);
    if (action) {
      e.preventDefault();
      if (action === "jump") {
        this._jumpPressed = false;
      } else {
        this.actions[action] = false;
      }
    }
  }

  consumeJump() {
    if (this.actions.jump) {
      this.actions.jump = false;
      return true;
    }
    return false;
  }

  destroy() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
  }
}
