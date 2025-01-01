// regular compute program

export const computeVertex = `
in vec3 position;
void main() {
  gl_Position = vec4(position.xy, 0, 1);
}`;

export const computeFragment = `
precision highp float;
precision highp int;

// precision highp sampler2D;
// precision highp isampler2D;
// precision highp usampler2D;

uniform ivec2 outputSize;

vec2 indexUv(int index, ivec2 size) {
  return (vec2(0.5) + vec2(index % size.x, index / size.y)) / vec2(size);
}

vec2 indexUv(uint index, uvec2 size) {
  return (vec2(0.5) + vec2(index % size.x, index / size.y)) / vec2(size);
}
`;

// special compute program
export const specialComputeVertex = `
precision highp float;
precision highp int;

// precision highp sampler2D;
// precision highp isampler2D;
// precision highp usampler2D;

flat out vec4 writeColor;
flat out int vDontDiscard;

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

vec2 indexUv(uint index, uvec2 size) {
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
precision highp float;
precision highp int;

// precision highp sampler2D;
// precision highp isampler2D;
// precision highp usampler2D;

flat in vec4 writeColor;
flat in int vDontDiscard;

out vec4 color;

void main() {
  if(vDontDiscard == 0) discard;
  color = writeColor;
}
`;
