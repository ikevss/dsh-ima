### 插件 / Plugin

`ikevss/dsh-ima` — https://github.com/ikevss/dsh-ima

### 需要更新的内容 / What needs updating

页面当前显示的安装命令已失效，请更新为 npm 包安装。

**当前页面显示（会失败）：**
```
dsh plugin --profile web add github:ikevss/dsh-ima
```

**应改为：**
```
dsh plugin --profile web add ik-dsh-ima
```

### 原因 / Why

1. **包名变了**：`dsh-ima` 这个 npm 名在 2026-09-04 被他人发布后撤回，npm Registry 已锁定该名字、无法再申请。现在发布的包名是 **`ik-dsh-ima`**（https://www.npmjs.com/package/ik-dsh-ima），仓库名仍是 `dsh-ima`。
2. **`github:` 简写会失败**：npm 把 `github:` 解析成 SSH 地址（`ssh://git@github.com/...`），没配 SSH key 的机器直接报 `Permission denied (publickey)`。这是我在 README 里专门标注过的坑。
3. **已发布到 npm**，一条命令即可安装，不需要 build 脚本，也不需要 allowBuilds 授权。

### 页面其他可同步更新的信息

| 字段 | 当前显示 | 实际 |
|---|---|---|
| 安装命令 | `add github:ikevss/dsh-ima` | `add ik-dsh-ima` |
| 一句话描述 | "Browse Tencent ima knowledge bases... **five tools**" | 现在 **7 个工具**（5 读 + 2 写：`ima_upload_file` / `ima_add_url`） |
| 功能范围 | 只有读 | **能读也能写**（v1.10 起：上传文件、收录网页/公众号文章） |
| 分类 | Docs & Rendering | 建议 **Tools & Capabilities**（虽然它有预览能力，但核心是知识库读写工具） |
| 兼容性 | DSH 0.2.0-rc.1 | **0.2.2-rc.1**（已适配；0.2.0-rc.1 起接口兼容） |

README 已经是最新的（页面上的 README 内容看起来已经抓到了 v1.11.1 的版本），只是顶部那张「Install」卡片里的命令还是旧的。

### 附加信息 / Extra

- npm: https://www.npmjs.com/package/ik-dsh-ima
- License: MIT
- 已验证 DSH 0.2.2-rc.1，Node ≥ 18，Windows / macOS / Linux
