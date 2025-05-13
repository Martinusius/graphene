import { shader } from "./shader";

export const move = shader(`
uniform buffer vertexData;
uniform buffer velocities;

uniform float deltaTime;

out vec4 color;

void main() {
  vec4 vertex = ReadBuffer(vertexData, instanceId);
  vec2 velocity =  ReadBuffer(velocities, instanceId).xy;

  float speed = min(50.0, length(velocity));

  if(speed > 0.001)
    vertex.xy += normalize(velocity) * speed * deltaTime;

  WriteOutput(instanceId, vertex);
}
`);