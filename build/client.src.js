/**
 * 插件主逻辑（被 build.mjs 嵌进 DSH 的闭包工厂里）
 *
 * 可用变量：
 *   require            DSH 模块加载器
 *   __VIEWER_CSS__     预览引擎的样式（构建时注入的 JSON 字符串）
 *   window.__DSH_IMA_VIEWER__  预览引擎（构建时注入的 IIFE 设置）
 *
 * ⚠️ sidebar.panellist 注册的组件只能是「图标」：
 *    侧边栏自己渲染 <button aria-label={label}><span class=glyph>{组件}</span><span class=title>{label}</span></button>
 *    组件里再写文字会重复出现。
 */

var react = require('react')
var React = react
var h = react.createElement

var PANEL_ID = 'dsh-ima'
var API = '/api/ima'

// ── 样式 ─────────────────────────────────────────────────
// 色彩全部走 DSH 真实存在的主题变量（已从 app.asar 的 CSS 里逐一核对，
// 共 98 个 --dsw-* 变量）。原先写的一批 --dsw-alias-brand-primary /
// status-danger / bg-secondary 在 DSH 里根本不存在，等于全靠 fallback 硬编码，
// 深色主题下就露馅。
var CSS = [
  // ── 设计令牌：一屏内统一的圆角/间距/字号/缓动 ──
  ':root,.dsh-ima-root{--ima-r-xs:4px;--ima-r-sm:6px;--ima-r-md:8px;--ima-r-lg:12px;--ima-sp-1:4px;--ima-sp-2:8px;--ima-sp-3:12px;--ima-sp-4:16px;--ima-ease-out:cubic-bezier(.2,0,0,1);--ima-ease-in-out:cubic-bezier(.4,0,.2,1);--ima-dur-fast:120ms;--ima-dur-base:180ms;--ima-dur-slow:240ms}',
  '.dsh-ima-root{display:flex;flex-direction:column;height:100%;font-size:var(--dsw-font-xs-13,13px);line-height:1.65;color:var(--dsw-alias-label-primary,#1a1a1a);background:var(--dsw-alias-bg-layer-1,#fff);font-family:var(--dsw-font-family,inherit)}',
  '.dsh-ima-head{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));flex-shrink:0}',
  '.dsh-ima-title{font-size:15px;font-weight:600}',
  '.dsh-ima-spacer{flex:1;min-width:0}',
  '.dsh-ima-badge{font-size:.88em;color:var(--dsw-alias-label-secondary,#666)}',
  '.dsh-ima-stamp{font-size:.85em;color:var(--dsw-alias-label-tertiary,#999);white-space:nowrap;font-variant-numeric:tabular-nums}',

  // 按钮：主按钮用 DSH 真正的品牌色变量
  '.dsh-ima-btn{display:inline-flex;align-items:center;gap:5px;font-size:.92em;padding:5px 11px;border-radius:var(--ima-r-sm);border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));background:transparent;color:var(--dsw-alias-label-primary,#1a1a1a);cursor:pointer;font-family:inherit;line-height:1.45;white-space:nowrap;text-decoration:none}',
  '.dsh-ima-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}',
  '.dsh-ima-btn-p{background:var(--dsw-alias-button-primary-fill,#3b6cf6);border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff);box-shadow:var(--dsw-elevation-soft,none)}',
  '.dsh-ima-btn-p:hover{background:var(--dsw-alias-button-primary-hover,#3560dd);border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff)}',
  '.dsh-ima-btn-d{color:var(--dsw-alias-label-error,#d93838)}',
  '.dsh-ima-btn-d:hover{background:var(--dsw-alias-interactive-bg-hover-danger,rgba(217,56,56,.08));color:var(--dsw-alias-label-error,#d93838)}',
  '.dsh-ima-btn:disabled{opacity:.45;cursor:default;filter:none}',
  '.dsh-ima-ibtn{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:none;border-radius:var(--ima-r-sm);background:transparent;color:var(--dsw-alias-label-secondary,#666);cursor:pointer;flex-shrink:0}',
  '.dsh-ima-ibtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06))}',
  '.dsh-ima-ibtn:disabled{opacity:.45;cursor:default}',

  '.dsh-ima-body{flex:1;display:flex;min-height:0}',
  '.dsh-ima-kbs{width:230px;border-right:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));overflow:auto;padding:10px;flex-shrink:0}',
  '.dsh-ima-kb{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:var(--ima-r-sm);cursor:pointer;margin-bottom:2px}',
  '.dsh-ima-kb:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}',
  '.dsh-ima-kb-on{background:var(--dsw-alias-interactive-bg-active,rgba(0,0,0,.08))}',
  '.dsh-ima-kb-name{flex:1;font-size:1em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.dsh-ima-tag{font-size:.8em;padding:2px 6px;border-radius:var(--ima-r-xs);flex-shrink:0}',
  '.dsh-ima-main{flex:1;overflow:auto;padding:14px 18px;min-width:0;display:flex;flex-direction:column}',
  '.dsh-ima-center{flex:1;display:flex;align-items:center;justify-content:center;padding:24px;overflow:auto}',
  '.dsh-ima-dlg{width:460px;max-width:100%;box-sizing:border-box;background:var(--dsw-alias-bg-layer-2,#fff);border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));border-radius:var(--dsw-radius-lg,12px);padding:24px;box-shadow:var(--dsw-elevation-prominent,0 8px 32px rgba(0,0,0,.10));font-size:var(--dsw-font-xs-13,13px)}',
  '.dsh-ima-crumb{font-size:1em;color:var(--dsw-alias-label-secondary,#666);margin-bottom:12px;display:flex;align-items:center;gap:8px;min-width:0;flex-shrink:0}',
  '.dsh-ima-crumb a{color:inherit;cursor:pointer;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.dsh-ima-crumb a:hover{text-decoration:underline}',
  '.dsh-ima-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--ima-r-sm);cursor:pointer;flex-shrink:0}',
  '.dsh-ima-kbsec{margin-bottom:4px}',
  '.dsh-ima-kbsec-h{display:flex;align-items:center;gap:5px;padding:6px 6px 4px;font-size:.92em;color:var(--dsw-alias-label-secondary,#666);cursor:pointer;user-select:none;border-radius:var(--ima-r-sm)}',
  '.dsh-ima-kbsec-h:hover{color:var(--dsw-alias-label-primary,#1a1a1a)}',
  '.dsh-ima-kbsec-t{font-weight:500}',
  '.dsh-ima-chev{display:inline-flex;color:var(--dsw-alias-label-tertiary,#999);transition:transform var(--ima-dur-fast) var(--ima-ease-out)}',
  '.dsh-ima-chev-off{transform:rotate(-90deg)}',
  '.dsh-ima-kbsec-add{width:22px;height:22px;padding:0;border:none;background:transparent;color:var(--dsw-alias-label-tertiary,#999);font-size:1.15em;line-height:1;border-radius:var(--ima-r-xs);cursor:pointer;font-family:inherit}',
  '.dsh-ima-kbsec-add:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));color:var(--dsw-alias-label-primary,#1a1a1a)}',
  '.dsh-ima-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}',
  '.dsh-ima-item-t{flex:1;font-size:1em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}',
  '.dsh-ima-item-y{font-size:.85em;color:var(--dsw-alias-label-tertiary,#999);flex-shrink:0}',
  // 行内操作：图标+文字，常驻显示
  '.dsh-ima-act{display:flex;gap:6px;flex-shrink:0;margin-left:6px;opacity:.55;transition:opacity var(--ima-dur-fast) var(--ima-ease-out)}',
  '.dsh-ima-item:hover .dsh-ima-act,.dsh-ima-item:focus-within .dsh-ima-act{opacity:1}',
  '.dsh-ima-actbtn{display:inline-flex;align-items:center;gap:5px;font-size:.86em;padding:4px 10px;border-radius:var(--ima-r-sm);border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.14));background:transparent;color:var(--dsw-alias-label-secondary,#666);cursor:pointer;font-family:inherit;line-height:1.45;white-space:nowrap}',
  '.dsh-ima-actbtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));color:var(--dsw-alias-label-primary,#1a1a1a)}',
  '.dsh-ima-actbtn-p{color:var(--dsw-alias-brand-primary,#3b6cf6);border-color:var(--dsw-alias-brand-primary,#3b6cf6);font-weight:500}',
  '.dsh-ima-actbtn-p:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));color:var(--dsw-alias-brand-primary,#3b6cf6)}',
  '.dsh-ima-empty{padding:48px 20px;text-align:center;color:var(--dsw-alias-label-tertiary,#999);font-size:1em}',
  '.dsh-ima-pre{white-space:pre-wrap;word-break:break-word;font-size:1em;line-height:1.75;background:var(--dsw-alias-bg-layer-2,#f5f5f5);border-radius:var(--ima-r-md);padding:16px;margin-top:12px;overflow:auto;font-family:var(--dsw-font-family,inherit)}',
  '.dsh-ima-vbox{margin-top:12px;border-radius:var(--ima-r-md);overflow:hidden;background:var(--dsw-alias-bg-layer-2,#f5f5f5)}',
  '.dsh-ima-vbox>div{height:100%}',
  '.dsh-ima-md h1{font-size:1.45em;font-weight:500;margin:1em 0 .5em}',
  '.dsh-ima-md h2{font-size:1.25em;font-weight:500;margin:1em 0 .5em}',
  '.dsh-ima-md h3{font-size:1.1em;font-weight:500;margin:.9em 0 .5em}',
  '.dsh-ima-md h4,.dsh-ima-md h5,.dsh-ima-md h6{font-size:1em;font-weight:500;margin:.8em 0 .4em}',
  '.dsh-ima-md p{margin:.55em 0}',
  '.dsh-ima-md code{font-size:.92em;background:var(--dsw-alias-bg-layer-3,rgba(0,0,0,.06));padding:1px 5px;border-radius:4px;font-family:ui-monospace,Menlo,Consolas,monospace}',
  '.dsh-ima-md pre{background:var(--dsw-alias-bg-layer-3,rgba(0,0,0,.06));border-radius:6px;padding:10px 12px;overflow:auto;margin:.6em 0}',
  '.dsh-ima-md pre code{background:none;padding:0}',
  '.dsh-ima-md strong{font-weight:500}',
  '.dsh-ima-md em{font-style:italic}',
  '.dsh-ima-md ul,.dsh-ima-md ol{padding-left:1.5em;margin:.5em 0}',
  '.dsh-ima-md li{margin:.22em 0}',
  '.dsh-ima-md a{color:var(--dsw-alias-brand-primary,#3b6cf6);text-decoration:none;word-break:break-all}',
  '.dsh-ima-md a:hover{text-decoration:underline}',
  '.dsh-ima-md hr{border:none;border-top:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));margin:1em 0}',
  '.dsh-ima-md blockquote{margin:.6em 0;padding:.1em 0 .1em .9em;border-left:2px solid var(--dsw-alias-border-l2,rgba(0,0,0,.16));color:var(--dsw-alias-label-secondary,#666)}',
  // 会议听记的发言人行（ima 听记类笔记展平后靠「发言人N 时间戳」还原）
  '.dsh-ima-spk{display:inline-block;margin:.9em 0 .15em;padding:1px 8px;border-radius:5px;background:var(--dsw-alias-bg-layer-3,rgba(0,0,0,.06));color:var(--dsw-alias-label-secondary,#666);font-size:.88em;line-height:1.6;font-variant-numeric:tabular-nums}',
  '.dsh-ima-md>:first-child{margin-top:0}',
  '.dsh-ima-md>:last-child{margin-bottom:0}',
  '.dsh-ima-rawhint{font-size:.85em;color:var(--dsw-alias-label-tertiary,#999);line-height:1.7;margin-top:10px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.08))}',
  '.dsh-ima-dlg h3{margin:0 0 8px;font-size:1.12em;font-weight:500}',
  '.dsh-ima-f{margin-top:14px}',
  '.dsh-ima-f label{display:block;font-size:.92em;color:var(--dsw-alias-label-secondary,#666);margin-bottom:6px}',
  '.dsh-ima-f input{width:100%;box-sizing:border-box;font-size:.95em;padding:9px 11px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#1a1a1a);font-family:inherit}',
  '.dsh-ima-acts{display:flex;gap:8px;justify-content:flex-end;align-items:center;margin-top:20px}',
  '.dsh-ima-link{background:none;border:none;padding:0;font-size:.88em;color:var(--dsw-alias-label-tertiary,#999);cursor:pointer;font-family:inherit;text-decoration:underline;text-underline-offset:2px}',
  '.dsh-ima-link:hover{color:var(--dsw-alias-label-secondary,#666)}',
  '.dsh-ima-step{display:flex;gap:10px;margin-top:16px;align-items:flex-start}',
  '.dsh-ima-stepno{flex-shrink:0;width:20px;height:20px;border-radius:50%;background:var(--dsw-alias-bg-layer-2,#f0f0f0);color:var(--dsw-alias-label-secondary,#666);font-size:.85em;display:inline-flex;align-items:center;justify-content:center;margin-top:2px}',
  '.dsh-ima-tip2{font-size:.9em;color:var(--dsw-alias-state-success-primary,#1a9e6a);background:var(--dsw-alias-bg-layer-2,#f5f5f5);border-radius:6px;padding:8px 12px;margin-top:14px;line-height:1.6}',
  '.dsh-ima-big{width:100%;box-sizing:border-box;padding:12px;font-size:1.05em;margin-top:18px;border-radius:8px}',
  '.dsh-ima-waitbar{display:flex;align-items:center;gap:8px;font-size:.92em;color:var(--dsw-alias-label-secondary,#666);margin-top:14px}',
  '.dsh-ima-spin{display:inline-block;width:13px;height:13px;border:2px solid var(--dsw-alias-brand-primary,#3b6cf6);border-top-color:transparent;border-radius:50%;animation:dsh-ima-rot .75s linear infinite}',
  '@keyframes dsh-ima-rot{to{transform:rotate(360deg)}}',
  '.dsh-ima-filled{font-size:.9em;color:var(--dsw-alias-label-secondary,#666);background:var(--dsw-alias-bg-layer-2,#f5f5f5);border-radius:6px;padding:10px 12px;margin-top:14px;line-height:1.9;font-family:ui-monospace,Menlo,Consolas,monospace}',
  '.dsh-ima-note{font-size:.92em;color:var(--dsw-alias-label-secondary,#666);line-height:1.7}',
  '.dsh-ima-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.82);color:#fff;font-size:.92em;padding:9px 18px;border-radius:8px;z-index:3000;pointer-events:none}',

  // ── 授权状态：右上角一个小图标 + 点击浮窗 ──────────────
  // 状态正常时不该占视线：常驻的只有一个 7px 圆点 + 盾牌图标，
  // 具体信息放进浮窗，想看才看。圆点变黄 = 超过 7 天没验证，提示页主该确认了。
  '.dsh-ima-authwrap{position:relative;flex-shrink:0}',
  '.dsh-ima-authbtn{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 8px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#666);cursor:pointer;flex-shrink:0}',
  '.dsh-ima-authbtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}',
  '.dsh-ima-authbtn-on{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}',
  '.dsh-ima-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;background:var(--dsw-alias-state-success-primary,#1a9e6a)}',
  '.dsh-ima-dot-warn{background:var(--dsw-alias-state-warn-primary,#d9a300)}',
  '.dsh-ima-dot-bad{background:var(--dsw-alias-label-error,#d93838)}',
  '.dsh-ima-authpop{position:absolute;top:34px;right:0;width:260px;box-sizing:border-box;padding:14px;border-radius:10px;background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));box-shadow:0 8px 28px rgba(0,0,0,.12);z-index:60;font-size:.92em;line-height:1.6}',
  '.dsh-ima-authpop-row{display:flex;align-items:center;gap:7px;margin-bottom:6px}',
  '.dsh-ima-authpop-note{font-size:.92em;color:var(--dsw-alias-label-secondary,#666);line-height:1.7}',
  '.dsh-ima-authpop-warn{font-size:.92em;color:var(--dsw-alias-state-warn-primary,#b07d00);background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.03));border-radius:6px;padding:6px 9px;margin-top:8px;line-height:1.6}',
  '.dsh-ima-auth-link{background:none;border:none;padding:0;font:inherit;color:var(--dsw-alias-brand-primary,#3b6cf6);cursor:pointer;text-decoration:underline;text-underline-offset:2px;flex-shrink:0}',
  '.dsh-ima-auth-link:disabled{color:var(--dsw-alias-label-tertiary,#999);cursor:default;text-decoration:none}',

  // ── 搜索框（Ctrl+K 聚焦） ──────────────────────────────
  '.dsh-ima-search{display:flex;align-items:center;gap:7px;padding:0 10px;height:30px;border-radius:7px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));background:var(--dsw-alias-bg-layer-1,#fff);margin-bottom:10px;flex-shrink:0}',
  '.dsh-ima-search:focus-within{border-color:var(--dsw-alias-brand-primary,#3b6cf6)}',
  '.dsh-ima-search input{flex:1;min-width:0;border:none;outline:none;background:transparent;font:inherit;font-size:.94em;color:var(--dsw-alias-label-primary,#1a1a1a);padding:0}',
  '.dsh-ima-search input::placeholder{color:var(--dsw-alias-label-tertiary,#999)}',
  '.dsh-ima-kbd{font-size:.78em;color:var(--dsw-alias-label-tertiary,#999);border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));border-radius:4px;padding:1px 5px;flex-shrink:0;font-family:ui-monospace,Menlo,Consolas,monospace}',

  // ── 命中高亮 ──
  // 不用警告色（黄色）做高亮 —— 语义错位，用户会以为命中处是"警告"。
  // 改用品牌色的低饱和混合，既醒目又不吓人。
  '.dsh-ima-hit{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#3b6cf6) 22%,transparent);color:inherit;border-radius:3px;padding:0 1px;scroll-margin:120px;box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary,#3b6cf6) 30%,transparent)}',

  // ── 空状态：有说明、有一个明确的下一步 ─────────────────
  '.dsh-ima-emptybox{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:40px 20px;text-align:center}',
  '.dsh-ima-empty-t{font-size:1em;color:var(--dsw-alias-label-secondary,#666)}',
  '.dsh-ima-empty-d{font-size:.9em;color:var(--dsw-alias-label-tertiary,#999);line-height:1.7;max-width:320px}',
  '.dsh-ima-empty-ico{color:var(--dsw-alias-label-tertiary,#bbb);margin-bottom:4px}',

  // ── 排序 ─────────────────────────────────────────────
  '.dsh-ima-sort{display:flex;align-items:center;gap:4px;flex-shrink:0}',
  '.dsh-ima-sortbtn{font-size:.86em;padding:3px 8px;border-radius:5px;border:none;background:transparent;color:var(--dsw-alias-label-tertiary,#999);cursor:pointer;font-family:inherit;white-space:nowrap}',
  '.dsh-ima-sortbtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));color:var(--dsw-alias-label-secondary,#666)}',
  '.dsh-ima-sortbtn-on{color:var(--dsw-alias-label-primary,#1a1a1a);font-weight:500}',
  '.dsh-ima-sortbtn-on:hover{color:var(--dsw-alias-label-primary,#1a1a1a)}',

  // ── 上传 / 写入 ───────────────────────────────────────
  '.dsh-ima-up{position:relative;flex-shrink:0}',
  // 拖拽遮罩：常驻 DOM，用 opacity 过渡（条件挂载会"啪"一下闪出来）
  '.dsh-ima-drop{position:absolute;inset:0;border:2px dashed var(--dsw-alias-brand-primary,#3b6cf6);border-radius:var(--ima-r-md);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fff) 92%,transparent);display:flex;align-items:center;justify-content:center;font-size:.95em;color:var(--dsw-alias-brand-primary,#3b6cf6);z-index:20;pointer-events:none;opacity:0;visibility:hidden;transition:opacity var(--ima-dur-base) var(--ima-ease-out),visibility 0s linear var(--ima-dur-base)}',
  '.dsh-ima-drop-on{opacity:1;visibility:visible;transition-delay:0s}',
  '.dsh-ima-uplist{margin-top:10px;display:flex;flex-direction:column;gap:6px;flex-shrink:0}',
  '.dsh-ima-uprow{display:flex;align-items:center;gap:8px;font-size:.9em;padding:7px 10px;border-radius:var(--ima-r-sm);background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.03));position:relative;overflow:hidden;transition:background-color var(--ima-dur-base) var(--ima-ease-out),color var(--ima-dur-base) var(--ima-ease-out)}',
  '.dsh-ima-uprow-ok{color:var(--dsw-alias-state-success-primary,#1a9e6a)}',
  '.dsh-ima-uprow-bad{color:var(--dsw-alias-label-error,#d93838)}',
  // 进行中：左侧 4px 状态竖条 + 底部 2px 不确定进度条，多个文件同时传也分得清
  '.dsh-ima-uprow-busy::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--dsw-alias-brand-primary,#3b6cf6);animation:dsh-ima-pulse 1.4s ease-in-out infinite}',
  '.dsh-ima-uprow-busy::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:linear-gradient(90deg,transparent,var(--dsw-alias-brand-primary,#3b6cf6),transparent);animation:dsh-ima-indet2 1.2s linear infinite}',
  '@keyframes dsh-ima-indet2{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}',
  '.dsh-ima-uprow-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary,#1a1a1a)}',
  '.dsh-ima-btn:hover .dsh-ima-ico,.dsh-ima-actbtn:hover .dsh-ima-ico{opacity:.85}',

  // ══ 动效基础 ══════════════════════════════════════════
  // 数据来自远程接口，300ms~3s 的等待必须有反馈，否则像"卡住"。
  // 时长规则：交互反馈 120ms / 状态过渡 180ms / 内容进出 220~260ms。
  '@keyframes dsh-ima-rot{to{transform:rotate(360deg)}}',
  '@keyframes dsh-ima-shimmer{from{background-position:100% 0}to{background-position:-100% 0}}',
  '@keyframes dsh-ima-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}',
  '@keyframes dsh-ima-fadein{from{opacity:0}to{opacity:1}}',
  '@keyframes dsh-ima-pop{from{opacity:0;transform:translateY(-4px) scale(.97)}to{opacity:1;transform:none}}',
  '@keyframes dsh-ima-pulse{0%,100%{opacity:1}50%{opacity:.4}}',
  '@keyframes dsh-ima-indet{0%{transform:translateX(-100%)}100%{transform:translateX(320%)}',

  // 所有可交互元素统一过渡，避免逐个补
  '.dsh-ima-btn,.dsh-ima-ibtn,.dsh-ima-actbtn,.dsh-ima-sortbtn,.dsh-ima-kb,.dsh-ima-item,.dsh-ima-kbsec-h,.dsh-ima-link,.dsh-ima-auth-link,.dsh-ima-authbtn{transition:background-color var(--ima-dur-fast) var(--ima-ease-out),color var(--ima-dur-fast) var(--ima-ease-out),border-color var(--ima-dur-fast) var(--ima-ease-out),opacity var(--ima-dur-fast) var(--ima-ease-out),transform 90ms var(--ima-ease-out)}',
  '.dsh-ima-btn:active,.dsh-ima-actbtn:active,.dsh-ima-ibtn:active{transform:scale(.97)}',

  // 焦点可见（键盘用户），不影响鼠标观感
  '.dsh-ima-root :focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary,#3b6cf6));outline-offset:2px;border-radius:var(--ima-r-sm)}',

  // 顶部不确定进度条：>800ms 的等待才出现，比转圈更能表达"在动"
  '.dsh-ima-prog{position:relative;height:2px;overflow:hidden;flex-shrink:0;background:transparent}',
  '.dsh-ima-prog::after{content:"";position:absolute;inset:0;width:32%;background:var(--dsw-alias-brand-primary,#3b6cf6);border-radius:2px;animation:dsh-ima-indet 1.2s var(--ima-ease-in-out) infinite}',

  // 骨架屏：与真实行同高（36px），避免布局跳动
  '.dsh-ima-skel{display:flex;align-items:center;gap:10px;padding:9px 12px;height:36px;box-sizing:border-box;flex-shrink:0}',
  '.dsh-ima-skel-ico{width:20px;height:20px;border-radius:var(--ima-r-xs);flex-shrink:0}',
  '.dsh-ima-skel-bar{height:9px;border-radius:5px;flex:1;max-width:220px}',
  '.dsh-ima-skel-ico,.dsh-ima-skel-bar{background:linear-gradient(90deg,var(--dsw-alias-bg-skeleton,var(--dsw-alias-bg-layer-3,rgba(0,0,0,.06))) 0%,var(--dsw-alias-bg-layer-2,rgba(0,0,0,.03)) 50%,var(--dsw-alias-bg-skeleton,var(--dsw-alias-bg-layer-3,rgba(0,0,0,.06))) 100%);background-size:200% 100%;animation:dsh-ima-shimmer 1.2s ease-in-out infinite}',

  // 旧数据淡出：切库/刷新时保留旧列表，不清空（避免闪白）
  '.dsh-ima-list{transition:opacity var(--ima-dur-base) var(--ima-ease-out)}',
  '.dsh-ima-list-stale{opacity:.45}',

  // 列表项进场：进新目录时逐项淡入，级联 18ms（超过 10 项不再排队，避免显得慢）
  '.dsh-ima-item{animation:dsh-ima-in .18s var(--ima-ease-out) both}',
  '.dsh-ima-item{animation-delay:calc(var(--i,0) * 18ms)}',

  // 预览层进出
  '.dsh-ima-pane-in{animation:dsh-ima-in .22s var(--ima-ease-out) both}',
  '.dsh-ima-authpop{animation:dsh-ima-pop .16s var(--ima-ease-out) both;transform-origin:top right}',
  '.dsh-ima-dlg{animation:dsh-ima-pop .2s var(--ima-ease-out) both}',
  '.dsh-ima-emptybox{animation:dsh-ima-in .22s var(--ima-ease-out) both}',

  // 验证中的状态点：呼吸
  '.dsh-ima-dot-pulse{animation:dsh-ima-pulse 1.6s ease-in-out infinite}',

  // 减少动态效果：全部降为瞬时，保留文字提示（否则"转圈没了以为卡死"）
  '@media (prefers-reduced-motion:reduce){.dsh-ima-root *,.dsh-ima-root *::before,.dsh-ima-root *::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;scroll-behavior:auto !important}.dsh-ima-spin,.dsh-ima-prog::after{display:none}.dsh-ima-waitbar::after{content:"（正在加载，请稍候）"}}',

  // ══ 错误样式：从"一行红字"改成有背景、有图标、有下一步 ══
  '.dsh-ima-alert{display:flex;gap:8px;align-items:flex-start;font-size:.92em;line-height:1.6;padding:9px 12px;border-radius:var(--ima-r-md);margin:8px 16px;border:1px solid var(--dsw-alias-label-error,rgba(217,56,56,.28));background:color-mix(in srgb,var(--dsw-alias-label-error,#d93838) 8%,transparent);color:var(--dsw-alias-label-primary,#1a1a1a);flex-shrink:0}',
  '.dsh-ima-alert>.dsh-ima-ico{color:var(--dsw-alias-label-error,#d93838);margin-top:2px}',
  '.dsh-ima-alert-body{flex:1;min-width:0}',
  '.dsh-ima-alert-warn{border-color:var(--dsw-alias-state-warn-primary,rgba(217,163,0,.32));background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d9a300) 10%,transparent)}',
  '.dsh-ima-alert-warn>.dsh-ima-ico{color:var(--dsw-alias-state-warn-primary,#b07d00)}',
  '.dsh-ima-alert-actions{display:flex;gap:6px;margin-top:6px}',

  // ══ toast：加进出场，定位在面板内不再压主对话区 ══
  '.dsh-ima-toast{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);background:var(--dsw-alias-toast-bg,rgba(0,0,0,.82));color:var(--dsw-alias-toast-label,#fff);font-size:.92em;padding:9px 18px;border-radius:var(--ima-r-md);z-index:30;pointer-events:none;max-width:80%;text-align:center;animation:dsh-ima-in .2s var(--ima-ease-out) both}',
].join('')

