# 行动清单(中文)— 发布应用,让 Hermes 发的帖子公开可见

> 更新于 2026-08-15(周五晚)。
>
> **已完成 ✅**:应用配置、11 个权限 Ready for testing、token、隐私政策/条款页面
> (ai4smb.fly.dev/privacy、/terms)、Settings→Basic 全部字段、应用图标(用 Safari
> 上传成功;Chrome 对 Meta 后台不可靠,以后都用 Safari)、实测发帖/删帖链路全通。
>
> **唯一剩余阻塞**:应用处于未发布(Unpublished)状态 → API 发的帖子只有你自己
> 可见。发布需要过一次**个人身份验证**(不需要注册公司)。验证草稿已填到
> 上传文件那一步。

## 周一要做的事(总共约 20 分钟)

### 1. 申请 EIN(免费,10 分钟,IRS 只在周一~周五美东 7:00–22:00 开放)

1. 打开 <https://www.irs.gov/ein> → Apply for an EIN Online → Begin Application
2. 实体类型:**Sole Proprietor**;原因:**Started a new business**;雇员:No
3. 填法定姓名、SSN、家庭住址(SSN 只给 IRS,不会出现在给 Meta 的文件里)
4. 提交后**当场**下载 EIN 确认信 PDF(**CP 575**),存好

### 2. 回到 Meta 验证流程,上传并提交

1. Publish 页面 → Start Verification(草稿还在):
   <https://developers.facebook.com/apps/1053704090779529/publish/>
2. 已选路径:Sole Proprietorship → **Not yet registered**;Business name = 法定姓名
   (与证件一致);Tax ID 字段可回填 EIN 号
3. 文件类型选 **IRS SS-4 (EIN Assignment Letter)** → 上传 CP 575 → 提交
4. 之后**等 Meta 邮件**(一般几天),期间什么都不用做

### 3. 验证通过后(邮件到了叫 Claude)

1. Publish 页面 → **Publish** 按钮(应已变蓝)→ 点击,即时生效,无人工审核
2. 叫 Claude:删掉旧测试帖、重发,用小号确认公开可见 → 全链路闭环

## 重要认知(踩坑总结,别再被后台绕晕)

- **永远不用做**:App Review、Access verification(Tech Provider)、企业营业执照。
  个人身份验证(EIN 路径)是唯一需要的验证。
- **Business portfolio(Ai4smb)已从应用移除**,别再连回去——连着它验证流程会
  强制走企业路径。
- Review → Verification 页面、"Add to App Review" 按钮 → 一律不点。
- Meta 后台一律用 **Safari**(Chrome 反复触发 "Something Went Wrong")。
- SS-4 ≠ SSN:SS-4 是申请 EIN 的表格名;给 Meta 传的是 EIN 确认信。

## 不受阻塞、现在就能用的部分

- 读操作全部正常:`list_posts`、`list_comments`、`get_insights`、`health`
- 挂到 Claude Code:
  `claude mcp add social-mcp -- node /Users/kate/phoenix/projects/social-mcp/apps/mcp/dist/index.js`
- 发帖也能发成功,只是发布前仅自己可见(发布后立即对所有人可见)

## 备忘

- Token 续期:约 **2026-10-14** 前,Graph API Explorer → Extend Access Token →
  换进 `apps/mcp/.env.local`(详见 `personal-use-setup.md` §3)
- (可选)关联 Instagram:主页 → 设置 → Linked accounts → 连接 IG 专业账号,
  解锁 4 个 IG 工具
- 仓库待决定:admin worktree(合并或丢弃)、Deploy CI 改手动触发
