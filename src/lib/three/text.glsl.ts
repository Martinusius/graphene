export const vertexColor = `
attribute vec4 transform;
attribute vec2 uvs;
attribute float pointIndex;

uniform vec2 resolution;

attribute mat4 letters;
attribute mat4 letters2;


varying mat4 vLetters;
varying mat4 vLetters2;


varying vec2 vUv;


void main() {
  mat4 m = projectionMatrix * viewMatrix;


  float width = 0.0, height = letters[0].w;
  width += letters[0].z;
  width += letters[1].z;
  width += letters[2].z;
  width += letters[3].z;
  width += letters2[0].z;
  width += letters2[1].z;
  width += letters2[2].z;
  width += letters2[3].z;

  vLetters = letters;
  vLetters2 = letters2;


  vUv = uvs;

  vec4 result = m * vec4(transform.xyz + vec3(0, 0, 40), 1);

  vec4 vert = vec4(position.xy, 0, 1);
  vert *= projectionMatrix;



  vert.xy *= result.w;
  vert.xy /= (vec4(resolution, 0.0, 1.0) * projectionMatrix).xy;

  result.xy += vert.xy * vec2(width, height) * transform.w;
  // result.xy += vert.xy * 100.0;

  gl_Position = result;
}`;

export const fragmentColor = `
varying vec2 vUv;

varying mat4 vLetters;
varying mat4 vLetters2;


uniform sampler2D alphabet;

void calculateCoord(inout vec2 coord) {
  float widthOffset = 0.0;

  if(coord.x > widthOffset && coord.x < widthOffset + vLetters[0].z) {
    coord = coord - vec2(widthOffset, 0) + vLetters[0].xy;
    return;
  }

  widthOffset += vLetters[0].z;

  if(coord.x > widthOffset && coord.x < widthOffset + vLetters[1].z) {
    coord = coord - vec2(widthOffset, 0) + vLetters[1].xy;
    return;
  }

  widthOffset += vLetters[1].z;

  if(coord.x > widthOffset && coord.x < widthOffset + vLetters[2].z) {
    coord = coord - vec2(widthOffset, 0) + vLetters[2].xy;
    return;
  }

  widthOffset += vLetters[2].z;

  if(coord.x > widthOffset && coord.x < widthOffset + vLetters[3].z) {
    coord = coord - vec2(widthOffset, 0) + vLetters[3].xy;
    return;
  }

  widthOffset += vLetters[3].z;

  if(coord.x > widthOffset && coord.x < widthOffset + vLetters2[0].z) {
    coord = coord - vec2(widthOffset, 0) + vLetters2[0].xy;
    return;
  }

  widthOffset += vLetters2[0].z;

  if(coord.x > widthOffset && coord.x < widthOffset + vLetters2[1].z) {
    coord = coord - vec2(widthOffset, 0) + vLetters2[1].xy;
    return;
  }

  widthOffset += vLetters2[1].z;

  if(coord.x > widthOffset && coord.x < widthOffset + vLetters2[2].z) {
    coord = coord - vec2(widthOffset, 0) + vLetters2[2].xy;
    return;
  }

  widthOffset += vLetters2[2].z;

  if(coord.x > widthOffset && coord.x < widthOffset + vLetters2[3].z) {
    coord = coord - vec2(widthOffset, 0) + vLetters2[3].xy;
    return;
  }
}

vec2 textureCoord(vec2 coord) {
  coord /= vec2(1024);
  coord.y = 1.0 - coord.y;
  return coord;
}

void main() {
  vec4 color = vec4(0.0);

  float width = 0.0, height = vLetters[0].w;
  width += vLetters[0].z;
  width += vLetters[1].z;
  width += vLetters[2].z;
  width += vLetters[3].z;
  width += vLetters2[0].z;
  width += vLetters2[1].z;
  width += vLetters2[2].z;
  width += vLetters2[3].z;

  vec2 coord = vUv;
  coord.y = 1.0 - coord.y;
  coord *= vec2(width, height);

  calculateCoord(coord);



  color = texture2D(alphabet, textureCoord(coord)) * 1.0;


  color += texture2D(alphabet, textureCoord(coord + vec2(1, 0))) * 1.0;
  color += texture2D(alphabet, textureCoord(coord + vec2(0, 1))) * 1.0;
  color += texture2D(alphabet, textureCoord(coord + vec2(-1, 0))) * 1.0;
  color += texture2D(alphabet, textureCoord(coord + vec2(0, -1))) * 1.0;

  color += texture2D(alphabet, textureCoord(coord + vec2(1, 1)));
  color += texture2D(alphabet, textureCoord(coord + vec2(-1, -1)));
  color += texture2D(alphabet, textureCoord(coord + vec2(-1, 1)));
  color += texture2D(alphabet, textureCoord(coord + vec2(1, -1)));
  

  color /= 8.0;



  if(color.a < 0.01) discard;
  
  gl_FragColor = color;
}`;
