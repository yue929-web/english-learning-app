# 英语学习 App - 部署与安装指南

## 一、上传到 GitHub

### 1. 安装 Git

如果电脑还没装 Git，先下载安装：
- 下载地址：https://git-scm.com/download/win
- 安装时一路点 "Next" 即可

安装完成后，**关闭并重新打开** 命令行窗口。

### 2. 创建 GitHub 仓库

1. 打开 https://github.com 并登录（没有账号就注册一个）
2. 点击右上角 **+** → **New repository**
3. Repository name 填：`english-learning-app`（或你喜欢的名字）
4. 选 **Public**（公开，这样才能用 GitHub Pages）
5. **不要**勾选 "Add a README"
6. 点击 **Create repository**

### 3. 推送代码到 GitHub

打开 PowerShell，依次执行以下命令（把 `你的用户名` 换成你的 GitHub 用户名）：

```powershell
cd C:\Users\YYsanhao\Documents\Trae-CN\default\english-learning-app

git init -b main
git config user.email "你的邮箱@example.com"
git config user.name "你的GitHub用户名"
git add -A
git commit -m "英语学习 App - 单词板块"

git remote add origin https://github.com/你的用户名/english-learning-app.git
git push -u origin main
```

如果提示输入密码，需要用 **Personal Access Token** 代替密码（GitHub 不再支持密码登录）：
- 生成地址：https://github.com/settings/tokens
- 点 "Generate new token" → 勾选 `repo` 权限 → 生成
- 把生成的 token 当密码输入

### 4. 开启 GitHub Pages 自动部署

1. 在 GitHub 仓库页面，点 **Settings**（设置）
2. 左侧菜单选 **Pages**
3. Source 下拉选 **GitHub Actions**
4. 推送代码后会自动构建部署，等待 1-2 分钟
5. 部署成功后，Pages 页面会显示你的网站地址，类似：
   `https://你的用户名.github.io/english-learning-app/`

> 注：`.github/workflows/deploy.yml` 已经配置好了自动部署，push 到 main 分支就会自动发布。

---

## 二、安装到手机

部署成功后，用手机浏览器打开你的网站地址。

### Android（Chrome 浏览器）

1. 用 Chrome 打开网站
2. 点击右上角 **⋮** 菜单
3. 选择 **"添加到主屏幕"** 或 **"安装应用"**
4. 确认后，桌面会出现"背单词"图标，点击即可像 App 一样使用

### iPhone（Safari 浏览器）

1. 用 Safari 打开网站
2. 点击底部的 **分享** 按钮（方框+向上箭头）
3. 选择 **"添加到主屏幕"**
4. 点右上角 **"添加"**
5. 桌面会出现图标，点击打开即全屏运行

> 安装后可离线使用，数据保存在手机本地。

---

## 三、本地开发（可选）

```powershell
npm install        # 安装依赖
npm run dev        # 启动开发服务器
npm run build      # 构建生产版本
npm run preview    # 预览生产版本
```
