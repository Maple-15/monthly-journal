from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from sqlalchemy import text
from ..database import get_db

router = APIRouter(prefix="/api/entries", tags=["entries"])


class EntryCreate(BaseModel):
    date: str
    main_category: str
    sub_category: str
    note: str = ""
    start_time: str
    end_time: str


class EntryUpdate(BaseModel):
    date: Optional[str] = None
    main_category: Optional[str] = None
    sub_category: Optional[str] = None
    note: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None


def calc_duration(start: str, end: str) -> float:
    fmt = "%H:%M:%S" if start.count(":") == 2 else "%H:%M"
    s = datetime.strptime(start, fmt)
    e = datetime.strptime(end, fmt)
    if e <= s:
        e += timedelta(days=1)
    return (e - s).total_seconds() / 60


@router.get("/monthly")
def get_monthly(year: int = Query(...), month: int = Query(...)):
    conn = get_db()
    prefix = f"{year}-{month:02d}"
    rows = conn.execute(
        text("SELECT * FROM time_entries WHERE date LIKE :prefix ORDER BY date, start_time"),
        {"prefix": f"{prefix}%"}
    ).mappings().all()
    conn.close()

    days = {}
    for r in rows:
        d = r["date"]
        if d not in days:
            days[d] = []
        days[d].append({
            "id": r["id"],
            "main_category": r["main_category"],
            "sub_category": r["sub_category"],
            "note": r["note"],
            "start_time": r["start_time"],
            "end_time": r["end_time"],
            "duration_minutes": r["duration_minutes"],
        })

    result = []
    for date, entries in sorted(days.items()):
        total_minutes = sum(e["duration_minutes"] for e in entries)
        category_summary = {}
        for e in entries:
            cat = e["main_category"]
            category_summary[cat] = category_summary.get(cat, 0) + e["duration_minutes"]
        result.append({
            "date": date,
            "total_minutes": round(total_minutes, 1),
            "entries": entries,
            "category_summary": category_summary,
        })

    return {"year": year, "month": month, "days": result}


@router.get("/daily/{date}")
def get_daily(date: str):
    conn = get_db()
    rows = conn.execute(
        text("SELECT * FROM time_entries WHERE date = :date ORDER BY start_time"),
        {"date": date}
    ).mappings().all()
    conn.close()

    entries = [dict(r) for r in rows]
    total_minutes = sum(r["duration_minutes"] for r in rows)
    return {"date": date, "total_minutes": round(total_minutes, 1), "entries": entries}


@router.post("")
def create_entry(entry: EntryCreate):
    minutes = calc_duration(entry.start_time, entry.end_time)
    conn = get_db()

    result = conn.execute(
        text("""INSERT INTO time_entries (date, main_category, sub_category, note, start_time, end_time, duration_minutes)
                VALUES (:date, :main_cat, :sub_cat, :note, :start, :end, :dur) RETURNING id"""),
        {
            "date": entry.date, "main_cat": entry.main_category,
            "sub_cat": entry.sub_category, "note": entry.note,
            "start": entry.start_time, "end": entry.end_time,
            "dur": minutes
        }
    )
    new_id = result.scalar_one()
    conn.commit()

    row = conn.execute(
        text("SELECT * FROM time_entries WHERE id = :id"), {"id": new_id}
    ).mappings().fetchone()
    conn.close()
    return {"ok": True, "entry": dict(row)}


@router.put("/{entry_id}")
def update_entry(entry_id: int, update: EntryUpdate):
    conn = get_db()
    existing = conn.execute(
        text("SELECT * FROM time_entries WHERE id = :id"), {"id": entry_id}
    ).mappings().fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="条目不存在")

    fields = {}
    for key in ("date", "main_category", "sub_category", "note", "start_time", "end_time"):
        val = getattr(update, key, None)
        if val is not None:
            fields[key] = val

    if "start_time" in fields or "end_time" in fields:
        st = fields.get("start_time", existing["start_time"])
        et = fields.get("end_time", existing["end_time"])
        fields["duration_minutes"] = calc_duration(st, et)

    if fields:
        set_clauses = ", ".join(f"{k} = :{k}" for k in fields)
        params = {**fields, "id": entry_id}
        conn.execute(text(f"UPDATE time_entries SET {set_clauses} WHERE id = :id"), params)
        conn.commit()

    row = conn.execute(
        text("SELECT * FROM time_entries WHERE id = :id"), {"id": entry_id}
    ).mappings().fetchone()
    conn.close()
    return {"ok": True, "entry": dict(row)}


@router.delete("/{entry_id}")
def delete_entry(entry_id: int):
    conn = get_db()
    conn.execute(text("DELETE FROM time_entries WHERE id = :id"), {"id": entry_id})
    conn.commit()
    conn.close()
    return {"ok": True}


@router.delete("")
def clear_all():
    conn = get_db()
    conn.execute(text("DELETE FROM time_entries"))
    conn.commit()
    conn.close()
    return {"ok": True}
