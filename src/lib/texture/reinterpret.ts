import { getUint32Fix, setUint32Fix } from "./polyfill.glsl";

const buffer = new ArrayBuffer(4);
const floatBuffer = new Float32Array(buffer);
const uintBuffer = new Uint32Array(buffer);

export function floatBitsToUint(floatNumber: number) {
  if (typeof floatNumber !== "number")
    throw new Error(`A float number is expected, got ${floatNumber}`);

  floatBuffer[0] = floatNumber;
  return getUint32Fix(uintBuffer[0]);
}

export function uintBitsToFloat(uintNumber: number) {
  if (typeof uintNumber !== "number")
    throw new Error(`A uint number is expected, got ${uintNumber}`);

  uintBuffer[0] = setUint32Fix(uintNumber);
  return floatBuffer[0];
}

export function uint(value: number) {
  uintBuffer[0] = value;
  return uintBuffer[0];
}
