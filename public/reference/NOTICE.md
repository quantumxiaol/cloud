# Dynamic cloud reference implementation

The `/lab/` page is an experiment, not ten scientifically validated cloud presets.

## Takram

- https://github.com/takram-design-engineering/three-geospatial
- @takram/three-clouds 0.7.6, atmosphere 0.19.1, geospatial 0.9.1.
- MIT license: [takram/LICENSE.txt](takram/LICENSE.txt).
- Cloud assets: revision 45a1c6c1bb9fd38b3680fd120795ff4c32df68ff.
- Atmosphere lookup tables: revision eac103980f20c0956f2d3215833e73514be08462.
- STBN data: revision 9627216cc50057994c98a2118f3c4a23765d43b9.
- STBN texture data originates from NVIDIA's Spatiotemporal Blue Noise SDK: https://github.com/NVIDIA-RTX/STBN. Its upstream [license](takram/STBN-LICENSE.txt) is included separately; do not assume this asset is covered by Takram's MIT license.
- Volume rendering follows the official vanilla Three.js example. The application integrates wind and evolution offsets separately, with explicit pause, time scaling and stepping.

## Photon

- Copyright (c) 2021-2025 Benjamin Stott (SixthSurge).
- https://github.com/sixthsurge/photon
- Source revision: 15458c0937f8647c37eb6a501bef5eb3bf3da31b.
- Source files: `shaders/include/sky/clouds/cirrus.glsl`, `common.glsl`, `shaders/include/utility/random.glsl`, `shaders/image/noise.png`.
- Full custom license: [photon/LICENSE.txt](photon/LICENSE.txt). Photon code/assets are not MIT licensed. Redistribution is subject to the upstream license, including its monetization restrictions.
- `src/lab/photon.frag.glsl` adapts the cirrus and cirrocumulus density functions and curl noise, retaining the original noise texture. Independent evolution time, browser coordinates, a thin layer and simplified lighting are adaptations. This does not reproduce Photon's complete lighting pipeline or imply identical visuals.
- Gradient-noise derivative credited upstream to Inigo Quilez: https://iquilezles.org/articles/gradientnoise/
- Hash credited upstream to Dave Hoskins: https://www.shadertoy.com/view/4djSRW

All reference assets are served locally; the experiment makes no runtime requests to GitHub or other external asset hosts.
