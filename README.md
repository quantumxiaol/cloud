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

Vite + TypeScript + Three.js + 自写 GLSL ES 3.0，无后端、无云照片。

- `src/engine/noise.ts`：一次性生成 64³ 可平铺的 value-fBm / Worley 噪声纹理。
- `src/shaders/sky.frag.glsl`：积云、积雨云、层积云和高积云采用体积 ray marching、太阳方向的多点遮挡采样和 Beer–Lambert 透射；层云、雨层云和高云采用轻量分层噪声。风平移和时间域扰动共同改变形态。
- `src/engine/CloudRenderer.ts`：同一个 WebGL 上下文生成主天空与图鉴缩略图；36 / 56 / 80 步画质；自动降低分辨率；上下文丢失恢复。
- `src/data/clouds.ts`：十个云属的数据与渲染预设。
- `src/lib/state.ts`：经过范围校验的 URL 状态。

当前为云属层面的艺术模拟，不是数值天气模型，也不是物理精确的大气散射。云种标签展示辨识资料，暂不单独改变渲染预设。没有闪电闪光，以保持安静的观看体验。

## 发布到 GitHub Pages

已提供 `.github/workflows/deploy.yml`，推送 `main` 分支后自动检查并部署。

1. 在 GitHub 创建名为 `cloud` 的仓库，将此目录提交并推送到 `main`。
2. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 推送后等待 **Deploy cloud to GitHub Pages** 完成，或在 Actions 中手动运行。
4. 项目地址通常为 `https://你的用户名.github.io/cloud/`。

Vite 使用 `base: './'`，静态资源兼容 `/cloud/` 子目录和自定义域名。无需密钥或后端服务。本地目录尚未关联远程仓库时，工作流文件不会自行发布网站。

部署参考：[Vite 静态部署](https://vite.dev/guide/static-deploy#github-pages)、[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 云资料

以用户提供的中文分类表为基础，参照 [WMO 国际云图集的云属分类](https://cloudatlas.wmo.int/en/clouds-genera.html) 和 [云层高度](https://cloudatlas.wmo.int/some-useful-concepts-levels.html) 整理。

高度只是参考，会随纬度和天气改变；积云、积雨云标注云底范围，积雨云顶部可进入高空；雨层云可能跨越多个高度层。原表卷积云的 `5000–1400 m` 显然有误，此处与其他高云统一显示中纬度参考范围 `5,000–13,000 m`。雨层云的降水强调持续性，不把所有雨层云都描述为强降雨。高层云的日晕表述也与卷层云作了区分。