var CSS_TAG_ID = 'dsh-ima/panel.css'
function injectStyle(tagId, css, plugin) {
  if (typeof document === 'undefined' || !css) return
  if (document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']')) return
  var tag = document.createElement('style')
  tag.dataset.plugin = plugin
  tag.dataset.pluginCss = tagId
  tag.textContent = css
  document.head.appendChild(tag)
}
function injectCss() {
  injectStyle(CSS_TAG_ID, CSS, 'dsh-ima')
  injectStyle('dsh-ima/viewer.css', window.__DSH_IMA_VIEWER_CSS__, 'dsh-ima')
}

// ── 图标（DSH 内置图标，与宿主视觉一致，零外部依赖） ──────
// 数据来自 dsh-web-frontend bundle 的 ICON_SYMBOLS，见 lib/dsh-icons.js
//   · 线宽：regular = 1，跟随 currentColor，自动适配主题色
//   · 统一 17×17 viewBox，与 DSH 侧边栏图标同源
var DSH_ICONS = require('./dsh-icons')

/** 把 ICON_SYMBOLS 的 svg 字符串包成 React 元素（dangerouslySetInnerHTML 走 svg 内容） */
function DshIcon(props) {
  var name = props.name
  var size = props.size || 16
  var stroke = props.stroke == null ? 1 : props.stroke
  var got = DSH_ICONS.iconSvg(name, { stroke: stroke })
  // 找不到图标时不能返回 null（会渲染成一片空白，看起来像排版坏了），
  // 换成"未知图标"占位，保证任何位置都有东西显示。
  if (!got) {
    return h('span', {
      className: 'dsh-ima-ico dsh-ima-ico-miss' + (props.className ? ' ' + props.className : ''),
      style: { width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: '3px', border: '1px dashed currentColor', opacity: 0.5 },
      title: '图标缺失：' + name,
    })
  }
  // got.html 是完整 <svg …>…</svg>，取出内层与属性
  return h('span', {
    className: 'dsh-ima-ico' + (props.className ? ' ' + props.className : ''),
    style: { width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    // 内容全部来自 DSH 官方图标，不含用户输入
    dangerouslySetInnerHTML: {
      __html: got.html
        .replace(/<svg([^>]*)>/, '<svg$1 width="' + size + '" height="' + size + '" style="display:block">'),
    },
  })
}

// 兼容旧调用点：保留同名函数，内部改用 DSH 图标
function FolderGlyph(props) {
  return h(DshIcon, { name: 'folder-open', size: (props && props.size) || 18 })
}
function RefreshIcon(props) {
  return h(DshIcon, { name: 'refresh-outline', size: (props && props.size) || 15 })
}
function CopyGlyph(props) {
  return h(DshIcon, { name: 'copy-outline', size: (props && props.size) || 14 })
}
function QuoteGlyph(props) {
  return h(DshIcon, { name: 'share-outline', size: (props && props.size) || 14 })
}
function ExternalGlyph(props) {
  return h(DshIcon, { name: 'link-outline', size: (props && props.size) || 14 })
}
function ChevGlyph() {
  return h(DshIcon, { name: 'chevron-down-outline', size: 10 })
}

/**
 * 文件类型图标：**自己画一套格式图标**。
 *
 * 为什么不能直接用 DSH 的图标：查了 `dsh-client-ui-attachment`，
 * DSH 客户端对附件只画一个通用纸夹，根本没有"按文件格式区分图标"这套东西。
 * 硬拿界面动作图标去套格式，就会出现"txt 显示成播放键"这种荒唐结果。
 *
 * 所以这里自绘一套格式图标，规矩是三条：
 *   1. 形状认得出格式：文档=折角纸、表格=纸+格子、演示=纸+屏幕、音频=音符、视频=播放键
 *   2. 颜色只用来辅助区分（PDF红/Word蓝/Excel绿/PPT橙），主判断靠形状
 *   3. 任何未知类型都有默认文档图标，永远不留空
 *
 * 视觉上和 DSH 保持一致：17×17 viewBox、stroke=currentColor、线宽 1。
 */

/** 文档底：一张折角的纸（所有文档类的共同底座） */
function docBase(extra) {
  return [
    h('path', {
      key: 'base',
      d: 'M4.2 1.6h5.1L13 5.3v10.1H4.2z',
      stroke: 'currentColor', strokeWidth: 1, fill: 'none', strokeLinejoin: 'round',
    }),
    h('path', {
      key: 'fold',
      d: 'M9.3 1.6v3.7H13',
      stroke: 'currentColor', strokeWidth: 1, fill: 'none', strokeLinejoin: 'round',
    }),
  ].concat(extra || [])
}

/** 每种类型的图形（画在 17×17 里，统一线宽 1） */
var FILE_GLYPH = {
  // PDF：纸 + 文字行
  paper: docBase([
    h('path', { key: 'l1', d: 'M6.2 8.6h5M6.2 11.2h5M6.2 13.8h3.2', stroke: 'currentColor', strokeWidth: 1, strokeLinecap: 'round' }),
  ]),
  // Word：纸 + 文字行 + 粗竖条（像段落标记）
  word: docBase([
    h('path', { key: 'l1', d: 'M6.4 8.5h4.4M6.4 11h4.4M6.4 13.5h3', stroke: 'currentColor', strokeWidth: 1, strokeLinecap: 'round' }),
    h('path', { key: 'bar', d: 'M10.6 8.2v5.6', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' }),
  ]),
  // Excel：纸 + 表格格子
  sheet: docBase([
    h('rect', { key: 'g1', x: 6.2, y: 8.4, width: 5.6, height: 5.6, stroke: 'currentColor', strokeWidth: 1, fill: 'none' }),
    h('path', { key: 'g2', d: 'M6.2 11.2h5.6M9 8.4v5.6', stroke: 'currentColor', strokeWidth: 0.9 }),
  ]),
  // PPT：纸 + 投影屏幕（像演示）
  slide: docBase([
    h('rect', { key: 's1', x: 6, y: 8.6, width: 6, height: 4.2, stroke: 'currentColor', strokeWidth: 1, fill: 'none' }),
    h('path', { key: 's2', d: 'M9 12.8v1.4', stroke: 'currentColor', strokeWidth: 1, strokeLinecap: 'round' }),
  ]),
  // 纯文本：纸 + 更多文字行（没有别的装饰，最朴素）
  text: docBase([
    h('path', { key: 'l1', d: 'M6.2 8.4h5.4M6.2 10.6h5.4M6.2 12.8h5.4M6.2 15h3', stroke: 'currentColor', strokeWidth: 0.9, strokeLinecap: 'round' }),
  ]),
  // Markdown：纸 + 下箭头（md 的通用记法）
  markdown: docBase([
    h('path', { key: 'l1', d: 'M6.3 9.2h1.6M7.1 9.2v3.4', stroke: 'currentColor', strokeWidth: 1, strokeLinecap: 'round' }),
    h('path', { key: 'l2', d: 'M9.3 9.2l1 1.4 1-1.4M10.3 10.6v2', stroke: 'currentColor', strokeWidth: 1, strokeLinecap: 'round', fill: 'none' }),
  ]),
  // 网页：地球
  web: [
    h('circle', { key: 'c', cx: 8.5, cy: 8.5, r: 6.3, stroke: 'currentColor', strokeWidth: 1, fill: 'none' }),
    h('ellipse', { key: 'e', cx: 8.5, cy: 8.5, rx: 2.7, ry: 6.3, stroke: 'currentColor', strokeWidth: 0.9, fill: 'none' }),
    h('path', { key: 'h', d: 'M2.6 6.4h11.8M2.6 10.6h11.8', stroke: 'currentColor', strokeWidth: 0.9 }),
  ],
  // 图片：山与太阳
  image: [
    h('rect', { key: 'r', x: 2.2, y: 3.2, width: 12.6, height: 10.6, rx: 1.2, stroke: 'currentColor', strokeWidth: 1, fill: 'none' }),
    h('circle', { key: 'sun', cx: 5.8, cy: 6.5, r: 1.2, stroke: 'currentColor', strokeWidth: 1, fill: 'none' }),
    h('path', { key: 'hill', d: 'M2.6 12.2l3.4-3.4 2.6 2.6 2.2-2 3.8 3.8', stroke: 'currentColor', strokeWidth: 1, fill: 'none', strokeLinejoin: 'round' }),
  ],
  // 音频：音符
  audio: [
    h('path', { key: 'stem', d: 'M6.8 12.6V3.8l6.2-1.2v8.6', stroke: 'currentColor', strokeWidth: 1, fill: 'none', strokeLinejoin: 'round' }),
    h('ellipse', { key: 'n1', cx: 5.2, cy: 12.9, rx: 1.9, ry: 1.5, stroke: 'currentColor', strokeWidth: 1, fill: 'none' }),
    h('ellipse', { key: 'n2', cx: 11.4, cy: 11.6, rx: 1.9, ry: 1.5, stroke: 'currentColor', strokeWidth: 1, fill: 'none' }),
  ],
  // 视频：胶片框 + 播放键
  video: [
    h('rect', { key: 'r', x: 2.2, y: 4, width: 12.6, height: 9, rx: 1.4, stroke: 'currentColor', strokeWidth: 1, fill: 'none' }),
    h('path', { key: 'p', d: 'M7 6.8l3.6 2.2-3.6 2.2z', stroke: 'currentColor', strokeWidth: 1, fill: 'none', strokeLinejoin: 'round' }),
  ],
  // 思维导图：中心点 + 三个分支
  mind: [
    h('circle', { key: 'c', cx: 5.4, cy: 8.5, r: 2.2, stroke: 'currentColor', strokeWidth: 1, fill: 'none' }),
    h('path', { key: 'b1', d: 'M7.6 7.6l3.6-2.6M7.6 9.4l3.6 2.6M7.6 8.5h4', stroke: 'currentColor', strokeWidth: 0.9 }),
    h('circle', { key: 'n1', cx: 12.6, cy: 4.6, r: 1.5, stroke: 'currentColor', strokeWidth: 1, fill: 'none' }),
    h('circle', { key: 'n2', cx: 12.6, cy: 12.4, r: 1.5, stroke: 'currentColor', strokeWidth: 1, fill: 'none' }),
    h('circle', { key: 'n3', cx: 13.4, cy: 8.5, r: 1.5, stroke: 'currentColor', strokeWidth: 1, fill: 'none' }),
  ],
  // 笔记：纸 + 笔
  note: docBase([
    h('path', { key: 'pen', d: 'M6.6 13.6l.5-2 3-3a1 1 0 011.4 1.4l-3 3z', stroke: 'currentColor', strokeWidth: 1, fill: 'none', strokeLinejoin: 'round' }),
  ]),
  // 会话：对话气泡
  chat: [
    h('path', { key: 'b', d: 'M2.6 4.2h11.8v6.6H7.2l-2.8 2.4v-2.4H2.6z', stroke: 'currentColor', strokeWidth: 1, fill: 'none', strokeLinejoin: 'round' }),
    h('path', { key: 'd', d: 'M5.6 7.5h.1M8.5 7.5h.1M11.4 7.5h.1', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
  ],
  // 压缩包：带拉链的盒子
  archive: [
    h('rect', { key: 'r', x: 2.4, y: 3.4, width: 12.2, height: 10.2, rx: 1.2, stroke: 'currentColor', strokeWidth: 1, fill: 'none' }),
    h('path', { key: 'z', d: 'M8.5 3.4v2M8.5 6.6v2M8.5 9.8v2M8.5 12.8v.8', stroke: 'currentColor', strokeWidth: 1, strokeLinecap: 'round' }),
  ],
  // 代码 / HTML：尖括号
  code: [
    h('path', { key: 'l', d: 'M6.2 4.8L2.4 8.5l3.8 3.7', stroke: 'currentColor', strokeWidth: 1, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }),
    h('path', { key: 'r', d: 'M10.8 4.8l3.8 3.7-3.8 3.7', stroke: 'currentColor', strokeWidth: 1, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }),
    h('path', { key: 's', d: 'M9.6 4.2l-2.2 8.6', stroke: 'currentColor', strokeWidth: 1, strokeLinecap: 'round' }),
  ],
  // 电子书：翻开的书
  book: [
    h('path', { key: 'b', d: 'M8.5 4.4C7 3.2 4.6 3 2.6 3.4v9.4c2-.4 4.4-.2 5.9 1 1.5-1.2 3.9-1.4 5.9-1V3.4c-2-.4-4.4-.2-5.9 1z', stroke: 'currentColor', strokeWidth: 1, fill: 'none', strokeLinejoin: 'round' }),
    h('path', { key: 'm', d: 'M8.5 4.4v9.4', stroke: 'currentColor', strokeWidth: 0.9 }),
  ],
  // 未知格式：空白文档轮廓（最保险，不像任何具体格式）
  unknown: docBase([]),
}

/**
 * 文件类型 → 图形 + 颜色。
 * 颜色只做辅助，形状才是主判断依据。ima 的 media_type 取值见 ima-client.js。
 */
var TYPE_ICON = {
  1:  { glyph: 'paper',    color: 'var(--dsw-alias-label-error, #d94b4b)' },  // PDF
  2:  { glyph: 'web',      color: '#2f7fd4' },                                    // 网页
  3:  { glyph: 'word',     color: '#2b579a' },                                    // Word
  4:  { glyph: 'slide',    color: '#d2712a' },                                    // PPT
  5:  { glyph: 'sheet',    color: '#217346' },                                    // Excel
  6:  { glyph: 'web',      color: '#07a05a' },                                    // 微信公众号文章
  7:  { glyph: 'markdown', color: '#5b6b7c' },                                    // Markdown
  8:  { glyph: 'image',    color: '#2fa39a' },                                    // 图片
  9:  { glyph: 'note',     color: '#c98a00' },                                    // ima 笔记
  10: { glyph: 'chat',     color: 'var(--dsw-alias-label-secondary, #666)' },     // 会话
  11: { glyph: 'text',     color: 'var(--dsw-alias-label-secondary, #666)' },     // 纯文本 TXT
  12: { glyph: 'mind',     color: '#7c5cff' },                                    // XMind
  13: { glyph: 'audio',    color: '#9b59b6' },                                    // 录音
  14: { glyph: 'video',    color: '#e0651f' },                                    // 视频
  15: { glyph: 'audio',    color: '#e0518f' },                                    // 播客
  16: { glyph: 'archive',  color: '#8a8f98' },                                    // 压缩包
  20: { glyph: 'code',     color: '#8a5cf6' },                                    // HTML
  21: { glyph: 'book',     color: '#d9a300' },                                    // EPUB
  99: { glyph: 'folder',   color: 'var(--dsw-alias-label-secondary, #666)' },     // 文件夹
}

/**
 * 文件类型图标。
 *
 * ⚠️ 关键教训：**ima 返回的 mediaType 不能直接用来决定图标**。
 *    实测「2026081010 路演中APP7.0 会议培训.txt」这条，ima 给的是 mediaType=13（录音），
 *    因为它按「内容来源」归类（这条是从录音转写来的），而不是按文件后缀。
 *    直接照着画就会出现"txt 显示成音符"这种荒唐结果。
 *
 * 所以判断顺序是：**先看文件名后缀**（用户看到的就是文件名），
 * 后缀认不出来才退回 ima 的 mediaType。
 */

/** 扩展名 → 图形（这是最准的判断依据） */
var EXT_GLYPH = {
  pdf: 'paper',
  doc: 'word', docx: 'word', rtf: 'word', odt: 'word', wps: 'word',
  ppt: 'slide', pptx: 'slide', pps: 'slide', ppsx: 'slide', key: 'slide', dps: 'slide',
  xls: 'sheet', xlsx: 'sheet', csv: 'sheet', et: 'sheet', ods: 'sheet',
  txt: 'text', log: 'text', ini: 'text', conf: 'text',
  md: 'markdown', markdown: 'markdown', mdx: 'markdown',
  png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', gif: 'image',
  bmp: 'image', svg: 'image', avif: 'image', ico: 'image', heic: 'image',
  mp3: 'audio', m4a: 'audio', wav: 'audio', aac: 'audio', flac: 'audio', ogg: 'audio', amr: 'audio',
  mp4: 'video', mov: 'video', m4v: 'video', webm: 'video', mkv: 'video', avi: 'video', flv: 'video',
  xmind: 'mind',
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
  html: 'code', htm: 'code', js: 'code', ts: 'code', json: 'code', xml: 'code',
  css: 'code', py: 'code', java: 'code', c: 'code', cpp: 'code', go: 'code', sql: 'code', sh: 'code',
  epub: 'book', mobi: 'book', azw3: 'book',
}

/** 图形 → 颜色 */
var GLYPH_COLOR = {
  paper: 'var(--dsw-alias-label-error, #d94b4b)',  // PDF
  web: '#2f7fd4',
  word: '#2b579a',
  slide: '#d2712a',
  sheet: '#217346',
  markdown: '#5b6b7c',
  text: 'var(--dsw-alias-label-secondary, #666)',
  image: '#2fa39a',
  note: '#c98a00',
  chat: 'var(--dsw-alias-label-secondary, #666)',
  mind: '#7c5cff',
  audio: '#9b59b6',
  video: '#e0651f',
  archive: '#8a8f98',
  code: '#8a5cf6',
  book: '#d9a300',
  folder: 'var(--dsw-alias-label-secondary, #666)',
  unknown: 'var(--dsw-alias-label-tertiary, #999)',
}

/** ima mediaType → 图形（只作为后缀认不出来时的兜底） */
var TYPE_GLYPH = {
  1: 'paper', 2: 'web', 3: 'word', 4: 'slide', 5: 'sheet', 6: 'web', 7: 'markdown',
  8: 'image', 9: 'note', 10: 'chat', 11: 'text', 12: 'mind', 13: 'audio', 14: 'video',
  15: 'audio', 16: 'archive', 20: 'code', 21: 'book', 99: 'folder',
}

/** 从标题里取扩展名（标题没有就返回空串） */
function extOfTitle(title) {
  var m = String(title || '').match(/\.([A-Za-z0-9]{1,8})$/)
  return m ? m[1].toLowerCase() : ''
}

/**
 * 决定用哪个图形：文件名后缀优先，其次 ima 的 mediaType，最后 unknown。
 * 任何情况下都返回一个能画出来的图形，绝不留空。
 */
function resolveGlyph(title, mediaType) {
  var ext = extOfTitle(title)
  if (ext && EXT_GLYPH[ext]) return EXT_GLYPH[ext]
  if (TYPE_GLYPH[mediaType]) return TYPE_GLYPH[mediaType]
  return 'unknown'
}

/**
 * 文件类型图标。
 * props: { title, mediaType, size }
 */
function FileTypeIcon(props) {
  var size = (props && props.size) || 22
  var glyphName = resolveGlyph(props.title, props.type)
  var color = GLYPH_COLOR[glyphName] || GLYPH_COLOR.unknown

  // 文件夹用自己的实心图标
  if (glyphName === 'folder') {
    return h('span', { style: { color: color, display: 'inline-flex', flexShrink: 0 } },
      h(DshIcon, { name: 'folder-open', size: size }))
  }

  var glyph = FILE_GLYPH[glyphName] || FILE_GLYPH.unknown
  return h('svg', {
    width: size, height: size, viewBox: '0 0 17 17', fill: 'none',
    style: { flexShrink: 0, display: 'block', color: color },
    'aria-hidden': 'true',
  }, glyph)
}

/** 文件夹图标：统一用 DSH 的 folder-open（实心说明"已展开/知识库"） */
function MacFolderIcon(props) {
  return h(DshIcon, { name: 'folder-open', size: (props && props.size) || 20 })
}

/**
 * 知识库图标：与 DSH 侧边栏一致的线性文件夹。
 */
function KbIcon(props) {
  return h(DshIcon, { name: 'folder-open-outline', size: (props && props.size) || 18 })
}

/** 类型兜底扩展名：标题没有扩展名时，用类型推断出来喂给预览引擎 */
var TYPE_EXT = {
  1: 'pdf', 3: 'docx', 4: 'pptx', 5: 'xlsx', 7: 'md', 8: 'png',
  11: 'txt', 12: 'xmind', 13: 'txt', 14: 'mp4', 15: 'm4a',
}
/** 直接打开原链接、不进详情页的类型 */
var OPEN_URL_TYPES = { 2: 1, 6: 1 }

/**
 * 给预览引擎一个带扩展名的文件名。
 * ima 的标题常常没有扩展名（比如播客「xxx宣讲_260811170025」），
 * 引擎认不出格式就会显示"不支持预览" —— 实际上文件是好的。
 * 优先从 URL 路径取扩展名，取不到再用类型兜底。
 */
function fileNameFor(title, url, mediaType) {
  var t = String(title || '')
  if (/\.[A-Za-z0-9]{2,5}$/.test(t)) return t
  try {
    var m = new URL(url).pathname.match(/\.([A-Za-z0-9]{2,5})$/)
    if (m) return t + '.' + m[1].toLowerCase()
  } catch (e) {}
  var ext = TYPE_EXT[mediaType]
  return ext ? t + '.' + ext : t
}

// ── 工具 ─────────────────────────────────────────────────
function api(path, opts) {
  return fetch(API + path, opts).then(function (r) { return r.json() })
}
function fmtTime(d) {
  if (!d) return ''
  var p = function (n) { return String(n).padStart(2, '0') }
  return p(d.getHours()) + ':' + p(d.getMinutes())
}
/** 文件最后更新时间：有就显示（今年省略年份），没有就留空 —— 绝不造假数据 */
function fmtDate(v) {
  if (!v) return ''
  var n = Number(v)
  var d = isNaN(n) || v === '' ? new Date(v) : new Date(n > 1e12 ? n : n * 1000)
  if (isNaN(d.getTime())) return ''
  var p = function (x) { return String(x).padStart(2, '0') }
  var now = new Date()
  return d.getFullYear() === now.getFullYear()
    ? p(d.getMonth() + 1) + '-' + p(d.getDate())
    : d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
function toast(msg) {
  try {
    var el = document.createElement('div')
    el.className = 'dsh-ima-toast'
    el.textContent = msg
    document.body.appendChild(el)
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el) }, 1800)
  } catch (e) {}
}
/**
 * 复制到剪贴板。
 * @param {boolean} silent 静默模式：不弹「已复制」提示。
 *        调用方自己会弹更具体的提示时用它，避免两个 toast 叠在一起糊成一团。
 */
function copyText(text, silent) {
  var onOk = function () { if (!silent) toast('已复制') }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onOk, function () { fallbackCopy(text, silent) })
      return
    }
  } catch (e) {}
  fallbackCopy(text, silent)
}
function fallbackCopy(text, silent) {
  try {
    var ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    if (!silent) toast('已复制')
  } catch (e) { toast('复制失败，请手动选中') }
}
function sendToConversation(text) {
  try {
    var el = document.querySelector('textarea[placeholder]') ||
             document.querySelector('[contenteditable="true"]')
    if (el) {
      if (el.tagName === 'TEXTAREA') {
        var setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
        setter.call(el, text)
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.focus()
        toast('已填入对话框')
        return true
      }
      if (el.isContentEditable) {
        el.focus()
        document.execCommand('insertText', false, text)
        toast('已填入对话框')
        return true
      }
    }
  } catch (e) {}
  // 兜底：放进剪贴板。这里用静默复制，只弹下面这一条提示
  copyText(text, true)
  toast('已复制，粘贴到对话框即可')
  return false
}

