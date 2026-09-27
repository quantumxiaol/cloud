precision highp float;
precision highp sampler3D;
in vec2 vUv;
out vec4 fragColor;
uniform sampler3D uNoise;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;
uniform float uSeed;
uniform float uWind;
uniform float uSun;
uniform float uDensity;
uniform float uMorph;
uniform int uKind;
uniform int uFromKind;
uniform int uSteps;
uniform vec3 uParams;
uniform vec3 uFromParams;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec3 p) { return texture(uNoise, p).r; }
float fbm(vec3 p) {
  return noise(p) * 0.58 + noise(p * 2.03 + 0.17) * 0.28 + noise(p * 4.01 + 0.37) * 0.14;
}
float ellipsoid(vec3 p, vec3 center, vec3 radius) {
  return (1.0 - length((p - center) / radius)) * min(radius.x, min(radius.y, radius.z));
}
float densityAt(vec3 p, int kind, vec3 params) {
  vec3 q = p;
  q.x += uTime * 0.032 * uWind;
  q.x = mod(q.x + 12.0, 24.0) - 12.0;
  vec3 offset = vec3(uSeed * 0.173, uSeed * 0.071, uSeed * 0.113);
  vec3 np = q * 0.18 + offset;
  np += vec3(sin(q.y * 1.1 + uTime * 0.034), cos(q.x * 0.6 + uTime * 0.026), sin(uTime * 0.031)) * 0.065;
  float base = fbm(np);
  float cell = texture(uNoise, np * 1.7 + vec3(0.0, uTime * 0.006, 0.0)).g;
  float detail = texture(uNoise, np * 5.1 - vec3(uTime * 0.003)).g;
  float body;
  if (kind == 0) {
    body = ellipsoid(q, vec3(1.8, 2.0, 0.0), vec3(3.6, 1.45, 2.1));
    body = max(body, ellipsoid(q, vec3(1.1, 3.1, -0.4), vec3(1.8, 1.8, 1.7)));
    body = max(body, ellipsoid(q, vec3(3.0, 2.8, 0.1), vec3(1.6, 1.45, 1.7)));
    body = max(body, ellipsoid(q, vec3(-0.6, 2.1, 0.7), vec3(1.9, 1.2, 1.6)));
    body = max(body, ellipsoid(q, vec3(4.8, 1.6, 0.7), vec3(1.6, 0.95, 1.4)));
    body = max(body, ellipsoid(q, vec3(-6.8, 1.1, -6.0), vec3(2.5, 1.15, 1.6)));
    body = max(body, ellipsoid(q, vec3(8.5, 1.4, -7.5), vec3(2.5, 1.35, 1.8)));
    body += (base - 0.5) * 1.35 + (cell - 0.5) * 0.5;
    body -= (1.0 - detail) * 0.16;
    body *= smoothstep(0.6, 1.0, q.y);
  } else if (kind == 1) {
    body = ellipsoid(q, vec3(1.9, 2.3, -1.0), vec3(2.8, 2.1, 2.0));
    body = max(body, ellipsoid(q, vec3(2.0, 4.2, -1.7), vec3(1.65, 2.4, 1.8)));
    body = max(body, ellipsoid(q, vec3(2.4, 5.8, -2.2), vec3(4.0, 0.85, 2.0)));
    body = max(body, ellipsoid(q, vec3(0.0, 1.6, 0.2), vec3(3.0, 1.05, 2.1)));
    body += (base - 0.52) * 1.5 + (cell - 0.5) * 0.5 - (1.0 - detail) * 0.14;
    body *= smoothstep(0.45, 0.8, q.y);
  } else {
    float scale = kind == 4 ? 2.1 : 1.0;
    vec3 tiled = vec3(mod(q.x * scale + 1.5, 3.0) - 1.5, q.y, mod(q.z * scale + 1.5, 3.0) - 1.5);
    body = ellipsoid(tiled, vec3(0.0, 2.2 + base * 0.65, 0.0), vec3(kind == 4 ? 1.25 : 1.55, kind == 4 ? 0.72 : 1.15, kind == 4 ? 1.22 : 1.5));
    body += (base - 0.55) * 1.8 + (cell - 0.5) * 0.32;
  }
  body += (params.y - 0.55) * 0.55 + (uDensity - 0.65) * 0.6;
  float edge = 1.0 - smoothstep(9.0, 12.0, abs(p.x));
  float baseMask = (kind == 0 || kind == 1) ? smoothstep(0.5, 0.95, q.y) : 1.0;
  return smoothstep(0.0, 0.75, body) * params.x * 1.6 * edge * baseMask;
}

