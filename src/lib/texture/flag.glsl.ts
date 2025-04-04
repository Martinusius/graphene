export const flag = `
uniform buffer flagData;

uniform int id;
uniform bool set;
uniform bool unsetOther;
uniform int channel;


void main() {
  vec4 data = ReadBuffer(flagData, instanceId); //texture(flagData, gl_FragCoord.xy / vec2(outputSize));
  uint value = floatBitsToUint(data.z);
  
  if(instanceId == id) {
    value = value & ~(1u << channel) | uint(set) << channel;
  }
  else if(unsetOther) {
    value = value & ~(1u << channel);
  }

  WriteOutput(instanceId, vec4(data.xy, uintBitsToFloat(value), data.w));
}`;
