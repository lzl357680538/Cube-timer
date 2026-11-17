# Cube Space · 魔方训练与状态实验室

原生 HTML / CSS / JavaScript 项目，包含计时训练、打乱预览和三阶魔方状态转换求解。渲染与求解依赖通过 npm 固定版本安装，浏览器从本地加载，运行时无需连接 CDN。

## 启动

需要 Node.js 22.3 或以上版本。首次安装或拉取依赖变更后，在项目目录运行：

```powershell
npm ci
npm start
```

Windows 安装过依赖后，直接双击项目目录中的 **`启动魔方计时器.cmd`**，会启动本地服务并自动打开浏览器；重复启动会复用已有服务，端口被其他程序占用时会自动换一个端口。也可以继续使用 `npm start`，再打开 http://localhost:8765 。

不要直接双击 `index.html`：`file://` 地址下，浏览器会限制 JavaScript 模块与求解 Worker，导致打乱预览和状态实验室不能正常加载。线上网站直接通过 HTTPS 使用即可。安装时自动生成 `vendor/`；如需重建，运行 `npm run prepare:assets`。`vendor/` 和 `node_modules/` 不提交到 Git。

## 计时训练

- 支持二阶至七阶、三阶单手、Clock、Megaminx、Pyraminx、Skewb 和 Square-1。
- 正阶魔方与 SQ1 采用白顶、绿前、红右参考持法；新打乱恢复标准三面视角。
- 生成或切换打乱时直接显示最终状态。点击“查看打乱过程”从复原状态播放，支持暂停、单步、拖动进度和返回终态。所有项目使用同一套控件。终态预览只计算最终变换，点击回放时再创建时间轴；SQ1 复用几何体，打乱缓存在空闲时分批生成，实验室 3D 视图首次打开时才初始化。
- 空格第一次按下进入 15 秒观察；观察中再次按住空格准备，松开开始，之后按下空格停止。触屏可操作计时卡片。
- 计时器采用明亮简约风格：白色卡片上的大号细体数字，状态用整块颜色表达，观察时为橙色、准备好时为绿色、计时中为蓝色、超时为红色。计时中其余区域自动淡出；手机和平板上计时器会铺满全屏，轻触任意位置即可停止。
- 手机布局顺序为：打乱公式 → 打乱状态 3D 预览 → 计时器 → 统计 → 成绩，打开页面即可看到打乱状态。
- 回放打乱过程时，打乱公式中当前步骤会高亮，已执行和未执行的步骤以深浅区分。
- 保留成绩、OK / +2 / DNF 标记、最佳、ao5、ao12 与平均，按项目存储到浏览器本地；上次选择的项目也会被记住。
- Square-1 所需的 Three.js 仅在首次选择 SQ1 时加载，其他项目不再下载这部分脚本；SQ1 视图隐藏时停止渲染循环。
- 三阶及单手项目支持六色底 Cross 求解。
- “外观”中可选择预设背景，上传 JPG / PNG / WebP 壁纸并调节白色遮罩。壁纸会缩放压缩后保存在当前浏览器，不上传服务器。

说明：现有普通正阶项目采用随机转动序列，不能视为 WCA 随机状态打乱器；SQ1 使用原项目的 csTimer 打乱器，其他异形项目优先使用 cubing.js。观察计时保留原项目的简化规则，不应视为比赛裁判程序。

## 状态实验室（三阶）

1. 分别建立起始与目标状态。每个状态都从复原状态开始，可点击 18 个面转按钮，也可粘贴公式。
2. 支持 `U D L R F B` 以及逆转 `'`、半转 `2`；各步以空格分隔，最多 500 步。可撤销最后一个基本转动、复原、复制起始状态，或导入计时页当前三阶打乱。
3. 输入的文本在点击“应用公式”后显示到预览；点击求解会自动应用两侧输入。无效输入会显示提示，并保留此前有效状态。
4. 点击“求解转换公式”，获取起点到终点的较短解，可复制并播放转换过程。编辑任意状态后，旧结果失效。
5. 两个状态的有效操作记录也会保存在本地。当前不支持手工涂色、整体转体、宽转和中层转动输入，也尚未实现其他项目的状态转换求解。

### 求解方式

