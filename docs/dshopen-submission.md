### 插件地址 / Plugin link

`ik-dsh-ima`

源码：https://github.com/ikevss/dsh-ima

---

### 简短说明 / Summary

把腾讯 **ima 知识库**接进 DeepSeek Harness：侧边栏浏览知识库与文件，agent 能自动检索、读取，**也能往知识库里写**。

**读：**
- 侧边栏「知识库 ima」面板：个人 / 共享两组折叠，多层文件夹 + 面包屑
- 面板内搜索（`Ctrl K`）：跨全部知识库搜正文，结果按知识库分组，点一条直接打开并高亮命中处、自动滚过去
- 文件预览：PDF / Word / Excel / PPT / 图片 / 音视频 / Markdown / XMind 在面板内直接看
- 5 个 agent 工具，含按正文内容搜索；每轮自动把库清单注入上下文

**写：**
- 上传本机文件到知识库：点「上传」选文件，或直接把文件拖进面板；支持 23 种格式（PDF / Word / PPT / Excel / CSV / Markdown / 图片 / TXT / XMind / 音频 / HTML / EPUB）
- 重名保护：ima 不支持覆盖，同名时先拦下来问，选「保留两者」自动加时间戳
- 网页 / 微信公众号文章一键收录（给个链接即可，服务端自动抓正文）
- 2 个写入类 agent 工具：`ima_upload_file`、`ima_add_url`

**界面：**
- 数据来自远程接口（300ms~3s），每个等待都有反馈：骨架屏 shimmer、顶部进度条、列表逐项淡入、拖拽遮罩渐显、多文件上传独立状态条
- 图标跟随主题明暗切换；`:focus-visible` 焦点环、键盘可操作、支持 `prefers-reduced-motion`

**关于写入能力的补充说明**：v1.10 之前的版本只能读。不是 ima 没开放写入接口，是调用 `create_media` 时少传了 `content_type` 和 `file_ext` 两个必填字段，而服务端返回的错误信息 `invalid media_type` 极具误导性。修好参数后写入链路完全可用。

**已知边界（如实说明）：**
- 订阅类知识库受 ima 产品策略保护，不开放读取，插件默认不显示
- ima OpenAPI 目前不返回文件更新时间字段，插件预留了显示通道，ima 开放后自动生效
- 上传上限约 30MB；Bilibili / YouTube 等视频只能在 ima 桌面端内添加
- 笔记接口只返回展平后的纯文本，原始段落结构在服务端就丢失，插件按锚点尽力还原并提供「看原文」对照

---

### 插件实际效果 / Plugin screenshots

截图见仓库 `docs/screenshots/`（演示数据，虚构库名与文件名）：

- `shot-1-panel.png` — 知识库面板与文件列表（左侧分组、格式图标、行尾操作）
- `shot-5-preview.png` — 文档预览（Word 按页渲染，右上角下载 / 引用到对话）
- `shot-3-detail.png` — 笔记排版还原（会议记录恢复成一句一条的发言列表）
- `shot-2-bind.png` — 一键绑定（自动打开浏览器登录 ima，其余全自动）
- `shot-4-manual.png` — 无 Chrome/Edge 时的手动兜底

https://github.com/ikevss/dsh-ima/tree/main/docs/screenshots

---

### 补充信息 / Additional details

**Logo**：https://github.com/ikevss/dsh-ima/blob/main/assets/logo-512.png
（蓝青渐变底 + 三层知识库 + 放大镜=检索 + 黄加号=写入，对应插件「能读能搜能写」三项能力）

**已验证环境：**

| 项 | 值 |
|---|---|
| DSH 版本 | 0.2.2-rc.1（0.2.0-rc.1 起接口兼容；插件已适配 0.2.2 的 `webServer.register` 必需 `kind` 字段） |
| Node.js | ≥ 18（推荐 ≥ 22，绑定自动化用到内置 WebSocket） |
| 操作系统 | Windows / macOS / Linux（宿主半为纯 Node 实现，无原生模块依赖） |
| 浏览器 | Chrome 或 Edge（仅「一键绑定」需要，没有会自动降级为手动填写） |

**许可证**：MIT

**关于包名**：npm 包名是 `ik-dsh-ima`，仓库名和目录名是 `dsh-ima`。`dsh-ima` 这个 npm 名在 2026-09-04 被别人发布后又撤回，名字已被 Registry 锁定、无法再申请，所以用了 `ik-` 前缀。

**权限说明**（README 里有完整表格，此处摘录）：
- 网络：只连 `ima.qq.com`（OpenAPI）和腾讯云 COS（文件上传，域名由 ima 返回的临时凭证决定）
- 本地文件：读取用户主动选择上传的文件；凭证存 `~/.dsh/storages/dsh-ima/credentials.json`（权限 600）
- 不收集任何遥测，不上传除用户主动指定外的任何内容
