# cloud

一部会呼吸的云图鉴。十种程序生成的云，在浏览器里随光与风持续演化。

## 开始

需要 Node.js 22.12+（推荐 24）和 pnpm 11.20.0。

```sh
pnpm install
pnpm dev
```

```sh
pnpm build   # 类型检查、构建到 dist/
pnpm preview # 本地预览生产构建
pnpm test    # 分享参数与三维噪声连续性测试
pnpm lint
```

## 看云

- 十个云属、按云族筛选、云种和变种资料。
- 风速、云量、日光、画质可调；暂停、随机种子、沉浸模式、PNG 导出。
- 每天有一个默认种子；分享链接保存云属、种子、天气参数、演化时间及暂停状态。
- `←` / `→` 切换云属；空格暂停；`Esc` 返回。操作输入框或按钮时快捷键不抢占焦点。
- 遵循系统的减少动态效果偏好；页面隐藏或天空离开视口时停止渲染。
- 需要 WebGL 2；不支持时展示提示，并保留完整图鉴。字体加载失败时使用系统字体。

## 实现

### 动态云实验

运行 `pnpm dev` 后打开 `/lab/`。该页面也会构建为 `dist/lab/index.html`，可随 GitHub Pages 发布到 `/cloud/lab/`。

- 体积云使用 `@takram/three-clouds`，大气使用 `@takram/three-atmosphere`。
- 卷云与卷积云移植 Photon 的密度函数、Curl Noise 和多尺度侵蚀，保留原始噪声纹理；采用薄层投影与简化光照，效果不等同于 Photon 完整渲染器。
- 风速、演化速度、云量独立控制，支持暂停、前进 30 秒、时间加速与仰角调整。风速为零时仍可观察原地演化。这里的演化是噪声场随时间变化，不是流体或天气数值模拟。
- 参考纹理约 12 MB，均随站点本地提供，首次访问需要加载。主页面不加载这些资源。
- 这是一页用于评估效果的独立实验，尚未替换首页十种云的渲染。
- 依赖版本、资产来源和 Photon 自定义许可证见 [第三方说明](public/reference/NOTICE.md)。

### 当前图鉴

Vite + TypeScript + Three.js + 自写 GLSL ES 3.0，无后端、无云照片。

- `src/engine/noise.ts`：一次性生成 64³ 可平铺的 value-fBm / Worley 噪声纹理。
- `src/shaders/sky.frag.glsl`：积云、积雨云、层积云和高积云采用体积 ray marching、太阳方向的多点遮挡采样和 Beer–Lambert 透射；层云、雨层云和高云采用轻量分层噪声。风平移和时间域扰动共同改变形态。
- 层积云与高积云分别定义三维密度场，从地面仰视采样。层积云采用较厚、底面起伏、相互融合的云层；高积云采用较薄的高度剖面、分散的云块和局部成片的排列。两者的厚度、云底、覆盖场和光照分别处理。
- 卷云用三次 Bézier 曲线构造带钩的云簇，再以细丝噪声打散轮廓和尾迹；卷积云积分数层高频密度，生成聚成薄片的不规则小云粒；卷层云使用半透明的纤维云纱，日晕只是微弱的附加光效。雨层云使用不透光的灰色云幕、局部低垂碎云与降水雾幕。主画面与缩略图共用这些形态函数。
- `src/engine/CloudRenderer.ts`：同一个 WebGL 上下文生成主天空与图鉴缩略图；36 / 56 / 80 步画质；自动降低分辨率；上下文丢失恢复。
- `src/data/clouds.ts`：十个云属的数据与渲染预设。
- `src/lib/state.ts`：经过范围校验的 URL 状态。

当前为云属层面的艺术模拟，不是数值天气模型，也不是物理精确的大气散射。云种标签展示辨识资料，暂不单独改变渲染预设。没有闪电闪光，以保持安静的观看体验。


## 云资料

