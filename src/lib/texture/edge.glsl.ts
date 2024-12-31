export const edgeVertex = `
uniform vec2 resolution;

uniform isampler2D vertices;
uniform sampler2D positions;
uniform sampler2D selection;

// attribute vec4 vertices;

uniform float size;
uniform int vertexSize;
uniform int edgeSize;

varying vec4 vSelection;
flat varying int vIndex;


vec2 getUv() {
  vec2 uv = vec2(gl_InstanceID % edgeSize, gl_InstanceID / edgeSize);
  return (uv + 0.5) / float(edgeSize);
}

vec2 indexUv(int index, int size) {
  return (vec2(index % size, index / size) + 0.5) / float(size);
}

void main() {
  mat4 m = projectionMatrix * viewMatrix;

  ivec2 vertexIndices = texture2D(vertices, getUv()).xy;

  bool vuArrow = bool(vertexIndices.x & 1);
  bool uvArrow = bool(vertexIndices.y & 1);

  vec2 firstVertex = texture2D(positions, indexUv(vertexIndices.x >> 1, vertexSize)).xy;
  vec2 secondVertex = texture2D(positions, indexUv(vertexIndices.y >> 1, vertexSize)).xy;

  vec2 toSecond = normalize(secondVertex - firstVertex);
  
  firstVertex.xy += toSecond * 4.0;
  secondVertex.xy -= toSecond * 4.0;

  float dist = length(firstVertex - secondVertex);

  vec2 uv = position.xy;

  vec2 radius = vec2(size) / resolution;


  if(vuArrow) {
    if(uv.x == 0.0 && uv.y != 0.5) {
      uv.x = 2.0 / dist;
      uv.y = 5.0 * (uv.y - 0.5) + 0.5;
    }
    else if(uv.x == 0.25) {
      uv.x = 1.5 / dist;
    }
  }

  if(uvArrow) {
    if(uv.x == 1.0 && uv.y != 0.5) {
      uv.x = 1.0 - 2.0 / dist;
      uv.y = 5.0 * (uv.y - 0.5) + 0.5;
    }
    else if(uv.x == 0.75) {
      uv.x = 1.0 - 1.5 / dist;
    }
  }

  vec2 tPosition = mix(firstVertex.xy, secondVertex.xy, uv.x);
  tPosition += vec2(-toSecond.y, toSecond.x) * (uv.y - 0.5) * 0.5;
  
  vec4 result = m * vec4(tPosition, 0, 1);

  vSelection = texture2D(selection, getUv());
  vIndex = gl_InstanceID;

  gl_Position = result;
}`;

export const edgeFragment = `
varying vec4 vSelection;
flat varying int vIndex;


uniform float size;
uniform bool raycast;


void main() {
  if(raycast) {
    gl_FragColor = vec4(1, vIndex + 1, 0, 1);
    return;
  }

  vec3 color = mix(vec3(0), vec3(0, 0.5, 1), vSelection.r);
  color = mix(color, vec3(1), vSelection.b * 0.4);

  gl_FragColor = vec4(color, 1);
}`;
