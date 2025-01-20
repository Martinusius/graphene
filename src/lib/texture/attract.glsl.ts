import { shader } from "./shader";

export const attract = shader(`
uniform sampler2D vertexData;
uniform sampler2D edgeData;

uniform ivec2 edgeDataSize;
uniform ivec2 vertexDataSize;

// uniform float strength;
// uniform float springLength;

uniform vec2 offset;

void main() {
  int edgeIndex = gl_VertexID / 2;
  int whichVertex = gl_VertexID % 2;

  vec4 edge = texture(edgeData, indexUv(edgeIndex, edgeDataSize));

  uvec2 vertexIndices = uvec2(floatBitsToUint(edge.x), floatBitsToUint(edge.y));
  float selection = float(floatBitsToUint(edge.z) & 1u);

  uint thisVertex = (whichVertex == 0 ? vertexIndices.x : vertexIndices.y) >> 1;
  uint otherVertex = (whichVertex == 0 ? vertexIndices.y : vertexIndices.x) >> 1;

  vec4 thisPosition = texture(vertexData, indexUv(int(thisVertex), vertexDataSize));
  vec4 otherPosition = texture(vertexData, indexUv(int(otherVertex), vertexDataSize));

  uint selectionOr = 1u - (floatBitsToUint(thisPosition.z) >> 3) & 1u;


  vec2 diff = otherPosition.xy - thisPosition.xy;
  vec2 direction = normalize(diff);

  float distance = length(diff);

  if(distance < 0.1) {
    Discard();
    return;
  } 


  // vec2 velocity = strength * log(max(1.0, length(diff)) / springLength) * direction;

  vec2 force = attract(thisPosition.xy, otherPosition.xy);


  writeIndexDepth(int(thisVertex), vec4(force * float(selectionOr), 0, 0), 1.0);

  // if(selection < 0.5) Discard();
}
`);