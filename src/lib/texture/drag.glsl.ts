import { shader } from "./shader";

export const drag = shader(`
uniform buffer vertexData;
uniform buffer edgeData;

uniform int vertexCount;

// uniform ivec2 edgeDataSize;
// uniform ivec2 vertexDataSize;

uniform vec2 offset;

void main() {
  int edgeCutoff = vertexCount;

  if (gl_VertexID < vertexCount) {
    // drag vertex
    vec4 vertex = ReadBuffer(vertexData, instanceId); //texture(vertexData, indexUv(gl_VertexID, vertexDataSize));

    uint flags = floatBitsToUint(vertex.z);
    
    float selection = float(flags & 1u);
    vertex.xy += selection * offset;

    vertex.z = uintBitsToFloat((flags & ~0b1000u) | ((flags & 1u) << 3)); // drag flag

    WriteOutput(instanceId, vertex);
    //writeIndex(gl_VertexID, vertex);
  }
  else {
    // drag edge
    int edgeIndex = (gl_VertexID - edgeCutoff) / 2;
    int whichVertex = (gl_VertexID - edgeCutoff) % 2;

    vec4 edge = texture(edgeData, indexUv(edgeIndex, edgeDataSize));

    uvec2 vertexIndices = uvec2(floatBitsToUint(edge.x), floatBitsToUint(edge.y));

    uint edgeFlags = floatBitsToUint(edge.z);
    float selection = float(edgeFlags & 1u);

    uint vertex = (whichVertex == 0 ? vertexIndices.x : vertexIndices.y) >> 1;

    vec4 position = texture(vertexData, indexUv(int(vertex), vertexDataSize));
    position.xy += selection * offset;

    uint vertexFlags = floatBitsToUint(position.z);

    position.z = uintBitsToFloat((vertexFlags & ~0b1000u) | ((edgeFlags & 1u) << 3)); // drag flag

    WriteOutput(int(vertex), position);

    //writeIndexDepth(int(vertex), position, 1.0);

    if(selection < 0.5) Discard();
  }
}`);
