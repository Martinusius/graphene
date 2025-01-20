import { PIXEL_RADIUS } from "./pixels";
import { shader } from "./shader";

export const vertexVertex = shader(`
uniform vec2 resolution;
uniform sampler2D vertexData;

uniform int bufferSize;

uniform float size;
uniform bool raycast;

varying vec3 vPosition;
flat varying int vIndex;
flat varying uint vSelection;

vec2 getUv() {
  vec2 uv = vec2(gl_VertexID % bufferSize, gl_VertexID / bufferSize);
  return (uv + 0.5) / float(bufferSize);
}

void main() {
  mat4 m = projectionMatrix * viewMatrix;

  vec2 uv = getUv();

  vec4 vertex = texture(vertexData, uv);

  vec2 tPosition = vertex.xy;
  vSelection = floatBitsToUint(vertex.z);

  vec4 result = m * vec4(tPosition.xy, 1, 1);

  gl_PointSize = size;

  vPosition = result.xyz;
  vIndex = gl_VertexID;

  gl_Position = result;
}`);

export const vertexFragment = shader(`
uniform float size;
uniform bool raycast;

flat varying int vIndex;
flat varying uint vSelection;

void main() {
  vec2 uv = 2.0 * vec2(gl_PointCoord) - 1.0;
  float smoothFactor = max(size / 5.0, 2.0);

  float alpha = smoothstep(1.0, 0.0, clamp(length(uv) * smoothFactor - smoothFactor + 1.0, 0.0, 1.0));
  float white = smoothstep(1.0, 0.0, clamp(length(uv) * 1.2 * smoothFactor - smoothFactor + 1.0, 0.0, 1.0));

  if(alpha < 0.2) discard;
  
  if(raycast) {
    gl_FragColor = vec4(0, vIndex + 1, 0, 1);
    return;
  }

  vec3 selectionColor = vec3(0, 0.5, 1);

  // if(bool(vSelection & 0b1000u)) selectionColor.gb = selectionColor.bg;

  vec3 colorFill = mix(vec3(0.9), selectionColor, float(vSelection & 1u));

  vec3 color = mix(vec3(white) * colorFill, vec3(1), float((vSelection & 0b100u) >> 2) * 0.4);

  gl_FragColor = vec4(color, alpha);
}`);
