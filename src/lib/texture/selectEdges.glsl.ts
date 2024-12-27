export const selectEdges = `
uniform sampler2D vertices;
uniform sampler2D positions;
uniform sampler2D selection;

uniform vec2 min;
uniform vec2 max;

uniform mat4 projectionMatrix;
uniform mat4 _viewMatrix;

uniform vec2 screenResolution;
uniform float size;

uniform bool select;
uniform bool preview;

bool lineSegmentIntersection(vec2 p1, vec2 p2, vec2 p3, vec2 p4) {
  float denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  float ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
  float ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;
  return ua >= 0.0 && ua <= 1.0 && ub >= 0.0 && ub <= 1.0;
}

void main() {
  mat4 m = projectionMatrix * _viewMatrix;
  
  vec2 uv = gl_FragCoord.xy / vec2(outputSize);

  vec4 vertexUvs = texture2D(vertices, uv);

  bool vuArrow = vertexUvs.x >= 1.0;
  vertexUvs.x -= float(vuArrow);

  bool uvArrow = vertexUvs.z >= 1.0;
  vertexUvs.z -= float(uvArrow); 

  vec2 firstVertex = (m * vec4(texture2D(positions, vertexUvs.xy).xy, 0, 1)).xy;
  vec2 secondVertex = (m * vec4(texture2D(positions, vertexUvs.zw).xy, 0, 1)).xy;

  bool intersectsLeft = lineSegmentIntersection(firstVertex, secondVertex, min, vec2(min.x, max.y));
  bool intersectsRight = lineSegmentIntersection(firstVertex, secondVertex, max, vec2(max.x, min.y));
  bool intersectsTop = lineSegmentIntersection(firstVertex, secondVertex, min, vec2(max.x, min.y));
  bool intersectsBottom = lineSegmentIntersection(firstVertex, secondVertex, max, vec2(min.x, max.y));
  
  bool intersects = intersectsLeft || intersectsRight || intersectsTop || intersectsBottom;
  bool inside = firstVertex.x >= min.x && firstVertex.x <= max.x && firstVertex.y >= min.y && firstVertex.y <= max.y && secondVertex.x >= min.x && secondVertex.x <= max.x && secondVertex.y >= min.y && secondVertex.y <= max.y;

  vec2 previous = texture2D(selection, uv).rg;

  if(intersects || inside) {
    gl_FragColor = vec4(select, preview ? previous.g : float(select), 0, 1);
  } else {
    gl_FragColor = vec4(previous.gg, 0, 1);
  }
}`;
