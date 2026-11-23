说得对，这是两回事，我此前只补了文档层，没动接口层的准入。已修，v1.11.4。

## 问题确认

`/api/ima/*` 之前直接挂在 `webServer` 上，只依赖"本机端口能不能连"。也就是说：本机任何进程、任何脚本、任何能访问到该端口的程序，都能 `GET /api/ima/media?kb=...` 拿到用户 ima 知识库里的真实内容，也能 `POST /api/ima/upload` 往里写。这跟"README 里写清楚了"完全不是一回事。

## 修复方式

```js
ctx.inject(['webServer', 'connection'], (webCtx) => {
  const conn = webCtx.connection
  if (!conn || typeof conn.isAuthenticated !== 'function') {
    console.warn('[dsh-ima] connection 服务不可用，为安全起见不注册 /api/ima 路由')
    return
  }
  webCtx.effect(() => webCtx.webServer.register({
    kind: 'prefix',
    path: '/api/ima',
    handler: async (req, res) => {
      // 准入放在最前面，早于任何参数解析与业务逻辑
      let authed = false
      try { authed = conn.isAuthenticated(req) } catch { authed = false }
      if (!authed) {
        try { conn.writeUnauthorized(req, res) } catch {
          res.writeHead(401, { 'content-type': 'text/plain; charset=utf-8' })
          res.end('unauthorized\n')
        }
        return
      }
      // ... 以下才是原有业务逻辑
```

四条要点：

1. **准入早于一切**：在 `new URL(...)` 解析参数之前、在查路由表之前，未通过就直接 return，不会碰到任何 ima 接口。
2. **fail-closed**：`isAuthenticated` 抛异常时按**未通过**处理，不会因为异常而放行。
3. **服务不可用时不注册**：`connection` 拿不到就整段路由不注册——宁可不提供能力，也不留一个裸接口。之前的写法是只要有 webServer 就注册。
4. **401 由 connection 自己写**：用 `conn.writeUnauthorized(req, res)` 保持与宿主一致的响应形态，只有它自己抛错时才用本地兜底。

`connection` 判断 `isAuthenticated` 的签名我核对过，与 `dsh-host-frontend-static` 保护 index 用的是同一套（`authorizeIndex` 内部也是走 `isAuthenticated`）；这里只需要布尔判定、不需要它接管响应，所以直接调 `isAuthenticated` 更轻。

## 测试

新增 `test/verify-auth-guard.js`，除了静态检查（准入存在、顺序在路由分发之前），还做了行为验证：

| 情形 | 期望 | 结果 |
|---|---|---|
| 未准入 | 401 且返回 blocked | ✅ |
| 已准入 | 放行 | ✅ |
| `isAuthenticated` 抛错 | 仍拦住（fail-closed） | ✅ |
| `connection` 不可用 | 整段不注册 | ✅（静态校验） |

```
=== 2. 顺序：准入在业务逻辑之前 ===
  OK   准入检查早于「查路由表并调用」  auth@30331 < 调用路由@31148
  OK   准入检查早于参数解析（new URL）
=== 3. 行为验证：模拟请求 ===
  OK   未准入 → 返回 blocked / 401
  OK   已准入 → 返回 passed
  OK   isAuthenticated 抛错 → 仍拦住（fail-closed）
全部通过
```

## 状态

- npm: `ik-dsh-ima@1.11.4`
- Release: https://github.com/ikevss/dsh-ima/releases/tag/v1.11.4
- 提交: `f3ed528`
- CHANGELOG 里这一条放在「安全」分类下

README 的权限表和授权说明也同步改了，明说"别的程序调不了它的接口，会被 401 挡在外面"。

请再看一眼实现是否还有遗漏——特别是 401 的写法和 fail-closed 的处理，是否符合你们期望的统一形态。
