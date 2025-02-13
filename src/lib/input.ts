const mouseButtons: Record<number, boolean> = {};

window.addEventListener('mousedown', (event) => {
  mouseButtons[event.button] = true;
}, { capture: true });

window.addEventListener('mouseup', (event) => {
  mouseButtons[event.button] = false;
}, { capture: true });

export const LEFT_MOUSE_BUTTON = 0;
export const RIGHT_MOUSE_BUTTON = 2;
export const MIDDLE_MOUSE_BUTTON = 1;

export function isMousePressed(button: number = 0) {
  return mouseButtons[button];
}


const keys: Record<string, boolean> = {};

window.addEventListener('keydown', (event) => {
  keys[event.key] = true;
}, { capture: true });

window.addEventListener('keyup', (event) => {
  keys[event.key] = false;
}, { capture: true });

export function isKeyPressed(key: string) {
  return keys[key];
}

const mouse = { x: 0, y: 0 };
window.addEventListener('mousemove', (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
});

export function getMousePosition() {
  return { ...mouse };
}