vec3 skyColor(vec2 uv, float storm) {
  float dusk = smoothstep(0.45, 1.0, uSun);
  vec3 bottom = mix(vec3(0.79, 0.88, 0.90), vec3(0.97, 0.74, 0.59), dusk);
  vec3 top = mix(vec3(0.28, 0.57, 0.77), vec3(0.40, 0.46, 0.65), dusk);
  vec3 sky = mix(bottom, top, pow(clamp(uv.y, 0.0, 1.0), 0.85));
  sky = mix(sky, mix(vec3(0.53, 0.61, 0.66), vec3(0.27, 0.37, 0.45), uv.y), storm * 0.8);
  vec2 sunPosition = vec2(0.78, mix(0.83, 0.3, dusk));
  vec2 delta = (uv - sunPosition) * vec2(uResolution.x / uResolution.y, 1.0);
  sky += vec3(1.0, 0.85, 0.67) * (0.11 * exp(-dot(delta, delta) * 4.0) + 0.14 * exp(-dot(delta, delta) * 110.0)) * (1.0 - storm);
  return sky;
}

vec3 volumeCloud(vec2 uv, vec3 sky, int kind, vec3 params) {
  float aspect = uResolution.x / uResolution.y;
  float mobile = 1.0 - smoothstep(0.7, 1.3, aspect);
  vec3 ro = vec3(uPointer.x * 0.35 + mobile * 1.8, 3.2 + uPointer.y * 0.18 + mobile * 1.8, 13.8 + mobile * 2.0);
  vec3 rd = normalize(vec3((uv.x - 0.5) * aspect * 0.93, (uv.y - 0.5) * 0.93, -1.0));
  bool cloudField = kind == 3 || kind == 4;
  if (cloudField) {
    ro.y = 6.0;
    rd = normalize(vec3((uv.x - 0.5) * aspect * 0.93, (uv.y - 0.5) * 0.8 - 0.28, -1.0));
  }
  float stepLength = 21.0 / float(uSteps);
  float t = (cloudField ? 2.0 : 8.0) + hash(gl_FragCoord.xy) * stepLength * 0.18;
  float transmittance = 1.0;
  vec3 accumulated = vec3(0.0);
  vec3 sunDir = normalize(vec3(-0.65 + uSun * 1.3, 0.8 - uSun * 0.45, 0.55));
  vec3 sunColor = mix(vec3(1.04, 1.035, 1.01), vec3(1.16, 0.88, 0.67), uSun);
  for (int i = 0; i < 80; i++) {
    if (i >= uSteps || transmittance < 0.015) break;
    vec3 p = ro + rd * t;
    if (p.y > 0.0 && p.y < 7.2) {
      float d = densityAt(p, kind, params);
      if (d > 0.008) {
        float shadow = densityAt(p + sunDir * 0.35, kind, params) * 0.35;
        shadow += densityAt(p + sunDir * 0.85, kind, params) * 0.55;
        shadow += densityAt(p + sunDir * 1.65, kind, params) * 0.9;
        float sunlight = exp(-shadow * 1.65);
        float heightLight = smoothstep(0.5, 4.5, p.y);
        vec3 ambient = mix(vec3(0.42, 0.53, 0.63), vec3(0.76, 0.83, 0.88), heightLight);
        ambient *= 1.0 - params.z * 0.35;
        float silver = pow(max(dot(rd, sunDir), 0.0), 8.0) * 0.16;
        vec3 light = ambient * 0.67 + sunColor * (sunlight * 0.58 + silver);
        float opacity = 1.0 - exp(-d * stepLength * 2.35);
        accumulated += transmittance * opacity * light;
        transmittance *= 1.0 - opacity;
      }
    }
    t += stepLength;
  }
  return accumulated + sky * transmittance;
}

