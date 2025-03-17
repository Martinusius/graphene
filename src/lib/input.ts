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

export function onKeybind(keybind: string, callback: (event: KeyboardEvent) => void) {
  const keys = keybind.replace(/\s/g, '').toLowerCase().split('+').reverse();

  const specialKeys = ['ctrl', 'shift', 'alt', 'meta'];

  const special = keys.filter(key => specialKeys.includes(key));
  const notSpecial = keys.filter(key => !specialKeys.includes(key));

  if (notSpecial.length === 0) {
    throw new Error('No key specified');
  }

  if (notSpecial.length > 1) {
    throw new Error('Only one regular key can be specified (you can use Ctrl, Shift, Alt and Meta as well)');
  }


  window.addEventListener('keydown', (event) => {
    const pressedSpecialKeys = specialKeys.filter(key => event[key + 'Key' as 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey']);

    if (pressedSpecialKeys.sort().join(' ') !== special.sort().join(' ')) return;
    if (notSpecial[0] !== event.key.toLowerCase()) return;

    callback(event);
  });
}
