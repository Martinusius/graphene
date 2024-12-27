export const drag = `
uniform sampler2D positions;
uniform sampler2D edgeVertices;
uniform sampler2D selectionEdges;
uniform sampler2D selectionVertices;

uniform ivec2 selectionVerticesSize;
uniform ivec2 selectionEdgesSize;

uniform vec2 offset;

void main() {
  int edgeCutoff = selectionVerticesSize.x * selectionVerticesSize.y;

  if (gl_VertexID < edgeCutoff) {
    // drag vertex
    vec4 selection = texture2D(selectionVertices, indexUv(gl_VertexID, selectionVerticesSize));
    vec4 position = texture2D(positions, indexUv(gl_VertexID, selectionVerticesSize));
    // position.a = 1.0;

    writeIndex(gl_VertexID, position + selection.r * vec4(offset, 0, 0));
  }
  else {
    // drag edge
    int edgeIndex = (gl_VertexID - edgeCutoff) / 2;
    int whichVertex = 2 * ((gl_VertexID - edgeCutoff) % 2);

    vec4 vertexUvs = texture2D(edgeVertices, indexUv(edgeIndex, selectionEdgesSize));
    vec4 selection = texture2D(selectionEdges, indexUv(edgeIndex, selectionEdgesSize));

    vec2 vertex = vec2(vertexUvs[whichVertex], vertexUvs[whichVertex + 1]);
    vertex.x -= float(vertex.x >= 1.0);

    vec4 position = texture2D(positions, vertex);
    // position.a = 1.0;


    writeUvDepth(vertex + vec2(0.5) / vec2(selectionVerticesSize), position + selection.r * vec4(offset, 0, 0), 1.0);

    if(selection.r < 0.5) Discard();
  }
}`;
