import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "journal.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            parent_id INTEGER REFERENCES categories(id),
            sort_order INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS time_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            main_category TEXT NOT NULL,
            sub_category TEXT NOT NULL,
            note TEXT DEFAULT '',
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            duration_minutes REAL NOT NULL,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE INDEX IF NOT EXISTS idx_entries_date ON time_entries(date);
        CREATE INDEX IF NOT EXISTS idx_entries_main_cat ON time_entries(main_category);

        -- 默认类别
        INSERT OR IGNORE INTO categories(id, name, parent_id, sort_order) VALUES
        (1, '工作', NULL, 1), (2, '学习', NULL, 2), (3, '运动', NULL, 3),
        (4, '阅读', NULL, 4), (5, '娱乐', NULL, 5), (6, '休息', NULL, 6), (7, '社交', NULL, 7);

        INSERT OR IGNORE INTO categories(name, parent_id, sort_order) VALUES
        ('开发', 1, 1), ('会议', 1, 2), ('文档', 1, 3), ('生产', 1, 4), ('需求分析', 1, 5),
        ('Python', 2, 1), ('系统设计', 2, 2), ('英语', 2, 3), ('工具', 2, 4),
        ('跑步', 3, 1), ('力量训练', 3, 2), ('瑜伽', 3, 3), ('游泳', 3, 4),
        ('专业书籍', 4, 1), ('文学', 4, 2), ('个人成长', 4, 3),
        ('刷剧', 5, 1), ('游戏', 5, 2), ('音乐', 5, 3), ('小说', 5, 4),
        ('午休', 6, 1), ('散步', 6, 2), ('冥想', 6, 3),
        ('聚餐', 7, 1), ('聊天', 7, 2), ('活动', 7, 3);
    """)
    conn.commit()
    conn.close()
