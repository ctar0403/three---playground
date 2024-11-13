#include classicnoise3D

uniform float u_time;
uniform float u_displacement;

varying vec2 vUv;
varying float vDisplacement;

void main() {
  vUv = uv;
  // vec3 newPosition = position + normal * vec3(sin(position.y * 10.0 + u_Time));
  // vDisplacement = sin(position.y * 10.0 + u_Time);
  float noise = pnoise(position + u_time, vec3(10.0));
  float displacement = u_displacement * noise / 10.0;
  vec3 newPosition = position + normal * displacement;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}