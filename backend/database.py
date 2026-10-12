import os
import socket
from urllib.parse import urlparse, urlunparse
from sqlalchemy import create_engine, text, inspect

DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if not DATABASE_URL:
    DB_DIR = os.path.dirname(os.path.abspath(__file__))
    DATABASE_URL = f"sqlite:///{os.path.join(DB_DIR, 'journal.db')}"


def _force_ipv4(db_url: str) -> str:
    """解决 Render 不支持 IPv6、而 Supabase 优先解析 IPv6 的问题：
    把连接串中的主机名替换为 IPv4 地址。"""
    try:
        parsed = urlparse(db_url)
        if not parsed.hostname or not parsed.scheme.startswith("postgres"):
            return db_url

        # 尝试解析 IPv4 地址
        infos = socket.getaddrinfo(parsed.hostname, None, socket.AF_INET)
        ipv4_host = infos[0][4][0]
        if not ipv4_host:
            return db_url

        # 重建 netloc：user:pass@ipv4:port
        netloc = ""
        if parsed.username:
            netloc += parsed.username
            if parsed.password:
                netloc += ":" + parsed.password
            netloc += "@"
        netloc += ipv4_host
        if parsed.port:
            netloc += f":{parsed.port}"

        return urlunparse(parsed._replace(netloc=netloc))
    except Exception:
        # 解析失败就返回原样，让 SQLAlchemy 自己处理
        return db_url


DATABASE_URL = _force_ipv4(DATABASE_URL)

# Supabase 要求 SSL 连接；本地 SQLite 不需要
engine_kwargs = {"echo": False, "pool_pre_ping": True}
if DATABASE_URL.startswith("postgres"):
    # connect_timeout：数据库不通时快速失败，避免请求一直挂住
    engine_kwargs["connect_args"] = {"sslmode": "require", "connect_timeout": 10}
engine = create_engine(DATABASE_URL, **engine_kwargs)


def get_db():
    return engine.connect()


def is_sqlite():
    return engine.dialect.name == "sqlite"


