### Repository
https://github.com/ikevss/dsh-ima

### One-line value
把腾讯 ima 知识库接进 DeepSeek Harness——侧边栏浏览、跨库搜正文，还能直接上传文件进去，agent 能读也能写。

### Category
Tools & Capabilities

### Install command
```
dsh plugin --profile web add ik-dsh-ima
```

（桌面端把 `web` 换成 `desktop`）

### Compatibility
- DSH 0.2.2-rc.1（已适配；0.2.0-rc.1 起接口兼容）
- Node.js ≥ 18（推荐 ≥ 22）
- Windows / macOS / Linux（宿主半为纯 Node 实现，无原生模块依赖）
- 一键绑定需 Chrome 或 Edge；没有会自动降级为手动填写

### License
MIT

### Screenshots / demo
- 面板与文件列表：https://github.com/ikevss/dsh-ima/blob/main/docs/screenshots/shot-1-panel.png
- 文档预览：https://github.com/ikevss/dsh-ima/blob/main/docs/screenshots/shot-5-preview.png
- 笔记排版还原：https://github.com/ikevss/dsh-ima/blob/main/docs/screenshots/shot-3-detail.png
- 一键绑定：https://github.com/ikevss/dsh-ima/blob/main/docs/screenshots/shot-2-bind.png

### Notes

**本次更新（v1.11.1，页面此前显示的是 v1.7.2）**

现有条目信息已过时，主要变化：

1. **新增写入能力**（v1.10）——之前只能读。走官方 OpenAPI：`check_repeated_names` → `create_media`（拿 COS 临时凭证）→ COS PUT → `add_knowledge`。支持 23 种格式，重名保护（ima 不支持覆盖），网页/公众号文章可一键收录。
2. **新增面板内搜索**（v1.9）——`Ctrl K` 跨全部知识库搜正文，结果按知识库分组，点一条直接打开并高亮命中处。
3. **agent 工具从 5 个增加到 7 个**——新增 `ima_upload_file`、`ima_add_url`。
4. **包名变更**——npm 包名是 `ik-dsh-ima`（`dsh-ima` 在 2026-09-04 被他人发布后撤回，Registry 已锁定该名字无法申请）。仓库名仍是 `dsh-ima`。
5. **安装命令变更**——页面当前给的 `dsh plugin --profile <profile> add github:ikevss/dsh-ima` 会走 SSH 协议，没配 SSH key 的机器报 `Permission denied (publickey)`。请改为 npm 包名安装。

**权限说明**
- 网络：只连 `ima.qq.com`（OpenAPI）和 ima 返回的腾讯云 COS 域名（文件上传）
- 本地文件：读取用户主动选中上传的文件；凭据存 `~/.dsh/storages/dsh-ima/credentials.json`（权限 600）
- 无遥测，不上传除用户主动指定外的任何内容

**已知边界（如实说明）**
- 订阅类知识库受 ima 产品策略保护，不开放读取，插件默认不显示
- ima OpenAPI 不返回文件更新时间字段，插件预留显示通道，开放后自动生效
- 上传上限约 30MB；Bilibili / YouTube 等视频只能在 ima 桌面端内添加
- 笔记接口只返回展平纯文本，原始段落结构服务端已丢失，插件按锚点尽力还原并提供「看原文」对照

### Pre-submission checklist
- [x] Repository is public
- [x] GitHub topic `dsh-plugin` added
- [x] README includes the install command
- [x] Plugin exports an `apply(ctx)` module
- [x] Repository root includes a `package.json`
