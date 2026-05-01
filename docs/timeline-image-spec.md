# 历史长河 ChronoScroll 插画规范

用于时间轴事件图的统一尺寸与命名规范。

## 1) 输出规格

- 尺寸：`1200 x 675`
- 比例：`16:9`
- 格式：优先 `webp`（可用 `png`）
- 色彩：`sRGB`
- 建议体积：`300KB - 900KB`
- 禁止：水印、Logo、边框、图内文字

## 2) 存放路径

```text
public/timeline-images/events/
```

文件名与事件 `id` 对齐，例如：

```text
public/timeline-images/events/china-an-lushan.webp
```

## 3) 与事件数据关系

事件数据只看 `data/timeline-events.json`，示例：

```json
{
  "id": "china-an-lushan",
  "title": "安史之乱",
  "startYear": 755,
  "endYear": 763,
  "type": "event",
  "category": "war",
  "summary": "唐朝由盛转衰的重要战乱。"
}
```

> 注意：禁止在事件数据里写入 `civilization` 或 `civilizationId`。

## 4) 图片映射

在 `data/timeline-event-images.json` 中写：

```json
{
  "china-an-lushan": {
    "src": "/timeline-images/events/china-an-lushan.webp",
    "alt": "安史之乱历史场景插画"
  }
}
```

## 5) 画面风格建议

- 博物馆叙事感、历史场景感
- 柔和配色，和时间轴纸张风格协调
- 主题清晰，小图预览仍可识别
- 避免现代物件与明显时代错误

