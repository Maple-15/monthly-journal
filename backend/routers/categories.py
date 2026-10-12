from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import text
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/api/categories", tags=["categories"])


class CategoryCreate(BaseModel):
    name: str
    parent_id: Optional[int] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None


@router.get("")
def get_categories(user=Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute(
        text("SELECT * FROM categories ORDER BY sort_order, id")
    ).mappings().all()
    conn.close()

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
def create_category(cat: CategoryCreate, user=Depends(get_current_user)):
    conn = get_db()
    if cat.parent_id:
        parent = conn.execute(
            text("SELECT id FROM categories WHERE id = :pid"), {"pid": cat.parent_id}
        ).fetchone()
        if not parent:
            conn.close()
            raise HTTPException(status_code=404, detail="父类不存在")

    result = conn.execute(
        text("INSERT INTO categories (name, parent_id) VALUES (:name, :pid) RETURNING id"),
        {"name": cat.name, "pid": cat.parent_id}
    )
    new_id = result.scalar_one()
    conn.commit()

    row = conn.execute(
        text("SELECT * FROM categories WHERE id = :id"), {"id": new_id}
    ).mappings().fetchone()
    conn.close()
    return {"ok": True, "category": dict(row)}


@router.put("/{cat_id}")
def update_category(cat_id: int, update: CategoryUpdate, user=Depends(get_current_user)):
    conn = get_db()
    existing = conn.execute(
        text("SELECT * FROM categories WHERE id = :id"), {"id": cat_id}
    ).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="类别不存在")

    if update.name is not None:
        conn.execute(
            text("UPDATE categories SET name = :name WHERE id = :id"),
            {"name": update.name, "id": cat_id}
        )
    if update.sort_order is not None:
        conn.execute(
            text("UPDATE categories SET sort_order = :so WHERE id = :id"),
            {"so": update.sort_order, "id": cat_id}
        )
    conn.commit()
    row = conn.execute(
        text("SELECT * FROM categories WHERE id = :id"), {"id": cat_id}
    ).mappings().fetchone()
    conn.close()
    return {"ok": True, "category": dict(row)}


@router.delete("/{cat_id}")
def delete_category(cat_id: int, user=Depends(get_current_user)):
    conn = get_db()
    conn.execute(text("DELETE FROM categories WHERE id = :id"), {"id": cat_id})
    conn.execute(text("DELETE FROM categories WHERE parent_id = :pid"), {"pid": cat_id})
    conn.commit()
    conn.close()
    return {"ok": True}
