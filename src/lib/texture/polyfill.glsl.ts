// Weird WebGL float bug. Cannot properly read uint encoded as floats. Fix: Add 2**30 while encoding and subtract it while decoding.

const enabled = true;

const polyfill = `
  uint floatBitsToUint_fixed(float value) {
    return floatBitsToUint(value) - (1u << 30);
  }

  float uintBitsToFloat_fixed(uint value) {
    return uintBitsToFloat(value + (1u << 30));
  }
`;

export function fixFloatUintBug(value: string) {
  if (!enabled) return value;

  value = value.replace(/floatBitsToUint/g, "floatBitsToUint_fixed");
  value = value.replace(/uintBitsToFloat/g, "uintBitsToFloat_fixed");
  return polyfill + value;
}

export function getUint32Fix(value: number) {
  if (!enabled) return value;
  return value - (1 << 30);
}

export function setUint32Fix(value: number) {
  if (!enabled) return value;
  return value + (1 << 30);
}
