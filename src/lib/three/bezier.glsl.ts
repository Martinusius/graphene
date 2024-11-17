export const vertexColor = `
attribute mat4 bezier;
attribute float t;
attribute float side;
attribute float bezierIndex;

uniform vec2 resolution;

varying vec3 vColor;

void main() {
  mat4 m = projectionMatrix * viewMatrix;

  float k = 1.0 - t;
  float k2 = k * k;
  float k3 = k2 * k;
  float t2 = t * t;
  float t3 = t2 * t;

  vec3 p0 = bezier[0].xyz;
  vec3 p1 = bezier[1].xyz;
  vec3 p2 = bezier[2].xyz;
  vec3 p3 = bezier[3].xyz;

  vec3 position = k3 * p0 + 3.0 * t * k2 * p1 + 3.0 * t2 * k * p2 + t3 * p3;
  vec3 derivative = -3.0 * k2 * p0 + 3.0 * k2 * p1 - 6.0 * t * k * p1 - 3.0 * t2 * p2 + 6.0 * t * k * p2 + 3.0 * t2 * p3;

  vec3 tangent = normalize(derivative);

  vec4 tangentM = m * vec4(position + tangent, 1) - m * vec4(position, 1);

  vec4 normal = vec4(tangentM.xyz, 1);
  normal.xy = normalize(vec2(-normal.y, normal.x));
  normal.z = 0.0;
  normal *= projectionMatrix;

  vec4 result = m * vec4(position, 1);

  normal.xy *= result.w;
  normal.xy /= (vec4(resolution, 0., 1.) * projectionMatrix).xy;

  result.xy += normal.xy * bezier[0].w * 0.5 * side;

  vColor = vec3(bezier[1].w, bezier[2].w, bezier[3].w);

  gl_Position = result;
}`;

export const fragmentColor = `
varying vec3 vColor;

void main() {
  gl_FragColor = vec4(vColor, 1);
}`;

export const vertexRaycast = `
attribute mat4 bezier;
attribute float t;
attribute float side;
attribute float bezierIndex;

uniform vec2 resolution;
uniform float tolerance;

varying vec3 vColor;

void main() {
  mat4 m = projectionMatrix * viewMatrix;

  float k = 1.0 - t;
  float k2 = k * k;
  float k3 = k2 * k;
  float t2 = t * t;
  float t3 = t2 * t;

  vec3 p0 = bezier[0].xyz;
  vec3 p1 = bezier[1].xyz;
  vec3 p2 = bezier[2].xyz;
  vec3 p3 = bezier[3].xyz;

  vec3 position = k3 * p0 + 3.0 * t * k2 * p1 + 3.0 * t2 * k * p2 + t3 * p3;
  vec3 derivative = -3.0 * k2 * p0 + 3.0 * k2 * p1 - 6.0 * t * k * p1 - 3.0 * t2 * p2 + 6.0 * t * k * p2 + 3.0 * t2 * p3;

  vec3 tangent = normalize(derivative);

  vec4 tangentM = m * vec4(position + tangent, 1) - m * vec4(position, 1);

  vec4 normal = vec4(tangentM.xyz, 1);
  normal.xy = normalize(vec2(-normal.y, normal.x));
  normal.z = 0.0;
  normal *= projectionMatrix;

  vec4 result = m * vec4(position, 1);

  normal.xy *= result.w;
  normal.xy /= (vec4(resolution, 0.0, 1.0) * projectionMatrix).xy;

  result.xy += normal.xy * (bezier[0].w * 0.5 + tolerance) * side;

  vColor = vec3(3, bezierIndex + 1.0, t);

  gl_Position = result;
}`;

export const fragmentRaycast = `
varying vec3 vColor;

void main() {
  gl_FragColor = vec4(vColor, 1);
}`;