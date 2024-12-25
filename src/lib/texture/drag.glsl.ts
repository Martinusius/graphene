export const drag = `
uniform sampler2D positions;
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

    writeIndex(gl_VertexID, position + selection.r * vec4(offset, 0, 0));
  }
  else {
    // drag edge

  }
}`;
