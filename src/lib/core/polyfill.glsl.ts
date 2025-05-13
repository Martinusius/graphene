// Weird WebGL float bug. Cannot properly read uint encoded as floats.

const enabled = true;
const bit = 26;

const offset = 2**bit;

const intMax = 2**31 - offset;
const intMin = -(2**31) + offset;

export const INT_NULL = intMax - 1;
export const INT_POSITIVE_INFINITY = intMax - 2;
export const INT_NEGATIVE_INFINITY = intMin + 1;

const polyfill = `
  uint floatBitsToUint_fixed(float value) {
    return uint(floatBitsToInt(value) - (1 << ${bit}));
  }

  float uintBitsToFloat_fixed(uint value) {
    return intBitsToFloat(int(value + (1u << ${bit})));
  }

  int floatBitsToInt_fixed(float value) {
    return floatBitsToInt(value) - (1 << ${bit});
  }

  float intBitsToFloat_fixed(int value) {
    return intBitsToFloat(value + (1 << ${bit}));
  }
`;

export function fixFloatUintBug(value: string) {
  if (!enabled) return value;

  value = value.replace(/\bfloatBitsToUint\b/g, "floatBitsToUint_fixed");
  value = value.replace(/\bfloatBitsToInt\b/g, "floatBitsToInt_fixed");
  value = value.replace(/\buintBitsToFloat\b/g, "uintBitsToFloat_fixed");
  value = value.replace(/\bintBitsToFloat\b/g, "intBitsToFloat_fixed");

  return polyfill + value;
}

export function getUint32Fix(value: number) {
  return getInt32Fix(value);
}

export function setUint32Fix(value: number) {
  return setInt32Fix(value);
}

export function getInt32Fix(value: number) {
  if (!enabled) return value;
  return value - offset;
}

export function setInt32Fix(value: number) {
  if (!enabled) return value;
  
  if (value === INT_NULL || value === INT_POSITIVE_INFINITY || value === INT_NEGATIVE_INFINITY) {
    return value + offset;
  }
  
  if (value < intMin) value = intMax + (value - intMin);
  if (value >= intMax) value = intMin + (value - intMax);
  return value + offset;
}

export function isSpecialIntValue(value: number): boolean {
  return value === INT_NULL || value === INT_POSITIVE_INFINITY || value === INT_NEGATIVE_INFINITY;
}
