export const hover = `
uniform sampler2D selection;
uniform ivec2 outputSize;

uniform int id;
uniform bool hover;

void main() {
  vec4 value = texture2D(selection, gl_FragCoord.xy / vec2(outputSize));

  int fragId = int(gl_FragCoord.x) + int(gl_FragCoord.y) * outputSize.x;

  value.b = mix(0.0, float(hover), float(fragId == id));

  gl_FragColor = value;
}`;