按 [WMO 国际云图集](https://cloudatlas.wmo.int/en/clouds-genera.html) 校订。中文名称附云属缩写，云种附拉丁名，方便对照图集。

**高度口径：** 表中采用中纬度的典型云层范围，单位为米，不是每个云属固定的云底或云顶高度。积云、积雨云单独注明云底，云顶可伸入中、高层；雨层云可跨越多个高度层。高云在极地约为 3,000–8,000 m，在热带约为 6,000–18,000 m，不能把中纬度数值套用到所有地区。参见 [WMO 云层高度](https://cloudatlas.wmo.int/en/some-useful-concepts-levels.html)。

**分类口径：** “种类”指云种（species），“变种”指排列或透光性质（varieties）；同一云属不同种可具有不同的变种，并非表中所有种与变种都能任意组合。“无”表示 WMO 未划分该类别。种类与种类特点按编号对应。参见 [云种对照表](https://cloudatlas.wmo.int/en/clouds-species-and-genera-most-frequently-occur-table.html)和 [变种对照表](https://cloudatlas.wmo.int/en/clouds-varieties-and-genera-most-frequently-occur-table.html)。

| 云                                                                          | 典型高度（m，中纬度参考）                                                    | 形成区域                           | 落地降水                                         | 简介                                                                                                                                                         | 种类                                                                                                                                 | 种类特点                                                                                                                                                                                                                   | 变种                                                                                                            |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [积云 Cu](https://cloudatlas.wmo.int/en/clouds-genera-cumulus.html)         | 云底通常在低层，约 0–2,000；云顶可进入中、高层                               | 世界各地；常见于对流发展的区域     | 通常无；浓积云可产生阵雨，寒冷条件下也可有阵雪等 | 单独或成群的云块，轮廓较清晰；顶部呈山丘、圆拱或塔状向上发展，受光部分明亮，云底较暗且较平坦。                                                               | ① 淡积云 humilis<br>② 中积云 mediocris<br>③ 浓积云 congestus<br>④ 碎积云 fractus                                                     | ① 垂直发展弱，通常宽大于高，不产生降水<br>② 垂直发展中等，顶部有小凸起<br>③ 垂直发展旺盛，塔状或花椰菜状，可产生阵性降水<br>④ 轮廓破碎、不断变化，也可出现在降水云下方                                                     | 辐射状 radiatus                                                                                                 |
| [积雨云 Cb](https://cloudatlas.wmo.int/en/clouds-genera-cumulonimbus.html)  | 云底通常在低层，约 0–2,000；云顶可达对流层顶附近                             | 世界多地，热带和温带对流活跃区常见 | 阵雨或雷阵雨，可很强；可能有冰雹、阵雪或霰       | 垂直发展强烈的厚重云体，像高山或巨塔；云底常很暗，顶部可由冰晶形成纤维状结构，并向外铺展成砧状。常伴雷电，但并非每次都有冰雹。                               | ① 秃积雨云 calvus<br>② 鬃积雨云 capillatus                                                                                           | ① 顶部开始失去清晰的积状轮廓，呈较平滑的白色云体，尚无明显纤维状结构<br>② 顶部具有明显纤维状或条纹状结构，可呈砧状、羽毛状或乱发状                                                                                         | 无（砧状 incus 属附属特征）                                                                                     |
| [层云 St](https://cloudatlas.wmo.int/en/clouds-genera-stratus.html)         | 低层，约 0–2,000                                                             | 世界各地，湿润沿岸、山地等处常见   | 可有毛毛雨、小雪或雪粒                           | 云底通常较均匀的灰色低云层，也可呈破碎云片；形成高度很低。近地面的类似水滴悬浮现象称为雾，不能把所有雾或霭直接等同于层云。                                   | ① 雾状层云 nebulosus<br>② 碎层云 fractus                                                                                             | ① 无明显细节的均匀灰色云层<br>② 不规则、破碎的云片，可出现在降水云下方                                                                                                                                                     | 蔽光 opacus、透光 translucidus、波状 undulatus                                                                  |
| [层积云 Sc](https://cloudatlas.wmo.int/en/clouds-genera-stratocumulus.html) | 低层，约 0–2,000                                                             | 世界各地                           | 偶有小雨、小雪或霰（雪丸）                       | 白色至灰色的低云片或云层，由较大的圆块、团块或滚轴状单元构成，通常有暗部；云块可以相连，也可留有缝隙，云底轮廓较明确。                                       | ① 层状层积云 stratiformis<br>② 荚状层积云 lenticularis<br>③ 堡状层积云 castellanus<br>④ 絮状层积云 floccus<br>⑤ 滚轴状层积云 volutus | ① 云块或滚轴状单元组成大片云层<br>② 平滑的杏仁状或透镜状云体<br>③ 共同云底上排列着塔状、城垛状凸起<br>④ 一簇簇积状云团，底部破碎，可有幡状降水<br>⑤ 与其他云分离的长条水平管状云，外观像绕水平轴滚动                       | 蔽光 opacus、透光 translucidus、漏光 perlucidus、重叠 duplicatus、波状 undulatus、辐射 radiatus、网状 lacunosus |
| [高积云 Ac](https://cloudatlas.wmo.int/en/clouds-genera-altocumulus.html)   | 中层，约 2,000–7,000                                                         | 世界各地                           | 通常无；可有未落地的幡状降水                     | 由较小云块组成的白色或灰色云片、云层，可呈圆块、滚轴或透镜状，通常带有阴影。主要由水滴组成，也可含冰晶；云块的排列、厚度和阴影均可变化。                     | ① 层状高积云 stratiformis<br>② 荚状高积云 lenticularis<br>③ 堡状高积云 castellanus<br>④ 絮状高积云 floccus<br>⑤ 滚轴状高积云 volutus | ① 成片或成层分布，可覆盖较大天空范围<br>② 杏仁状或透镜状，轮廓通常清晰，可有阴影<br>③ 共同云底上伸出城垛状小塔<br>④ 一簇簇云团，底部破碎，常伴幡状降水<br>⑤ 独立的长条水平管状云，在高积云中少见                           | 蔽光 opacus、透光 translucidus、漏光 perlucidus、重叠 duplicatus、波状 undulatus、辐射 radiatus、网状 lacunosus |
| [高层云 As](https://cloudatlas.wmo.int/en/clouds-genera-altostratus.html)   | 通常在中层，约 2,000–7,000；可向更高处延伸                                   | 世界各地，中纬度天气系统中常见     | 可有雨、雪或冰粒；也可能在到达地面前蒸发或升华   | 灰色或带蓝灰色的广阔云层，可有条纹、纤维或较均匀的外观，由水滴和冰晶等组成。薄处透出的太阳像隔着磨砂玻璃，厚处可遮住太阳；不产生晕现象。                     | 无                                                                                                                                   | 不按云种细分；透光程度和排列特征列入变种                                                                                                                                                                                   | 蔽光 opacus、透光 translucidus、重叠 duplicatus、波状 undulatus、辐射 radiatus                                  |
| [雨层云 Ns](https://cloudatlas.wmo.int/en/clouds-genera-nimbostratus.html)  | 通常涉及中层（约 2,000–7,000），并常向低层和高层延伸；不宜用单一云底区间概括 | 世界各地，中纬度天气系统中常见     | 持续性雨或雪，也可有冰粒；不一定都是强降水       | 厚而广阔的灰暗云层，足以遮蔽太阳或月亮；连续降水使云底显得模糊、散漫。下方常有更低、更暗的碎云，可与主云层合并。覆盖面积和垂直厚度变化很大，没有固定面积。   | 无                                                                                                                                   | 不按云种细分；下方碎云不属于雨层云的云种                                                                                                                                                                                   | 无                                                                                                              |
| [卷云 Ci](https://cloudatlas.wmo.int/en/clouds-genera-cirrus.html)          | 高层，约 5,000–13,000                                                        | 世界各地                           | 通常无                                           | 由冰晶组成的高云，呈分离的细丝、斑块或带状，常有纤维感、丝绢光泽。钩状只是部分云种的特征，并非所有卷云都弯卷；可出现局部晕现象。                             | ① 毛卷云 fibratus<br>② 钩卷云 uncinus<br>③ 密卷云 spissatus<br>④ 堡卷云 castellanus<br>⑤ 絮卷云 floccus                              | ① 细丝较直或不规则弯曲，末端没有明显钩状结构<br>② 末端呈钩或逗点状，上端可有小簇<br>③ 较厚，向太阳方向看可显灰色，也可由积雨云云砧演变而来<br>④ 共同云底上有塔状、城垛状凸起<br>⑤ 小绒毛团状，底部破碎，常有下垂的冰晶尾迹 | 乱卷 intortus、辐射 radiatus、脊状 vertebratus、重叠 duplicatus                                                 |
| [卷积云 Cc](https://cloudatlas.wmo.int/en/clouds-genera-cirrocumulus.html)  | 高层，约 5,000–13,000                                                        | 世界各地                           | 通常无；可有幡状降水                             | 薄而白的云片或云层，由很小的颗粒、波纹等单元组成，从地面看通常无明显阴影。云粒可相连或分离，常排列成涟漪状；并非均匀铺满天空的相同圆点。                     | ① 层状卷积云 stratiformis<br>② 荚状卷积云 lenticularis<br>③ 堡状卷积云 castellanus<br>④ 絮状卷积云 floccus                           | ① 小颗粒组成较广的云片或云层<br>② 杏仁状或透镜状，轮廓较清晰<br>③ 共同云底上伸出小塔或城垛状凸起<br>④ 小簇状云团，云底参差不齐                                                                                             | 波状 undulatus、网状 lacunosus                                                                                  |
| [卷层云 Cs](https://cloudatlas.wmo.int/en/clouds-genera-cirrostratus.html)  | 高层，约 5,000–13,000                                                        | 世界各地                           | 通常无                                           | 由冰晶组成的透明、乳白色云纱，可呈纤维状或平滑外观，覆盖部分或全部天空；常较薄而不易察觉，能在太阳或月亮周围形成晕。云纱本身是辨识主体，晕是伴随的光学现象。 | ① 毛卷层云（纤维状）fibratus<br>② 雾状卷层云 nebulosus                                                                               | ① 云纱中能辨认出精细纤维<br>② 较均匀的薄纱，无明显结构细节                                                                                                                                                                 | 波状 undulatus、重叠 duplicatus                                                                                 |

补充 WMO 所列的絮状层积云及层积云、高积云中的滚轴状云种。高层云与雨层云未划分云种，积雨云未划分变种。幡状降水指未到达地面的降水尾迹，不能算作落地降水。降水类型可对照 [WMO 云属与降水对应表](https://cloudatlas.wmo.int/en/Associated-cloud-forms-table.html)；幡状降水见 [WMO 定义](https://cloudatlas.wmo.int/clouds-supplementary-features-virga.html)。

### 形态参照

以下图集用于观察形态，照片不作为网站贴图使用：

- **层积云**：[Houze 云图集](https://atmos.uw.edu/~gcg/Atlas/stratocu.html)。本预设选择底面有阴影、云块常相互连接的厚层形态。
- **高积云**：[英国气象局中云实拍与说明](https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/clouds/mid-level-clouds)、[Houze 云图集](https://atmos.uw.edu/~gcg/Atlas/altocu.html)。本预设选择带灰色底部、薄而分散的云块。高积云和层积云的实际形态也可能相似，不能只凭这一组预设辨识所有情况。
- **卷云**：[WMO 定义](https://cloudatlas.wmo.int/en/clouds-genera-cirrus.html)、[钩卷云](https://cloudatlas.wmo.int/en/clouds-species-uncinus.html)、[英国气象局高云实拍与说明](https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/clouds/high-clouds)。当前预设突出钩状头部与渐散的纤维尾迹；并非所有卷云都有钩。
- **卷积云**：[WMO 定义](https://cloudatlas.wmo.int/en/clouds-genera-cirrocumulus.html)、[华盛顿大学 Houze 云图集实拍](https://atmos.uw.edu/~gcg/Atlas/phot_cicu01.html)。细小、少阴影的颗粒聚成薄片，可有涟漪排列；多数云粒视角小于 1°。
- **卷层云**：[Houze 云图集](https://atmos.uw.edu/~gcg/Atlas/cist.html)。表现覆盖天空的乳白色薄纱与纤维层次，透出日光；日晕不能代替云体。
- **雨层云**：[WMO 定义](https://cloudatlas.wmo.int/en/clouds-genera-nimbostratus.html)、[Houze 云图集实拍](https://atmos.uw.edu/~gcg/Atlas/ns.html)。连续、厚重、漫散的灰暗云层遮蔽太阳，降水模糊云底；下方可有更暗的碎云。保持柔和层次，不以强烈翻卷的积状云块代替。