使用 cubing.js 的 `experimentalSolve3x3x3IgnoringCenters`，在 Web Worker 中执行快速三阶求解，不阻塞主界面；固定中心朝向，不求解中心贴纸自转（非超级魔方）。不保证全局最短，也未加入指法评分或多候选公式搜索。

设两个状态由复原状态分别执行 A、B 得到，所需转换 X 满足 A·X = B。对相对状态 B⁻¹·A 求复原解，即可得到 X = A⁻¹·B。每次返回结果后，程序都会重新从起始状态执行结果，逐项核对块的位置和朝向与目标状态一致；校验通过才显示结果。

## 代码结构

```text
index.html                  两个工作区和外观弹窗
css/style.css               共享设计变量、组件和响应式布局
js/script.js                打乱、计时和成绩管理
js/playback.js              普通项目 / SQ1 统一播放控制
js/sq1-viewer.js             SQ1 专用几何模型及动画
js/appearance.js            主题、壁纸和本地保存
js/lab.js                   双状态编辑与求解交互
js/moves.js                 状态公式解析与限制
js/state-engine.js          相对状态建模、求解与结果校验
js/cross-solver.js          原有 Cross 求解器
js/cstimer-sq1.js           原有 SQ1 打乱器
sq1-3d.html                  SQ1 独立查看页
 tools/prepare.cjs           生成本地浏览器依赖及 Worker 资源
 tools/serve.cjs             本地静态服务
 tools/launch.cjs            Windows 双击启动、复用服务并打开浏览器
 tests/state-engine.test.cjs 解析与状态转换回归测试
```

增加新的状态求解项目时，建议独立实现该项目的合法状态表示、输入解析、求解函数和终态验证，复用工作区布局与播放控件。SQ1 需要单独的合法切割约束和求解算法，不可直接套用三阶引擎。

## 检查

```powershell
npm test
npm run format:check
```

单元测试覆盖输入验证、等价状态和 12 组状态转换（包含确定性生成的随机情况），验证求解方向及实际终态。界面已在桌面与 390 px 移动视口检查全部项目的终态预览、回放、逐步控制，以及计时、撤销、求解播放、壁纸上传和刷新后保留。

## 第三方依赖

- [cubing.js](https://github.com/cubing/cubing.js)：魔方状态模型、普通项目渲染、打乱和三阶求解；许可证见安装包及生成的 `vendor/cubing-LICENSE.txt`。
- [Three.js](https://threejs.org/)：3D 渲染，MIT 许可证。
- SQ1 模型与打乱器沿用原项目的 csTimer 衍生实现，保留源文件归属说明。

## 发布到 Netlify

```powershell
npm ci
npm run build
```

生成的 `dist/` 是完整静态网站，包含 `index.html`、`sq1-3d.html`、`css/`、`js/` 和必需的 `vendor/` 依赖。手动部署时打开 [Netlify Drop](https://app.netlify.com/drop)，上传 `dist` 文件夹；如果拿到 ZIP，先解压，选择直接包含 `index.html` 的文件夹。手动上传不会替你安装 npm 依赖或运行构建，不要直接上传缺少 `vendor/` 的源码。

也可将仓库连接到 Netlify，根目录的 `netlify.toml` 已配置构建命令 `npm run build`、发布目录 `dist` 和 Node.js 版本。线上不需要运行 `npm start`，也无需额外后端。

成绩、状态记录和壁纸保存在每位访问者的浏览器中，不会公开到服务器，也不会自动从 localhost 或其他域名迁移到新站点。

## 发布到 GitHub Pages

项目网站地址：[https://lzl357680538.github.io/Cube-timer/](https://lzl357680538.github.io/Cube-timer/)。

仓库通过 `.github/workflows/pages.yml` 自动部署：推送到 `main` 后安装依赖、运行状态转换测试、构建静态资源，再发布 `dist/`。GitHub 仓库的 Settings → Pages → Build and deployment → Source 使用 **GitHub Actions**。部署进度可在仓库的 Actions 页面查看。

网站资源与求解 Worker 使用相对路径，支持 `/Cube-timer/` 项目子路径；无需配置独立域名和后端。后续修改后提交并推送 `main` 即会更新线上版本。不要把 `node_modules/`、`vendor/`、`dist/` 或备份文件提交进仓库，发布资源由工作流生成。