/**
 * 当前要高亮的搜索词（空 = 不高亮）。
 * 用模块级变量而不是透传参数，是因为 renderMarkdown 的调用点有好几层，
 * 逐个加参数会把签名搞得很脏；这里只是渲染期的一次性上下文。
 */
var HIT_TEXT = ''

/** 极简 Markdown 渲染（笔记/纯文本兜底用） */
function renderMarkdown(src) {
  var lines = String(src).split('\n')
  var out = []
  var listBuf = []
  var key = 0

  var URL_RE = /https?:\/\/[A-Za-z0-9\-._~:\/?#\[\]@!$&'()*+,;=%]+/g
  // 段落开头的序号/小标题标记 —— 保留原样并加粗。
  // ⚠️ 故意不把「1.」「（一）」转成 <ol>：相邻的「（一）…」和「1.…」会被浏览器
  //    当成同一个列表重新编号，原来的 1. 会被显示成 2.，那是篡改语义。
  var LEAD_MARK = /^([（(][0-9一二三四五六七八九十]{1,3}[）)]|[一二三四五六七八九十]{1,3}、|[0-9]{1,3}[.、](?=[\u3400-\u4dbf\u4e00-\u9fff])|【[^】\n]{1,40}】)/

  function inline(t) {
    // 先把 **加粗** / `代码` / [文字](链接) / 裸链接 抠出来
    var re = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]*\]\([^)\s]+\))/g
    var parts = []
    var last = 0
    var m
    function plain(chunk) {
      // 裸链接：笔记里经常直接贴 URL（实测有些还和前后汉字粘在一起，只能尽力切）
      URL_RE.lastIndex = 0
      var cut = 0
      var mm
      while ((mm = URL_RE.exec(chunk))) {
        if (mm.index > cut) pushPlain(chunk.slice(cut, mm.index))
        parts.push(h('a', { key: 'a' + (key++), href: mm[0], target: '_blank', rel: 'noreferrer' }, mm[0]))
        cut = mm.index + mm[0].length
      }
      if (cut < chunk.length) pushPlain(chunk.slice(cut))
    }
    /**
     * 纯文本片段：如果命中了搜索词，就切成「普通 + 高亮 + 普通…」几段。
     * 只在这一层做，所以加粗/代码/链接里的文字不受影响、也不会被拆坏标签。
     */
    function pushPlain(chunk) {
      var q = String(HIT_TEXT || '')
      if (!q || !chunk) { parts.push(chunk); return }
      var lo = chunk.toLowerCase()
      var ql = q.toLowerCase()
      var from = 0
      var at
      while ((at = lo.indexOf(ql, from)) !== -1) {
        if (at > from) parts.push(chunk.slice(from, at))
        parts.push(h('mark', { key: 'hit' + (key++), className: 'dsh-ima-hit' }, chunk.slice(at, at + ql.length)))
        from = at + ql.length
      }
      if (from < chunk.length) parts.push(chunk.slice(from))
    }
    while ((m = re.exec(t))) {
      if (m.index > last) plain(t.slice(last, m.index))
      var tok = m[0]
      if (tok.slice(0, 2) === '**') parts.push(h('strong', { key: 'b' + (key++) }, tok.slice(2, -2)))
      else if (tok.charAt(0) === '`') parts.push(h('code', { key: 'c' + (key++) }, tok.slice(1, -1)))
      else {
        var mm2 = /^\[([^\]]*)\]\(([^)\s]+)\)$/.exec(tok)
        parts.push(h('a', { key: 'k' + (key++), href: mm2[2], target: '_blank', rel: 'noreferrer' }, mm2[1] || mm2[2]))
      }
      last = m.index + tok.length
    }
    if (last < t.length) plain(t.slice(last))
    if (!parts.length) return t
    // 过滤掉纯文本里的 '\n' 不该出现（行已切分），但保留以兼容异常输入
    return parts
  }

  function flushList() {
    if (!listBuf.length) return
    out.push(h('ul', { key: 'u' + (key++) },
      listBuf.map(function (t, i) { return h('li', { key: i }, inline(t)) })))
    listBuf = []
  }

  /** 段首的序号标记加粗，其余照旧 */
  function para(line) {
    var m = LEAD_MARK.exec(line)
    if (!m) return inline(line)
    var rest = line.slice(m[0].length)
    return [h('strong', { key: 'm' + (key++) }, m[0])].concat(rest ? inline(rest) : [])
  }

  lines.forEach(function (line) {
    var m
    if ((m = /^(#{1,6})\s+(.*)$/.exec(line))) {
      flushList()
      out.push(h('h' + m[1].length, { key: 'h' + (key++) }, inline(m[2])))
    } else if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushList()
      out.push(h('hr', { key: 'r' + (key++) }))
    } else if ((m = /^>\s?(.*)$/.exec(line))) {
      flushList()
      out.push(h('blockquote', { key: 'q' + (key++) }, inline(m[1])))
    } else if (/^(发言人|说话人|说话者|Speaker)\s*\d{1,2}\s+\d{1,2}:\d{2}$/i.test(line.trim())) {
      flushList()
      out.push(h('div', { key: 's' + (key++) }, h('span', { className: 'dsh-ima-spk' }, line.trim())))
    } else if ((m = /^\s*[-*+]\s+(.*)$/.exec(line))) {
      // 真 Markdown 的项目符号（.md 类文件才有，展平后的笔记不会有）
      listBuf.push(m[1])
    } else if (line.trim() === '') {
      flushList()
    } else {
      flushList()
      out.push(h('p', { key: 'p' + (key++) }, para(line)))
    }
  })
  flushList()
  return h('div', { className: 'dsh-ima-md' }, out)
}

