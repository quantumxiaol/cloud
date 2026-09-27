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

// Cloud decks are sampled from below, in world space. Their horizontal
// structure and thickness are different, not scaled copies of a tiled puff.
float stratocumulusDensity(vec3 p) {
  p.x += uTime * 0.024 * uWind;
  vec3 seed = vec3(uSeed * 0.173, uSeed * 0.071, uSeed * 0.113);
  vec3 q = p * vec3(0.16, 0.23, 0.11) + seed;
  float weather = fbm(vec3(p.xz * 0.035, seed.z));
  float rolls = noise(vec3(p.x * 0.08, p.z * 0.18, seed.x));
  q += vec3(0.0, uTime * 0.0006, 0.0);
  float mass = fbm(q) * 0.72 + texture(uNoise, q * 0.65).g * 0.28;
  float underside = texture(uNoise, vec3(p.xz * 0.14, seed.y)).g;
  float base = 3.0 - underside * 1.2 + (rolls - 0.5) * 0.35;
  float top = 4.1 + rolls * 1.2;
  float profile = smoothstep(base, base + 0.24, p.y) * (1.0 - smoothstep(top - 0.45, top, p.y));
  float shape = mass + (weather - 0.5) * 0.7 + (rolls - 0.5) * 0.2;
  shape += (noise(q * 4.5) - 0.5) * 0.16 + (noise(q * 10.0) - 0.5) * 0.05;
  return smoothstep(0.39 - (uDensity - 0.65) * 0.13, 0.52, shape) * profile * 1.65;
}

float altocumulusDensity(vec3 p) {
  p.x += uTime * 0.033 * uWind;
  vec3 seed = vec3(uSeed * 0.173, uSeed * 0.071, uSeed * 0.113);
  vec2 plane = mat2(0.94, -0.34, 0.34, 0.94) * p.xz;
  float weather = fbm(vec3(plane * 0.055, seed.z));
  float wave = noise(vec3(plane * vec2(0.05, 0.23), seed.x));
  vec3 q = vec3(plane.x * 0.19, p.y * 0.42, plane.y * 0.17) + seed;
  float lobes = texture(uNoise, q * 0.8).g * 0.48 + fbm(q) * 0.52;
  float erosion = noise(q * 4.3 + vec3(0.0, uTime * 0.001, 0.0));
  float middle = 6.2 + (wave - 0.5) * 0.4;
  float profile = 1.0 - smoothstep(0.08, 0.55, abs(p.y - middle));
  float shape = lobes + (weather - 0.5) * 0.7 + (wave - 0.5) * 0.2 - (1.0 - profile) * 0.28;
  shape += (erosion - 0.5) * 0.15 + (noise(q * 9.0) - 0.5) * 0.06;
  return smoothstep(0.41 - (uDensity - 0.65) * 0.12, 0.55, shape) * profile * 2.1;
}

float densityAt(vec3 p, int kind, vec3 params) {
  if (kind == 3) return stratocumulusDensity(p);
  if (kind == 4) return altocumulusDensity(p);
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
  } else body = 0.0;
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
  float entry = 8.0;
  float exitDistance = 29.0;
  if (cloudField) {
    ro = vec3(uPointer * 0.1, 0.0).xzy;
    vec3 forward = vec3(0.0, 0.766, -0.643);
    vec3 up = vec3(0.0, 0.643, 0.766);
    rd = normalize(forward + up * (uv.y - 0.5) * 1.05 + vec3((uv.x - 0.5) * aspect * 1.05, 0.0, 0.0));
    entry = (kind == 3 ? 1.5 : 5.2) / rd.y;
    exitDistance = (kind == 3 ? 5.4 : 7.2) / rd.y;
  }
  float stepLength = (exitDistance - entry) / float(uSteps);
  float t = entry + hash(gl_FragCoord.xy) * stepLength * 0.18;
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
        float heightLight = kind == 3 ? smoothstep(2.2, 5.3, p.y) : kind == 4 ? smoothstep(5.6, 6.9, p.y) : smoothstep(0.5, 4.5, p.y);
        vec3 ambient = mix(vec3(0.42, 0.53, 0.63), vec3(0.76, 0.83, 0.88), heightLight);
        if (kind == 3) ambient = mix(vec3(0.58, 0.64, 0.70), vec3(0.78, 0.83, 0.88), heightLight);
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

