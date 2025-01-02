import { shader } from "./shader";

export const hash = shader(`
uniform sampler2D vertexData;
uniform uvec2 vertexDataSize;

uniform float cellSize;
uniform int hashModulo;

out vec4 color;

const int primeA = 5499311;
const int primeB = 1381747;

float calculateHash(uint index) {
  vec4 vertex = texture(vertexData, indexUv(index, vertexDataSize));
  
  ivec2 cellCoords = ivec2(vertex.xy / cellSize);

  int pa = primeA % hashModulo;
  int pb = primeB % hashModulo;

  int x = cellCoords.x % hashModulo;
  int y = cellCoords.y % hashModulo;

  int cellHash = ((pa * x) % hashModulo + (pb * y) % hashModulo) % hashModulo;

  return uintBitsToFloat(uint(cellHash));
}

void main() {
  uint index = uint(gl_FragCoord.x) + uint(gl_FragCoord.y) * uint(outputSize.x);

  // calculate hashes for four vertices at once
  float r = calculateHash(index * 4u);
  float g = calculateHash(index * 4u + 1u);
  float b = calculateHash(index * 4u + 2u);
  float a = calculateHash(index * 4u + 3u);

  color = vec4(r, g, b, a);
}
`);