// ── 笔记正文重排（2026-10-16 实测，别再试图「修好」它）──────────────────
// ima 的笔记接口 openapi/note/v1/get_doc_content 只返回一个**已被服务端展平的
// 纯文本 content 字段**，段落边界是在 ima 那一侧丢掉的：
//   · data 顶层只有 content 一个键；format / content_type / with_blocks / rich / type
//     这些参数传什么都一样，返回字节完全一致（md5 相同）
//   · 另探 8 个更「结构化」的候选接口（get_doc_blocks / get_doc_content_v2 /
//     get_doc_detail / list_doc_blocks / get_doc_markdown …）全部 HTTP 404
//   · 6 个真实样本里零宽空格、BOM、\r、\t、全角空格、U+2028 的数量**全部为 0**
//   · 一份 28868 字的会议记录，\n 的数量是 0
// 所以「无损还原」不可能做到。这里退一步：只用**实测出现过、且不会误伤**的
// 高置信锚点做「有损但可读」的段落重排；界面上留了「原文」按钮可随时对照。
var NOTE_CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/
var NOTE_SENT_END = '。！？；：!?;:…）)」』】"”'
// 这些字后面的「X、」不是标题而是量词/序数（如「二十届二中、三中全会」）
var NOTE_NO_BREAK_AFTER = '第届中月日号年十百千万亿期时分秒'

function isCjk(ch) { return !!ch && NOTE_CJK.test(ch) }
function isSentEnd(ch) { return !!ch && NOTE_SENT_END.indexOf(ch) >= 0 }

/** 如果正文开头就是标题原样重复（实测 6 个样本里 5 个如此），去掉这一段 */
function stripLeadingTitle(s, title) {
  var t = String(title == null ? '' : title).trim()
  if (!t || t.length < 4) return s
  var k = 0
  var i = 0
  while (k < t.length && i < s.length) {
    if (/\s/.test(t.charAt(k))) { k++; continue }
    if (/\s/.test(s.charAt(i))) { i++; continue }
    if (t.charAt(k) !== s.charAt(i)) break
    k++; i++
  }
  if (k < t.length) return s
  return s.slice(i).replace(/^[\s:：\-—|·]+/, '')
}

/**
 * 把 ima 展平后的正文按高置信锚点重排成有段落的样子。
 * 有损、但**不改一个字**：只在锚点前面插入换行，不增删任何原文内容。
 */
function beautifyNoteText(raw, title) {
  var s = String(raw == null ? '' : raw)
  if (!s.trim()) return s
  s = s.replace(/\r\n?/g, '\n')
  s = stripLeadingTitle(s, title)

  // ① 会议听记：把「发言人1 00:24」提成独立一行（实测单文件出现 414 次，收益最大）
  s = s.replace(/(发言人|说话人|说话者|Speaker)\s*(\d{1,2})\s*(\d{1,2}:\d{2})/gi,
    function (_, who, n, ts) { return '\n\n' + who + n + ' ' + ts + '\n' })

  // ②~⑥ 收集「应在该下标之前换行」的位置，level 2 = 空行分段，1 = 仅换行
  var marks = Object.create(null)
  function mark(i, lv) {
    if (i > 0 && (!marks[i] || marks[i] < lv)) marks[i] = lv
  }
  var m

  // ② 【…】小标题
  var reA = /【[^】\n]{1,40}】/g
  while ((m = reA.exec(s))) mark(m.index, 2)

  // ③ 旧版- / 新版-
  var reB = /(?:旧版|新版)\s*[-—－]/g
  while ((m = reB.exec(s))) mark(m.index, 2)

  // ④ （一）（二）式中文序号（全角/半角括号都认）
  var reC = /[（(][一二三四五六七八九十]{1,3}[）)]/g
  while ((m = reC.exec(s))) mark(m.index, 2)

  // ④b （1）（2）式阿拉伯序号
  var reF = /[（(][0-9]{1,3}[）)]/g
  while ((m = reF.exec(s))) mark(m.index, 2)

  // ⑤ 一、二、三、式章节标题（最容易误伤，条件最严）
  var reD = /[一二三四五六七八九十]{1,3}、/g
  while ((m = reD.exec(s))) {
    var p = s.charAt(m.index - 1)
    var nx = s.charAt(m.index + m[0].length)
    // 前一字必须是段首/换行/句末，且不能是量词 —— 否则「二中、」会被误切
    var okPrev = m.index === 0 || p === '\n' || isSentEnd(p)
    if (okPrev && NOTE_NO_BREAK_AFTER.indexOf(p) < 0 && isCjk(nx)) mark(m.index, 2)
  }

  // ⑥ 1. / 1、式列表项 —— 必须同时躲开 URL、小数、版本号
  var reE = /[0-9]{1,2}[.、]/g
  while ((m = reE.exec(s))) {
    var pi = m.index - 1
    var p2 = s.charAt(pi)
    var n2 = s.charAt(m.index + m[0].length)
    // 前一字符是字母/数字/点/斜杠等 → 一定是 URL、小数、版本号（agnes-2.5-flash、…-20230901）
    if (/[0-9A-Za-z./%\-_]/.test(p2)) continue
    // 后面必须紧跟中文，否则不是列表项（"480p"、"2024 年"、"2.5 万"都被这条挡住）
    if (!isCjk(n2)) continue
    // 前面必须是段首/换行/句末/右括号/中文（"（一）政务服务类1.智能问答" 这种就是前面接中文）
    if (!(m.index === 0 || p2 === '\n' || isSentEnd(p2) || p2 === '）' || p2 === ')' || isCjk(p2))) continue
    mark(m.index, 1)
  }

  // ⑦ 裸链接另起一行（笔记里经常直接把一堆 URL 堆在一起）
  var reU = /https?:\/\//g
  while ((m = reU.exec(s))) {
    var pu = s.charAt(m.index - 1)
    if (pu === '(' || pu === '<' || pu === '"' || pu === '=' || pu === '\n') continue
    mark(m.index, 1)
  }

  var idx = Object.keys(marks).map(Number).sort(function (a, b) { return a - b })
  if (!idx.length) return s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '')

  var out = ''
  var last = 0
  idx.forEach(function (i) {
    if (i <= last) return
    out += s.slice(last, i)
    out += marks[i] >= 2 ? '\n\n' : '\n'
    last = i
  })
  out += s.slice(last)
  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '')
}

