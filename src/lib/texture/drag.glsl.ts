export const drag = `
uniform sampler2D positions;
uniform isampler2D edgeVertices;
uniform sampler2D selectionEdges;
uniform sampler2D selectionVertices;

uniform ivec2 edgeVerticesSize;
uniform ivec2 selectionVerticesSize;
uniform ivec2 selectionEdgesSize;

uniform vec2 offset;

void main() {
  int edgeCutoff = selectionVerticesSize.x * selectionVerticesSize.y;

  if (gl_VertexID < edgeCutoff) {
    // drag vertex
    vec4 selection = texture(selectionVertices, indexUv(gl_VertexID, selectionVerticesSize));
    vec4 position = texture(positions, indexUv(gl_VertexID, selectionVerticesSize));

    writeIndex(gl_VertexID, position + selection.r * vec4(offset, 0, 0));
  }
  else {
    // drag edge
    int edgeIndex = (gl_VertexID - edgeCutoff) / 2;
    int whichVertex = (gl_VertexID - edgeCutoff) % 2;

    ivec2 vertexIndices = texture(edgeVertices, indexUv(edgeIndex, edgeVerticesSize)).xy;

    vec4 selection = texture(selectionEdges, indexUv(edgeIndex, selectionEdgesSize));
    
    int vertex = (whichVertex == 0 ? vertexIndices.x : vertexIndices.y) >> 1;

    vec4 position = texture(positions, indexUv(vertex, selectionVerticesSize));

    writeIndexDepth(vertex, position + selection.r * vec4(offset, 0, 0), 1.0);

    if(selection.r < 0.5) Discard();
  }
}`;
