import { NULL } from "../../../Properties";
import { shader } from "../shader";
import { Font } from "./Font";

export const textEdgeVertex = shader(`
uniform vec2 resolution;

uniform sampler2D vertexData;
uniform sampler2D edgeData;
uniform sampler2D aux;

uniform int auxChannel;
uniform int decimalPlaces;

uniform int maxDigits;

uniform uint alphabetSize;
uniform sampler2D fontAtlasCoords;

uniform uint edgeDataSize;
uniform uint vertexDataSize;
uniform uint auxSize;
uniform uint fontAtlasCoordsSize;

uniform vec2 overflowString;

uniform float size;

flat varying vec4 vFontCoords;

vec2 indexUv(uint index, uint size) {
  return (vec2(0.5) + vec2(index % size, index / size)) / vec2(size);
}

float log10(float x) {
  return log(x) * 0.43429448190325176;
}

float lineDist(vec2 pt1, vec2 pt2, vec2 testPt) {
  vec2 lineDir = pt2 - pt1;
  vec2 perpDir = vec2(lineDir.y, -lineDir.x);
  vec2 dirToPt1 = pt1 - testPt;
  return abs(dot(normalize(perpDir), dirToPt1));
}

void renderUnsignedInteger(int value, int whichCharacter, inout int characterToRender, inout float totalWidth, inout float totalOffset) {
  int totalDigits = int(max(0.0, floor(log10(float(value))))) + 1;

  for(int i = 0; i < totalDigits; i++) {
    int character = 52 + value % 10;
    vec4 data = texture(fontAtlasCoords, indexUv(12u * alphabetSize + uint(character), fontAtlasCoordsSize));

    totalWidth += data.z;

    if(i == whichCharacter) {
      vFontCoords = data;
      characterToRender = character;

      totalOffset = totalWidth;
    }

    value /= 10;
  }
}

void renderSignedInteger(int value, int whichCharacter, inout int characterToRender, inout float totalWidth, inout float totalOffset) {
  int totalDigits = int(max(0.0, floor(log10(float(value))))) + 1;
  renderUnsignedInteger(abs(value), whichCharacter, characterToRender, totalWidth, totalOffset);

  if(sign(value) == -1) {
    int character = ${Font.glslChar("-")};
    vec4 data = texture(fontAtlasCoords, indexUv(12u * alphabetSize + uint(character), fontAtlasCoordsSize));
    totalWidth += data.z;
 
    if(whichCharacter == totalDigits + 1) {
      vFontCoords = data;
      characterToRender = character;

      totalOffset = totalWidth;
    }
  }
}

void renderString(vec3 string, int whichCharacter, inout int characterToRender, inout float totalWidth, inout float totalOffset) {
  for(int i = 0; i < int(string.z); i++) {
    int character = (int(floatBitsToUint(string[i / 4])) >> (8 * (i % 4))) & 0xFF;
    vec4 data = texture(fontAtlasCoords, indexUv(12u * alphabetSize + uint(character), fontAtlasCoordsSize));

    totalWidth += data.z;

    if(i == whichCharacter) {
      vFontCoords = data;
      characterToRender = character;

      totalOffset = totalWidth;
    }
  }
}

const float SQRT_PHI = 1.2720196494944565;

void main() {
  mat4 m = projectionMatrix * viewMatrix;

  int whichEdge = gl_VertexID / maxDigits;
  int whichCharacter  = gl_VertexID % maxDigits;

  float floatValue = texture(aux, indexUv(uint(whichEdge), auxSize))[auxChannel];
  int signedValue = int(floatBitsToUint(floatValue));

  int sgn = sign(signedValue);
  int value = abs(signedValue);

  int totalDigits = int(max(0.0, floor(log10(float(value))))) + 1;
  int requiredDigits = totalDigits + (sgn == -1 ? 1 : 0);

  float totalWidth = 0.0;
  float totalOffset = 0.0;

  int characterToRender = 0;

  if(signedValue == ${NULL}) {
    renderString(${Font.glslString('Null')}, whichCharacter, characterToRender, totalWidth, totalOffset);
  }
  else if(requiredDigits <= maxDigits) {
    renderSignedInteger(signedValue, whichCharacter, characterToRender, totalWidth, totalOffset);
  }
  else {
    renderString(${Font.glslString('Overflow')}, whichCharacter, characterToRender, totalWidth, totalOffset);
  }
  

  float scale = min(1.0, vFontCoords.w / totalWidth) * 0.5;
  float offset = -8.0 * scale * (totalOffset - totalWidth / 2.0 - vFontCoords.z / 2.0) / vFontCoords.w;

  float width = 8.0 * scale * totalWidth / vFontCoords.w;
  float height = 8.0 * scale;


  vec4 edge = texture2D(edgeData, indexUv(uint(whichEdge), edgeDataSize));

  uvec2 vertexIndices = uvec2(floatBitsToUint(edge.x), floatBitsToUint(edge.y));

  bool vuArrow = bool(vertexIndices.x & 1u);
  bool uvArrow = bool(vertexIndices.y & 1u);

  bool isDual = bool(vertexIndices.x & 2u);

  vec2 firstVertex = texture2D(vertexData, indexUv(vertexIndices.x >> 2, vertexDataSize)).xy;
  vec2 secondVertex = texture2D(vertexData, indexUv(vertexIndices.y >> 2, vertexDataSize)).xy;

  vec2 dir = normalize(firstVertex - secondVertex);
  vec2 normal = vec2(dir.y, -dir.x);

  firstVertex.xy += normal * float(isDual);
  secondVertex.xy += normal * float(isDual);

  vec2 center = (firstVertex + secondVertex) / 2.0;
  
  uint fontSizeIndex = uint(min(ceil(log(size * scale) / log(SQRT_PHI) - log(8.0) / log(SQRT_PHI)), 12.0));

  vFontCoords = texture(fontAtlasCoords, indexUv(uint(characterToRender) + fontSizeIndex * alphabetSize, fontAtlasCoordsSize));

  float far = abs(dot(abs(normal), vec2(width, height) / 2.0));

  vec4 result = m * vec4(center + vec2(offset, 0) + normal * far * 1.2, 1, 1);

  gl_PointSize = size * scale;
  gl_Position = result;
}`);

export const textEdgeFragment = shader(`
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

  vec4 color = texture(fontAtlas, uv);

  if(color.a < 0.2) discard;

  gl_FragColor = color;
}`);
