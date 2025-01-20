import { shader } from "./shader";

export const repulse = shader(`
uniform sampler2D vertexData;
uniform sampler2D hashTable;
uniform sampler2D offsets;

uniform uvec2 hashTableSize;
uniform uvec2 vertexDataSize;

uniform float cellSize;
uniform float strength;

uniform int hashModulo;

const int primeA = 5499311;
const int primeB = 1381747;

out vec4 color;

int modulo(int a, int b) {
  return (b + (a % b)) % b;
}

uint calculateHash(uint index, ivec2 offset) {
  vec4 vertex = texture(vertexData, indexUv(index, vertexDataSize));
  
  ivec2 cellCoords = ivec2(vertex.xy / cellSize) + offset;

  int pa = modulo(primeA, hashModulo);
  int pb = modulo(primeB, hashModulo);

  int x = modulo(cellCoords.x, hashModulo);
  int y = modulo(cellCoords.y, hashModulo);

  int cellHash = modulo(modulo(pa * x, hashModulo) + modulo(pb * y, hashModulo), hashModulo);

  return uint(cellHash);
}

vec2 calculateRepulsion(uint myIndex, vec2 me, uint hash) {
  uint nextOffsetIndex = floatBitsToUint(texture(offsets, indexUv(hash / 4u, hashTableSize))[hash % 4u]);
  uint offsetIndex = hash == 0u ? 0u : 
    floatBitsToUint(texture(offsets, indexUv((hash - 1u) / 4u, hashTableSize))[(hash - 1u) % 4u]);

  vec2 totalForce = vec2(0.0);

  for(uint i = offsetIndex; i < nextOffsetIndex; i++) {
    uint vertexIndex = floatBitsToUint(texture(hashTable, indexUv(i / 4u, hashTableSize))[i % 4u]);
    if(vertexIndex == myIndex) continue;
    vec2 vertex = texture(vertexData, indexUv(vertexIndex, vertexDataSize)).xy;

    vec2 direction = normalize(me - vertex);
    float distance = length(vertex - me);

    if(distance > cellSize) continue;

    if(distance == 0.0) continue;

    totalForce += repulse(me, vertex); 
    //totalForce += strength * direction / max(10.0, distance * distance);
  } 

  return totalForce;
}

void main() {
  uint index = uint(gl_FragCoord.x) + uint(gl_FragCoord.y) * uint(outputSize.x);

  vec4 vertex = texture(vertexData, indexUv(index, vertexDataSize));
  vec2 me = vertex.xy;

  uint selection = 1u - (floatBitsToUint(vertex.z) >> 3) & 1u;
  
  vec2 totalForce = vec2(0.0);

  for(int x = -1; x <= 1; x++) {
    for(int y = -1; y <= 1; y++) {
      totalForce += calculateRepulsion(index, me, calculateHash(index, ivec2(x, y)));
    }
  }

  color = vec4(totalForce * float(selection), 0, 0);
}
`);