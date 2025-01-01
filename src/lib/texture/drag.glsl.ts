import { shader } from "./shader";

export const drag = shader(`
uniform sampler2D vertexData;
uniform sampler2D edgeData;

uniform ivec2 edgeDataSize;
uniform ivec2 vertexDataSize;

uniform vec2 offset;

void main() {
  int edgeCutoff = vertexDataSize.x * vertexDataSize.y;

  if (gl_VertexID < edgeCutoff) {
    // drag vertex
    vec4 vertex = texture(vertexData, indexUv(gl_VertexID, vertexDataSize));
    
    float selection = float(floatBitsToUint(vertex.z) & 1u);
    vertex.xy += selection * offset;

    writeIndex(gl_VertexID, vertex);
  }
  else {
    // drag edge
    int edgeIndex = (gl_VertexID - edgeCutoff) / 2;
    int whichVertex = (gl_VertexID - edgeCutoff) % 2;

    vec4 edge = texture(edgeData, indexUv(edgeIndex, edgeDataSize));

    uvec2 vertexIndices = uvec2(floatBitsToUint(edge.x), floatBitsToUint(edge.y));
    float selection = float(floatBitsToUint(edge.z) & 1u);

    uint vertex = (whichVertex == 0 ? vertexIndices.x : vertexIndices.y) >> 1;

    vec4 position = texture(vertexData, indexUv(int(vertex), vertexDataSize));
    position.xy += selection * offset;

    writeIndexDepth(int(vertex), position, 1.0);

    if(selection < 0.5) Discard();
  }
}`);
