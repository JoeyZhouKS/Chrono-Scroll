# 历史长河 ChronoScroll 数据维护规范

本项目时间轴使用单一数据源：`data/timeline-events.json`。
不再维护文明层级字段。

## 界面布局与命名

整个可视化界面从左到右分为四个区域：

| 区域名称 | 位置 | 说明 |
|---------|------|------|
| **背景列** | 最左边 | 显示长期事件和背景注释（蓝色背景 `bg-[#deebf7]`） |
| **朝代柱** | 左二 | 显示中国朝代/时代（`id` 以 `china-` 开头且 `type === "era"` 的事件，米黄色背景） |
| **时光轴** | 左三 | 显示年份刻度和年份轴 |
| **事件轴** | 右边 | 显示所有事件条块（主事件区） |

```
┌────────────┬────────────┬──────────┬──────────────────────────────┐
│  背景列    │  朝代柱    │  时光轴  │         事件轴                │
│(Background│  (ERA)      │ (YEAR)   │       (EVENTS)               │
│ Column)   │            │          │                              │
│ 126px+    │  120px     │  107px   │       可变宽度               │
└────────────┴────────────┴──────────┴──────────────────────────────┘
```

### 相关变量

#### 背景列（Background Column）

| 变量 | 当前值 | 说明 |
|------|--------|------|
| `BACKGROUND_COLUMN_MIN_WIDTH` | 126px | 背景列最小宽度 |
| `BACKGROUND_BAR_WIDTH` | 64px | 背景条块宽度 |
| `BACKGROUND_LANE_WIDTH` | 72px | 背景车道宽度 |
| `BACKGROUND_TRACK_INSET` | 12px | 背景轨道内边距 |
| `BACKGROUND_LONG_EVENT_MIN_YEARS` | 50年 | 长期事件最小持续时间 |
| `ANNOTATION_BAR_WIDTH` | 64px | 注释条块宽度 |

#### 朝代柱（Era Column）

| 变量 | 当前值 | 说明 |
|------|--------|------|
| `ERA_COLUMN_WIDTH` | 120px | 朝代柱最小宽度 |
| `ERA_BAR_WIDTH` | 72px | 朝代条块宽度 |
| `ERA_LANE_WIDTH` | 80px | 朝代车道宽度 |
| `ERA_TRACK_INSET` | 16px | 朝代轨道内边距 |

#### 时光轴（Year Axis）

| 变量 | 当前值 | 说明 |
|------|--------|------|
| `YEAR_AXIS_WIDTH` | 107px | 时光轴宽度 |

#### 事件轴（Event Area）

| 变量 | 当前值 | 说明 |
|------|--------|------|
| `EVENT_BAR_WIDTH` | 100px | 事件条块宽度 |
| `LANE_WIDTH` | 110px | 事件车道宽度（定义在 `lib/laneAssignment.ts`） |
| `TRACK_INSET` | 16px | 事件轨道内边距 |
| `eventAreaWidth` | `Math.max(200, laneCount * LANE_WIDTH + 44)` | 事件轴整体宽度（动态计算） |

### 命名约定

- 中文讨论时使用：**背景列**、**朝代柱**、**时光轴**、**事件轴**
- 代码变量使用：`BACKGROUND_*`（背景列）、`ERA_*`（朝代柱）、`YEAR_AXIS_*`（时光轴）、`EVENT_*` / `LANE_*`（事件轴）

## 文件结构

```text
data/
  timeline-events.json          # 主要事件数据
  timeline-event-images.json    # 事件图片映射
  timelineTypes.ts              # TypeScript 类型定义
  timeline.ts                   # 数据导出入口
  pending_events.json           # 待审批事件
  rejection_log.json            # 拒绝记录
  event_titles.txt              # 事件标题参考
```

## 强制规则

1. 禁止写入 `civilization` / `civilizationId` / `civilizations`。
2. 年份规则：公元前用负数，不存在 `0` 年。
3. `summary` 必须可读，禁止乱码与占位文本。
4. 事件 `id` 必须全局唯一。

## TimelineEvent 字段

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

字段说明：

- `id`: 唯一标识。
- `title`: 事件名。
- `startYear` / `endYear`: 年份区间；不写 `endYear` 视为单年。
- `type`: `event | era`。`event` 表示普通事件，`era` 表示朝代/时代。
- `category`: `era | dynasty | war | politics | culture | technology | revolution | diplomacy | economy | society`。
- `rail`（可选）: 决定事件在界面中的显示位置
  - `main`: 主线轨道（右侧事件轴）
  - `global_long`: 长期轨道（左侧背景列）
- `summary`: 简介。

## 背景列显示规则

背景列（最左侧，蓝色背景）显示两类内容：

### 1. 长期事件

不写 `rail` 字段时，系统自动将满足以下所有条件的事件放到背景列：

1. `id` 不以 `china-` 开头（国际事件）
2. `type !== "era"`（非朝代事件）
3. 起始年份 `>= 500`
4. 持续时间 `>= 50` 年（`BACKGROUND_LONG_EVENT_MIN_YEARS`）
5. `category` 属于：`politics | diplomacy | economy | technology | era | dynasty`

### 2. 背景注释

`rail === "global_long"` 的事件将作为背景注释显示在背景列，不显示在右侧事件轴中。

### 人工覆盖

使用 `rail` 字段可以覆盖自动规则：

- 强制进入长期轨道：`"rail": "global_long"`
- 强制留在事件轴：`"rail": "main"`

## 图片映射

图片放在：

```text
public/timeline-images/events/
```

并在 `data/timeline-event-images.json` 维护映射：

```json
{
  "world-industrial-revolution": {
    "src": "/timeline-images/events/world-industrial-revolution.png",
    "alt": "工业革命历史场景插画"
  }
}
```

## 修改后检查

```bash
npm run lint
npm run build
```
