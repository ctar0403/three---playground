uniform vec2 u_Resolution;
uniform vec3 u_color;  
uniform float u_opacity;


void main() {
  vec2 st = gl_FragColor.xy / u_Resolution;

  vec3 color = u_color;
  gl_FragColor = vec4(color, u_opacity);
}