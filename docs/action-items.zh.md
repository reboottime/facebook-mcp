# 行动清单(中文)— 让帖子公开可见 + 收尾事项

> 更新于 2026-08-15。当前状态:应用配置完成、token 有效、API 实测可以发帖/删帖,
> 但应用处于**开发模式**,API 发的帖子只有你自己能看到。下面按顺序做。

## 1. 决定隐私政策页面放哪里(先做,卡着后面所有步骤)

Live 模式要求一个真实可访问的隐私政策链接。三选一,告诉 Claude 你选哪个:

- **A(推荐)**:放到你的业务网站 <https://ai4smb.fly.dev> 下(如 `/privacy`)。
  → 需要你告诉 Claude 这个网站的代码在哪个文件夹,Claude 来加页面。
- **B**:GitHub Pages(`reboottime/facebook-mcp` 仓库,需要仓库是 public)。
- **C**:你已有的其他静态托管。

页面内容 Claude 来写(很短:stdio 模式不存储任何用户数据,同一页面附一句
"如需删除数据请邮件 hello.katezhang@gmail.com",可同时用作数据删除链接)。

## 2. 填写应用基本设置(隐私政策 + 数据删除)

打开:**<https://developers.facebook.com/apps/1053704090779529/settings/basic/?business_id=1385996026366592>**

- **Privacy policy URL** → 填第 1 步得到的链接
- **User data deletion** → 选 "Data deletion instructions URL",填同一个链接
- ⚠️ 不要填 facebook.com 之类 Meta 域名——会保存失败并弹 "Something Went Wrong"
- 顺手可传应用图标:`/Users/kate/phoenix/phoenix/app-icon-1024.png`(1024×1024)
- 点 **Save changes**

## 3. 把应用切换到 Live 模式

打开:**<https://developers.facebook.com/apps/1053704090779529/dashboard/?business_id=1385996026366592>**

- 页面顶部有 **App Mode: Development / Live** 开关,切到 **Live**
- 不需要 App Review、不需要企业验证;你的 token 和 11 个权限照常工作
  (Standard Access 对应用管理员永久有效)
- 唯一变化:API 创建的内容从"仅自己可见"变成"公开可见"

## 4. 验证帖子公开可见

- 用你的**另一个账号**打开测试帖:
  <https://www.facebook.com/122105764515433874/posts/122105773785433874>
- 能看到 → 完成 ✅
- 仍然显示"内容不可用" → 开发模式期间发的旧帖可能仍被锁,告诉 Claude,
  删掉重发即可(API 操作,几秒钟)

## 5.(可选)关联 Instagram

Instagram 相关的 4 个工具(发 IG 帖、评论、洞察、跨平台转发)目前不可用,
因为主页还没关联 IG 专业账号:

- 打开你的主页 **AI for Small Business**:<https://www.facebook.com/profile.php?id=122105764515433874>
- 路径:主页 → 设置(Settings)→ 关联的账号(Linked accounts)→ 关联 Instagram
- IG 账号需为专业账号(Business/Creator,可在 IG 应用里免费转换)

## 6.(可选)把服务器挂到 Claude Code

任何终端里执行一次:

```sh
claude mcp add social-mcp -- node /Users/kate/phoenix/projects/social-mcp/apps/mcp/dist/index.js
```

之后在任意 Claude Code 会话里直接说"帮我发一条帖子"即可。

## 7. 日历提醒:token 续期(约 2026-10-14 前)

长效 token 约 60 天过期(本次生成于 2026-08-15)。到期后:

1. Graph API Explorer:<https://developers.facebook.com/tools/explorer>
   → 选应用 → Generate Access Token(勾选主页)
2. 延长:token 旁蓝色 ⓘ → Access Token Tool
   <https://developers.facebook.com/tools/accesstoken/> → Extend Access Token
3. 新 token 换进 `apps/mcp/.env.local` 的 `META_ACCESS_TOKEN`
4. 查看 token 剩余有效期/权限:<https://developers.facebook.com/tools/debug/accesstoken/>

## 8. 仓库里两个待决定事项(告诉 Claude 怎么处理)

1. **未合并的 worktree**:`worktree-agent-ae77d48b25f483ec5` 里有一个
   "管理员页面(列出已注册用户)"功能(2 个 commit,未进 main)。
   → 选择:合并交付(浏览器验收后合并)或 丢弃删除。
2. **Deploy CI 每次推送都失败**:工作流指向不存在的 `apps/api` 路径,
   且没有配置部署密钥。→ 建议:改成手动触发 + 修正路径,等真要部署时再用。