// Cubic fallstreaks turn back at their heads. The body is porous and soft;
// fine fibres modulate it instead of drawing parallel lines across the sky.
vec2 fallstreak(float t, vec2 a, vec2 b, vec2 c, vec2 d) {
  float v = 1.0 - t;
  return v*v*v*a + 3.0*v*v*t*b + 3.0*v*t*t*c + t*t*t*d;
}
float cirrusOpacity(vec2 p) {
  float opacity = 0.0;
  float z = uSeed * 0.173 + uTime * 0.0012;
  float spacing = mix(0.72, 1.18, smoothstep(0.65, 1.6, uResolution.x / uResolution.y));
  for (int i = 0; i < 6; i++) {
    float id = float(i);
    vec2 random = vec2(hash(vec2(id + 1.0, uSeed)), hash(vec2(uSeed, id + 19.0)));
    vec2 center = vec2((mod(id, 3.0) - 1.0) * spacing, (floor(id / 3.0) - 0.5) * 0.55);
    center += (random - 0.5) * vec2(spacing * 0.6, 0.24);
    vec2 q = p - center;
    q.x = mod(q.x + spacing * 1.5, spacing * 3.0) - spacing * 1.5;
    float angle = (random.x - 0.5) * 0.7;
    q = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * q;
    q /= mix(0.75, 1.15, random.y) * sqrt(spacing / 1.18);
    vec2 a = vec2(-0.65, -0.20);
    vec2 b = vec2(0.18 + random.x * 0.36, -0.13 - random.y * 0.35);
    vec2 c = vec2(0.10 + random.y * 0.38, 0.18 + random.x * 0.40);
    vec2 d = vec2(-0.20 + random.x * 0.20, 0.10 + random.y * 0.18);
    float envelope = 0.0;
    float fringe = 0.0;
    float grain = fbm(vec3(q * vec2(3.5, 8.0), z + id * 0.37));
    vec2 previous = a;
    for (int j = 1; j <= 18; j++) {
      float t = float(j) / 18.0;
      vec2 next = fallstreak(t, a, b, c, d);
      vec2 segment = next - previous;
      float f = clamp(dot(q - previous, segment) / dot(segment, segment), 0.0, 1.0);
      vec2 delta = q - (previous + segment * f);
      float distanceSquared = dot(delta, delta);
      float along = (float(j - 1) + f) / 18.0;
      float width = (0.025 + along * 0.024 + 0.018 * exp(-pow((along - 0.72) * 5.0, 2.0))) * (0.65 + grain * 0.9);
      float taper = smoothstep(0.0, 0.23, along) * (1.0 - smoothstep(0.94, 1.04, along));
      envelope = max(envelope, exp(-distanceSquared / (width * width * 2.0)) * taper);
      fringe = max(fringe, exp(-distanceSquared / (width * width * 5.5)) * taper);
      previous = next;
    }
    float fibres = noise(vec3(q * vec2(1.7, 16.0), z + id));
    float cloud = envelope * (0.2 + smoothstep(0.26, 0.68, grain) * 0.75) * (0.55 + fibres * 0.55);
    cloud += fringe * smoothstep(0.38, 0.65, grain) * 0.25;
    opacity = 1.0 - (1.0 - opacity) * (1.0 - cloud * 0.9);
  }
  return opacity;
}

// A thin, broken high sheet. Integrate several turbulent density slices;
// no nearest-cell distance field, circular stamps or geometric lattice.
float cirrocumulusOpacity(vec2 p, vec2 uv) {
  float depth = 0.85 + uv.y * 0.65;
  vec2 sheet = vec2(p.x / depth, 1.1 / depth);
  float z = uSeed * 0.173 + uTime * 0.001;
  sheet = mat2(0.96, -0.28, 0.28, 0.96) * sheet;
  vec2 drift = vec2(uSeed * 0.071, uSeed * 0.113);
  vec2 q = sheet + drift;
  float weather = fbm(vec3(p * vec2(0.45, 0.65), z + 0.7));
  float coverage = smoothstep(0.32 - (uDensity - 0.65) * 0.15, 0.57, weather);
  float waves = noise(vec3(q * vec2(0.6, 6.0), z));
  float opticalDepth = 0.0;
  for (int i = 0; i < 4; i++) {
    vec3 samplePoint = vec3(q * vec2(13.0, 19.5), z + float(i) * 0.019);
    float shape = noise(samplePoint) * 0.58 + noise(samplePoint * 2.17 + 0.37) * 0.29 + noise(samplePoint * 4.1 + 0.71) * 0.13;
    shape += (waves - 0.5) * 0.18;
    opticalDepth += smoothstep(0.40, 0.61, shape) * 0.65;
  }
  return (1.0 - exp(-opticalDepth)) * coverage;
}

