# 📖 月视图时间手账

个人时间记录管理应用。记录每天做的事情和花费时长，以**月视图日历**形式汇总展示，支持手机/电脑随时访问。

## 🔗 在线地址

> 生产地址不在此公开（私有应用），部署后从 Render 控制台获取。

| 环境 | 地址 |
|------|------|
| 本地开发 | http://localhost:8123 |

---

## ✨ 功能清单

### 1. 月视图日历（首页）
- 月历网格布局（周一至周日），每天显示各类别耗时
- 点击日期弹出当天明细（次类/备注/起止时间/时长）
- 月度统计条：总耗时 + 各主类占比
- 支持年份/月份切换

### 2. 时间记录
- 新增记录：日期、主类、次类、备注、开始/结束时间
- 次类随主类联动，自动计算持续时间（跨零点自动 +24h）
- 支持编辑和删除（后端 API 已支持）

### 2.5 多账户登录
- 登录页 + 账号密码认证（JWT，30 天免登录）
- 账号由服务器环境变量配置，不开放注册（外人无法注册）
- 每个账号的时间记录**完全隔离**，互不可见
- 分类共享（家庭场景友好）

### 3. 类别管理
- 7 大主类：工作 / 学习 / 运动 / 阅读 / 娱乐 / 休息 / 社交
- 每个主类下有预设次类，可随时新增

### 4. Excel 数据导入
- 上传原始「月视图电子手账」Excel 文件（.xlsx）
- 自动解析「时间明细」Sheet，批量写入数据库
- 自动跳过空行、处理 Excel 时间格式、纠正主类名不一致

### 5. 移动端适配
- 响应式布局：手机单列 + 底部导航，PC 全宽 + 侧边导航
- 手机浏览器直接可用，同 WiFi 可用局域网 IP 访问

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────┐
│  前端：React 18 + Vite 5 + Tailwind CSS 3   │
│  （build 后由后端直接托管静态文件）           │
├─────────────────────────────────────────────┤
│  后端：Python FastAPI + SQLAlchemy 2.0      │
├─────────────────────────────────────────────┤
│  数据库：                                    │
│    生产 = Supabase PostgreSQL（免费）        │
│    本地 = SQLite（自动切换）                 │
└─────────────────────────────────────────────┘
```

- **单进程部署**：后端 FastAPI 同时服务 API 和前端静态页面（`frontend/dist`），只需跑一个服务
- **数据库自动适配**：检测 `DATABASE_URL` 环境变量，有则用 PostgreSQL，无则用本地 SQLite
- **IPv4 强制**：代码自动将数据库主机名解析为 IPv4 地址（解决 Render 不支持 IPv6 的问题）
- **SSL 自动开启**：PostgreSQL 连接自动加 `sslmode=require`

---

## 🗄️ 数据库设计

### categories（类别表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增 |
| name | VARCHAR(100) | 类别名 |
| parent_id | INTEGER NULL | 父类 ID，NULL=主类 |
| sort_order | INTEGER | 排序 |

### time_entries（时间记录表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增 |
| date | VARCHAR(10) | 日期 YYYY-MM-DD |
| main_category | VARCHAR(50) | 主类 |
| sub_category | VARCHAR(50) | 次类 |
| note | TEXT | 备注 |
| start_time | VARCHAR(8) | 开始时间 |
| end_time | VARCHAR(8) | 结束时间 |
| duration_minutes | FLOAT | 持续分钟数 |
| created_at | TIMESTAMP | 创建时间 |

---

## 🔌 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/entries/monthly?year=&month= | 按月获取记录（按天分组+分类汇总） |
| GET | /api/entries/daily/{date} | 获取某天记录 |
| POST | /api/entries | 新增记录 |
| PUT | /api/entries/{id} | 更新记录 |
| DELETE | /api/entries/{id} | 删除记录 |
| DELETE | /api/entries | 清空所有 |
| GET | /api/categories | 获取类别树 |
| POST | /api/categories | 新增类别 |
| PUT | /api/categories/{id} | 更新类别 |
| DELETE | /api/categories/{id} | 删除类别 |
| POST | /api/import/excel | 上传 Excel 导入 |
| GET | /api/health | 健康检查 |

---

## 🚀 部署指南（Render + Supabase）

### 1. 推送代码到 GitHub
```bash
git add -A
git commit -m "update"
git push origin main
```

### 2. 创建 Supabase 数据库
1. 注册 [supabase.com](https://supabase.com)，创建项目（Region 选 Singapore）
2. 记下数据库密码
3. 项目页面右上角 **Connect** → 选 **Session pooler** → 复制连接串
   - 注意：**不要用 Direct connection**（那是 IPv6 的，Render 连不上）
   - 连接串格式：`postgresql://postgres.项目ID:密码@aws-0-区域.pooler.supabase.com:5432/postgres`

