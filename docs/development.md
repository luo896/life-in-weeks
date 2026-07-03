# 开发文档

## 环境要求

- Node.js ≥ 18（开发时使用 26.x）
- npm ≥ 9

## 常用命令

```bash
npm install       # 安装依赖
npm run dev       # 开发服务器（Vite，端口 5174，HMR）
npm run build     # 生产构建 → dist/
npm run preview   # 预览 dist/（端口 4173）
```

> 端口在 `vite.config.js` 中配置（5174，避免与常见的 5173 冲突）。

## 代码约定

- **JSX + 无 TypeScript**：保持零构建复杂度；类型意图写在数据模型注释里（见 `store.jsx` 顶部与 [data-model.md](data-model.md)）。
- **无路由库**：视图 = `App.jsx` 里一个 `useState('grid')`；新增页面就是加一个 `NAV` 项 + 一个条件渲染。
- **样式集中**：全部在 `src/styles.css`，CSS 变量定义在 `:root`（改主题色只动 `--accent` 等几处）。类名按模块前缀（`.wk-*` 周历、`.tl-*` 时间线、`.gapbar-*` 差距条…）。
- **纯函数放 lib/**：日期/统计/计划/导出逻辑不依赖 React，便于单测与复用。
- **组件不直接碰 localStorage**：一律通过 `useStore()` 的语义化 API。

## 常见改动指引

### 加一个打卡字段（例：饮水量）

1. `store.jsx`：`logs` 注释里补字段说明（存储无需迁移，旧数据自动缺省）。
2. `Log.jsx`：表单加输入 + `form` 初始值。
3. （可选）`stats.js` 加序列函数 → `Progress.jsx` 加一张 `LineChart`。
4. （可选）`share.js` 报告表格加一列。

### 加一种目标类型

1. `lib/plan.js`：`METRICS` 注册 label/kind/icon；`generatePlan()` 加对应拆解分支。
2. `Goals.jsx`：表单按 `kind` 分支渲染；如需可视化，扩展 `Visuals.jsx`。

### 调整周历配色

`styles.css` `:root` 中 `--past / --future / --accent`；分享卡片的对应色值在 `lib/share.js` `exportShareCard()` 内（两处需同步）。

### 计划节奏参数

`lib/plan.js` `generatePlan(baseline, goals, opts)`：`opts.bedStepMin`（默认 15 分钟/周）、`opts.weightRate`（默认 0.5kg/周）。

## 测试

目前无自动化测试框架（刻意保持零依赖）。人工回归清单：

1. **引导**：清 localStorage → 填生日 → 进入周历。
2. **周历**：悬停提示正确；点格子滚动到编辑器；横竖切换且刷新后记住；窗口缩放格子自适应且整表不出首屏。
3. **周记**：本周写/改/删；金点位置正确；点历史周记回跳编辑。
4. **基线→目标→计划**：基线值自动带入目标；生成计划里程碑数 = 可拆解目标数；周历出现色带。
5. **打卡**：同日覆盖；streak 正确；清单项来自计划。
6. **进度**：三张图渲染、目标虚线正确。
7. **分享**：三种导出无控制台报错；报告含 ①–⑤ 全部章节；导入旧备份（无 journals 字段）不炸。
8. **边界**：预期寿命 < 实际年龄（本周=最后一格、剩余 0）；未来出生日期（已度过 0）。

浏览器控制台应全程无错误。

## 发布

`npm run build` 后 `dist/` 是纯静态产物，可部署到任意静态托管。无环境变量、无服务端。

### GitHub Pages（当前方案，已配置）

- 推送 `main` → `.github/workflows/deploy.yml` 自动构建并发布到 <https://luo896.github.io/life-in-weeks/>。
- 子路径 base 由工作流里的 `npm run build -- --base=/life-in-weeks/` 注入，**本地开发/构建不受影响**。
- 手动重新部署：GitHub 仓库 → Actions → Deploy to GitHub Pages → Run workflow。

### 其他平台

- **Cloudflare Pages**：Dashboard → Workers & Pages → 连接 GitHub 仓库，构建命令 `npm run build`、输出目录 `dist`（根路径部署，无需 base 参数）。支持私有仓库与自定义域名，中国大陆访问通常更稳定。
- **Vercel / Netlify**：同上，检测到 Vite 会自动填好配置。
