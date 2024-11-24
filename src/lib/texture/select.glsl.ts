export const select = `

uniform sampler2D positions;

uniform vec2 min;
uniform vec2 max;

uniform mat4 projectionMatrix;
uniform mat4 _viewMatrix;


void main() {
  mat4 m = projectionMatrix * _viewMatrix;


  vec2 uv = gl_FragCoord.xy / resolution;
  vec4 position = m * vec4(texture2D(positions, uv).xyz, 1);

  if(position.x > min.x && position.x < max.x && position.y > min.y && position.y < max.y) {
    gl_FragColor = vec4(1);
  } else {
    gl_FragColor = vec4(0);
  }
}`;

