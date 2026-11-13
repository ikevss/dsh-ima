# dsh-ima

[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com/p/ikevss/dsh-ima/)
[![Listed on dsh-plugin.org](https://dsh-plugin.org/badges/listed.svg)](https://dsh-plugin.org/plugins/ikevss/dsh-ima)
[![Version](https://img.shields.io/badge/version-1.11.1-blue)](./CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![npm](https://img.shields.io/npm/v/ik-dsh-ima?label=npm&color=0891b2&logo=npm)](https://www.npmjs.com/package/ik-dsh-ima)

<img src="assets/logo-256.png" alt="dsh-ima" width="120" align="right">

> 把腾讯 [ima](https://ima.qq.com) 的知识库接进 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)：侧边栏浏览知识库，**agent 能自动检索、读取，也能往里写**。

[English](#english) · 简体中文

---

## 它解决什么问题

你在 ima 里攒了很多资料（文档、笔记、网页、录音转写…），但对话里的 agent 看不见——每次都要手动复制粘贴。

装上这个插件后：

- **侧边栏多一个「知识库 ima」**：左目录、右文件地浏览，点击直接预览
- **agent 自动知道有这个知识库**：每轮对话开头会把库清单注入上下文，模型知道「这儿有资料可查」
- **按正文内容搜索**：不记得文件叫什么名？问「我的资料里提到过 X 吗」，agent 自己去搜
- **能读也能写**：拖个文件进去就传上 ima 了，网页和公众号文章给个链接就行

> v1.10 起支持写入。之前只能读，不是 ima 没开放——是我方调用参数不对，详见 [CHANGELOG](./CHANGELOG.md#1100---2026-11-13)。

## 功能一览

| 能力 | 说明 |
|---|---|
| 绑定 | 一键绑定：自动打开浏览器让你登录 ima，其余全自动，不需要复制粘贴 |
| 浏览 | 全部 / 共享 / 个人 三类筛选，多层文件夹 + 面包屑 |
| 预览 | PDF、Word、Excel、PPT、图片、音视频、Markdown、XMind 等在面板内直接看 |
| **写入** | 上传文件（拖拽或点按钮）、收录网页/公众号文章；23 种格式；重名自动保护 |
| 文件图标 | 自绘 17 种格式图标（折角纸 + 表格格子 / 投影屏幕 / 音符 / 播放键…），形状优先、颜色辅助，跟随主题；**后缀优先于 ima 的类型标签**（ima 按来源归类，会把 .txt 标成录音） |
| 左侧分组 | 与 ima 一致的「个人知识库 / 共享知识库」折叠分组，可一键去 ima 新建 |
| 笔记排版 | ima 的笔记接口只返回一段**展平过的纯文本**（段落边界在服务端就丢了）；插件按标点、序号、「发言人 + 时间戳」等锚点尽力还原段落，会议记录能恢复成一句一条的发言列表，并保留「原文」按钮随时对照 |
| 网页类 | 网页、微信文章点击直接在新窗口打开原文 |
| 引用到对话 | 文件一键交给 agent 读取 |
| Agent 工具 | 7 个工具：5 个读 + 2 个写（`ima_upload_file` / `ima_add_url`） |
| 上下文注入 | 模型每轮自动看到知识库清单，主动去查 |
| **面板内搜索** | 顶部搜索框（`Ctrl K` 聚焦）跨全部知识库搜正文；结果**按知识库分组**，点一条直接打开并**高亮命中处、自动滚过去** |
| **授权状态** | 右上角一个盾牌图标 + 状态圆点（绿=正常 / 黄=超过 7 天没验证），点开浮窗看详情。ima 不返回过期时间，插件只说「已验证」，绝不算一个假的有效期 |
| **排序** | 名称 / 类型两档，文件夹永远最前。ima 不给时间字段，所以**不做**「按最近更新」 |
| **空状态** | 没选库、库是空的、搜不到、加载中，四种情况都有话说 + 一个明确的下一步按钮 |
| **快捷键** | `Ctrl K` 搜索，`Esc` 清搜索 / 退出预览 |

### 写入能力（v1.10 新增）

过去只能读。现在能写，走的是 ima 官方 OpenAPI 的三步：

```
check_repeated_names → create_media（拿 COS 临时凭证）→ COS PUT 上传 → add_knowledge（挂进知识库）
```

- **支持格式**：PDF / Word / PPT / Excel / CSV / Markdown / 图片（png·jpg·webp）/ TXT / XMind / 音频（mp3·m4a·wav·aac）/ HTML / EPUB，共 23 种
- **重名保护**：ima 不支持覆盖。同名时先拦下来问一句，选「保留两者」会自动加时间戳
- **上传进度**：每个文件单独一行状态（准备中 / 上传中 / 已完成 / 失败原因），传完自动刷列表
- **网页收录**：网页和微信文章不用先下载，直接给链接就行（`import_urls`）
- **Agent 也能写**：新增 `ima_upload_file` 和 `ima_add_url` 两个工具，对话里就能让 agent 往知识库放东西

> 上传上限约 30MB。视频（Bilibili/YouTube 等）只能在 ima 桌面端内添加，接口不支持 —— 这是 ima 的产品限制。

## 界面与动效

数据都来自远程接口（300ms~3s），所以每个等待都有反馈，不留白屏：

| 场景 | 反馈 |
|---|---|
| 首次加载文件列表 | 6 行骨架屏 shimmer，与真实行同高，加载完不跳动 |
| 刷新已有列表 | 顶部 2px 进度条 + 旧列表降到 45%（不清空，不闪白） |
| 进入文件夹 | 列表逐项淡入上移，级联 18ms（超过 10 项不再排队） |
| 打开 / 返回预览 | 淡入 220ms |
| 拖文件进面板 | 遮罩渐显 180ms（常驻 DOM，不闪） |
| 多文件上传 | 每行独立状态 + 左侧呼吸竖条 + 底部流动进度条 |
| 出错 | 带图标的 Alert，附「重试」「知道了」 |

无障碍：`:focus-visible` 焦点环、文件行支持 Tab + 回车、触控目标 ≥32px、支持 `prefers-reduced-motion` 降级。

## 界面预览

> 以下截图为**演示数据**（虚构的库名与文件名），实际界面与之一致。唯一例外：文件行的「更新时间」列目前 ima 接口不返回该字段，实际显示为空，ima 开放后无需更新插件即可自动显示。

### 文件列表

左侧按 ima 自己的习惯分成「个人知识库 / 共享知识库」两组，可折叠，右上角「+」直达 ima 新建；知识库与文件图标**直接取自 DSH 客户端内置图标库**，换主题、切深色会跟着变；行尾是操作按钮。网页 / 微信文章直接「打开原文」，文档类一键「引用到对话」：

![知识库面板与文件列表](docs/screenshots/shot-1-panel.png)

### 文件预览

PDF / Word / Excel / PPT / 图片 / 音视频都不用跳出面板，点开直接看（Word 类文档按页渲染）；右上角可下载原文件，或一键「引用到对话」把当前文件交给 agent 读取：

![文档预览](docs/screenshots/shot-5-preview.png)

### 笔记排版还原

ima 的笔记接口返回的是一段**展平的纯文本**，段落边界在 ima 服务端就丢了。插件按「发言人 + 时间戳」「中文序号」等锚点重建段落——会议记录能还原成一句一条的发言列表，右上角「看原文」可随时切回原始文本对照：

![笔记排版还原](docs/screenshots/shot-3-detail.png)

### 绑定 ima 账号

一键绑定：自动弹出浏览器登录 ima，其余全自动：

![一键绑定](docs/screenshots/shot-2-bind.png)

没有 Chrome/Edge 时的手动兜底（每一步都告诉你去哪拿、怎么拿）：

![手动填写兜底](docs/screenshots/shot-4-manual.png)

## 环境与版本适配

| 项目 | 要求 | 说明 |
|---|---|---|
| DeepSeek Harness | **0.2.2-rc.1** | 当前实测版本；0.2.0-rc.1 起接口保持兼容 |
| Node.js | ≥ 18（推荐 ≥ 22） | 宿主半要求；绑定自动化用到 Node 内置 WebSocket，22 起零依赖 |
| 浏览器 | Chrome 或 Edge | 仅「一键绑定」需要；都没有会自动降级为手动填写方式 |
| 操作系统 | Windows / macOS / Linux | 宿主半为纯 Node 实现，无原生模块依赖 |
| ima 账号 | 能登录 [ima.qq.com](https://ima.qq.com) 即可 | 订阅类知识库 ima 不开放读取（产品策略，见「已知边界」） |

> DSH 的插件接口在 0.2.x 阶段仍在演进。升级 DSH 后如果插件异常，欢迎[提 issue](https://github.com/ikevss/dsh-ima/issues)，附上 DSH 版本号即可。

### 图标与宿主保持一致

插件界面里的图标不在本地自绘，而是**提取 DSH 客户端内置图标库**（`icon-outline` 系列，17×17 线性、`stroke=currentColor`），因此换主题、换深浅色时图标会跟着走，和 DSH 侧边栏、按钮的视觉完全一致。

DSH 没有把图标库作为独立包导出，所以走的是「构建时提取 + 内联」：升级 DSH 后若宿主图标有调整，跑一次同步即可。

```bash
node test/extract-icons.js   # 从 app.asar 里抓最新图标数据
node test/gen-icons.js       # 生成 lib/dsh-icons.js
node build/build.mjs         # 重新打包客户端
```

## 安装

### 前置条件

- 已安装 DeepSeek Harness（下文以 `~/.dsh` 为其 home 目录）
- Node.js ≥ 18

### 方式一：一行命令（推荐）

把 `web` 换成你要装的 profile 名即可（桌面端用 `desktop`）。

**从 npm 安装**（最简单，包名是 `ik-dsh-ima`）：

```bash
dsh plugin --profile web add ik-dsh-ima
```

**从 GitHub 预构建包安装** —— 不需要 git，也不需要本地构建：

```bash
dsh plugin --profile web add https://github.com/ikevss/dsh-ima/releases/latest/download/dsh-ima.tgz
```

**从源码安装**：

```bash
dsh plugin --profile web add git+https://github.com/ikevss/dsh-ima.git
```

装完**重启 DSH**（Web 端也可以只重启服务后刷新页面）。

> ⚠️ **不要写成 `github:ikevss/dsh-ima`。** npm 会把 `github:` 这种简写解析成 **SSH** 地址（`ssh://git@github.com/...`），没配过 SSH key 的机器会直接报
> `Permission denied (publickey)` 装不上。要让人人都能装，必须用上面的 `git+https://` 形式或 tarball 链接。

> 💡 包名是 `ik-dsh-ima`，仓库名和目录名是 `dsh-ima`。`dsh-ima` 这个 npm 名在 2026-09 被别人发布后又撤回，名字已被锁定、无法再申请。

> 💡 预构建 tarball 里已经包含编译好的 `lib/client.js`，所以安装时不会触发构建；从源码装也一样，`lib/` 是随仓库提交的。

### 方式二：手动安装（改 profile 配置）

适合想改代码、或者网络环境装不了包的情况。

**1. clone 到插件目录**

```bash
git clone https://github.com/ikevss/dsh-ima.git ~/.dsh/plugins/dsh-ima
```

**2. `~/.dsh/profiles/web/package.json`** —— 加依赖和 bundle：

```jsonc
{
  "dependencies": {
    "ik-dsh-ima": "file:../../plugins/dsh-ima"   // ← 新增
  },
  "dsh": {
    "profile": {
      "bundles": [
        // ...原有内容...
        "ik-dsh-ima"                              // ← 新增
      ]
    }
  }
}
```

**3. `~/.dsh/profiles/web/cordis.patch.yml`** —— 文件末尾加一段：

```yaml
- insert:
    - id: dsh-ima
      name: ik-dsh-ima
```

> 包名是 `ik-dsh-ima`（`dsh-ima` 在 npm 上已被别人占用过、无法使用），目录名和仓库名仍叫 `dsh-ima`。

**4. 把插件文件拷进 profile 的 node_modules**（不要用 `pnpm add`，容易搞坏 profile 的依赖解析）：

```bash
mkdir -p ~/.dsh/profiles/web/node_modules/dsh-ima
cp ~/.dsh/plugins/dsh-ima/{package.json,cordis.patch.yml} ~/.dsh/profiles/web/node_modules/dsh-ima/
cp ~/.dsh/plugins/dsh-ima/lib/*.js ~/.dsh/profiles/web/node_modules/dsh-ima/lib/
```

**5. 重启 DSH。**

### 桌面端（DeepSeek Harness Desktop）

把上面的 `web` 全部换成 `desktop` 即可：

```bash
# 一行命令方式
dsh plugin --profile desktop add https://github.com/ikevss/dsh-ima/releases/latest/download/dsh-ima.tgz
```

手动方式同样三步，只是 profile 目录换成 `~/.dsh/profiles/desktop`：

```bash
# 1. 改 ~/.dsh/profiles/desktop/package.json（加 dependencies + bundles，同上）
# 2. 改 ~/.dsh/profiles/desktop/cordis.patch.yml（加 insert 段，同上）
mkdir -p ~/.dsh/profiles/desktop/node_modules/dsh-ima
cp ~/.dsh/plugins/dsh-ima/{package.json,cordis.patch.yml} ~/.dsh/profiles/desktop/node_modules/dsh-ima/
cp ~/.dsh/plugins/dsh-ima/lib/*.js ~/.dsh/profiles/desktop/node_modules/dsh-ima/lib/
# 3. 重启桌面端
```

> ⚠️ desktop profile 由桌面端独占管理，命令行 `dsh --profile desktop` 会拒绝启动——这是正常的。

## 它访问什么（权限说明）

装之前你大概想知道它碰了什么。全部如实列出：

| 项 | 说明 |
|---|---|
| **访问的域名** | 只有 `https://ima.qq.com`（腾讯 ima 官方 OpenAPI）。预览/下载文件时用的是 ima 接口返回的腾讯云 COS 签名直链 |
| **读取的本地文件** | `~/.dsh/storages/dsh-ima/credentials.json`（插件自己的凭证）；取不到时回退读 `~/.config/ima/{client_id,api_key}`（ima 官方技能的标准位置）。除这两个位置外不读任何本地文件 |
| **写入的本地文件** | 只在 `~/.dsh/storages/dsh-ima/` 下写凭证与绑定用的浏览器 profile；**不碰 `~/.config/ima/`**（那是 ima 自己技能的资产，解绑只用标记文件） |
| **启动的进程** | 仅「一键绑定」时会拉起你本机的 Chrome / Edge，带 `--remote-debugging-port=9333`（只监听 `127.0.0.1`），用完即关 |
| **本机 HTTP 路由** | `/api/ima/*`，由 DSH 的 webServer 提供，与 DSH 面板同源。之所以要这层中转，是因为 ima 的接口不返回 CORS 头，浏览器不能直连 |
| **安装期脚本** | **没有**。`package.json` 里没有 `postinstall`/`prepare`，装的时候不会执行任何脚本 |
| **遥测 / 上报** | **没有**。不收集、不上传任何数据到第三方；除了上面那个域名不连任何服务器 |

> 想自己核对：`grep -rn "https://" lib/index.js lib/ima-client.js`，宿主半只有 `ima.qq.com` 一个外部地址。

## 绑定 ima 账号

1. 打开侧边栏「知识库 ima」→ 点「一键绑定 ima 账号」
2. 会自动弹出一个浏览器窗口，已打开 ima 授权页
3. **登录**（唯一需要你做的事）
4. 自动完成绑定，面板刷出知识库

> **备用方式**（没有 Chrome/Edge 时）：点「都试过了还是不行？」，打开 ima 授权页 → 点第 1 步的**「一键复制」**→ 回到插件，会自动识别。
> 注意：API Key **不在页面上显示**，藏在「一键复制」复制出来的那段文字里。

## Agent 工具

插件注册 5 个工具，模型按需调用：

| 工具 | 用途 |
|---|---|
| `ima_search_files` | **按正文内容搜索文件**（最常用）——不知道文件叫什么、想找"哪些资料提到过 X"时用 |
| `ima_list_knowledge_bases` | 列出全部知识库 |
| `ima_search_knowledge_bases` | 按关键词搜知识库（匹配库名/描述） |
| `ima_list_kb_files` | 列出某个库里的文件和文件夹 |
| `ima_read_file` | 读取文件正文（文本直接返回，二进制返回下载直链） |

### 上下文注入

插件在每轮对话的第一步，会把知识库清单注入模型上下文（10 分钟内不重复注入）：

```
[ima 知识库] 用户已连接 ima 知识库，下面这些库可以直接搜：
· 我的笔记（个人）
· 项目文档（共享）
...
· 找"哪份资料提到过 X" → ima_search_files
· 想浏览某个库里有啥 → ima_list_kb_files
· 读全文 → ima_read_file
```

所以模型会**主动去查**，而不是说"我看不到你的资料"。

## 架构

```
dsh-ima/
├── lib/
│   ├── index.js        宿主半：agent 工具 + 上下文注入 + /api/ima/* 路由
│   ├── ima-client.js   ima OpenAPI 客户端
│   ├── ima-browser.js  浏览器自动化取凭证（CDP，零依赖）
│   └── client.js       浏览器半产物（由 build/ 生成，已随仓库提供）
├── build/
│   ├── client.src.js   界面逻辑源码
│   ├── viewer.src.js   预览引擎配置
│   └── build.mjs       构建脚本（esbuild）
└── cordis.patch.yml    bundle patch
```

**两半设计**：宿主半跑在 Node 里（工具、HTTP 路由），浏览器半跑在 DSH 页面里（侧边栏面板、预览）。两者通过同源的 `/api/ima/*` 通信。

> 为什么要有 HTTP 路由？因为 ima 的接口**不返回 `Access-Control-Allow-Origin`**，浏览器直连会被 CORS 拦死。只能由宿主半代理。

## 开发

```bash
cd ~/.dsh/plugins/dsh-ima
npm install          # 构建依赖（约 400MB，仅开发时需要）
npm run build        # 重新生成 lib/client.js
npm test             # ima-client 冒烟测试
```

改 `build/client.src.js` → `npm run build` → 把 `lib/client.js` 拷进各 profile 的 node_modules → 刷新页面。
改 `lib/index.js` 等宿主半 → 拷进 profile → **重启 DSH**。

> `lib/client.js` 是构建产物，已随仓库提供，**普通用户不需要构建**，clone 下来即可使用。

### 自检脚本

改完 UI 或接口后，跑一遍这些脚本能挡住大部分回归：

| 脚本 | 查什么 |
|---|---|
| `test/verify-hooks.js` | **Hook 规则**：`useEffect` 不能放在组件的条件 return 之后（否则 React #310） |
| `test/verify-ui.js` | 引用的 `--dsw-*` 变量是否真实存在（DSH 里没有的变量会静默退回硬编码颜色） |
| `test/verify-file-icons.js` | 19 种文件类型的图标语义是否对应（txt 不能画成播放键） |
| `test/verify-features.js` | 搜索 / 授权浮窗 / 上传等功能的代码是否都在 |
| `test/verify-build.js` | 构建产物完整性 |

### 同步 DSH 内置图标

```bash
node test/extract-icons.js   # 从 app.asar 抓 DSH 当前图标数据（写到系统临时目录）
node test/gen-icons.js       # 生成 lib/dsh-icons.js
node build/build.mjs         # 重新打包
```

> `lib/client.js` 是构建产物，已随仓库提供，**普通用户不需要构建**，clone 下来即可使用。

## 预览能力

内置 [open-file-viewer](https://github.com/xushanpei/open-file-viewer)（MIT）做纯前端渲染：

| 类型 | 预览方式 |
|---|---|
| PDF | 浏览器原生 |
| Word / Excel / PPT | docx-preview / xlsx 纯前端渲染 |
| 图片 | 直接渲染 |
| 音视频 | 内置播放器 |
| Markdown / 文本 / 思维导图 | 内置渲染 |

> 小技巧：ima 的文件标题常常**没有扩展名**（例如播客标题就是一段描述）。插件会从文件真实地址里取扩展名补上再交给预览引擎，否则会误报"不支持预览"。

## 已知边界

| 项 | 说明 |
|---|---|
| 订阅知识库 | ima 产品策略不开放读取（错误码 220030），默认不显示 |
| 文件更新时间 | ima OpenAPI 目前不返回任何时间字段（实测 2026-10-16，已探测多个候选接口），插件已预留显示通道，ima 开放后无需更新插件 |
| 笔记段落结构 | ima 笔记接口 `note/v1/get_doc_content` 只返回一个已展平的纯文本字段：`data` 顶层只有 `content` 一个键，`format` / `with_blocks` / `rich` 等参数全部被忽略（返回字节一致），另探 8 个结构化候选接口全部 404。**原始段落结构在 ima 服务端就丢失了，插件无法无损还原**，只能按可见锚点尽力重排（右上角「看原文」可对照）；表格类内容展平后无法重建 |
| 知识库列表 | 单页上限 20 个 |
| 浏览器要求 | 一键绑定需要本机有 Chrome 或 Edge；没有会自动降级到手动方式 |
| API Key | 有效期一年，到期需重新绑定。ima 接口不返回具体过期时间，所以插件的状态浮窗只说「多久前验证过」，不报倒计时 |
| 文件类型标签 | ima 按「内容来源」归类而非文件后缀（从录音转写来的 .txt 会被标成「录音」），所以插件**以文件名为准**判断图标 |
| 上传上限 | 约 30MB（base64 传输，宿主侧限 40MB 请求体） |
| 视频链接 | Bilibili / YouTube 等只能在 ima 桌面端内添加，接口不支持 |
| 重名文件 | ima 不支持覆盖，同名时只能改名后重传（插件会自动加时间戳） |
| 桌面端 | 插件支持，但 desktop profile 由桌面端独占管理 |

## 更新日志

完整记录见 [CHANGELOG.md](./CHANGELOG.md)。

| 版本 | 要点 |
|---|---|
| 1.11.1 | 修 React #310；预览/上传/拖拽动效补齐 |
| 1.11.0 | 骨架屏、进度条、动效系统、无障碍；校正 27 个主题变量（原先一半在 DSH 里不存在）；错误样式重做 |
| 1.10.4 | 授权状态收进右上角图标 + 浮窗 |
| 1.10.3 | 文件图标改为后缀优先（ima 按来源归类，会把 .txt 标成录音） |
| 1.10.2 | 自绘 17 种格式图标，形状优先 |
| 1.10.1 | 补齐缺失图标 + 兜底；上传按钮改「+」 |
| 1.10.0 | **写入能力**：上传文件 / 收录网页，23 种格式，重名保护 |
| 1.9.0 | 面板内搜索 + 命中高亮、授权状态、排序、空状态、快捷键 |
| 1.8.0 | 适配 DSH 0.2.2-rc.1；图标换成 DSH 内置图标库 |
| 1.7.2 | 笔记预览排版还原 |
| 1.6.0 | 按正文内容搜索、agent 上下文注入、开源发布 |

## 致谢

- [open-file-viewer](https://github.com/xushanpei/open-file-viewer) —— 提供纯前端文档预览能力
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) —— 插件宿主

---

<a name="english"></a>

## English

**dsh-ima** connects [Tencent ima](https://ima.qq.com) knowledge bases to [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

- Browse your ima knowledge bases from a sidebar panel (collapsible groups, Finder-style folders, macOS-style type icons, in-panel file preview)
- **The agent automatically knows your knowledge base exists** — a short summary is injected into the model context at the start of each turn
- **Full-text search** — ask "does anything I saved mention X?" and the agent searches inside your documents
- 5 agent tools: `ima_search_files`, `ima_list_knowledge_bases`, `ima_search_knowledge_bases`, `ima_list_kb_files`, `ima_read_file`
- One-click binding: a browser opens the ima login page, everything else is automatic

**Requirements**: DeepSeek Harness **0.2.0-rc.1** (tested; other 0.2.x likely compatible) · Node.js ≥ 18 (22+ recommended) · Chrome or Edge for one-click binding (falls back to manual setup otherwise). Screenshots above use demo data.

See the Chinese section above for installation steps. Licensed under MIT.

---

## License

[MIT](./LICENSE) © 2026 ikevss
