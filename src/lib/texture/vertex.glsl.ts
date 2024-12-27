import { PIXEL_RADIUS } from "./pixels";

export const vertexVertex = `
uniform vec2 resolution;
uniform sampler2D positions;
uniform sampler2D selection;

uniform int bufferSize;

uniform float size;
uniform bool raycast;

varying vec3 vPosition;
flat varying int vIndex;
varying vec4 vSelection;

vec2 getUv() {
  vec2 uv = vec2(gl_VertexID % bufferSize, gl_VertexID / bufferSize);
  return (uv + 0.5) / float(bufferSize);
}

void main() {
  mat4 m = projectionMatrix * viewMatrix;

  vec2 uv = getUv();

  vec3 tPosition = texture2D(positions, uv).xyz;
  vSelection = texture2D(selection, uv);

  vec4 result = m * vec4(tPosition.xy, 1, 1);

  gl_PointSize = size;

  vPosition = result.xyz;
  vIndex = gl_VertexID;

  gl_Position = result;
}`;

export const vertexFragment = `
uniform float size;
uniform bool raycast;

flat varying int vIndex;
varying vec4 vSelection;

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

  vec3 colorFill = mix(vec3(0.9), vec3(0, 0.5, 1), vSelection.r);

  vec3 color = mix(vec3(white) * colorFill, vec3(1), vSelection.b * 0.4);

  gl_FragColor = vec4(color, alpha);
}`;