vec3 cirrostratusCloud(vec2 uv, vec2 p, vec3 sky) {
  float z = uSeed * 0.173 + uTime * 0.001;
  float broad = fbm(vec3(p * vec2(0.35, 0.65), z));
  vec2 q = p + vec2(broad * 0.08, noise(vec3(p * 0.7, z + 0.4)) * 0.06);
  float silk = fbm(vec3(q * vec2(0.65, 3.1), z + 1.2));
  float grain = noise(vec3(q * 6.0, z));
  float ice = smoothstep(0.39, 0.61, silk + (grain - 0.5) * 0.1);
  float thickness = 0.15 + broad * 0.35 + ice * 1.1;
  float alpha = 1.0 - exp(-thickness * (0.65 + uDensity));
  vec3 veilColor = mix(vec3(0.92, 0.95, 0.97), vec3(0.99, 0.86, 0.77), uSun * 0.55);
  vec3 color = mix(sky, veilColor, alpha);
  vec2 sun = vec2(0.78, mix(0.83, 0.3, smoothstep(0.45, 1.0, uSun)));
  vec2 delta = (uv - sun) * vec2(uResolution.x / uResolution.y, 1.0);
  float radius = length(delta);
  // A faint, uneven halo in the veil, with a visible diffused sun at its centre.
  float halo = exp(-pow((radius - 0.27) / 0.022, 2.0)) * (0.45 + broad * 0.55);
  color += vec3(0.035, 0.030, 0.021) * halo;
  color += vec3(0.12, 0.115, 0.10) * exp(-dot(delta, delta) * 850.0);
  return color;
}

// An opaque, diffuse rain-bearing deck, with darker pannus beneath it.
// Keep the contrast restrained: nimbostratus is not a field of storm towers.
vec3 nimbostratusCloud(vec2 uv, vec2 p) {
  float z = uSeed * 0.173 + uTime * 0.001;
  vec2 warp = vec2(noise(vec3(p * 0.36, z)), noise(vec3(p * 0.4 + 0.37, z + 0.5))) - 0.5;
  vec2 q = p + warp * 0.45;
  float deck = fbm(vec3(q * vec2(0.5, 0.9), z));
  float folds = fbm(vec3(q * vec2(1.0, 2.5), z + 0.7));
  float detail = noise(vec3(q * 5.5, z + 0.3));
  float ceiling = smoothstep(0.22, 0.83, uv.y + (deck - 0.5) * 0.4);
  vec3 color = mix(vec3(0.66, 0.71, 0.73), vec3(0.40, 0.46, 0.51), ceiling);
  color += (deck - 0.5) * 0.22 + (folds - 0.5) * 0.15 + (detail - 0.5) * 0.022;
  vec2 scud = q * vec2(1.15, 2.8) + vec2(uTime * 0.0018 * uWind, 0.0);
  float ragged = fbm(vec3(scud, z + 1.7));
  float underside = smoothstep(0.46, 0.66, ragged + (detail - 0.5) * 0.12);
  underside *= smoothstep(0.34, 0.61, noise(vec3(p * 0.4, z + 4.1)));
  float scudHeight = smoothstep(0.18, 0.5, uv.y) * (1.0 - smoothstep(0.65, 1.0, uv.y));
  color -= underside * scudHeight * (0.10 + uDensity * 0.07);
  vec2 rain = vec2(p.x + p.y * 0.13, p.y);
  float curtain = fbm(vec3(rain * vec2(1.8, 0.14), z + 2.3));
  float streaks = noise(vec3(rain.x * 18.0, rain.y * 0.32 + uTime * 0.012, z));
  float haze = (1.0 - smoothstep(0.05, 0.65, uv.y)) * (0.2 + curtain * 0.35);
  color = mix(color, vec3(0.69, 0.74, 0.76) + (streaks - 0.5) * 0.028, haze);
  color *= 1.0 - (uDensity - 0.65) * 0.16;
  return color * mix(vec3(1.0), vec3(1.04, 0.97, 0.93), uSun);
}

vec3 layeredCloud(vec2 uv, vec3 sky, int kind, vec3 params) {
  vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  p += uPointer * 0.012;
  p.x += uTime * 0.0025 * uWind;
  if (kind == 6) return nimbostratusCloud(uv, p);
  if (kind == 9) return cirrostratusCloud(uv, p, sky);
  vec3 q = vec3(p * 0.8, uSeed * 0.173 + uTime * 0.003);
  float n = fbm(q);
  float alpha = 0.0;
  float shading = 1.0;
  if (kind == 7) {
    alpha = cirrusOpacity(p);
  } else if (kind == 8) {
    alpha = cirrocumulusOpacity(p, uv);
  } else {
    float billow = fbm(vec3(p.x * 0.34, p.y * 1.2, q.z));
    alpha = clamp(params.y + (billow - 0.5) * 0.7, 0.0, 0.99);
    shading = 0.82 + n * 0.22 - params.z * 0.33;
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
  if (kind == 1) {
    vec2 rainUv = uv * vec2(uResolution.x / uResolution.y, 1.0);
    rainUv.x += rainUv.y * 0.11;
    float rain = smoothstep(0.32, 0.7, noise(vec3(rainUv.x * 12.0, rainUv.y * 0.12 + uTime * 0.028, uSeed)));
    float curtain = smoothstep(0.42, 0.54, uv.x) * (1.0 - smoothstep(0.66, 0.76, uv.x));
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
