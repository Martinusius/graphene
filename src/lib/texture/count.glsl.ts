export const count = `
uniform buffer flagData;

uniform int id;

out vec4 color;

void main() {
  vec4 data = ReadBuffer(flagData, instanceId);
  uint value = floatBitsToUint(data.z);

  uint set = (value >> id) & 1u;
  
  WriteOutput(0, vec4(float(set), 0, 0, 0));
}`;
