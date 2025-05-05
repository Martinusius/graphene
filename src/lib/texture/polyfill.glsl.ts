// Weird WebGL float bug. Cannot properly read uint encoded as floats. Fix: Add 2**30 while encoding and subtract it while decoding.

const enabled = true;
const bit = 26;

const offset = 2**bit;

const intLimit = 2**31 - offset;
const intMin = -(2**31) + offset;

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
  if (value < intMin) value = intLimit + (value - intMin);
  if (value >= intLimit) value = intMin + (value - intLimit);
  return value + offset;
}
