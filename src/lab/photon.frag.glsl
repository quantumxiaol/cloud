// Density model adapted from Photon by Benjamin Stott (SixthSurge).
// Source revision and full license: public/reference/NOTICE.md, photon/LICENSE.txt.
// Retains the source's curl field and multiscale erosion; adds independent
// evolution time. This browser port uses a thin layer and simplified lighting,
// not Photon's complete Minecraft renderer.
uniform sampler2D noiseTexture;
uniform mat4 cameraWorld;
uniform mat4 inverseProjection;
uniform float windTime;
uniform float evolutionTime;
uniform float amount;
uniform int cloudKind;

vec2 hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
vec2 curl2D(vec2 coord) {
  vec2 i = floor(coord), f = fract(coord);
  vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
  vec2 du = 30.0*f*f*(f*(f-2.0)+1.0);
  vec2 g0=hash2(i), g1=hash2(i+vec2(1,0));
  vec2 g2=hash2(i+vec2(0,1)), g3=hash2(i+vec2(1,1));
  float v0=dot(g0,f), v1=dot(g1,f-vec2(1,0));
  float v2=dot(g2,f-vec2(0,1)), v3=dot(g3,f-vec2(1,1));
  vec2 gradient=g0+u.x*(g1-g0)+u.y*(g2-g0)+u.x*u.y*(g0-g1-g2+g3)
    +du*(u.yx*(v0-v1-v2+v3)+vec2(v1,v2)-v0);
  return vec2(gradient.y,-gradient.x);
}
float linearStep(float a, float b, float x) { return clamp((x-a)/(b-a),0.0,1.0); }
float densityAt(vec2 coord) {
  coord += vec2(23111.0,95127.0) + vec2(40.0, 12.0)*windTime;
  vec2 flow=coord+vec2(13.0,-9.0)*evolutionTime;
  vec2 curl=curl2D(.00002*flow)*.5+curl2D(.00004*flow)*.25+curl2D(.00008*flow)*.125;
  if (cloudKind == 1) {
    float d=.7*texture(noiseTexture,.000001*coord+.004*curl).x
      +.3*texture(noiseTexture,.000008*coord+.008*curl).x;
    d=linearStep(.7-amount,1.0,d);
    float amplitude=.2, frequency=.00002, strength=.1;
    vec2 detailCoord=coord;
    for(int i=0;i<4;i++) {
      d-=texture(noiseTexture,detailCoord*frequency+curl*strength).x*amplitude;
      amplitude*=.6; frequency*=2.0; strength*=4.0;
      detailCoord+=vec2(12.0,3.6)*evolutionTime;
    }
    return .375*pow(max(d,0.0),3.0);
  }
  float coverage=texture(noiseTexture,.0000026*coord+.25).w;
  coverage=5.0*linearStep(.25,.9,amount*coverage);
  float d=texture(noiseTexture,.000025*coord+.033*curl).w;
  d=d*(2.0-d);
  d=linearStep(1.0-coverage,1.0+0.00001,d);
  vec2 cc=curl2D(.001*flow);
  d-=pow(texture(noiseTexture,.00005*coord+.003*cc).y,2.0);
  d-=.5*pow(texture(noiseTexture,.0002*coord+.007*cc).y,2.0);
  d-=.1*pow(texture(noiseTexture,.0008*coord+.03*cc).y,2.0);
  return .3*pow(max(d,0.0),4.0);
}
void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor) {
  outputColor=inputColor;
  if(cloudKind==0) return;
  vec3 worldRay=normalize(mat3(cameraWorld)*(inverseProjection*vec4(uv*2.0-1.0,1,1)).xyz);
  // Local frame: east=X, up=Y, north=-Z.
  vec3 ray=vec3(worldRay.x,worldRay.y,-worldRay.z);
  if(ray.y<=.015) return;
  vec2 coord=ray.xz*(6000.0/ray.y);
  float density=densityAt(coord);
  float optical=density*220.0/max(ray.y,.15);
  float alpha=1.0-exp(-optical);
  float shadow=0.0;
  for(int i=1;i<=5;i++) shadow+=densityAt(coord+vec2(-130.0,210.0)*float(i));
  // Approximate thin ice-cloud scattering in the atmosphere's linear HDR space.
  vec3 light=mix(vec3(.055,.073,.10),vec3(.14,.145,.15),exp(-shadow*12.0));
  float haze=exp(-length(coord)*.000008);
  outputColor=vec4(mix(inputColor.rgb,light,alpha*haze),inputColor.a);
}
