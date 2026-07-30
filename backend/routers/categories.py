from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from ..database import get_db

router = APIRouter(prefix="/api/categories", tags=["categories"])


class CategoryCreate(BaseModel):
    name: str
    parent_id: Optional[int] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None


@router.get("")
def get_categories():
    conn = get_db()
    rows = conn.execute("SELECT * FROM categories ORDER BY sort_order, id").fetchall()
    conn.close()

    # 组织成树结构
    main_cats = {}
    sub_cats = {}
    for r in rows:
        if r["parent_id"] is None:
            main_cats[r["id"]] = {"id": r["id"], "name": r["name"], "children": []}
        else:
            sub_cats.setdefault(r["parent_id"], []).append({
                "id": r["id"], "name": r["name"]
            })

    for pid, children in sub_cats.items():
        if pid in main_cats:
            main_cats[pid]["children"] = children

    return {"categories": list(main_cats.values())}


@router.post("")
def create_category(cat: CategoryCreate):
    conn = get_db()
    if cat.parent_id:
        parent = conn.execute("SELECT id FROM categories WHERE id = ?", (cat.parent_id,)).fetchone()
        if not parent:
            conn.close()
            raise HTTPException(status_code=404, detail="父类不存在")

    cur = conn.execute(
        "INSERT INTO categories (name, parent_id) VALUES (?, ?)",
        (cat.name, cat.parent_id)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM categories WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return {"ok": True, "category": dict(row)}


@router.put("/{cat_id}")
def update_category(cat_id: int, update: CategoryUpdate):
    conn = get_db()
    existing = conn.execute("SELECT * FROM categories WHERE id = ?", (cat_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="类别不存在")

    if update.name is not None:
        conn.execute("UPDATE categories SET name = ? WHERE id = ?", (update.name, cat_id))
    if update.sort_order is not None:
        conn.execute("UPDATE categories SET sort_order = ? WHERE id = ?", (update.sort_order, cat_id))
    conn.commit()
    row = conn.execute("SELECT * FROM categories WHERE id = ?", (cat_id,)).fetchone()
    conn.close()
    return {"ok": True, "category": dict(row)}


@router.delete("/{cat_id}")
def delete_category(cat_id: int):
    conn = get_db()
    conn.execute("DELETE FROM categories WHERE id = ?", (cat_id,))
    conn.execute("DELETE FROM categories WHERE parent_id = ?", (cat_id,))
    conn.commit()
    conn.close()
    return {"ok": True}