### 3. Render 部署
1. 注册 [render.com](https://render.com)（GitHub 登录）
2. **New +** → **Web Service** → 选仓库
3. 配置：
   - **Build Command**：
     ```
     pip install --upgrade pip && pip install -r backend/requirements.txt && cd frontend && npm install && npm run build
     ```
   - **Start Command**：
     ```
     python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Plan**：Free
4. **Environment** 添加变量：
   - `DATABASE_URL` = Supabase 连接串
   - `APP_USERS` = 账号列表，格式：`user1:pass1,user2:pass2`（逗号分隔）
   - `SECRET_KEY` = 任意长随机字符串（登录 token 加密用，可用在线工具生成）
5. 部署完成后访问 `https://xxx.onrender.com`

### 4. 防止休眠（免费计划）
- Render 免费版 15 分钟无访问会休眠，首次打开需等 30-60 秒
- 用 [uptimerobot.com](https://uptimerobot.com) 免费监控，每 5 分钟 Ping 一次，保持常醒

---

## 💻 本地运行

### 方式一：一键启动（Windows）
双击项目根目录的 `start.bat`，自动构建前端并启动服务，浏览器自动打开。

### 方式二：手动
```bash
# 1. 启动后端（会自动构建前端后 serve）
cd monthly-journal
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8123

# 2. 浏览器访问
http://localhost:8123
```

本地默认使用 SQLite（`backend/journal.db`），无需数据库配置。

---

## ❓ 常见问题

### 数据打不开/丢失
- **生产环境**：检查 Supabase 数据库是否正常（Render 免费版磁盘不持久化，必须用外部数据库）
- **本地**：检查 `backend/journal.db` 是否存在

### 部署失败 status 3
- 多为数据库连接问题，查看日志：
  - `Network is unreachable` → IPv6 问题，确认用 Session pooler 连接串
  - `could not translate host name` → 连接串主机名错误
  - `password authentication failed` → 密码错误

### 登录不了
- 确认 Render 的 `APP_USERS` 环境变量已配置且格式正确（`user1:pass1,user2:pass2`）
- 修改 `APP_USERS` 后需要重新部署才会生效

### 手机访问慢/打不开
- 免费版 Render 在国外，国内访问需梯子或改用国内云服务器
- 建议方案：腾讯云/阿里云轻量服务器（约 60-100 元/年），国内直连秒开

---

## 📁 项目结构

```
monthly-journal/
├── backend/
│   ├── main.py            # FastAPI 入口 + 静态文件托管
│   ├── database.py        # SQLAlchemy 引擎 + 建表 + IPv4 强制
│   ├── requirements.txt
│   └── routers/
│       ├── entries.py     # 时间记录 CRUD + 月度汇总
│       ├── categories.py  # 类别管理
│       └── import_data.py # Excel 导入
├── frontend/
│   ├── src/
│   │   ├── pages/         # 月视图/记录/类别/导入 4 个页面
│   │   ├── components/    # 布局组件
│   │   └── api/           # 前端 API 封装
│   └── dist/              # 构建产物（后端托管）
├── requirements.txt       # Render 部署用
├── render.yaml            # Blueprint 配置（可选）
└── .gitignore
```
