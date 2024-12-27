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
flat varying int vDontDiscard;

uniform ivec2 outputSize;

void writeUv(vec2 position, vec4 color) {
  gl_Position = vec4(position * 2.0 - vec2(1), -1, 1);
  gl_PointSize = 1.0;
  writeColor = color;
  vDontDiscard = 1;
}

vec2 indexUv(int index, ivec2 size) {
  return (vec2(0.5) + vec2(index % size.x, index / size.y)) / vec2(size);
}

void writeIndex(int index, vec4 color) {
  writeUv(indexUv(index, outputSize), color);
}

void writeUvDepth(vec2 position, vec4 color, float depth) {
  gl_Position = vec4(position * 2.0 - vec2(1), depth, 1);
  gl_PointSize = 1.0;
  writeColor = color;
  vDontDiscard = 1;
}


void writeIndexDepth(int index, vec4 color, float depth) {
  writeUvDepth(indexUv(index, outputSize), color, depth);
}

void Discard() {
  vDontDiscard = 0;
}
`;

export const specialComputeFragment = `
varying vec4 writeColor;
flat varying int vDontDiscard;

void main() {
  if(vDontDiscard == 0) discard;
  gl_FragColor = writeColor;
}
`;
