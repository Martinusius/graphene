// regular compute program

export const computeVertex = `
void main() {
  gl_Position = vec4(position.xy, 0, 1);
}`;

export const computeFragment = `
uniform ivec2 outputSize;
`;

// special compute program
export const specialComputeVertex = `
varying vec4 writeColor;
uniform ivec2 outputSize;

void writeUv(vec2 position, vec4 color) {
  gl_Position = vec4(position.xy * 2.0 - vec2(1), -1, 1);
  gl_PointSize = 1.0;
  writeColor = color;
}

vec2 indexUv(int index, ivec2 size) {
  vec2 o = vec2(0.5) / vec2(size);
  return vec2(index % size.x, index / size.y) / vec2(size) + o;
}

void writeIndex(int index, vec4 color) {
  writeUv(indexUv(index, outputSize), color);
}
`;

export const specialComputeFragment = `
varying vec4 writeColor;

void main() {
  if(writeColor == vec4(0)) discard;
  gl_FragColor = writeColor;
}
`;
