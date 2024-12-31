export const selectEdges = `
uniform isampler2D vertices;
uniform sampler2D positions;
uniform sampler2D selection;

uniform ivec2 verticesSize;

uniform vec2 min;
uniform vec2 max;

uniform mat4 projectionMatrix;
uniform mat4 _viewMatrix;

uniform vec2 screenResolution;
uniform float size;

uniform bool select;
uniform bool preview;

out vec4 color;

bool lineSegmentIntersection(vec2 p1, vec2 p2, vec2 p3, vec2 p4) {
  float denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  float ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
  float ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;
  return ua >= 0.0 && ua <= 1.0 && ub >= 0.0 && ub <= 1.0;
}

void main() {
  mat4 m = projectionMatrix * _viewMatrix;
  
  vec2 uv = gl_FragCoord.xy / vec2(outputSize);

  ivec2 vertexIndices = texture(vertices, uv).xy;

  bool vuArrow = bool(vertexIndices.x & 1);
  bool uvArrow = bool(vertexIndices.y & 1);

  vec2 firstVertex = texture(positions, indexUv(vertexIndices.x >> 1, verticesSize)).xy;
  vec2 secondVertex = texture(positions, indexUv(vertexIndices.y >> 1, verticesSize)).xy;

  vec2 firstVertexScreen = (m * vec4(firstVertex, 0, 1)).xy;
  vec2 secondVertexScreen = (m * vec4(secondVertex, 0, 1)).xy;

  bool intersectsLeft = lineSegmentIntersection(firstVertexScreen, secondVertexScreen, min, vec2(min.x, max.y));
  bool intersectsRight = lineSegmentIntersection(firstVertexScreen, secondVertexScreen, max, vec2(max.x, min.y));
  bool intersectsTop = lineSegmentIntersection(firstVertexScreen, secondVertexScreen, min, vec2(max.x, min.y));
  bool intersectsBottom = lineSegmentIntersection(firstVertexScreen, secondVertexScreen, max, vec2(min.x, max.y));
  
  bool intersects = intersectsLeft || intersectsRight || intersectsTop || intersectsBottom;
  bool inside = 
    firstVertexScreen.x >= min.x && firstVertexScreen.x <= max.x && 
    firstVertexScreen.y >= min.y && firstVertexScreen.y <= max.y &&
    secondVertexScreen.x >= min.x && secondVertexScreen.x <= max.x && 
    secondVertexScreen.y >= min.y && secondVertexScreen.y <= max.y;

  vec2 previous = texture(selection, uv).rg;

  if(intersects || inside) {
    color = vec4(select, preview ? previous.g : float(select), 0, 1);
  } else {
    color = vec4(previous.gg, 0, 1);
  }
}`;
