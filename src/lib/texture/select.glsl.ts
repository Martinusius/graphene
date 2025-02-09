import { shader } from "./shader";

export const select = shader(`
uniform buffer vertexData;

uniform vec2 min;
uniform vec2 max;

uniform mat4 projectionMatrix;
uniform mat4 _viewMatrix;

uniform vec2 screenResolution;
uniform float size;

uniform bool select;
uniform bool preview;

// out vec4 color;

void main() {
  mat4 m = projectionMatrix * _viewMatrix;
  
  // vec2 uv = gl_FragCoord.xy / vec2(outputSize);

  vec4 vertex = ReadBuffer(vertexData, instanceId); //texture(vertexData, uv);

  uint valid = floatBitsToUint(vertex.w);
  if(valid == 0u) {
    Discard();
    return;
  }

  vec4 position = m * vec4(vertex.xy, 0, 1);

  vec2 screenPixel = position.xy * screenResolution;
  vec2 closestInside = clamp(screenPixel, min * screenResolution, max * screenResolution);


  float dist = length(screenPixel - closestInside);

  uint previous = floatBitsToUint(vertex.z);
  uint new = previous & ~0b11u;

  if(dist < size) {
    new |= uint(select);
    new |= preview ? (previous & 0b10u) : uint(select) << 1;
  } else {
    new |= previous & 0b10u;
    new |= (previous & 0b10u) >> 1;
  }

  // color = vec4(vertex.xy, uintBitsToFloat(new), 0);
  WriteOutput(instanceId, vec4(vertex.xy, uintBitsToFloat(new), vertex.w));
}`);