// ── 预览挂载器（真正用 open-file-viewer 渲染） ────────────
// 引擎认不出的格式（比如 PDF —— 我们没打 pdfPlugin，它有 Node 原生依赖）
// 自动退回浏览器原生 iframe，不让用户看到空白
function ViewerBox(props) {
  var ref = React.useRef(null)
  var instRef = React.useRef(null)
  var fs = React.useState(false)
  var fallback = fs[0], setFallback = fs[1]

  React.useEffect(function () { setFallback(false) }, [props.source])

  React.useEffect(function () {
    var V = window.__DSH_IMA_VIEWER__
    if (fallback || !ref.current || !V) return
    var destroyed = false

    try {
      if (instRef.current) { try { instRef.current.destroy() } catch (e) {} instRef.current = null }
      instRef.current = V.createViewer({
        container: ref.current,
        file: props.source,
        fileName: props.fileName,
        height: '100%',
        width: '100%',
        fit: 'contain',
        toolbar: true,
        theme: 'auto',
        plugins: V.makePlugins(),
        onUnsupported: function () { if (!destroyed) setFallback(true) },
        onError: function () { if (!destroyed) setFallback(true) },
      })
    } catch (e) {
      setFallback(true)
    }

    return function () {
      destroyed = true
      if (instRef.current) { try { instRef.current.destroy() } catch (e) {} instRef.current = null }
    }
  }, [props.source, props.fileName, fallback])

  if (fallback) {
    // 原生兜底：PDF / 图片 / 音视频浏览器都能直接渲染
    var ext = String(props.fileName || '').split('.').pop().toLowerCase()
    if (ext === 'pdf') {
      return h('iframe', {
        className: 'dsh-ima-frame',
        src: props.source,
        title: props.fileName,
        style: { flex: 1, minHeight: '60vh' },
      })
    }
    if (/^(png|jpe?g|gif|webp|bmp|svg|avif|ico)$/.test(ext)) {
      return h('img', { className: 'dsh-ima-media', src: props.source, alt: props.fileName })
    }
    if (/^(mp4|webm|mov|m4v)$/.test(ext)) {
      return h('video', { className: 'dsh-ima-media', src: props.source, controls: true })
    }
    if (/^(mp3|wav|m4a|ogg|aac|flac)$/.test(ext)) {
      return h('audio', { className: 'dsh-ima-media', src: props.source, controls: true })
    }
    return h('div', { className: 'dsh-ima-note', style: { marginTop: '12px' } },
      '这个格式没法内联预览，点右上角「下载」拿原文件。')
  }

  return h('div', { ref: ref, className: 'dsh-ima-vbox', style: { flex: 1, minHeight: '60vh' } })
}

// ── 侧边栏入口（⚠️ 只返回图标） ──────────────────────────
function PanelGlyph(props) {
  return h(DshIcon, { name: 'database-outline', size: (props && props.size) || 18 })
}

// ── 主面板 ───────────────────────────────────────────────
/**
 * 错误边界：界面渲染出错时显示原因，而不是让整个面板变成一片空白。
 * 空白面板是最糟的失败方式 —— 用户看不到任何线索，也没法自助。
 */
class PanelBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err) {
    console.error('[dsh-ima] 界面渲染出错：', err)
  }
  render() {
    if (this.state.err) {
      return h('div', { className: 'dsh-ima-root' },
        h('div', { className: 'dsh-ima-head' }, h('span', { className: 'dsh-ima-title' }, '知识库 ima')),
        h('div', { className: 'dsh-ima-main' },
          h('div', { className: 'dsh-ima-alert', style: { margin: '12px 16px' }, role: 'alert' },
            '界面出了点问题：' + String((this.state.err && this.state.err.message) || this.state.err)),
          h('div', { className: 'dsh-ima-note', style: { marginTop: '10px' } },
            '可以点下面的按钮重试；如果反复出现，重启 DSH 再看看。'),
          h('button', {
            className: 'dsh-ima-btn dsh-ima-btn-p', style: { marginTop: '14px' },
            onClick: function () { this.setState({ err: null }) }.bind(this),
          }, '重试'),
        ),
      )
    }
    return this.props.children
  }
}

