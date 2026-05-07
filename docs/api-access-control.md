# ChronoScroll API 权限与访问控制说明

本文档说明当前版本（2026-05-07）各 API 的权限边界，便于前后端协作和安全审查。

## 认证方式

- 管理员登录成功后，服务端通过 `admin_session` Cookie 识别管理员身份。
- 认证逻辑位于 `lib/adminAuth.ts`，核心校验方法为 `isAdminAuthenticated(request)`。

## 接口权限矩阵

| 接口 | 方法 | 权限要求 | 用途 |
|------|------|------|------|
| `/api/auth/admin` | `POST` | 公开 | 管理员登录 |
| `/api/auth/admin` | `GET` | 公开 | 查询当前登录状态 |
| `/api/auth/admin` | `DELETE` | 公开 | 管理员退出登录 |
| `/api/auth/admin/setup` | `POST` | 公开（仅首次有效） | 初始化管理员密码 |
| `/api/pending-events` | `GET` | 管理员 | 读取待审核事件 + 拒绝记录 |
| `/api/pending-events` | `POST`（无 `action`） | 公开 | 用户提交待审核事件 |
| `/api/pending-events` | `POST`（`action=approve`） | 管理员 | 审核通过并写入正式事件 |
| `/api/pending-events` | `POST`（`action=reject`） | 管理员 | 拒绝待审核事件并写入拒绝记录 |
| `/api/pending-events?action=clear-rejections` | `DELETE` | 管理员 | 清空拒绝记录 |
| `/api/events` | `GET` | 公开 | 读取正式事件数据 |
| `/api/events` | `POST` | 管理员 | 新增正式事件 |
| `/api/events` | `PUT` | 管理员 | 编辑正式事件 |
| `/api/events` | `DELETE` | 管理员 | 删除正式事件 |

## 约定与建议

- 前端调用管理员接口时统一携带 `credentials: "include"`。
- 管理员接口返回 `401` 时，前端应跳转到 `/admin` 登录页。
- 公开提交接口只接受必要字段，避免把管理员字段暴露给匿名用户。

## 变更记录

- 2026-05-07：为 `/api/pending-events` 的管理动作补齐服务端鉴权（`GET`、`approve/reject`、`clear-rejections`）。
