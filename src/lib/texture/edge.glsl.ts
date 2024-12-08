export const vertexColor = `
uniform vec2 resolution;
uniform sampler2D positions;
uniform sampler2D selection;

attribute vec4 vertices;

uniform float size;

varying vec3 vfirstVertex;
varying vec3 vSecondVertex;
varying vec2 vUv;


void main() {
  mat4 m = projectionMatrix * viewMatrix;

  vec3 firstVertex = texture2D(positions, vertices.xy).xyz;
  vec3 secondVertex = texture2D(positions, vertices.zw).xyz;

  vec3 toSecond = secondVertex - firstVertex;


  vec2 tPosition = mix(firstVertex.xy, secondVertex.xy, uv.x);
  tPosition += normalize(vec2(-toSecond.y, toSecond.x)) * (uv.y - 0.5) * 1.0;

  vec4 result = m * vec4(tPosition, 0, 1);

  vfirstVertex = firstVertex;
  vSecondVertex = secondVertex;
  vUv = uv;

  gl_Position = result;
}`;

export const fragmentColor = `
varying vec3 vfirstVertex;
varying vec3 vSecondVertex;
varying vec2 vUv;

uniform float size;


void main() {
  // float smoothFactor = 1.0 * size;

  // float distanceFromCenter = 8.0 * abs(vUv.y - 0.5);
  // float alpha = smoothstep(1.0, 0.0, smoothFactor * max(distanceFromCenter - (smoothFactor - 1.0) / smoothFactor, 0.0));

  // if(alpha < 0.001) discard;


  gl_FragColor = vec4(0, 0, 0, 1);
}`;