function ImaPage(props) {
  // 面板可见时才需要读剪贴板；DSH 会把 active 传进来，拿不到就默认可读
  var panelActive = !props || props.active !== false
  var st = React.useState(null); var status = st[0], setStatus = st[1]
  var ks = React.useState([]); var kbs = ks[0], setKbs = ks[1]
  var os = React.useState({ mine: true, shared: true }); var secOpen = os[0], setSecOpen = os[1]
  var cs = React.useState(null); var curKb = cs[0], setCurKb = cs[1]
  var is = React.useState([]); var items = is[0], setItems = is[1]
  var ps = React.useState([]); var path = ps[0], setPath = ps[1]
  var ls = React.useState(false); var loading = ls[0], setLoading = ls[1]
  var es = React.useState(''); var error = es[0], setError = es[1]
  var vs = React.useState(null); var preview = vs[0], setPreview = vs[1]
  var bs = React.useState(false); var showBind = bs[0], setShowBind = bs[1]
  var us = React.useState(null); var updatedAt = us[0], setUpdatedAt = us[1]
  var cus = React.useState(false); var confirmUnbind = cus[0], setConfirmUnbind = cus[1]
  // 笔记正文是 ima 展平过的，「还原排版」只是尽力重排，保留一个「原文」视角便于对照
  var rms = React.useState(false); var rawMode = rms[0], setRawMode = rms[1]
  // ── 搜索与排序 ──
  var qs = React.useState(''); var query = qs[0], setQuery = qs[1]
  var ss2 = React.useState('name'); var sortBy = ss2[0], setSortBy = ss2[1]
  var srs = React.useState([]); var searchResults = srs[0], setSearchResults = srs[1]
  var sbs = React.useState(false); var searching = sbs[0], setSearching = sbs[1]
  var sks = React.useState(''); var searchKb = sks[0], setSearchKb = sks[1]
  // ── 快捷键 / 滚动定位 ──
  var searchRef = React.useRef(null)
  var rootRef = React.useRef(null)
  var preRef = React.useRef(null)
  // ── 授权重新验证 ──
  var vfs = React.useState(false); var verifying = vfs[0], setVerifying = vfs[1]
  var aos = React.useState(false); var authOpen = aos[0], setAuthOpen = aos[1]
  // ── 上传（写入）──
  var ups = React.useState([]); var uploads = ups[0], setUploads = ups[1]
  var uds = React.useState(false); var dragOver = uds[0], setDragOver = uds[1]
  var fileRef = React.useRef(null)

  var msg = function (e) { return String((e && e.message) || e) }

  var refreshStatus = function () {
    return api('/status').then(function (s) {
      setStatus(s)
      if (!s.bound) { setKbs([]); setCurKb(null); setItems([]); setPreview(null) }
      return s
    }).catch(function (e) { setError(msg(e)) })
  }
  var loadKbs = function () {
    setLoading(true); setError('')
    return api('/knowledgeBases?type=all').then(function (r) {
      if (!r.ok) {
        if (r.needRebind) { setStatus({ bound: false }); setShowBind(true) }
        setError(r.message); return
      }
      setKbs(r.knowledgeBases); setUpdatedAt(new Date())
    }).catch(function (e) { setError(msg(e)) })
      .then(function () { setLoading(false) })
  }
  var loadMedia = function (kb, folderId) {
    if (!kb) return
    setLoading(true); setError(''); setPreview(null)
    return api('/media?kb=' + encodeURIComponent(kb.id) + '&folder=' + encodeURIComponent(folderId || '')).then(function (r) {
      if (!r.ok) { setError(r.message); return }
      setItems(r.items); setPath(r.currentPath); setUpdatedAt(new Date())
    }).catch(function (e) { setError(msg(e)) })
      .then(function () { setLoading(false) })
  }

  React.useEffect(function () { refreshStatus() }, [])
  React.useEffect(function () {
    if (status && status.bound) loadKbs()
  }, [status && status.bound])

  /** 重新验证授权：给用户「点一下就知道还好不好用」的确定感 */
  var onVerify = function () {
    if (verifying) return
    setVerifying(true); setError('')
    return api('/verify', { method: 'POST' }).then(function (r) {
      if (r && r.ok) {
        setStatus(function (s) { return s ? Object.assign({}, s, { lastValidatedAt: r.lastValidatedAt }) : s })
        toast('授权正常')
        return
      }
      // 验证失败分两种：凭证真失效（要重新绑定），还是网络抖动（可以再试）
      if (r && r.error === 'auth') {
        setStatus(function (s) { return s ? Object.assign({}, s, { bound: false }) : s })
        setShowBind(true)
        setError((r && r.message) || '授权已失效，请重新绑定')
      } else {
        setError((r && r.message) || '验证没成功，稍后再试一次')
      }
    }).catch(function (e) { setError(msg(e)) })
      .then(function () { setVerifying(false) })
  }

  /**
   * 上传文件到当前知识库。
   * 产品上的三条硬规矩：
   *   1. 每个文件都单独回显状态（排队/上传中/成功/失败+原因），不能只给一个转圈
   *   2. 重名不静默覆盖（ima 本来也不支持覆盖），问一句再决定
   *   3. 传完自动刷新列表，用户立刻看得到结果
   */
  var doUpload = function (fileList) {
    if (!curKb) { toast('先选一个知识库'); return }
    var files = Array.prototype.slice.call(fileList || [])
    if (!files.length) return

    var jobs = files.map(function (f, idx) {
      return { id: String(Date.now()) + '-' + idx, name: f.name, size: f.size, state: 'reading', message: '' }
    })
    setUploads(function (prev) { return jobs.concat(prev).slice(0, 20) })

    var update = function (name, patch) {
      setUploads(function (prev) {
        return prev.map(function (u) { return u.name === name ? Object.assign({}, u, patch) : u })
      })
    }

    // 逐个读成 base64，再一次性提交（避免并发把宿主压垮）
    Promise.all(files.map(function (f) {
      return new Promise(function (resolve) {
        var fr = new FileReader()
        fr.onload = function () {
          var s = String(fr.result || '')
          var b64 = s.indexOf(',') >= 0 ? s.slice(s.indexOf(',') + 1) : s
          update(f.name, { state: 'uploading' })
          resolve({ name: f.name, data: b64 })
        }
        fr.onerror = function () {
          update(f.name, { state: 'failed', message: '读不到这个文件' })
          resolve(null)
        }
        fr.readAsDataURL(f)
      })
    })).then(function (loaded) {
      var payload = loaded.filter(Boolean)
      if (!payload.length) return
      return api('/upload?kb=' + encodeURIComponent(curKb.id) + '&folder=' + encodeURIComponent(curFolder || ''), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ files: payload }),
      }).then(function (r) {
        var list = (r && r.results) || []
        list.forEach(function (x) {
          if (x.ok) update(x.name, { state: 'done', message: '已上传' })
          else if (x.error === 'duplicate') update(x.name, { state: 'dup', message: x.message })
          else update(x.name, { state: 'failed', message: x.message || '上传失败' })
        })
        // 有重名的，问用户要不要改名重传
        var dups = list.filter(function (x) { return x.error === 'duplicate' })
        dups.forEach(function (d) {
          var yes = window.confirm('知识库里已有同名文件「' + d.name + '」。\n\nima 不支持覆盖。\n确定 = 加时间戳后重新上传；取消 = 跳过这个文件。')
          if (!yes) return
          update(d.name, { state: 'uploading', message: '改名重传中…' })
          api('/upload?kb=' + encodeURIComponent(curKb.id) + '&folder=' + encodeURIComponent(curFolder || ''), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ files: payload.filter(function (p) { return p.name === d.name }), renameOnDuplicate: true }),
          }).then(function (r2) {
            var x2 = (r2 && r2.results && r2.results[0]) || {}
            if (x2.ok) update(d.name, { state: 'done', message: '已改名为 ' + x2.title })
            else update(d.name, { state: 'failed', message: x2.message || '重传失败' })
          }).catch(function (e) { update(d.name, { state: 'failed', message: msg(e) }) })
        })
        // 有成功的就刷新列表，让用户立刻看到文件
        if (list.some(function (x) { return x.ok })) {
          setTimeout(function () { loadMedia(curKb, curFolder) }, 600)
        }
      }).catch(function (e) {
        payload.forEach(function (p) { update(p.name, { state: 'failed', message: msg(e) }) })
      })
    })
  }

  /** 搜索：走宿主半的内容搜索，命中哪个知识库就记下来，点进去能跳到对应库 */
  var runSearch = function (q) {
    var kw = String(q || '').trim()
    if (!kw) { setSearchResults([]); setSearchKb(''); return }
    setSearching(true); setError('')
    return api('/search?q=' + encodeURIComponent(kw) + '&limit=30').then(function (r) {
      if (!r || !r.ok) { setError((r && r.message) || '搜索没成功，稍后再试'); setSearchResults([]); return }
      var list = (r.results || []).map(function (x) {
        return {
          mediaId: x.mediaId,
          title: x.title,
          mediaType: x.typeCode != null ? x.typeCode : x.mediaType,
          typeLabel: x.type || x.typeLabel || '',
          kbId: x.knowledgeBaseId || x.kbId || '',
          kbName: x.knowledgeBase || x.kbName || '',
          highlight: x.highlight || '',
        }
      })
      setSearchResults(list)
    }).catch(function (e) { setError(msg(e)) })
      .then(function () { setSearching(false) })
  }

  // 输入防抖：连续打字只在停下来 300ms 后发一次请求
  React.useEffect(function () {
    if (!query.trim()) { setSearchResults([]); return }
    var t = setTimeout(function () { runSearch(query) }, 300)
    return function () { clearTimeout(t) }
  }, [query])

  /**
   * 从搜索结果打开一条：别的知识库里的文件要先切库再进预览，
   * 否则预览拿到的 mediaId 和当前列表对不上，用户会以为「点了没反应」。
   */
  var openSearchHit = function (hit) {
    var targetKb = null
    if (hit.kbId && (!curKb || curKb.id !== hit.kbId)) {
      targetKb = kbs.filter(function (k) { return k.id === hit.kbId })[0] || { id: hit.kbId, name: hit.kbName }
      setCurKb(targetKb)
    }
    var item = {
      mediaId: hit.mediaId,
      title: hit.title,
      mediaType: hit.mediaType,
      typeLabel: hit.typeLabel,
      isFolder: false,
    }
    // 先进预览，再把列表补上，保证「返回列表」有内容可回
    if (targetKb) loadMedia(targetKb, '')
    onItemClick(item, query)
  }

  // ── 快捷键：Ctrl/Cmd+K 聚焦搜索，Esc 退出搜索/预览 ──
  React.useEffect(function () {
    var onKey = function (e) {
      var mod = e.ctrlKey || e.metaKey
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        if (searchRef.current) { searchRef.current.focus(); searchRef.current.select() }
        return
      }
      if (e.key === 'Escape') {
        var tag = (document.activeElement && document.activeElement.tagName) || ''
        if (query) {
          // 先清搜索（最轻的一步），再试关预览
          setQuery('')
          if (tag === 'INPUT') document.activeElement.blur()
          return
        }
        if (preview) { setPreview(null); return }
      }
    }
    window.addEventListener('keydown', onKey)
    return function () { window.removeEventListener('keydown', onKey) }
  }, [query, preview])

  // 预览打开、且有关键词时，把第一处命中滚到视野内
  React.useEffect(function () {
    if (preview || !query) return
    var t = setTimeout(function () {
      var box = preRef.current
      if (!box) return
      var first = box.querySelector('.dsh-ima-hit')
      if (first && first.scrollIntoView) first.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 120)
    return function () { clearTimeout(t) }
  }, [preview, query])

  // 授权浮窗：点外部关闭
  // ⚠️ 所有 useEffect 必须写在组件顶部、任何 return 之前。
  //    写成"条件渲染之后的 useEffect"会导致 Hook 数量随渲染变化 → React error #310。
  React.useEffect(function () {
    if (!authOpen) return
    var onDoc = function (e) {
      var box = rootRef.current && rootRef.current.querySelector('.dsh-ima-authpop')
      var btn = rootRef.current && rootRef.current.querySelector('.dsh-ima-authbtn')
      if ((box && box.contains(e.target)) || (btn && btn.contains(e.target))) return
      setAuthOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return function () { document.removeEventListener('mousedown', onDoc) }
  }, [authOpen])

  var onBind = function (clientId, apiKey) {
    setError('')
    return api('/bind', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clientId: clientId, apiKey: apiKey }),
    }).then(function (r) {
      if (r.ok) {
        setShowBind(false)
        return refreshStatus().then(function () { return loadKbs() }).then(function () { return true })
      }
      setError(r.message)
      return false
    }).catch(function (e) { setError(msg(e)); return false })
  }

  var onUnbind = function () {
    if (!confirmUnbind) {
      setConfirmUnbind(true)
      setTimeout(function () { setConfirmUnbind(false) }, 4000)
      return
    }
    setConfirmUnbind(false)
    setError('')
    return api('/unbind', { method: 'POST' }).then(function (r) {
      if (!r || !r.ok) { setError((r && r.message) || '解绑失败，请重试'); return }
      toast('已解绑')
      return refreshStatus()
    }).then(function () {
      setKbs([]); setCurKb(null); setItems([]); setPath([]); setPreview(null)
    }).catch(function (e) { setError(msg(e)) })
  }

  /** 网页 / 微信文章：不进详情页，直接在新窗口打开原始链接 */
  var openOriginal = function (item) {
    setLoading(true); setError('')
    return api('/mediaContent?id=' + encodeURIComponent(item.mediaId)).then(function (r) {
      if (r.ok && r.url) {
        try { window.open(r.url, '_blank', 'noopener') } catch (e) {}
        return
      }
      setError((r && r.message) || '没能取到这个网页的原始链接')
    }).catch(function (e) { setError(msg(e)) })
      .then(function () { setLoading(false) })
  }

  var onItemClick = function (item, hitText) {
    if (item.isFolder) { loadMedia(curKb, item.mediaId); return }
    // 这两类本质是链接，给个详情页反而多一层，直接跳原站更合理
    if (OPEN_URL_TYPES[item.mediaType]) { openOriginal(item); return }
    setLoading(true); setError(''); setRawMode(false)
    return api('/mediaContent?id=' + encodeURIComponent(item.mediaId)).then(function (r) {
      if (!r.ok) { setError(r.message); return }
      setPreview({
        title: item.title,
        mediaType: r.mediaType,
        url: r.url || '',
        content: r.content || '',
        noteId: r.noteId || '',
        bytes: r.bytes,
        truncated: r.truncated,
        reason: r.reason,
        binary: !!r.binary,
        // 从搜索命中进来的，记住关键词，正文里高亮 + 自动滚到第一处
        hitText: hitText || '',
      })
    }).catch(function (e) { setError(msg(e)) })
      .then(function () { setLoading(false) })
  }

  var goCrumb = function (idx) {
    var p = path[idx]
    loadMedia(curKb, p && p.folderId ? p.folderId : '')
  }
  var refText = function (item) {
    return '请读取我 ima 知识库中的文件：' + item.title + '（media_id: ' + item.mediaId + '）'
  }

  var toggleSec = function (key) {
    var n = {}
    for (var k in secOpen) n[k] = secOpen[k]
    n[key] = !n[key]
    setSecOpen(n)
  }
  /** 左侧分组：对齐 ima 自己的「个人知识库 / 共享知识库」折叠分组 */
  var renderSection = function (key, title, list) {
    if (!list.length) return null
    var open = secOpen[key] !== false
    return h('div', { key: key, className: 'dsh-ima-kbsec' },
      h('div', {
        className: 'dsh-ima-kbsec-h',
        onClick: function () { toggleSec(key) },
      },
        h('span', { className: 'dsh-ima-chev' + (open ? '' : ' dsh-ima-chev-off') }, h(ChevGlyph)),
        h('span', { className: 'dsh-ima-kbsec-t' }, title),
        h('span', { className: 'dsh-ima-spacer' }),
        h('button', {
          className: 'dsh-ima-kbsec-add',
          title: '在 ima 里新建知识库（打开 ima 网页版）',
          onClick: function (e) {
            e.stopPropagation()
            try { window.open('https://ima.qq.com', '_blank', 'noopener') } catch (err) {}
          },
        }, '+'),
      ),
      open ? list.map(function (kb) {
        return h('div', {
          key: kb.id,
          className: 'dsh-ima-kb' + (curKb && curKb.id === kb.id ? ' dsh-ima-kb-on' : ''),
          title: (kb.description ? kb.description + '\n' : '') + (kb.contentCount || 0) + ' 个内容',
          onClick: function () { setCurKb(kb); loadMedia(kb, '') },
        },
          h(KbIcon, { size: 18 }),
          h('span', { className: 'dsh-ima-kb-name' }, kb.name),
        )
      }) : null,
    )
  }

  // ── 未绑定 ──
  if (!status || !status.bound) {
    return h('div', { className: 'dsh-ima-root' },
      h('div', { className: 'dsh-ima-head' }, h('span', { className: 'dsh-ima-title' }, '知识库 ima')),
      h('div', { className: 'dsh-ima-body' },
        h('div', { className: 'dsh-ima-center' },
          showBind
            ? h(BindDialog, {
                onBind: onBind,
                error: error,
                active: panelActive,
                onCancel: function () { setShowBind(false); setError('') },
                onBound: function () { setShowBind(false); setError(''); refreshStatus().then(function () { return loadKbs() }) },
              })
            : h('div', { className: 'dsh-ima-empty' },
                h('div', { style: { marginBottom: '8px' } }, '尚未绑定 ima 账号'),
                h('div', { className: 'dsh-ima-note', style: { marginBottom: '16px' } }, '绑定后即可浏览知识库，并让 agent 直接调用其中的文件'),
                h('button', { className: 'dsh-ima-btn dsh-ima-btn-p', onClick: function () { setShowBind(true) } }, '立即绑定'),
              ),
        ),
      ),
    )
  }

  var curFolder = path.length > 1 ? path[path.length - 1].folderId : ''

  /**
   * 排序后的列表。
   * 注意：ima 的 OpenAPI 目前不返回任何时间字段，所以【不做按时间排序】，
   * 也不显示假的「最近更新」—— 只提供名称 / 类型两种真实可排序的维度。
   * 文件夹永远排在最前，这是所有文件管理器的共识，不符合会让人找不到东西。
   */
  var sortedItems = (function () {
    var arr = items.slice()
    arr.sort(function (a, b) {
      if (!!a.isFolder !== !!b.isFolder) return a.isFolder ? -1 : 1
      if (sortBy === 'type') {
        var ta = String(a.typeLabel || '')
        var tb = String(b.typeLabel || '')
        if (ta !== tb) return ta < tb ? -1 : 1
      }
      return String(a.title || '').localeCompare(String(b.title || ''), 'zh-CN')
    })
    return arr
  })()

  // ── 预览区 ──
  var previewBody = null
  // 正文是否是「被 ima 展平过的笔记」：接口只回一个 content 字符串，
  // 段落边界在 ima 那侧就没了，这里按锚点尽力还原（详见 beautifyNoteText 的注释）
  var isFlatText = !!(preview && !preview.url && preview.content)
  var prettyText = ''
  if (isFlatText) prettyText = beautifyNoteText(preview.content, preview.title)
  var textChanged = isFlatText && prettyText !== String(preview.content)
  var prettyTextForHit = isFlatText ? prettyText : ''

  if (preview) {
    var V = window.__DSH_IMA_VIEWER__
    if (V && preview.url) {
      // 有直链就让预览引擎处理（COS 带 ACAO:*，浏览器可直接取）
      // ⚠️ 必须传带扩展名的文件名：ima 的标题常常没有扩展名，
      //    引擎认不出格式就会显示"不支持预览"（播客/录音就是栽在这）
      previewBody = h(ViewerBox, {
        source: preview.url,
        fileName: fileNameFor(preview.title, preview.url, preview.mediaType),
        onError: function () { /* 引擎自己会显示错误态 */ },
      })
    } else if (preview.content) {
      previewBody = h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } },
        // 高亮词：优先用搜索命中时带进来的关键词，否则用当前搜索框
        h('div', { className: 'dsh-ima-pre', ref: preRef },
          (function () {
            HIT_TEXT = (preview.hitText || query || '').trim()
            try { return renderMarkdown(rawMode ? preview.content : prettyText) }
            finally { HIT_TEXT = '' }
          })(),
          textChanged
            ? h('div', { className: 'dsh-ima-rawhint' },
                rawMode
                  ? '↑ 这是 ima 接口返回的原文（未做任何处理）。'
                  : '↑ 段落是按标点、序号、「发言人 + 时间戳」等可见锚点还原的，仅供阅读。',
                'ima 的笔记接口只返回一段已展平的纯文本，原始段落结构在 ima 服务端就丢失了，'
                + '插件无法无损还原，原文一个字都没有改动。',
              )
            : null,
        ),
      )
    } else {
      previewBody = h('div', { className: 'dsh-ima-note', style: { marginTop: '12px' } },
        preview.reason || '这个文件没有办法内联预览，点右上角下载原文件。')
    }
  }

  // ── 授权状态：收进右上角一个图标，点开才浮窗 ──────────
  // 设计原则：状态好的时候不该占用视线。所以常驻的只有一个小图标（绿点正常/黄点该看看），
  //          具体「多久前验证过」和「重新验证」放进浮窗，用户想看才看。
  //          ima 接口不返回过期时间，浮窗里只说「已验证」，绝不说「有效期至 X」。
  var authInfo = (function () {
    if (!status || !status.bound) return null
    var validated = status.lastValidatedAt ? new Date(status.lastValidatedAt) : null
    var ageMs = validated ? (Date.now() - validated.getTime()) : Infinity
    var ageMin = Math.floor(ageMs / 60000)
    var ageTxt = !validated ? '还没验证过'
      : ageMin < 1 ? '刚刚验证过'
        : ageMin < 60 ? ageMin + ' 分钟前验证过'
          : Math.floor(ageMin / 60) < 24 ? Math.floor(ageMin / 60) + ' 小时前验证过'
            : Math.floor(ageMin / 1440) + ' 天前验证过'
    return {
      ageTxt: ageTxt,
      stale: ageMs > 7 * 86400000,   // 超过 7 天没验证 → 黄点
    }
  })()

  // 点浮窗外部关闭
  // ⚠️ 这个 useEffect 必须留在组件顶部、所有早退（if (!status.bound) return）之前。
  //    之前它写在第 1394 行那个早退之后，导致「未绑定 → 绑定成功」时 Hook 数量从 N 变 N+1，
  //    React 直接抛 error #310（Rendered more hooks than during the previous render）。

  var authPopover = authOpen && authInfo
    ? h('div', { className: 'dsh-ima-authpop' },
        h('div', { className: 'dsh-ima-authpop-row' },
          h('span', { className: 'dsh-ima-dot' + (authInfo.stale ? ' dsh-ima-dot-warn' : '') }),
          h('span', { style: { fontWeight: 500 } }, '授权正常'),
        ),
        h('div', { className: 'dsh-ima-authpop-note' }, authInfo.ageTxt),
        h('div', { className: 'dsh-ima-authpop-note' },
          'ima 不提供有效期信息，这里只报最近一次验证成功的时间。'),
        authInfo.stale
          ? h('div', { className: 'dsh-ima-authpop-warn' }, '较久没验证了，建议点下面确认一次。')
          : null,
        h('div', { style: { display: 'flex', gap: '8px', marginTop: '10px' } },
          h('button', {
            className: 'dsh-ima-btn',
            disabled: verifying,
            onClick: onVerify,
          }, verifying ? '验证中…' : '重新验证'),
        ),
      )
    : null

  // ── 搜索框 ──
  var searchBar = h('div', { className: 'dsh-ima-search' },
    h(DshIcon, { name: 'search-outline', size: 14 }),
    h('input', {
      ref: searchRef,
      value: query,
      placeholder: curKb ? '在全部知识库里搜内容…' : '搜索全部知识库里的内容…',
      onChange: function (e) { setQuery(e.target.value) },
      onKeyDown: function (e) {
        if (e.key === 'Escape') { setQuery(''); e.currentTarget.blur() }
      },
      'aria-label': '搜索知识库内容',
    }),
    query
      ? h('button', { className: 'dsh-ima-ibtn', style: { width: '20px', height: '20px' }, title: '清空搜索', onClick: function () { setQuery(''); if (searchRef.current) searchRef.current.focus() } }, h(DshIcon, { name: 'close-outline', size: 12 }))
      : h('span', { className: 'dsh-ima-kbd' }, 'Ctrl K'),
  )

  // ── 搜索结果区 ──
  var searchArea = (function () {
    if (!query.trim()) return null
    if (searching) {
      return h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column' } },
        searchBar,
        h('div', { className: 'dsh-ima-emptybox' },
          h('div', { className: 'dsh-ima-empty-t' }, '正在搜索…'),
          h('div', { className: 'dsh-ima-empty-d' }, '在 ' + (kbs.length || '全部') + ' 个知识库里检索正文，通常一两秒'),
        ),
      )
    }
    if (!searchResults.length) {
      return h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column' } },
        searchBar,
        h('div', { className: 'dsh-ima-emptybox' },
          h('div', { className: 'dsh-ima-empty-ico' }, h(DshIcon, { name: 'search-outline', size: 28 })),
          h('div', { className: 'dsh-ima-empty-t' }, '没搜到「' + query.trim() + '」'),
          h('div', { className: 'dsh-ima-empty-d' },
            '换个更短的关键词试试，比如只搜人名或一个词。ima 只开放了已收藏内容的搜索，订阅类知识库搜不到。'),
          h('button', { className: 'dsh-ima-btn', onClick: function () { setQuery('') } }, '清空搜索'),
        ),
      )
    }
    return h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 } },
      searchBar,
      h('div', { className: 'dsh-ima-crumb' },
        h('span', null, '搜到 ' + searchResults.length + ' 条'),
        h('span', { className: 'dsh-ima-spacer' }),
        h('button', { className: 'dsh-ima-btn', onClick: function () { setQuery('') } }, '退出搜索'),
      ),
      // 先按知识库分组，回答「我要的东西在哪个库」——这是用户最想先知道的事
      (function () {
        var groups = {}
        searchResults.forEach(function (r) {
          var k = r.kbName || '未知知识库'
          if (!groups[k]) groups[k] = []
          groups[k].push(r)
        })
        return Object.keys(groups).map(function (kname) {
          return h('div', { key: 'g-' + kname, style: { marginBottom: '10px' } },
            h('div', { style: { fontSize: '.88em', color: 'var(--dsw-alias-label-tertiary,#999)', padding: '4px 0 6px' } },
              kname + ' · ' + groups[kname].length + ' 条'),
            groups[kname].map(function (hit) {
              return h('div', {
                key: hit.mediaId,
                className: 'dsh-ima-item',
                title: '点击打开并定位到命中处',
                onClick: function () { openSearchHit(hit) },
              },
                h(FileTypeIcon, { title: hit.title, type: hit.mediaType, size: 18 }),
                h('span', { className: 'dsh-ima-item-t' }, hit.title),
                h('span', { className: 'dsh-ima-stamp' }, hit.typeLabel || ''),
              )
            }),
          )
        })
      })(),
    )
  })()

  return h('div', {
    className: 'dsh-ima-root',
    ref: rootRef,
    // 拖拽上传：落在整个面板上都能接，但必须选了知识库才允许
    onDragOver: function (e) {
      if (!curKb) return
      if (!e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') < 0) return
      e.preventDefault()
      if (!dragOver) setDragOver(true)
    },
    onDragLeave: function (e) {
      // 只有真的离开面板才收起，避免掠过子元素时闪烁
      if (rootRef.current && rootRef.current.contains(e.relatedTarget)) return
      setDragOver(false)
    },
    onDrop: function (e) {
      if (!curKb) return
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) doUpload(e.dataTransfer.files)
    },
    style: { position: 'relative' },
  },
    h('div', { className: 'dsh-ima-drop' + (dragOver ? ' dsh-ima-drop-on' : '') }, '松手即可上传到「' + (curKb ? curKb.name : '') + '」'),
    h('div', { className: 'dsh-ima-head' },
      h('span', { className: 'dsh-ima-title' }, '知识库 ima'),
      h('span', { className: 'dsh-ima-badge' }, '已绑定 ima 知识库'),
      h('span', { className: 'dsh-ima-spacer' }),
      updatedAt ? h('span', { className: 'dsh-ima-stamp', title: 'ima 不支持增量同步，这里显示上次从 ima 获取数据的时间' }, '更新于 ' + fmtTime(updatedAt)) : null,
      // 授权状态：一个小图标，点开看详情
      authInfo
        ? h('div', { className: 'dsh-ima-authwrap' },
            h('button', {
              className: 'dsh-ima-authbtn' + (authOpen ? ' dsh-ima-authbtn-on' : ''),
              title: '授权状态：' + authInfo.ageTxt + '（点击查看）',
              'aria-label': '授权状态',
              onClick: function () { setAuthOpen(!authOpen) },
            },
              h('span', { className: 'dsh-ima-dot' + (authInfo.stale ? ' dsh-ima-dot-warn' : '') }),
              h(DshIcon, { name: 'shield-outline', size: 15 }),
            ),
            authPopover,
          )
        : null,
      h('button', { className: 'dsh-ima-ibtn', onClick: function () { loadKbs() }, title: '重新获取知识库列表' }, h(RefreshIcon)),
      h('button', { className: 'dsh-ima-btn dsh-ima-btn-d', onClick: onUnbind }, confirmUnbind ? '再点一次确认' : '解绑'),
    ),
    // 错误：有背景条 + 图标 + 下一步，不再是一行裸红字
    error
      ? h('div', { className: 'dsh-ima-alert', role: 'alert' },
          h(DshIcon, { name: 'warning-outline', size: 15 }),
          h('div', { className: 'dsh-ima-alert-body' },
            h('div', null, error),
            h('div', { className: 'dsh-ima-alert-actions' },
              h('button', {
                className: 'dsh-ima-btn',
                onClick: function () { setError(''); if (curKb) loadMedia(curKb, curFolder); else loadKbs() },
              }, '重试'),
              h('button', { className: 'dsh-ima-btn', onClick: function () { setError('') } }, '知道了'),
            ),
          ),
        )
      : null,
    // 刷新中：顶部一条 2px 不确定进度条，比转圈更能表达"在动"
    loading && items.length > 0 ? h('div', { className: 'dsh-ima-prog' }) : null,
    h('div', { className: 'dsh-ima-body' },
      h('div', { className: 'dsh-ima-kbs' },
        kbs.length === 0 && !loading
          ? h('div', { className: 'dsh-ima-emptybox', style: { padding: '20px 8px' } },
              h('div', { className: 'dsh-ima-empty-t' }, loading ? '加载中…' : '还没有知识库'),
              h('div', { className: 'dsh-ima-empty-d' }, '去 ima 建一个，回来点右上角刷新'),
              h('button', {
                className: 'dsh-ima-btn dsh-ima-btn-p',
                style: { marginTop: '8px' },
                onClick: function () { try { window.open('https://ima.qq.com', '_blank', 'noopener') } catch (e) {} },
              }, '去 ima 新建'),
            )
          : null,
        renderSection('mine', '个人知识库', kbs.filter(function (k) { return k.baseType !== '共享知识库' })),
        renderSection('shared', '共享知识库', kbs.filter(function (k) { return k.baseType === '共享知识库' })),
      ),
      h('div', { className: 'dsh-ima-main' },
        searchArea ? searchArea
          : !curKb
            ? h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1 } },
                searchBar,
                h('div', { className: 'dsh-ima-emptybox' },
                  h('div', { className: 'dsh-ima-empty-ico' }, h(DshIcon, { name: 'database-outline', size: 30 })),
                  h('div', { className: 'dsh-ima-empty-t' }, '选一个知识库开始浏览'),
                  h('div', { className: 'dsh-ima-empty-d' }, '左侧点任意一个库；不知道东西在哪个库，就在上面搜一句。'),
                ),
              )
            : [
                h('div', { key: 'crumb', className: 'dsh-ima-crumb' },
                  h('a', { onClick: function () { goCrumb(0) } }, curKb.name),
                  path.slice(1).map(function (p, i) {
                    return h('span', { key: p.folderId || i, style: { flexShrink: 0 } }, ' / ',
                      h('a', { onClick: function () { goCrumb(i + 1) } }, p.name))
                  }),
                  h('span', { className: 'dsh-ima-spacer' }),
                  // 上传：点按钮选文件，或者直接把文件拖到面板里
                  h('div', { className: 'dsh-ima-up' },
                    h('input', {
                      ref: fileRef,
                      type: 'file',
                      multiple: true,
                      style: { display: 'none' },
                      onChange: function (e) { doUpload(e.target.files); e.target.value = '' },
                    }),
                    h('button', {
                      className: 'dsh-ima-btn dsh-ima-btn-p',
                      title: '上传本机文件到这个知识库，也可以直接把文件拖进面板',
                      onClick: function () { if (fileRef.current) fileRef.current.click() },
                    }, h(DshIcon, { name: 'plus-outline', size: 14 }), '上传'),
                  ),
                  // 排序：只给真实的两个维度（ima 不返回时间，就不做「最近更新」）
                  h('div', { className: 'dsh-ima-sort' },
                    h('button', {
                      className: 'dsh-ima-sortbtn' + (sortBy === 'name' ? ' dsh-ima-sortbtn-on' : ''),
                      title: '按名称排序（文件夹始终在最前）',
                      onClick: function () { setSortBy('name') },
                    }, '名称'),
                    h('button', {
                      className: 'dsh-ima-sortbtn' + (sortBy === 'type' ? ' dsh-ima-sortbtn-on' : ''),
                      title: '按文件类型排序（PDF / Word / 图片…）',
                      onClick: function () { setSortBy('type') },
                    }, '类型'),
                  ),
                  h('button', { className: 'dsh-ima-ibtn', onClick: function () { loadMedia(curKb, curFolder) }, title: '重新获取文件列表' }, h(RefreshIcon, { size: 14 })),
                ),
                h('div', { key: 'sb' }, searchBar),
                // 上传进度：每个文件一行，成功/失败/重名都说清楚
                uploads.length
                  ? h('div', { className: 'dsh-ima-uplist dsh-ima-pane-in' },
                      uploads.slice(0, 5).map(function (u, i) {
                        var busy = u.state === 'uploading' || u.state === 'reading'
                        return h('div', {
                          // key 用稳定的 id：同名文件重传时不会整行重挂载、动画被重置
                          key: u.id || (u.name + i),
                          className: 'dsh-ima-uprow' +
                            (u.state === 'done' ? ' dsh-ima-uprow-ok' : '') +
                            (u.state === 'failed' ? ' dsh-ima-uprow-bad' : '') +
                            (busy ? ' dsh-ima-uprow-busy' : ''),
                        },
                          busy
                            ? h('span', { className: 'dsh-ima-spin' })
                            : h(DshIcon, {
                                name: u.state === 'done' ? 'check-circle-outline'
                                  : u.state === 'failed' ? 'warning-outline'
                                    : 'info-outline',
                                size: 14,
                              }),
                          h('span', { className: 'dsh-ima-uprow-name' }, u.name),
                          h('span', { className: 'dsh-ima-stamp' },
                            u.state === 'reading' ? '准备中…'
                              : u.state === 'uploading' ? '上传中…'
                                : u.state === 'dup' ? '重名'
                                  : u.message || ''),
                        )
                      }),
                      uploads.length > 5 ? h('div', { className: 'dsh-ima-stamp' }, '…还有 ' + (uploads.length - 5) + ' 个更早的记录') : null,
                      h('button', {
                        className: 'dsh-ima-link',
                        style: { alignSelf: 'flex-end' },
                        onClick: function () { setUploads([]) },
                      }, '清空记录'),
                    )
                  : null,
                preview
                  ? h('div', { key: 'pv', className: 'dsh-ima-pane-in', style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } },
                      h('div', { className: 'dsh-ima-crumb' },
                        h('button', { className: 'dsh-ima-btn', onClick: function () { setPreview(null) }, title: '返回列表（Esc）' }, '返回列表'),
                        h('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, minWidth: 0 } }, preview.title),
                        // 只有「确实重排过」才给对照开关，没事不加按钮
                        textChanged
                          ? h('button', {
                              className: 'dsh-ima-btn',
                              title: '在「尽力还原的排版」和「ima 返回的原始文本」之间切换，便于核对',
                              onClick: function () { setRawMode(!rawMode) },
                            }, rawMode ? '恢复排版' : '看原文')
                          : null,
                        preview.url ? h('a', { className: 'dsh-ima-btn', href: preview.url, target: '_blank', rel: 'noreferrer' }, '下载') : null,
                        h('button', { className: 'dsh-ima-btn', onClick: function () { copyText(preview.title) } }, '复制名称'),
                        // 主操作放最后、用主色实心，最显眼
                        h('button', {
                          className: 'dsh-ima-btn dsh-ima-btn-p',
                          title: '把它交给对话里的 agent 读取',
                          onClick: function () { sendToConversation('请读取我 ima 知识库中的文件：' + preview.title) },
                        }, h(QuoteGlyph), '引用到对话'),
                      ),
                      previewBody,
                      preview.truncated ? h('div', { className: 'dsh-ima-stamp', style: { marginTop: '8px' } }, '（内容过长，已截断）') : null,
                    )
                  : loading && items.length === 0
                    // 首次加载：骨架屏（与真实行同高，加载完不跳动）
                    ? h('div', { key: 'l' },
                        [0, 1, 2, 3, 4, 5].map(function (n) {
                          return h('div', { key: n, className: 'dsh-ima-skel' },
                            h('div', { className: 'dsh-ima-skel-ico' }),
                            h('div', { className: 'dsh-ima-skel-bar', style: { maxWidth: (120 + (n * 37) % 160) + 'px' } }),
                          )
                        }),
                      )
                    : items.length === 0
                      ? h('div', { key: 'e', className: 'dsh-ima-emptybox' },
                          h('div', { className: 'dsh-ima-empty-ico' }, h(DshIcon, { name: 'folder-open-outline', size: 30 })),
                          h('div', { className: 'dsh-ima-empty-t' }, '这个目录还没有内容'),
                          h('div', { className: 'dsh-ima-empty-d' }, '去 ima 里往这个知识库上传文件，回来点右上角刷新即可。'),
                          h('div', { style: { display: 'flex', gap: '8px', marginTop: '10px' } },
                            h('button', {
                              className: 'dsh-ima-btn dsh-ima-btn-p',
                              onClick: function () { try { window.open('https://ima.qq.com', '_blank', 'noopener') } catch (e) {} },
                            }, '去 ima 上传'),
                            h('button', { className: 'dsh-ima-btn', onClick: function () { loadMedia(curKb, curFolder) } }, '刷新'),
                          ),
                        )
                      : sortedItems.map(function (it, idx) {
                      var isLink = !it.isFolder && !!OPEN_URL_TYPES[it.mediaType]
                      return h('div', {
                        key: it.mediaId,
                        className: 'dsh-ima-item',
                        // 进场级联：只让前 10 项排队出现，后面的直接显示，避免长列表显得慢
                        style: { '--i': Math.min(idx, 10) },
                        role: 'button',
                        tabIndex: 0,
                        title: (isLink ? '在新窗口打开原链接' : '点击预览') + ' · ' + (it.typeLabel || ''),
                        onClick: function () { onItemClick(it) },
                        onKeyDown: function (e) {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onItemClick(it) }
                        },
                      },
                        it.isFolder ? h(MacFolderIcon, { size: 20 }) : h(FileTypeIcon, { title: it.title, type: it.mediaType, size: 22 }),
                        h('span', { className: 'dsh-ima-item-t' }, it.title),
                        // 最后更新时间：ima 的 OpenAPI 目前（2026-10-16）不返回任何时间字段，
                        // 这里只在拿得到的时候显示，拿不到就留空，绝不造假数据
                        it.updateTime ? h('span', { className: 'dsh-ima-item-y' }, fmtDate(it.updateTime)) : null,
                        it.isFolder
                          ? null
                          : h('span', { className: 'dsh-ima-act' },
                              isLink
                                ? h('button', {
                                    className: 'dsh-ima-actbtn dsh-ima-actbtn-p',
                                    title: '在新窗口打开原始链接',
                                    onClick: function (e) { e.stopPropagation(); openOriginal(it) },
                                  }, h(ExternalGlyph), '打开原文')
                                : h('button', {
                                    className: 'dsh-ima-actbtn dsh-ima-actbtn-p',
                                    title: '把它交给对话里的 agent 读取',
                                    onClick: function (e) { e.stopPropagation(); sendToConversation(refText(it)) },
                                  }, h(QuoteGlyph), '引用到对话'),
                              h('button', {
                                className: 'dsh-ima-actbtn',
                                title: '复制文件名',
                                onClick: function (e) { e.stopPropagation(); copyText(it.title) },
                              }, h(CopyGlyph), '复制名称'),
                            ),
                      )
                    }),
            ],
        ),
      ),
    )
}

