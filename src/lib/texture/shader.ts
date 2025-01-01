function allowBinaryRepresentations(code: string) {
  // replace 0b0101010 with the equivalent decimal number
  return code.replace(/0b([01]+)/g, (_, binary) => parseInt(binary, 2).toString());
}

export function shader(code: string) {
  return allowBinaryRepresentations(code);
}