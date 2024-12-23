export const edgeVertex = `
uniform vec2 resolution;
uniform sampler2D positions;
// uniform sampler2D selection;

attribute vec4 vertices;

uniform float size;

varying vec2 vfirstVertex;
varying vec2 vSecondVertex;
varying vec2 vUv;


void main() {
  mat4 m = projectionMatrix * viewMatrix;

  vec4 vertexUvs = vertices;

  bool vuArrow = vertexUvs.x >= 1.0;
  vertexUvs.x -= float(vuArrow);

  bool uvArrow = vertexUvs.z >= 1.0;
  vertexUvs.z -= float(uvArrow); 


  vec2 firstVertex = texture2D(positions, vertexUvs.xy).xy;
  vec2 secondVertex = texture2D(positions, vertexUvs.zw).xy;

  vec2 toSecond = normalize(secondVertex - firstVertex);
  
  firstVertex.xy += toSecond * 3.6;
  secondVertex.xy -= toSecond * 3.6;

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

  vfirstVertex = firstVertex;
  vSecondVertex = secondVertex;
  vUv = uv;

  gl_Position = result;
}`;

export const edgeFragment = `
varying vec2 vfirstVertex;
varying vec2 vSecondVertex;
varying vec2 vUv;

uniform float size;

void main() {
  gl_FragColor = vec4(0, 0, 0, 1);
}`;
