import { shader } from "../shader";

export const textVertex = shader(`
uniform vec2 resolution;

uniform sampler2D vertexData;
uniform sampler2D letters;

uniform uint alphabetSize;
uniform sampler2D fontAtlasCoords;

uniform uint vertexDataSize;
uniform uint lettersSize;
uniform uint fontAtlasCoordsSize;

uniform float size;

flat varying  vec4 vFontCoords;

vec2 getUv(uint index, uint size) {
  return (vec2(0.5) + vec2(index % size, index / size)) / vec2(size);
}

const float SQRT_PHI = 1.2720196494944565;

void main() {
  mat4 m = projectionMatrix * viewMatrix;

  vec4 letterInfo = texture(letters, getUv(uint(gl_VertexID), lettersSize));

  uint vertexId = floatBitsToUint(letterInfo.x);
  float scale = letterInfo.z;
  float offset = 8.0 * letterInfo.w * scale;
  uint letterIndex = floatBitsToUint(letterInfo.y);

  vec4 vertex = texture(vertexData, getUv(vertexId, vertexDataSize));
  
  uint fontSizeIndex = uint(min(ceil(log(size * scale) / log(SQRT_PHI) - log(8.0) / log(SQRT_PHI)), 12.0));

  vFontCoords = texture(fontAtlasCoords, getUv(letterIndex + fontSizeIndex * alphabetSize, fontAtlasCoordsSize));

  vec4 result = m * vec4(vertex.xy + vec2(offset, 0), 2, 1);

  gl_PointSize = size * scale;
  gl_Position = result;
}`);

export const textFragment = shader(`
uniform float size;

flat varying  vec4 vFontCoords;

uniform sampler2D fontAtlas;

void main() {
  float maxDim = max(vFontCoords.z, vFontCoords.w);

  vec2 off = (vec2(maxDim) - vFontCoords.zw) * 0.5;
  vec2 pos = gl_PointCoord * maxDim;

  if(pos.x < off.x || pos.x > maxDim - off.x || pos.y < off.y || pos.y > maxDim - off.y) discard;

  vec2 uv = vFontCoords.xy - off + pos;
  uv.y = 1.0 - uv.y;

  gl_FragColor = texture(fontAtlas, uv);
}`);
