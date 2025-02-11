import { shader } from "./shader";

export const move = shader(`
uniform buffer vertexData;
uniform buffer velocities;

uniform float deltaTime;

out vec4 color;

void main() {
  // vec2 uv = gl_FragCoord.xy / vec2(outputSize);

  vec4 vertex = ReadBuffer(vertexData, instanceId); // texture(vertexData, uv);
  vec2 velocity =  ReadBuffer(velocities, instanceId).xy; // texture(velocities, uv).xy;

  float speed = min(50.0, length(velocity));

  if(speed > 0.001)
    vertex.xy += normalize(velocity) * speed * deltaTime;

  WriteOutput(instanceId, vertex);
  //color = vertex;
}
`);