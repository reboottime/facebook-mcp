# Hermes 对接 social-mcp(中文)

> Hermes 是"脑",social-mcp 是"手":接上之后 Hermes 可以直接管理
> "AI for Small Business" 主页——发帖、定时发布、回复/隐藏评论、拉取洞察。
> 所有动作以**主页身份**发出,外人看不出是自动化。

## 前置条件(均已就绪)

- 已构建:`pnpm exec turbo run build --filter=mcp`(产物在 `apps/mcp/dist/`)
- Token 已配置:`apps/mcp/.env.local` 的 `META_ACCESS_TOKEN`
  (服务器按模块路径找这个文件,**不依赖启动目录**,Hermes 从任何 cwd 拉起都行)

## 接入(一条命令 + 一次交互确认)

```sh
hermes mcp add social-mcp \
  --command node \
  --args /Users/kate/phoenix/projects/social-mcp/apps/mcp/dist/index.js
```

执行后会列出 12 个工具并问 `Enable all 12 tools? [Y/n/select]`:

- 回 **Y**:全部启用(推荐——写操作在应用发布前本来就只对你可见,风险为零)
- 回 **select**:勾选子集。保守起见可先只开只读:
  `health, list_pages, list_posts, list_comments, get_insights`

之后:

```sh
hermes mcp test social-mcp   # 验证连接,应列出 12 个工具
hermes mcp list              # social-mcp 显示 ✓ enabled
```

**开一个新的 Hermes 会话**工具才会加载(老会话不热加载)。

## 验证

新 Hermes 会话里说:"调用 social-mcp 的 health 看看主页状态"。
预期返回:token 持有人 Kate Zhang、pagesCount 1、主页 AI for Small Business。

## 12 个工具速览

| 工具 | 作用 | 当前状态 |
|---|---|---|
| `health` / `list_pages` | 状态检查、列主页 | ✅ |
| `list_posts` / `list_comments` / `get_insights` | 读帖子/评论/洞察 | ✅ |
| `moderate_comment` | 隐藏/删除/开关评论 | ✅ |
| `publish_post` / `publish_reel` | 发帖、发 Reels(支持 `scheduled_publish_time`,ISO 8601 字符串) | ⚠️ 发布前仅自己可见 |
| `reply_to_comment` | 以主页身份回复评论 | ⚠️ 同上 |
| `delete_post` | 删主页帖子 | ✅ |
| `publish_instagram` / `cross_post` | IG 发布、跨平台转发 | ❌ 待关联 IG 账号 |

⚠️ = 调用成功、内容真实存在,但在 Meta 应用发布(Publish)之前只有你自己可见。
发布流程见 [`action-items.zh.md`](action-items.zh.md)(EIN → 个人验证 → Publish)。

## 自动化场景示例(接好后直接对 Hermes 说)

- "每周一早上 9 点发一条本周 AI 小技巧到主页"(Hermes cron + `publish_post`)
- "每小时检查主页新评论,普通评论友好回复,垃圾评论隐藏"
  (`list_comments` → `reply_to_comment` / `moderate_comment`)
- "每周五拉主页洞察,总结成中文周报"(`get_insights`)

## 故障排查

- **工具没出现** → 新开会话;`hermes mcp list` 确认 ✓ enabled
- **所有调用报 token 错误** → token 过期(约 60 天,下次 ~2026-10-14)。
  续期:Graph API Explorer → Extend Access Token → 换进 `apps/mcp/.env.local`,
  详见 [`personal-use-setup.md`](personal-use-setup.md) §3
- **发的帖子别人看不到** → 应用还没 Publish,见 [`action-items.zh.md`](action-items.zh.md)
- **移除**:`hermes mcp remove social-mcp`
