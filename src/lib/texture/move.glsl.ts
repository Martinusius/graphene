import { shader } from "./shader";

export const move = shader(`
uniform sampler2D vertexData;
uniform sampler2D velocities;

uniform float deltaTime;

out vec4 color;

void main() {
  vec2 uv = gl_FragCoord.xy / vec2(outputSize);

  vec4 vertex = texture(vertexData, uv);
  vec2 velocity = texture(velocities, uv).xy;

  vertex.xy += velocity * deltaTime;

  color = vertex;
}
`);