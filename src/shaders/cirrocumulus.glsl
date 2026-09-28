// Photon density / curl adaptation. Copyright (c) 2021-2025 Benjamin Stott.
// See public/reference/photon/LICENSE.txt and public/reference/NOTICE.md.
// The projection, ripple organisation and optical-depth integration below
// are specific to cloud's ground-view atlas, not Photon's full atmosphere.
uniform sampler2D uPhotonNoise;

vec2 ccHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

vec2 ccCurl(vec2 coord) {
  vec2 i = floor(coord), f = fract(coord);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec2 g0 = ccHash(i), g1 = ccHash(i + vec2(1, 0));
  vec2 g2 = ccHash(i + vec2(0, 1)), g3 = ccHash(i + vec2(1, 1));
  float v0 = dot(g0, f), v1 = dot(g1, f - vec2(1, 0));
  float v2 = dot(g2, f - vec2(0, 1)), v3 = dot(g3, f - vec2(1, 1));
  vec2 gradient = g0 + u.x * (g1 - g0) + u.y * (g2 - g0)
    + u.x * u.y * (g0 - g1 - g2 + g3)
    + du * (u.yx * (v0 - v1 - v2 + v3) + vec2(v1, v2) - v0);
  return vec2(gradient.y, -gradient.x);
}

float ccLinearStep(float a, float b, float x) {
  return clamp((x - a) / (b - a), 0.0, 1.0);
}

float ccDensity(vec2 coord) {
  vec2 flow = coord + vec2(13.0, -9.0) * uTime * 0.15;
  vec2 curl = ccCurl(0.00002 * flow) * 0.5
    + ccCurl(0.00004 * flow) * 0.25 + ccCurl(0.00008 * flow) * 0.125;
  float weather = fbm(vec3(coord * 0.000025, uSeed * 0.173));
  float sheet = smoothstep(0.35, 0.61, weather + (uDensity - 0.65) * 0.22);
  float coverage = texture(uPhotonNoise, 0.0000026 * coord + 0.25).w;
  coverage = 5.0 * ccLinearStep(0.25, 0.9, 0.74 * coverage);
  float d = texture(uPhotonNoise, 0.000025 * coord + 0.033 * curl).w;
  d = d * (2.0 - d);
  d = ccLinearStep(1.0 - coverage, 1.00001, d);
  // Local gravity-wave bands organise the cloudlets; a slowly varying phase
  // curves/breaks the rows rather than stamping equal circles onto a grid.
  vec2 rippleCoord = mat2(0.94, -0.342, 0.342, 0.94)
    * (coord + ccCurl(flow * 0.00016) * 1500.0);
  float phase = rippleCoord.y * 0.017
    + texture(uPhotonNoise, coord * 0.000011).w * 12.0
    + ccCurl(flow * 0.00055).x * 1.4;
  float ripple = 0.5 + 0.5 * sin(phase);
  float organisation = 0.5 + 0.45 * smoothstep(0.38, 0.65, weather);
  d *= mix(1.0, 0.5 + 0.5 * ripple, organisation);
  vec2 detailCurl = ccCurl(0.001 * flow);
  float e0 = texture(uPhotonNoise, 0.000085 * coord + 0.003 * detailCurl).y;
  float e1 = texture(uPhotonNoise, 0.0003 * coord + 0.007 * detailCurl).y;
  float e2 = texture(uPhotonNoise, 0.0008 * coord + 0.03 * detailCurl).y;
  d = max(0.0, d - e0 * e0 - 0.5 * e1 * e1 - 0.1 * e2 * e2);
  return 0.072 * d * d * d * d * sheet;
}

float cirrocumulusOpacity(vec2 uv) {
  // A 50 degree vertical field of view, looking up 62 degrees. This avoids
  // the old grazing sheet projection stretching grains at the image edges.
  vec2 screen = (uv - 0.5) * 0.9326;
  screen.x *= uResolution.x / uResolution.y;
  vec3 ray = normalize(vec3(screen.x, 0.883 + screen.y * 0.469,
    -0.469 + screen.y * 0.883));
  vec2 offset = vec2(23111.0, 95127.0)
    + vec2(uSeed * 113.0, uSeed * 71.0)
    + vec2(22.0, 7.0) * uTime * uWind + uPointer * 100.0;
  float opticalDepth = 0.0;
  // Integrate through a 120 m thin cloud layer. A smooth height profile
  // leaves translucent fringes instead of thresholding a single noise slice.
  for (int i = 0; i < 4; i++) {
    float h = (float(i) + 0.5) / 4.0;
    vec2 coord = ray.xz * ((6940.0 + h * 120.0) / ray.y) + offset;
    float heightProfile = 4.0 * h * (1.0 - h);
    opticalDepth += ccDensity(coord) * heightProfile * 30.0 / ray.y;
  }
  return 1.0 - exp(-opticalDepth);
}
