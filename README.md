# 医策 · 医疗决策 AI 顾问（重构版 MVP）

最短路径匹配：**医院 + 科室 + 医生**（湘雅 / 附二）。一句话输入，先出推荐卡，最多 0–1 个追问。

## 本地启动

```bash
cd ~/Desktop/xiangya-medical-advisor
npm install
npm run dev
```

打开终端提示的本地地址（默认 http://127.0.0.1:5173）。

生产构建：

```bash
npm run build
npm run preview
```

## 部署到 Vercel

本项目是 **Vite 静态前端 SPA**，可直接部署到 Vercel（无服务端、无数据库依赖）。

### 方式 A：网页导入（推荐首次）

1. 将代码推送到 GitHub / GitLab / Bitbucket。
2. 打开 [https://vercel.com](https://vercel.com) 登录，点击 **Add New… → Project**。
3. Import 该仓库。
4. 确认框架预设为 **Vite**（或按 `vercel.json` 自动识别）。
5. 确认构建配置：
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
   - **Node.js Version**: `20.x`（与 `.nvmrc` 一致）
6. 点击 **Deploy**。
7. 部署完成后访问 Vercel 分配的域名；也可在 Project → Settings → Domains 绑定自定义域名。

### 方式 B：Vercel CLI

```bash
npm i -g vercel
cd ~/Desktop/xiangya-medical-advisor
vercel login
vercel          # 预览环境
vercel --prod   # 生产环境
```

按提示关联团队/项目即可。`vercel.json` 已配置 SPA 路由回退到 `index.html`，刷新 `/recommend` 等路径不会 404。

### 部署后自检

- 首页能一句话匹配并进入推荐页
- 直接打开 `https://你的域名/recommend` 会回到空态引导（无会话时），不会白屏 404
- 快捷入口（失眠焦虑 / 肺结节 / 突发症状）可出推荐卡

### 说明

- 医生库与排班缓存在构建时打进前端包，**无需** Vercel 环境变量即可运行。
- 采集脚本（`npm run scrape:haodf`）仅本地维护数据用，不会在 Vercel 上执行。
- 当前产物 JS 体积偏大（医生库 JSON），不影响部署；后续可做分片或按需加载。

## 核心流程

```
一句话 → 意图抽取 → 医院相对优势 → 医生候选池 →（可选追问）→ 推荐卡
```

## 技术栈

- Vite + React + TypeScript
- 本地 Repository（可替换 Supabase / 飞书）
- 规则引擎确定性判断

## 文档

- [产品完整方案](./docs/产品完整方案.md)
- [重构交付说明](./docs/重构交付说明.md)
