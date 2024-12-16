// regular compute program

export const computeVertex = `
void main() {
  gl_Position = vec4(position.xy, 0, 1);
}`;

// special compute program
export const specialComputeVertex = `
varying vec4 writeColor;

void write(vec2 position, vec4 color) {
  gl_Position = vec4(position.xy * 2.0 - vec2(1), -1, 1);
  gl_PointSize = 1.0;
  writeColor = color;
}
`;

export const specialComputeFragment = `
varying vec4 writeColor;

void main() {
  gl_FragColor = vec4(1);
}
`;