// ── 绑定弹窗 ─────────────────────────────────────────────
// 产品原则（对着「系统1/系统2」来的）：
//   绑定不该让用户做判断、做选择、做校对。所以整个流程只有一件事要用户做：登录。
//   其余（开浏览器、取密钥、存下来、刷新界面）全部程序化完成。
//
//   主路径：点「开始」→ 弹出浏览器 → 用户登录 → 自动绑好（用户到此为止）
//   备选一：本机已有 ima 技能凭证 → 直接收编，连登录都不用
//   备选二：剪贴板里已有凭证 → 自动识别填入
//   备选三：手动粘贴（给前面都走不通的情况兜底）
function parseCreds(text) {
  var s = String(text || '')
  if (!s.trim()) return {}
  var out = {}
  var cid = (s.match(/client[_\s-]?id["'\s:=]+([0-9a-fA-F]{32})/i) || [])[1] ||
            (s.match(/\b([0-9a-fA-F]{32})\b/) || [])[1]
  if (cid) out.clientId = cid
  var k = (s.match(/api[_\s-]?key["'\s:=]+([A-Za-z0-9+/=_-]{40,200})/i) || [])[1]
  if (!k) {
    var cands = (s.match(/[A-Za-z0-9+/=_-]{50,200}/g) || []).filter(function (c) { return c !== cid })
    cands.sort(function (a, b) { return b.length - a.length })
    if (cands.length) k = cands[0]
  }
  if (k) out.apiKey = k
  return out
}

function BindDialog(props) {
  var ms = React.useState('idle'); var mode = ms[0], setMode = ms[1]
  var ss = React.useState(''); var stepText = ss[0], setStepText = ss[1]
  var er = React.useState(''); var errMsg = er[0], setErrMsg = er[1]
  var cs = React.useState(''); var clientId = cs[0], setClientId = cs[1]
  var ks = React.useState(''); var apiKey = ks[0], setApiKey = ks[1]
  var ls = React.useState(null); var local = ls[0], setLocal = ls[1]
  var bs = React.useState(false); var busy = bs[0], setBusy = bs[1]

  // 进来看一眼本机有没有现成凭证（有就直接收编，最省事）
  // 顺带确认宿主半是不是新版：旧版没有 acquire 接口，点了会白跑一趟
  var hs = React.useState(false); var hostStale = hs[0], setHostStale = hs[1]
  React.useEffect(function () {
    api('/status').then(function (s) {
      if (s && s.caps && s.caps.indexOf('acquire') === -1) setHostStale(true)
    }).catch(function () {})
    api('/detectLocal').then(function (r) {
      if (r && r.available && !r.alreadyBound) setLocal(r)
    }).catch(function () {})
  }, [])

  var finish = function () { props.onBound && props.onBound() }

  var adopt = function () {
    setBusy(true); setErrMsg('')
    api('/adoptLocal', { method: 'POST' }).then(function (r) {
      if (r && r.ok) { finish(); return }
      // 本机没现成凭证（或它失效了）→ 才去开浏览器自动授权
      setLocal(null)
      startAcquire()
    }).catch(function (e) { setErrMsg(String(e.message || e)); setMode('idle') })
      .then(function () { setBusy(false) })
  }

  /** 主路径：起浏览器自动取凭证 */
  var startAcquire = function () {
    setMode('acquiring'); setErrMsg(''); setStepText('正在打开浏览器…')
    api('/acquire', { method: 'POST' }).then(function (r) {
      if (r && r.ok) return
      // 宿主半没这个接口 → 多半是插件更新后 DSH 还没重启
      if (r && r.error === 'unknown_action') {
        setMode('pagewait')
        setErrMsg('检测到插件更新后 DSH 还没重启，本次先用备用方式。重启 DSH 后即可自动打开浏览器。')
        openImaPage()
        return
      }
      if (r && r.error === 'nobrowser') {
        setMode('pagewait')
        setErrMsg((r && r.message) || '这台电脑没装 Chrome/Edge，先用备用方式。')
        openImaPage()
        return
      }
      setMode('idle')
      setErrMsg((r && r.message) || '自动授权没能启动')
    }).catch(function (e) {
      // 请求本身失败也降级
      setMode('pagewait')
      setErrMsg('连不上本地服务，改用备用方式。')
      openImaPage()
    })
  }

  var openImaPage = function () {
    try { window.open('https://ima.qq.com/agent-interface', '_blank', 'noopener') } catch (e) {}
  }

  // 主按钮：永远先问后端「有没有现成凭证能用」。
  // 不看前端缓存的那个 local 状态 —— 否则用户点太快（detectLocal 还没回来）
  // 就会跳过收编、直接去开浏览器，白等一趟。
  var primary = function () {
    adopt()
  }

  // 授权中：轮询进度，成功就自动收工
  React.useEffect(function () {
    if (mode !== 'acquiring') return
    var stopped = false
    var timer = setInterval(function () {
      api('/acquireStatus').then(function (r) {
        if (stopped || !r) return
        if (r.message) setStepText(r.message)
        if (r.state === 'ok') { stopped = true; clearInterval(timer); finish() }
        else if (r.state === 'error') {
          stopped = true; clearInterval(timer)
          setMode('idle')
          setErrMsg(r.message || '授权没完成')
        }
      }).catch(function () {})
    }, 1500)
    return function () { stopped = true; clearInterval(timer) }
  }, [mode])

  // ── 授权中 ──
  if (mode === 'acquiring') {
    return h('div', { className: 'dsh-ima-dlg' },
      h('h3', null, '正在打开浏览器…'),
      h('div', { className: 'dsh-ima-note', style: { marginTop: '10px' } },
        '我们会单独开一个浏览器窗口打开 ima 授权页。第一次打开可能要十几秒，请稍等。'),

      h('div', { className: 'dsh-ima-step' },
        h('span', { className: 'dsh-ima-stepno' }, '1'),
        h('div', null, '在弹出的窗口里登录 ima'),
      ),
      h('div', { className: 'dsh-ima-step' },
        h('span', { className: 'dsh-ima-stepno' }, '2'),
        h('div', null, '登完什么都不用做 —— 这里会自动绑定，并把那个窗口关掉'),
      ),

      h('div', { className: 'dsh-ima-waitbar', style: { marginTop: '18px' } },
        h('span', { className: 'dsh-ima-spin' }),
        h('span', null, stepText || '准备中…'),
      ),

      errMsg ? h('div', { className: 'dsh-ima-alert', style: { margin: '10px 0 0' }, role: 'alert' }, h(DshIcon, { name: 'warning-outline', size: 15 }), h('div', { className: 'dsh-ima-alert-body' }, errMsg)) : null,

      h('div', { className: 'dsh-ima-acts' },
        h('button', { className: 'dsh-ima-btn', onClick: props.onCancel }, '取消'),
        h('button', { className: 'dsh-ima-link', onClick: function () { setMode('manual') } }, '改用自己填'),
      ),
    )
  }

  // 备用方式：默认浏览器打开 ima 页面，用户复制，这里自动识别并绑定
  var credRef = React.useRef({ clientId: '', apiKey: '' })
  credRef.current = { clientId: clientId, apiKey: apiKey }
  var afs = React.useState(false); var autoFailed = afs[0], setAutoFailed = afs[1]
  var triedRef = React.useRef('')

  var tryClipboard = function () {
    if (busy || autoFailed) return
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) return
      navigator.clipboard.readText().then(function (text) {
        var r = parseCreds(text)
        if (!r.clientId && !r.apiKey) return
        var cur = credRef.current
        var c = r.clientId || cur.clientId
        var k = r.apiKey || cur.apiKey
        if (r.clientId) setClientId(r.clientId)
        if (r.apiKey) setApiKey(r.apiKey)
        if (!c || !k) return
        var sig = c + '|' + k
        if (triedRef.current === sig) return
        triedRef.current = sig
        setBusy(true)
        props.onBind(c, k).then(function (ok) {
          if (ok) { finish(); return }
          setAutoFailed(true)
          setErrMsg('识别到的凭证没通过验证。点「改用自己填」检查，或重新打开 ima 页面复制一次。')
        }).catch(function () {}).then(function () { setBusy(false) })
      }, function () { /* 没焦点/没授权，静默 */ })
    } catch (e) {}
  }

  React.useEffect(function () {
    if (mode !== 'pagewait' || autoFailed) return
    var onFocus = function () { tryClipboard() }
    window.addEventListener('focus', onFocus)
    var timer = setInterval(function () { if (document.hasFocus()) tryClipboard() }, 1500)
    tryClipboard()
    return function () {
      window.removeEventListener('focus', onFocus)
      clearInterval(timer)
    }
  }, [mode, autoFailed, busy])

  // ── 备用方式：自己去 ima 页面复制，回来自动识别 ──
  if (mode === 'pagewait') {
    return h('div', { className: 'dsh-ima-dlg' },
      h('h3', null, '绑定 ima 账号'),
      h('div', { className: 'dsh-ima-note', style: { marginTop: '10px' } },
        '已在浏览器打开 ima 授权页。'),

      h('div', { className: 'dsh-ima-step' },
        h('span', { className: 'dsh-ima-stepno' }, '1'),
        h('div', null, '在 ima 页面登录'),
      ),
      h('div', { className: 'dsh-ima-step' },
        h('span', { className: 'dsh-ima-stepno' }, '2'),
        h('div', null,
          h('div', null, '点第 1 步那个「一键复制」按钮'),
          h('div', { style: { color: 'var(--dsw-alias-label-tertiary,#999)', fontSize: '.88em', marginTop: '2px' } },
            '（API Key 不在页面上显示，就在这段复制出来的文字里）'),
        ),
      ),
      h('div', { className: 'dsh-ima-step' },
        h('span', { className: 'dsh-ima-stepno' }, '3'),
        h('div', null, '切回这里 —— 会自动识别并绑好，不用粘贴'),
      ),

      (clientId || apiKey)
        ? h('div', { className: 'dsh-ima-filled' },
            h('div', null, 'Client ID：' + (clientId ? clientId.slice(0, 4) + '****' + clientId.slice(-4) : '待识别')),
            h('div', null, 'API Key：' + (apiKey ? '已识别（' + apiKey.length + ' 位）' : '待识别')),
          )
        : null,

      busy ? h('div', { className: 'dsh-ima-waitbar' }, h('span', { className: 'dsh-ima-spin' }), '正在验证凭证…') : null,
      errMsg ? h('div', { className: 'dsh-ima-alert', style: { margin: '10px 0 0', fontSize: '.9em' }, role: 'alert' }, h(DshIcon, { name: 'warning-outline', size: 15 }), h('div', { className: 'dsh-ima-alert-body' }, errMsg)) : null,

      h('div', { className: 'dsh-ima-acts' },
        h('button', { className: 'dsh-ima-btn', onClick: props.onCancel }, '取消'),
        h('button', { className: 'dsh-ima-btn', onClick: openImaPage }, '重开 ima 页面'),
        h('button', { className: 'dsh-ima-link', onClick: function () { setMode('manual') } }, '改用自己填'),
      ),
    )
  }

  // ── 手动填写（最后兜底，但必须自己讲清楚每一步） ──
  if (mode === 'manual') {
    var submit = function () {
      setBusy(true); setErrMsg('')
      props.onBind(clientId, apiKey).then(function (ok) {
        if (ok) finish()
        else setErrMsg('这两串码没通过验证。多半是没复制全，或者混进了空格。重新复制一次试试。')
      }).catch(function () {}).then(function () { setBusy(false) })
    }
    var fromClip = function () {
      setErrMsg('')
      try {
        navigator.clipboard.readText().then(function (t) {
          var r = parseCreds(t)
          if (r.clientId) setClientId(r.clientId)
          if (r.apiKey) setApiKey(r.apiKey)
          if (r.clientId && r.apiKey) setErrMsg('')
          else if (!r.clientId && !r.apiKey) setErrMsg('剪贴板里没找到那两串码。请先在 ima 页面点复制。')
          else setErrMsg('只找到一半，另一串再复制一次。')
        }, function () { setErrMsg('浏览器不允许读剪贴板，只能在下面手动粘贴了。') })
      } catch (e) { setErrMsg('这个环境读不到剪贴板，只能在下面手动粘贴了。') }
    }
    return h('div', { className: 'dsh-ima-dlg' },
      h('h3', null, '自己填（最后兜底方式）'),
      h('div', { className: 'dsh-ima-note', style: { marginTop: '10px' } },
        '这个方式要你手动复制两串码，比较麻烦。如果前面的「一键绑定」还能用，建议退回去用它。'),

      h('div', { className: 'dsh-ima-step' },
        h('span', { className: 'dsh-ima-stepno' }, '1'),
        h('div', null,
          h('div', null, '打开 ima 授权页并登录'),
          h('button', { className: 'dsh-ima-btn', style: { marginTop: '8px' }, onClick: openImaPage },
            '打开 ima 页面'),
        ),
      ),
      h('div', { className: 'dsh-ima-step' },
        h('span', { className: 'dsh-ima-stepno' }, '2'),
        h('div', null,
          h('div', null, '点第 1 步那个「一键复制」按钮'),
          h('button', { className: 'dsh-ima-btn dsh-ima-btn-p', style: { marginTop: '8px' }, onClick: fromClip },
            '从剪贴板自动填入'),
        ),
      ),

      h('div', { className: 'dsh-ima-filled', style: { marginTop: '16px' } },
        h('div', { style: { marginBottom: '6px', color: 'var(--dsw-alias-label-primary,#1a1a1a)' } },
          '⚠️ 注意：API Key 不在页面上显示'),
        h('div', null, 'ima 页面上只能看到 Client ID。API Key 藏在第 1 步「一键复制」复制出来的那段文字里 —— 点一下那个按钮，两个值就都在剪贴板了。'),
        h('div', { style: { marginTop: '6px' } }, '这两串码只存在你这台电脑上，不会上传到别处。'),
      ),

      h('div', { className: 'dsh-ima-f' },
        h('label', null, 'Client ID ', h('span', { style: { fontWeight: 400 } }, '— 页面上能看到，32 位字母数字')),
        h('input', { value: clientId, onChange: function (e) { setClientId(e.target.value) }, placeholder: '例如 a1b2c3d4e5f6789012345678abcd1234', spellCheck: false }),
      ),
      h('div', { className: 'dsh-ima-f' },
        h('label', null, 'API Key ', h('span', { style: { fontWeight: 400 } }, '— 从「一键复制」的内容里取，约 76 位')),
        h('input', { value: apiKey, onChange: function (e) { setApiKey(e.target.value) }, placeholder: '粘贴 API Key', type: 'password', spellCheck: false }),
      ),

      errMsg ? h('div', { className: 'dsh-ima-alert', style: { margin: '10px 0 0' }, role: 'alert' }, h(DshIcon, { name: 'warning-outline', size: 15 }), h('div', { className: 'dsh-ima-alert-body' }, errMsg)) : null,

      h('div', { className: 'dsh-ima-acts' },
        h('button', { className: 'dsh-ima-btn', onClick: function () { setMode('pagewait'); setErrMsg(''); openImaPage() } },
          '回到自动方式'),
        h('button', {
          className: 'dsh-ima-btn dsh-ima-btn-p',
          disabled: busy || !clientId.trim() || !apiKey.trim(),
          onClick: submit,
        }, busy ? '验证中…' : '绑定'),
      ),
    )
  }

  // ── 起点：一个大按钮 ──
  return h('div', { className: 'dsh-ima-dlg' },
    h('h3', null, '绑定 ima 账号'),
    h('div', { className: 'dsh-ima-note', style: { marginTop: '10px' } },
      local && local.available
        ? '检测到这台电脑上已经有 ima 凭证，点一下就绑好。'
        : '点下面的按钮就开始，接下来只需要登录 ima —— 不用复制粘贴。'),

    hostStale
      ? h('div', { className: 'dsh-ima-tip2', style: { color: 'var(--dsw-alias-state-warn-primary,#b26a00)' } },
          '提示：插件更新过但 DSH 还没重启，自动打开浏览器可能用不了。重启 DSH 后即可。')
      : null,

    h('button', {
      className: 'dsh-ima-btn dsh-ima-btn-p dsh-ima-big',
      disabled: busy,
      onClick: primary,
    }, busy ? '处理中…' : '一键绑定 ima 账号'),

    errMsg ? h('div', { className: 'dsh-ima-alert', style: { margin: '10px 0 0' }, role: 'alert' }, h(DshIcon, { name: 'warning-outline', size: 15 }), h('div', { className: 'dsh-ima-alert-body' }, errMsg)) : null,

    h('div', { className: 'dsh-ima-acts' },
      h('button', { className: 'dsh-ima-btn', onClick: props.onCancel }, '取消'),
      // 手动填是最后兜底，做成文字链接，别让新用户第一眼就被引到难路上
      h('button', {
        className: 'dsh-ima-link',
        onClick: function () { setMode('manual') },
      }, '都试过了还是不行？'),
    ),
  )
}

// ── 插件入口 ─────────────────────────────────────────────
var inject = ['slots']
var applied = false

function apply(ctx) {
  if (applied) {
    console.log('[dsh-ima] apply 已执行过，跳过重复注册')
    return
  }
  applied = true
  injectCss()
  console.log('[dsh-ima] 浏览器半初始化，预览引擎:', window.__DSH_IMA_VIEWER__ ? '已加载' : '缺失')

  ctx.slots.inject('sidebar.panellist', function () {
    return ctx.slots.register({
      name: 'sidebar.panellist',
      id: PANEL_ID,
      order: 0,
      label: '知识库 ima',
    }, PanelGlyph)
  })

  ctx.slots.inject('main', function () {
    return ctx.slots.register({
      name: 'main',
      key: PANEL_ID,
    }, function ImaPageGuarded(props) {
      return h(PanelBoundary, null, h(ImaPage, props))
    })
  })

  console.log('[dsh-ima] UI 注册完成：sidebar.panellist + main[' + PANEL_ID + ']')
  ctx.effect(function () { return function () { console.log('[dsh-ima] 浏览器半卸载') } })
}

exports.apply = apply
exports.inject = inject