vec3 layeredCloud(vec2 uv, vec3 sky, int kind, vec3 params) {
  vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  p += uPointer * 0.012;
  p.x += uTime * 0.0025 * uWind;
  vec3 q = vec3(p * 0.8, uSeed * 0.173 + uTime * 0.003);
  float n = fbm(q);
  float alpha = 0.0;
  float shading = 1.0;
  if (kind == 7) {
    float bend = noise(vec3(p * 0.35, uSeed * 0.1)) * 0.6;
    vec3 fiber = vec3(p.x * 0.18 + p.y * 0.3, (p.y + bend) * 4.0, q.z);
    float strands = fbm(fiber);
    float fine = noise(fiber * vec3(0.6, 4.5, 1.0));
    alpha = smoothstep(0.44, 0.68, strands) * smoothstep(0.31, 0.57, n) * (0.6 + fine * 0.4);
    alpha *= 0.95;
  } else if (kind == 8) {
    vec2 rippled = p * vec2(7.0, 12.0);
    rippled.x += sin(p.y * 12.0) * 0.35;
    float cells = texture(uNoise, vec3(rippled * 0.2, q.z)).g;
    alpha = smoothstep(0.4, 0.68, cells) * smoothstep(0.33, 0.53, n);
  } else if (kind == 9) {
    alpha = 0.24 + n * 0.35;
    vec2 sun = vec2(0.78, mix(0.83, 0.3, smoothstep(0.45, 1.0, uSun)));
    float r = length((uv - sun) * vec2(uResolution.x / uResolution.y, 1.0));
    sky += vec3(0.16, 0.125, 0.085) * exp(-pow((r - 0.24) * 100.0, 2.0));
  } else {
    float billow = fbm(vec3(p.x * 0.34, p.y * 1.2, q.z));
    alpha = clamp(params.y + (billow - 0.5) * 0.7, 0.0, 0.99);
    shading = 0.82 + n * 0.22 - params.z * 0.33;
    if (kind == 6) shading -= (1.0 - uv.y) * 0.08;
  }
  alpha *= clamp(params.x + uDensity * 0.65, 0.0, 1.3);
  vec3 cloudColor = mix(vec3(0.96, 0.97, 0.96), vec3(1.04, 0.83, 0.70), uSun * 0.65) * shading;
  return mix(sky, cloudColor, clamp(alpha, 0.0, 0.97));
}

vec3 renderType(vec2 uv, int kind, vec3 params) {
  vec3 sky = skyColor(uv, params.z);
  vec3 color;
  if (kind == 0 || kind == 1 || kind == 3 || kind == 4) color = volumeCloud(uv, sky, kind, params);
  else color = layeredCloud(uv, sky, kind, params);
  if (kind == 1 || kind == 6) {
    vec2 rainUv = uv * vec2(uResolution.x / uResolution.y, 1.0);
    rainUv.x += rainUv.y * 0.11;
    float rain = smoothstep(0.32, 0.7, noise(vec3(rainUv.x * 12.0, rainUv.y * 0.12 + uTime * 0.028, uSeed)));
    float curtain = kind == 1 ? smoothstep(0.42, 0.54, uv.x) * (1.0 - smoothstep(0.66, 0.76, uv.x)) : 1.0;
    float veil = rain * curtain * (1.0 - smoothstep(0.15, 0.39, uv.y));
    color = mix(color, vec3(0.65, 0.72, 0.75), veil * 0.15);
  }
  return color;
}

void main() {
  vec3 color = renderType(vUv, uKind, uParams);
  if (uMorph < 0.999) color = mix(renderType(vUv, uFromKind, uFromParams), color, smoothstep(0.0, 1.0, uMorph));
  // A touch of fixed dither avoids gradient banding without temporal shimmer.
  color += (hash(gl_FragCoord.xy + 37.0) - 0.5) / 255.0;
  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
