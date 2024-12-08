export const select = `

uniform sampler2D positions;
// uniform sampler2D selection;

uniform vec2 min;
uniform vec2 max;

uniform mat4 projectionMatrix;
uniform mat4 _viewMatrix;

uniform vec2 screenResolution;
uniform float size;

uniform bool select;
uniform bool preview;



void main() {
  mat4 m = projectionMatrix * _viewMatrix;


  vec2 uv = gl_FragCoord.xy / resolution;
  vec4 position = m * vec4(texture2D(positions, uv).xyz, 1);

  vec2 screenPixel = position.xy * screenResolution;
  vec2 closestInside = clamp(screenPixel, min * screenResolution, max * screenResolution);

  float dist = length(screenPixel - closestInside);

  vec2 previous = texture2D(selection, uv).rg;

  if(dist < size) {
    gl_FragColor = vec4(select, preview ? previous.g : float(select), 0, 1);
  } else {
    gl_FragColor = vec4(previous.gg, 0, 1);
  }
}`;

