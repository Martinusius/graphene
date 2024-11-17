export const vertexColor = `
attribute mat4 point;
attribute vec2 uvs;
attribute float pointIndex;

uniform vec2 resolution;

varying vec2 vUv;
varying vec4 vImage;

void main() {
  mat4 m = projectionMatrix * viewMatrix;

  vUv = uvs;
  vImage = point[1];

  vec4 result = m * vec4(point[0].xyz, 1);

  vec4 vert = vec4(position.xy, 0, 1);
  vert *= projectionMatrix;

  vert.xy *= result.w;
  vert.xy /= (vec4(resolution, 0.0, 1.0) * projectionMatrix).xy;

  result.xy += vert.xy * point[0].w; 

  gl_Position = result;
}`;

export const fragmentColor = `
varying vec2 vUv;
varying vec4 vImage;

uniform sampler2D atlas;
uniform vec2 atlasSize;

void main() {
  vec4 color = texture2D(atlas, (vUv * vImage.zw + vImage.xy) / atlasSize);

  if(color.a < 0.01) discard;
  
  gl_FragColor = color;
}`;

export const vertexRaycast = `
attribute mat4 point;
attribute vec2 uvs;
attribute float pointIndex;

uniform vec2 resolution;
uniform float tolerance;

varying vec2 vUv;
varying vec4 vImage;
varying float vPointIndex;

void main() {
  mat4 m = projectionMatrix * viewMatrix;

  vUv = uvs;
  vImage = point[1];
  vPointIndex = pointIndex;

  vec4 result = m * vec4(point[0].xyz, 1);

  vec4 vert = vec4(position.xy, 0, 1);
  vert *= projectionMatrix;

  vert.xy *= result.w;
  vert.xy /= (vec4(resolution, 0.0, 1.0) * projectionMatrix).xy;

  result.xy += vert.xy * (point[0].w + tolerance); 

  gl_Position = result;
}`;

export const fragmentRaycast = `
varying vec2 vUv;
varying vec4 vImage;
varying float vPointIndex;

uniform sampler2D atlas;
uniform vec2 atlasSize;

void main() {
  vec4 color = texture2D(atlas, (vUv * vImage.zw + vImage.xy) / atlasSize);
  if(color.a < 0.01) discard;
  gl_FragColor = vec4(2, vPointIndex + 1.0, 0, 1);
}`;