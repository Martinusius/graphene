import { shader } from "./shader";

export const attract = shader(`
uniform buffer vertexData;
uniform buffer edgeData;

// uniform ivec2 edgeDataSize;
// uniform ivec2 vertexDataSize;

// uniform float strength;
// uniform float springLength;

uniform vec2 offset;

void main() {
  int edgeIndex = instanceId / 2;
  int whichVertex = instanceId % 2;

  vec4 edge = ReadBuffer(edgeData, edgeIndex);

  uvec2 vertexIndices = uvec2(floatBitsToUint(edge.x), floatBitsToUint(edge.y));
  float selection = float(floatBitsToUint(edge.z) & 1u);

  uint thisVertex = (whichVertex == 0 ? vertexIndices.x : vertexIndices.y) >> 1;
  uint otherVertex = (whichVertex == 0 ? vertexIndices.y : vertexIndices.x) >> 1;

  vec4 thisPosition = ReadBuffer(vertexData, thisVertex);
  vec4 otherPosition = ReadBuffer(vertexData, otherVertex);

  uint selectionOr = 1u - (floatBitsToUint(thisPosition.z) >> 3) & 1u;


  vec2 diff = otherPosition.xy - thisPosition.xy;
  vec2 direction = normalize(diff);

  float distance = length(diff);

  if(distance < 0.1) {
    Discard();
    return;
  } 

  vec2 force = attract(thisPosition.xy, otherPosition.xy);

  WriteOutput(thisVertex, vec4(force * float(selectionOr), 0, 0));
}
`);