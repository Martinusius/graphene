export const flag = `
uniform sampler2D selection;

uniform int id;
uniform bool set;
uniform bool unsetOther;
uniform int channel;

void main() {
  vec4 value = texture2D(selection, gl_FragCoord.xy / vec2(outputSize));

  int fragId = int(gl_FragCoord.x) + int(gl_FragCoord.y) * outputSize.x;

  value[channel] = mix(mix(value[channel], 0.0, unsetOther), float(set), float(fragId == id));

  gl_FragColor = value;
}`;
