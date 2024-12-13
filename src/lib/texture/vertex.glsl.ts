import { PIXEL_RADIUS } from "./pixels";

export const vertexColor = `
uniform vec2 resolution;
uniform sampler2D positions;
uniform sampler2D selection;

uniform float size;
uniform bool raycast;

varying vec3 vPosition;
varying vec3 vOriginal;
varying vec4 vSelection;

const float PIXEL_RADIUS = ${PIXEL_RADIUS}.0;


void main() {
  mat4 m = projectionMatrix * viewMatrix;

  vec3 tPosition = texture2D(positions, position.xy).xyz;
  vSelection = texture2D(selection, position.xy);

  vec4 result = m * vec4(tPosition, 1);

  // result.xy *= 3.0;
  if(raycast)
    result.xy *= resolution / vec2(PIXEL_RADIUS);

  gl_PointSize = size;

  vPosition = result.xyz;
  vOriginal = position;

  gl_Position = result;
}`;

export const fragmentColor = `
uniform float size;
uniform bool raycast;

varying vec3 vOriginal;
varying vec4 vSelection;

void main() {
  if(raycast) {
    gl_FragColor = vec4(vOriginal.z, 0, 0, 1);
    return;
  }


  if(vOriginal.z < 0.5) discard;

  
  vec2 uv = 2.0 * vec2(gl_PointCoord) - 1.0;


  float smoothFactor = max(size / 5.0, 2.0);

  float alpha = smoothstep(1.0, 0.0, clamp(length(uv) * smoothFactor - smoothFactor + 1.0, 0.0, 1.0));


  float white = smoothstep(1.0, 0.0, clamp(length(uv) * 1.2 * smoothFactor - smoothFactor + 1.0, 0.0, 1.0));
  gl_FragColor = vec4(vec3(white) * mix(vec3(0.9), vec3(0, 0.5, 1), vSelection.r), alpha);
}`;
