import { getInt32Fix, getUint32Fix, setInt32Fix, setUint32Fix } from "./polyfill.glsl";

const buffer = new ArrayBuffer(4);
const floatBuffer = new Float32Array(buffer);
const uintBuffer = new Uint32Array(buffer);
const intBuffer = new Int32Array(buffer);

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

export function floatBitsToInt(floatNumber: number) {
  if (typeof floatNumber !== "number")
    throw new Error(`A float number is expected, got ${floatNumber}`);

  floatBuffer[0] = floatNumber;
  return getInt32Fix(uintBuffer[0]);
}

export function intBitsToFloat(uintNumber: number) {
  if (typeof uintNumber !== "number")
    throw new Error(`A int number is expected, got ${uintNumber}`);

  uintBuffer[0] = setInt32Fix(uintNumber);
  return floatBuffer[0];
}


export function intBitsToUint(uintNumber: number) {
  if (typeof uintNumber !== "number")
    throw new Error(`A int number is expected, got ${uintNumber}`);

  intBuffer[0] = setInt32Fix(uintNumber);
  return uintBuffer[0];
}

export function uintBitsToInt(uintNumber: number) {
  if (typeof uintNumber !== "number")
    throw new Error(`A uint number is expected, got ${uintNumber}`);

  uintBuffer[0] = uintNumber;
  return getInt32Fix(intBuffer[0]);
}