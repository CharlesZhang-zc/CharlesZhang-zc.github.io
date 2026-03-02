# 个人主页静态网站模板

这是一个简洁、现代、响应式的单页个人主页模板，专为设计师、开发者与学者打造。它完全基于纯静态的 HTML、CSS 与 JavaScript，无需复杂的构建过程，便于快速部署到 GitHub Pages 或任何静态托管平台。

## ✨ 主要特性

- **现代设计**：简洁大气，注重排版、间距与视觉层次。
- **响应式布局**：完美适配桌面、平板与移动设备。
- **动态数据驱动**：通过 `data.json` 统一管理页面内容，方便修改与维护。
- **丰富的组件**：
  - 个人信息展示（头像、职位、联系方式）
  - 工作项目卡片（支持图片、交互式图表、视频嵌入）
  - 学术成果列表（支持标签分类与链接）
  - 学历信息时间轴
- **交互式图表**：内置 [ECharts](https://echarts.apache.org/zh/index.html) 示例，轻松展示数据。
- **技术栈**：HTML / CSS / JavaScript / [Tailwind CSS (CDN)](https://tailwindcss.com/) / [Remix Icon](https://remixicon.com/)

## 🚀 快速开始

### 1. 在本地预览

1.  克隆或下载此仓库到本地。
2.  进入 `output` 目录。
3.  直接用浏览器打开 `index.html` 文件即可预览。
    > **提示**：为获得最佳体验（特别是处理 `data.json` 的加载），建议使用一个简单的本地服务器来预览，例如 VS Code 的 `Live Server` 扩展，或通过命令行 `python -m http.server` 启动。

### 2. 替换个人内容

所有页面内容都存储在 `output/data.json` 文件中，你可以直接修改它来更新你的个人主页。

#### (1) 基础信息 (`basicInfo`)

```json
"basicInfo": {
  "name": "你的姓名",
  "title": "你的职位 / 领域",
  "location": "你所在的城市",
  "summary": "一段精彩的个人简介...",
  "avatar": "avatar-placeholder.svg", // 替换为你的头像文件名
  "contacts": [
    { "type": "email", "value": "your@email.com", "href": "mailto:your@email.com" },
    { "type": "github", "value": "your-github-id", "href": "https://github.com/your-github-id" },
    { "type": "wechat", "value": "你的微信号" } // 如果不想提供链接，可省略 href
  ]
}
```

#### (2) 替换头像

1.  准备一张你的个人头像图片（建议为正方形，如 `avatar.png` 或 `avatar.jpg`）。
2.  将图片文件放入 `output` 目录下。
3.  修改 `data.json` 中 `basicInfo.avatar` 的值为你的图片文件名。

#### (3) 工作项目 (`projects`)

`projects` 是一个数组，每个对象代表一个项目卡片。

-   `type`: `image` (图片), `chart` (图表), `video` (视频)。
-   **图片项目**：提供 `image` 文件名和 `imageAlt` 描述。
-   **图表项目**：在 `chart.dataset` 中提供数据。
-   **视频项目**：在 `video.iframeSrc` 中提供视频嵌入链接。

```json
"projects": [
  {
    "id": "project-chart-example",
    "name": "数据可视化项目",
    "type": "chart",
    "chart": {
      "title": "月度活跃用户",
      "unit": "万人",
      "dataset": [
        { "name": "一月", "value": 120 },
        { "name": "二月", "value": 150 }
      ]
    }
    // ... 其他字段
  },
  {
    "id": "project-image-example",
    "name": "品牌设计项目",
    "type": "image",
    "image": "my-project-image.jpg", // 替换为你的项目图片
    "imageAlt": "项目界面的截图"
    // ... 其他字段
  }
]
```

#### (4) 学术成果 (`achievements`) 和学历信息 (`education`)

同样，直接修改 `data.json` 中对应的数组即可。

### 3. 部署到 GitHub Pages

GitHub Pages 提供免费的静态网站托管服务，非常适合部署此项目。

1.  **创建仓库**：
    -   在 GitHub 上创建一个新的**公共**仓库。
    -   仓库名必须为 `你的用户名.github.io` (例如，如果你的 GitHub 用户名是 `octocat`，则仓库名为 `octocat.github.io`)。

2.  **上传文件**：
    -   将 `output` 目录下的**所有文件** (`index.html`, `styles.css`, `script.js`, `data.json` 以及所有图片等) 推送到你刚刚创建的仓库的 `main` (或 `master`) 分支的**根目录**。

    -   你可以通过 `git` 命令或直接在 GitHub 网页上上传文件。
        ```bash
        # 假设你已在本地 `output` 目录下初始化了 git
        git init
        git add .
        git commit -m "Initial commit: My personal homepage"
        git branch -M main
        git remote add origin https://github.com/你的用户名/你的用户名.github.io.git
        git push -u origin main
        ```

3.  **等待生效**：
    -   推送完成后，等待几分钟。
    -   你的个人主页即可通过 `https://你的用户名.github.io` 公开访问。

## 🤝 贡献与反馈

如果你对这个模板有任何改进建议或发现了问题，欢迎提交 Issue 或 Pull Request。

## 📄 许可证

本项目采用 [MIT License](https://opensource.org/licenses/MIT)。
