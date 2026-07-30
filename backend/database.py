import os
from sqlalchemy import create_engine, text, inspect

DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if not DATABASE_URL:
    DB_DIR = os.path.dirname(os.path.abspath(__file__))
    DATABASE_URL = f"sqlite:///{os.path.join(DB_DIR, 'journal.db')}"

engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)


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

    # 索引
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_entries_date ON time_entries(date)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_entries_main_cat ON time_entries(main_category)"))

    # 检查是否已有默认分类
    has_cats = conn.execute(text("SELECT COUNT(*) FROM categories")).scalar()

    if has_cats == 0:
        # 插入主类
        if is_sqlite():
            conn.execute(text("INSERT INTO categories(id, name, parent_id, sort_order) VALUES (1, '工作', NULL, 1)"))
            conn.execute(text("INSERT INTO categories(id, name, parent_id, sort_order) VALUES (2, '学习', NULL, 2)"))
            conn.execute(text("INSERT INTO categories(id, name, parent_id, sort_order) VALUES (3, '运动', NULL, 3)"))
            conn.execute(text("INSERT INTO categories(id, name, parent_id, sort_order) VALUES (4, '阅读', NULL, 4)"))
            conn.execute(text("INSERT INTO categories(id, name, parent_id, sort_order) VALUES (5, '娱乐', NULL, 5)"))
            conn.execute(text("INSERT INTO categories(id, name, parent_id, sort_order) VALUES (6, '休息', NULL, 6)"))
            conn.execute(text("INSERT INTO categories(id, name, parent_id, sort_order) VALUES (7, '社交', NULL, 7)"))
        else:
            conn.execute(text("INSERT INTO categories(name, parent_id, sort_order) VALUES ('工作', NULL, 1)"))
            conn.execute(text("INSERT INTO categories(name, parent_id, sort_order) VALUES ('学习', NULL, 2)"))
            conn.execute(text("INSERT INTO categories(name, parent_id, sort_order) VALUES ('运动', NULL, 3)"))
            conn.execute(text("INSERT INTO categories(name, parent_id, sort_order) VALUES ('阅读', NULL, 4)"))
            conn.execute(text("INSERT INTO categories(name, parent_id, sort_order) VALUES ('娱乐', NULL, 5)"))
            conn.execute(text("INSERT INTO categories(name, parent_id, sort_order) VALUES ('休息', NULL, 6)"))
            conn.execute(text("INSERT INTO categories(name, parent_id, sort_order) VALUES ('社交', NULL, 7)"))

        # 插入次类
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
            conn.execute(
                text("INSERT INTO categories(name, parent_id) VALUES (:n, :pid)"),
                {"n": sub_name, "pid": pid}
            )

    conn.commit()
    conn.close()


def _auto():
    """返回自增主键 DDL（SQLite / PostgreSQL 兼容）"""
    if is_sqlite():
        return "INTEGER PRIMARY KEY AUTOINCREMENT"
    return "SERIAL PRIMARY KEY"