def init_db():
    conn = get_db()

    if is_sqlite():
        conn.execute(text("PRAGMA journal_mode=WAL"))
        conn.execute(text("PRAGMA foreign_keys=ON"))

    conn.execute(text(f"""
        CREATE TABLE IF NOT EXISTS categories (
            id {_auto()},
            name VARCHAR(100) NOT NULL,
            parent_id INTEGER REFERENCES categories(id),
            sort_order INTEGER DEFAULT 0
        )
    """))

    conn.execute(text(f"""
        CREATE TABLE IF NOT EXISTS time_entries (
            id {_auto()},
            user_id INTEGER NOT NULL DEFAULT 1,
            date VARCHAR(10) NOT NULL,
            main_category VARCHAR(50) NOT NULL,
            sub_category VARCHAR(50) NOT NULL,
            note TEXT DEFAULT '',
            start_time VARCHAR(8) NOT NULL,
            end_time VARCHAR(8) NOT NULL,
            duration_minutes FLOAT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))

    # users 表
    conn.execute(text(f"""
        CREATE TABLE IF NOT EXISTS users (
            id {_auto()},
            username VARCHAR(50) NOT NULL UNIQUE,
            password_hash VARCHAR(200) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))

    # 清理重复分类：同一父类下同名次类只保留 id 最小的一条
    # （早期版本 INSERT OR IGNORE 无唯一约束导致重复插入，这里兜底修复）
    conn.execute(text("""
        DELETE FROM categories
        WHERE id NOT IN (
            SELECT MIN(id) FROM categories GROUP BY name, COALESCE(parent_id, -1)
        )
    """))
    conn.commit()

    # 旧数据库兼容：time_entries 补 user_id 列
    _ensure_column(conn, "time_entries", "user_id", "INTEGER NOT NULL DEFAULT 1")

    # 索引
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_entries_date ON time_entries(date)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_entries_main_cat ON time_entries(main_category)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_entries_user ON time_entries(user_id)"))

    # 确保 7 大主类存在（幂等，缺失才补）
    main_names = ['工作', '学习', '运动', '阅读', '娱乐', '休息', '社交']
    for i, name in enumerate(main_names, start=1):
        exists = conn.execute(
            text("SELECT id FROM categories WHERE name = :n AND parent_id IS NULL"),
            {"n": name}
        ).fetchone()
        if not exists:
            conn.execute(
                text("INSERT INTO categories(name, parent_id, sort_order) VALUES (:n, NULL, :so)"),
                {"n": name, "so": i}
            )

    # 确保默认次类存在（幂等，按名称检查）
    subs = [
        ('开发', '工作'), ('会议', '工作'), ('文档', '工作'), ('生产', '工作'), ('需求分析', '工作'),
        ('Python', '学习'), ('系统设计', '学习'), ('英语', '学习'), ('工具', '学习'),
        ('跑步', '运动'), ('力量训练', '运动'), ('瑜伽', '运动'), ('游泳', '运动'),
        ('专业书籍', '阅读'), ('文学', '阅读'), ('个人成长', '阅读'),
        ('刷剧', '娱乐'), ('游戏', '娱乐'), ('音乐', '娱乐'), ('小说', '娱乐'),
        ('午休', '休息'), ('散步', '休息'), ('冥想', '休息'),
        ('聚餐', '社交'), ('聊天', '社交'), ('活动', '社交'),
    ]
    for sub_name, parent_name in subs:
        pid = conn.execute(
            text("SELECT id FROM categories WHERE name = :pn AND parent_id IS NULL"),
            {"pn": parent_name}
        ).scalar_one()
        exists = conn.execute(
            text("SELECT id FROM categories WHERE name = :n AND parent_id = :pid"),
            {"n": sub_name, "pid": pid}
        ).fetchone()
        if not exists:
            conn.execute(
                text("INSERT INTO categories(name, parent_id) VALUES (:n, :pid)"),
                {"n": sub_name, "pid": pid}
            )

    conn.commit()
    conn.close()

    # 从环境变量创建预置账号
    _seed_users()


def _ensure_column(conn, table: str, column: str, ddl: str):
    """检查列是否存在，不存在则 ALTER TABLE 添加（兼容旧数据库）"""
    try:
        insp = inspect(conn)
        cols = [c["name"] for c in insp.get_columns(table)]
    except Exception:
        return
    if column not in cols:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
        conn.commit()


def _seed_users():
    """从 APP_USERS 环境变量创建预置账号，格式：user1:pass1,user2:pass2"""
    from .auth import hash_password

    raw = os.environ.get("APP_USERS", "").strip()
    if not raw:
        return

    conn = get_db()
    for pair in raw.split(","):
        pair = pair.strip()
        if not pair or ":" not in pair:
            continue
        username, password = pair.split(":", 1)
        username = username.strip()
        if not username:
            continue

        existing = conn.execute(
            text("SELECT id FROM users WHERE username = :u"), {"u": username}
        ).fetchone()
        if existing:
            continue

        conn.execute(
            text("INSERT INTO users (username, password_hash) VALUES (:u, :h)"),
            {"u": username, "h": hash_password(password)}
        )
    conn.commit()
    conn.close()


def _auto():
    """返回自增主键 DDL（SQLite / PostgreSQL 兼容）"""
    if is_sqlite():
        return "INTEGER PRIMARY KEY AUTOINCREMENT"
    return "SERIAL PRIMARY KEY"


def db_info() -> dict:
    """数据库诊断信息，供 /api/health 排查「数据去哪了」"""
    info = {"db_type": engine.dialect.name}
    try:
        parsed = urlparse(DATABASE_URL)
        info["host"] = parsed.hostname or "local"
        info["port"] = parsed.port
    except Exception:
        info["host"] = "unknown"

    try:
        conn = get_db()
        info["entries_total"] = conn.execute(
            text("SELECT COUNT(*) FROM time_entries")).scalar()
        info["users_total"] = conn.execute(
            text("SELECT COUNT(*) FROM users")).scalar()
        info["categories_total"] = conn.execute(
            text("SELECT COUNT(*) FROM categories")).scalar()

        rows = conn.execute(text(
            "SELECT user_id, COUNT(*) AS n, MIN(date) AS d1, MAX(date) AS d2 "
            "FROM time_entries GROUP BY user_id ORDER BY user_id"
        )).mappings().all()
        info["entries_by_user"] = [
            {"user_id": r["user_id"], "count": r["n"], "from": r["d1"], "to": r["d2"]}
            for r in rows
        ]
        # 悬空数据：user_id 不对应任何账号（账号 ID 变动会导致「数据消失」）
        info["orphan_entries"] = conn.execute(text(
            "SELECT COUNT(*) FROM time_entries "
            "WHERE user_id NOT IN (SELECT id FROM users)"
        )).scalar()
        info["user_list"] = [
            {"id": r["id"], "username": r["username"]}
            for r in conn.execute(text(
                "SELECT id, username FROM users ORDER BY id")).mappings().all()
        ]
        conn.close()
    except Exception as e:
        info["error"] = f"{type(e).__name__}: {e}"[:300]
    return info
