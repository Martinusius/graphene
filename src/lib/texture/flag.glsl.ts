export const flag = `
uniform sampler2D flagData;

uniform int id;
uniform bool set;
uniform bool unsetOther;
uniform int channel;

out vec4 color;

void main() {
  vec4 data = texture(flagData, gl_FragCoord.xy / vec2(outputSize));
  uint value = floatBitsToUint(data.z);

  int fragId = int(gl_FragCoord.x) + int(gl_FragCoord.y) * outputSize.x;
  
  if(fragId == id) {
    value = value & ~(1u << channel) | uint(set) << channel;
  }
  else if(unsetOther) {
    value = value & ~(1u << channel);
  }

  // value[channel] = uint(mix(mix(value[channel], 0.0, unsetOther), float(set), float(fragId == id)));

  color = vec4(data.xy, uintBitsToFloat(value), 0);  
}`;
