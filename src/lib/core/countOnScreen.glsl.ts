import { shader } from "./shader";

export const countOnScreen = shader(`
uniform sampler2D vertexData;
uniform ivec2 vertexDataSize;

uniform mat4 projectionMatrix;
uniform mat4 _viewMatrix;

uniform vec2 screenResolution;
uniform float size;

out vec4 color;

void main() {
  mat4 m = projectionMatrix * _viewMatrix;

  vec4 vertex = texture(vertexData, indexUv(gl_VertexID, vertexDataSize));

  vec4 position = m * vec4(vertex.xy, 0, 1);

  vec2 screenPixel = position.xy * screenResolution;
  vec2 closestInside = clamp(screenPixel, -screenResolution, screenResolution);

  float dist = length(screenPixel - closestInside);

  if(dist < size) {
    writeIndexDepth(0, vec4(1, 0, 0, 0), 1.0);
  } else {
    Discard();
  }
}

`);