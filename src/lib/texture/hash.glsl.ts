import { shader } from "./shader";

export const hash = shader(`
uniform buffer vertexData;
// uniform uvec2 vertexDataSize;

uniform float cellSize;
uniform int hashModulo;

// out vec4 color;

const int primeA = 5499311;
const int primeB = 1381747;

int modulo(int a, int b) {
  return (b + (a % b)) % b;
}

float calculateHash(uint index) {
  vec4 vertex = ReadBuffer(vertexData, index); //texture(vertexData, indexUv(index, vertexDataSize));
  
  ivec2 cellCoords = ivec2(vertex.xy / cellSize);

  int pa = modulo(primeA, hashModulo);
  int pb = modulo(primeB, hashModulo);

  int x = modulo(cellCoords.x, hashModulo);
  int y = modulo(cellCoords.y, hashModulo);

  int cellHash = modulo(modulo(pa * x, hashModulo) + modulo(pb * y, hashModulo), hashModulo);

  return uintBitsToFloat(uint(cellHash));
}

void main() {
  uint index = uint(instanceId); //uint(gl_FragCoord.x) + uint(gl_FragCoord.y) * uint(outputSize.x);

  // calculate hashes for four vertices at once
  float r = calculateHash(index * 4u);
  float g = calculateHash(index * 4u + 1u);
  float b = calculateHash(index * 4u + 2u);
  float a = calculateHash(index * 4u + 3u);

  // color = vec4(r, g, b, a);
  WriteOutput(index, vec4(r, g, b, a));
}
`);