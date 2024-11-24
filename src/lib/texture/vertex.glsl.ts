export const vertexColor = `
uniform vec2 resolution;
uniform sampler2D positions;

// varying vec2 vUv;
// varying vec4 vImage;

uniform float size;

varying vec3 vPosition;
varying vec3 vOriginal;

void main() {
  mat4 m = projectionMatrix * viewMatrix;

  vec3 texturePosition = texture2D(positions, position.xy).xyz;

  vec4 result = m * vec4(texturePosition, 1);

  gl_PointSize = size;

  vPosition = result.xyz;
  vOriginal = position;

  gl_Position = result;
}`;

export const fragmentColor = `
// varying vec2 vUv;
// varying vec4 vImage;

// uniform sampler2D atlas;
// uniform vec2 atlasSize;

uniform float size;
varying vec3 vOriginal;


void main() {
  if(vOriginal.z < 0.5) discard;

  vec2 uv = 2.0 * vec2(gl_PointCoord) - 1.0;

  float smoothFactor = size / 5.0;

  float alpha = smoothstep(1.0, 0.0, clamp(length(uv) * smoothFactor - smoothFactor + 1.0, 0.0, 1.0));

  float smoothFactor2 = size / 5.0;

  float white = smoothstep(1.0, 0.0, clamp(length(uv) * 1.2 * smoothFactor2 - smoothFactor2 + 1.0, 0.0, 1.0));




  // if(alpha <= 0.0) discard;

  // vec4 color = texture2D(atlas, (vUv * vImage.zw + vImage.xy) / atlasSize);


  // color.rgb = vec3(color.r + color.b + color.g) / 3.0;
  
  gl_FragColor = vec4(white, white, white, alpha);
}`;