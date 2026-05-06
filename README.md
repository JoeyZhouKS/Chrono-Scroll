# 历史长河 ChronoScroll

> 交互式世界历史时间轴 — 探索从公元前3000年到2026年跨越5000年的文明演进历程

## 项目简介

**ChronoScroll** 是一个基于 Next.js 构建的交互式历史时间轴可视化应用。项目以沉浸式的时间轴形式，展示了从公元前3000年到2026年数千年的重大历史事件，涵盖中国朝代更迭、世界大战、科技革命、文化变迁等丰富内容。

## 功能特性

### 📅 时间轴可视化
- 跨越5000+年的历史时间轴（公元前3000年 - 公元2026年）
- 四年区域布局：背景列、朝代柱、时光轴、事件轴
- 滚动视口优化，仅渲染可见区域的事件，确保流畅体验

### 🏷️ 分类筛选
- 支持按类别筛选：朝代/时代、战争、政治、文化、科技、革命、外交、经济
- 每种类别拥有独特的颜色编码

### 🔍 搜索与导航
- 实时事件搜索，支持模糊匹配
- 快速跳转到任意年份
- 悬停显示事件详情与配图

### ✏️ 事件管理
- 用户可申请添加新事件，提交后进入审核流程
- 管理员后台审批/拒绝事件申请
- 支持事件的编辑与删除

### 🎨 视觉设计
- 仿羊皮纸复古风格设计
- 响应式布局，支持暗色/亮色主题
- 事件配图展示

## 技术栈

| 技术 | 说明 |
|------|------|
| **Next.js 15** | React 全栈框架，App Router 架构 |
| **React 19** | 前端 UI 库 |
| **TypeScript** | 类型安全的 JavaScript |
| **TailwindCSS** | 原子化 CSS 框架 |
| **Lucide React** | 图标库 |

## 项目结构

```
Chrono-Scroll/
├── app/                          # Next.js App Router
│   ├── admin/                    # 管理后台页面
│   │   ├── approval/page.tsx     # 事件审批页面
│   │   └── page.tsx              # 管理主页
│   ├── api/                      # API 路由
│   │   ├── auth/                 # 认证相关
│   │   ├── events/route.ts       # 事件 CRUD 接口
│   │   └── pending-events/route.ts # 待审批事件接口
│   ├── globals.css               # 全局样式
│   ├── layout.tsx                # 根布局
│   ├── page.tsx                  # 主页
│   ├── robots.ts                 # robots.txt
│   └── sitemap.ts                # sitemap
├── components/                   # React 组件
│   ├── AdminChronoScroll.tsx     # 管理员时间轴组件
│   └── ChronoScroll.tsx          # 主时间轴组件
├── data/                         # 数据文件
│   ├── timeline-events.json      # 历史事件数据
│   ├── timeline-event-images.json # 事件图片映射
│   ├── timelineTypes.ts          # TypeScript 类型定义
│   ├── timeline.ts               # 数据导出入口
│   ├── pending_events.json       # 待审批事件
│   ├── rejection_log.json        # 拒绝记录
│   └── event_titles.txt          # 事件标题参考
├── docs/                         # 文档
│   ├── timeline-data-guide.md    # 数据维护规范
│   ├── timeline-image-spec.md    # 图片规范
│   └── ...
├── lib/                          # 工具库
│   ├── adminAuth.ts              # 管理员认证
│   ├── laneAssignment.ts         # 事件车道分配算法
│   └── yearUtils.ts              # 年份计算工具
└── public/                       # 静态资源
    └── timeline-images/          # 事件图片
        ├── drafts/               # 草稿图片
        └── events/               # 正式图片
```

## 快速开始

### 环境要求

- Node.js 18+ 
- npm / yarn / pnpm

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/your-username/Chrono-Scroll.git
cd Chrono-Scroll

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint
```

开发服务器默认运行在 [http://localhost:3000](http://localhost:3000)

## 数据格式

### TimelineEvent 字段

```json
{
  "id": "world-industrial-revolution",
  "title": "工业革命",
  "startYear": 1760,
  "endYear": 1840,
  "type": "event",
  "category": "technology",
  "rail": "global_long",
  "summary": "机器化生产和能源革命推动全球工业社会形成。"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识符，全局唯一 |
| `title` | string | 事件名称 |
| `startYear` | number | 开始年份（公元前用负数，无0年） |
| `endYear` | number | 结束年份（可选，不填则为单年事件） |
| `type` | `"event" \| "era"` | 事件类型 |
| `category` | string | 分类：`era` / `dynasty` / `war` / `politics` / `culture` / `technology` / `revolution` / `diplomacy` / `economy` / `society` |
| `rail` | `"main" \| "global_long"` | 轨道位置（可选，`main` 为主线事件轴，`global_long` 为左侧背景列） |
| `summary` | string | 事件简介 |

详细数据维护规范请参阅 [docs/timeline-data-guide.md](docs/timeline-data-guide.md)

## 界面布局

```
┌────────────┬────────────┬──────────┬──────────────────────────────┐
│  背景列    │  朝代柱    │  时光轴  │         事件轴                │
│ (Background│  (ERA)     │ (YEAR)   │       (EVENTS)               │
│  Column)   │            │          │                              │
│ 126px+     │  120px     │  107px   │       可变宽度               │
└────────────┴────────────┴──────────┴──────────────────────────────┘
```

- **背景列**：显示长期事件和背景注释（蓝色背景）
- **朝代柱**：显示中国朝代/时代（米黄色背景）
- **时光轴**：显示年份刻度和年份轴
- **事件轴**：显示所有事件条块

## SEO 优化

项目已内置完整的 SEO 配置：
- Open Graph 元数据
- Twitter Card 元数据
- JSON-LD 结构化数据
- 动态 sitemap.xml
- robots.txt

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！如需添加历史事件，可通过网站上的「申请添加事件」功能提交，或直接修改 `data/timeline-events.json` 文件。

---

**历史长河 ChronoScroll** — 让5000年历史一目了然 🌊⏳
