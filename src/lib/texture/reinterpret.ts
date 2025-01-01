const buffer = new ArrayBuffer(4);
const floatBuffer = new Float32Array(buffer);
const uintBuffer = new Uint32Array(buffer);

export function floatBitsToUint(floatNumber: number) {
  if (typeof floatNumber !== "number")
    throw new Error("A float number is expected.");

  floatBuffer[0] = floatNumber;
  return uintBuffer[0];
}

export function uintBitsToFloat(uintNumber: number) {
  if (typeof uintNumber !== "number")
    throw new Error("A uint number is expected.");

  uintBuffer[0] = uintNumber;
  return floatBuffer[0];
}