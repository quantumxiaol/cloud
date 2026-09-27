export type CloudFamily = 'low' | 'middle' | 'high' | 'vertical'

export interface CloudSpecies {
  name: string
  latin: string
  description: string
}

export interface Cloud {
  id: string
  name: string
  latin: string
  abbreviation: string
  family: CloudFamily
  altitude: string
  altitudeLabel: string
  range: [number, number]
  region: string
  precipitation: string
  tagline: string
  description: string
  observation: string
  species: CloudSpecies[]
  varieties: string[]
  kind: number
  density: number
  coverage: number
  storm: number
}

export const familyLabels: Record<CloudFamily, string> = {
  low: '低云',
  middle: '中云',
  high: '高云',
  vertical: '垂直发展云',
}

export const clouds: Cloud[] = [
  {
    id: 'cumulus',
    name: '积云',
    latin: 'Cumulus',
    abbreviation: 'Cu',
    family: 'vertical',
    altitude: '600–2,000',
    altitudeLabel: '典型云底高度',
    range: [0.6, 2],
    region: '广泛分布，晴朗的陆地上空尤为常见',
    precipitation: '通常无降水，浓积云可带来阵雨',
    tagline: '天空中，缓慢生长的棉花岛。',
    description:
      '一朵一朵，轮廓分明。积云的顶部像山丘或花椰菜，底部却往往平坦。阳光照亮洁白的云顶，阴影留在下方；暖空气上升，让这些漂浮的小岛慢慢生长。',
    observation: '晴天午后，找一片平坦的云底。向上鼓起的白色轮廓，是暖空气正在上升的痕迹。',
    species: [
      { name: '淡积云', latin: 'humilis', description: '宽大于高，垂直发展弱，通常不产生降水。' },
      { name: '中积云', latin: 'mediocris', description: '高度与宽度相仿，云顶逐渐隆起。' },
      { name: '浓积云', latin: 'congestus', description: '向上发展成高塔，可能带来短时阵雨。' },
      { name: '碎积云', latin: 'fractus', description: '轮廓破碎，随风改变，有时出现在降水云下。' },
    ],
    varieties: ['辐射状'],
    kind: 0,
    density: 0.78,
    coverage: 0.55,
    storm: 0,
  },
  {
    id: 'stratocumulus',
    name: '层积云',
    latin: 'Stratocumulus',
    abbreviation: 'Sc',
    family: 'low',
    altitude: '600–2,000',
    altitudeLabel: '典型云底高度',
    range: [0.6, 2],
    region: '世界各地，海洋和沿岸地区常见',
    precipitation: '偶有小雨、小雪或雪丸',
    tagline: '连成一片的，柔软起伏。',
    description:
      '白色与灰色的大云块彼此相连，铺成一片有起伏的天空。有时像滚轴般排列，有时在云块之间露出蓝色缝隙；明暗相间的云底，是它的辨认线索。',
    observation: '伸出手臂，单个云块常比三根手指还宽。云块较大，又有清晰阴影，多半是层积云。',
    species: [
      { name: '层状层积云', latin: 'stratiformis', description: '块状或滚轴状云体铺成一层。' },
      { name: '荚状层积云', latin: 'lenticularis', description: '形似杏仁或透镜，边缘平滑。' },
      { name: '堡状层积云', latin: 'castellanus', description: '共同云底上冒出城堡垛口般的云塔。' },
    ],
    varieties: ['蔽光', '透光', '漏光', '重叠', '波状', '辐射状', '网状'],
    kind: 3,
    density: 0.73,
    coverage: 0.67,
    storm: 0.12,
  },
  {
    id: 'stratus',
    name: '层云',
    latin: 'Stratus',
    abbreviation: 'St',
    family: 'low',
    altitude: '0–2,000',
    altitudeLabel: '典型云底高度',
    range: [0, 2],
    region: '世界各地，沿岸、山地与湿润地区',
    precipitation: '偶有毛毛雨、雪粒或小雪',
    tagline: '一层低低的云，把天空放轻。',
    description:
      '层云像一块均匀的灰色薄毯，低低地铺在天空，边界朦胧。它的云底有时很接近地面；当类似的悬浮小水滴出现在地面附近，就成了熟悉的雾。',
    observation: '看不出明显云块，天空低而均匀；如果太阳可见，它的轮廓通常仍能辨认。',
    species: [
      { name: '雾状层云', latin: 'nebulosus', description: '常见的均匀灰白色云层。' },
      { name: '碎层云', latin: 'fractus', description: '破碎、不规则的小片云，常出现在降水云下。' },
    ],
    varieties: ['蔽光', '透光', '波状'],
    kind: 2,
    density: 0.55,
    coverage: 0.85,
    storm: 0.25,
  },
  {
    id: 'altocumulus',
    name: '高积云',
    latin: 'Altocumulus',
    abbreviation: 'Ac',
    family: 'middle',
    altitude: '2,000–7,000',
    altitudeLabel: '典型出现高度',
    range: [2, 7],
    region: '世界各地',
    precipitation: '通常无落地降水，可能出现雨幡',
    tagline: '一群小小的岛，结伴穿过天空。',
    description:
      '中空的小云块组成片层、波纹或透镜。它们常带一点灰色阴影，比层积云精巧，比卷积云更厚实，主要由水滴构成，也可能含有冰晶。',
    observation: '伸直手臂，典型云块的视宽约一到三根手指，并有明暗层次。',
    species: [
      { name: '层状高积云', latin: 'stratiformis', description: '小云块在大片天空中铺展。' },
      {
        name: '荚状高积云',
        latin: 'lenticularis',
        description: '轮廓清楚的透镜状云，常与山地气流有关。',
      },
      { name: '堡状高积云', latin: 'castellanus', description: '顶部出现城堡般的凸起。' },
      { name: '絮状高积云', latin: 'floccus', description: '如一簇簇棉絮，底部常不规则。' },
    ],
    varieties: ['蔽光', '透光', '漏光', '重叠', '波状', '辐射状', '网状'],
    kind: 4,
    density: 0.62,
    coverage: 0.52,
    storm: 0.03,
  },
  {
    id: 'altostratus',
    name: '高层云',
    latin: 'Altostratus',
    abbreviation: 'As',
    family: 'middle',
    altitude: '2,000–7,000',
    altitudeLabel: '典型出现高度',
    range: [2, 7],
    region: '世界各地，中纬度常见',
    precipitation: '可有持续降水，未必到达地面',
    tagline: '日光，隔着一层磨砂玻璃。',
    description:
      '灰蓝色的云幕横过天空，平整或带有细微纹理。水滴与冰晶混合其中，较薄的地方能透出太阳，像透过磨砂玻璃看见一枚柔和的光斑。',
    observation: '太阳变得模糊，地面几乎没有影子。高层云通常不产生卷层云那样的日晕。',
    species: [],
    varieties: ['蔽光', '透光', '重叠', '波状', '辐射状'],
    kind: 5,
    density: 0.45,
    coverage: 0.88,
    storm: 0.2,
  },
  {
    id: 'nimbostratus',
    name: '雨层云',
    latin: 'Nimbostratus',
    abbreviation: 'Ns',
    family: 'middle',
    altitude: '地面附近–7,000',
    altitudeLabel: '可跨越的高度范围',
    range: [0.1, 7],
    region: '世界各地，中纬度常见',
    precipitation: '持续而较广泛的雨或雪',
    tagline: '一场长雨，藏在灰色的天空里。',
    description:
      '厚重的灰暗云层遮住太阳，带来范围广、持续较久的雨雪。降水使云底显得模糊，其下还可能飘着更暗、更低的碎云。',
    observation: '天空没有明显的单个云块，太阳完全隐去，雨雪连绵；它常从中层延伸到低层。',
    species: [],
    varieties: [],
    kind: 6,
    density: 0.92,
    coverage: 0.94,
    storm: 0.85,
  },
  {
    id: 'cirrus',
    name: '卷云',
    latin: 'Cirrus',
    abbreviation: 'Ci',
    family: 'high',
    altitude: '5,000–13,000',
    altitudeLabel: '中纬度典型高度',
    range: [5, 13],
    region: '世界各地',
    precipitation: '通常无落地降水',
    tagline: '风在高处，写下几行白色的诗。',
    description:
      '一缕一缕的白色纤维，像羽毛、发丝或细钩。高空的冰晶随风铺展，形成卷云轻盈的轮廓；它们往往彼此分离，带着柔和的丝绸光泽。',
    observation: '寻找清晰的丝状纹理或末端的小钩。高空风会将冰晶拖成纤长的尾迹。',
    species: [
      { name: '毛卷云', latin: 'fibratus', description: '细长纤维，平直或略微弯曲。' },
      { name: '钩卷云', latin: 'uncinus', description: '末端弯成钩状或逗号状。' },
      { name: '密卷云', latin: 'spissatus', description: '较厚的卷云，有时来自积雨云的云砧。' },
      { name: '堡卷云', latin: 'castellanus', description: '云体上部有小塔状凸起。' },
      { name: '絮卷云', latin: 'floccus', description: '小绒毛团般的冰晶云。' },
    ],
    varieties: ['乱卷', '辐射状', '脊状', '重叠'],
    kind: 7,
    density: 0.48,
    coverage: 0.47,
    storm: 0,
  },
  {
    id: 'cirrocumulus',
    name: '卷积云',
    latin: 'Cirrocumulus',
    abbreviation: 'Cc',
    family: 'high',
    altitude: '5,000–13,000',
    altitudeLabel: '中纬度典型高度',
    range: [5, 13],
    region: '世界各地',
    precipitation: '通常无落地降水',
    tagline: '细碎的白，像风吹过的鱼鳞。',
    description:
      '高空的小颗粒排列成薄薄的白色云片，有时像沙纹，有时像鱼鳞。云块非常细小，通常没有明显阴影，常与其他高云相伴出现。',
    observation: '伸直手臂，多数小云粒比一根手指还窄。细小、洁白、少阴影，是它与高积云的区别。',
    species: [
      { name: '层状卷积云', latin: 'stratiformis', description: '小颗粒云体覆盖一片天空。' },
      { name: '荚状卷积云', latin: 'lenticularis', description: '透镜形云片，轮廓分明。' },
      { name: '堡状卷积云', latin: 'castellanus', description: '细小云体顶部有塔状突起。' },
      { name: '絮状卷积云', latin: 'floccus', description: '絮团状，云底不规则。' },
    ],
    varieties: ['波状', '网状'],
    kind: 8,
    density: 0.5,
    coverage: 0.5,
    storm: 0,
  },
  {
    id: 'cirrostratus',
    name: '卷层云',
    latin: 'Cirrostratus',
    abbreviation: 'Cs',
    family: 'high',
    altitude: '5,000–13,000',
    altitudeLabel: '中纬度典型高度',
    range: [5, 13],
    region: '世界各地',
    precipitation: '通常无落地降水',
    tagline: '薄如轻纱，让日光有了圆环。',
    description:
      '透明的乳白色云纱，轻轻覆盖大片天空，有时呈纤维状。冰晶折射阳光或月光，可能在太阳或月亮周围画出一道光晕。',
    observation: '地面的影子仍然可见，天空却蒙上一层薄纱；太阳周围的日晕是很有用的辨认线索。',
    species: [
      { name: '毛卷层云', latin: 'fibratus', description: '云纱中带着精细的纤维纹理。' },
      { name: '雾状卷层云', latin: 'nebulosus', description: '均匀而平滑，纹理不明显。' },
    ],
    varieties: ['波状', '重叠'],
    kind: 9,
    density: 0.24,
    coverage: 0.88,
    storm: 0,
  },
  {
    id: 'cumulonimbus',
    name: '积雨云',
    latin: 'Cumulonimbus',
    abbreviation: 'Cb',
    family: 'vertical',
    altitude: '600–2,000',
    altitudeLabel: '典型云底 · 云顶可达高空',
    range: [0.6, 13],
    region: '热带和温带尤其常见',
    precipitation: '阵雨或暴雨，可伴冰雹、雷电',
    tagline: '从一朵白云，到一座天空的山。',
    description:
      '强烈的上升气流将云体推向高空，长成巨大的山峰或高塔。顶部冰晶向外扩散，形成铁砧般的云顶，阴暗的云底下可能有暴雨、冰雹和雷电。',
    observation: '远处高耸的云塔、向两边展开的云砧，是很醒目的特征。雷雨来临时，请在室内观察。',
    species: [
      { name: '秃积雨云', latin: 'calvus', description: '顶部开始变得柔和，尚无明显纤维状结构。' },
      {
        name: '鬃积雨云',
        latin: 'capillatus',
        description: '顶部纤维化，常呈铁砧、羽毛或乱发状。',
      },
    ],
    varieties: [],
    kind: 1,
    density: 0.93,
    coverage: 0.67,
    storm: 0.64,
  },
]

export const cloudById = (id: string) => clouds.find((cloud) => cloud.id === id)
