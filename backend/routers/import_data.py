import openpyxl
from fastapi import APIRouter, UploadFile, File
from datetime import datetime, timedelta
from sqlalchemy import text
from ..database import get_db

router = APIRouter(prefix="/api/import", tags=["import"])

# 主类映射（处理原数据中的不一致）
CATEGORY_MAP = {
    "工作": "工作", "学习": "学习", "运动": "运动",
    "阅读": "阅读", "娱乐": "娱乐", "休息": "休息", "社交": "社交",
    "游戏": "娱乐",  # 有些记录把"游戏"记在次类但主类乱填
}


def excel_time_to_minutes(val):
    """Excel 时间数值转分钟数"""
    if val is None:
        return 0
    if isinstance(val, (int, float)):
        # Excel 中 1 天 = 1，所以 0.0625 = 1.5 小时 = 90 分钟
        return round(val * 24 * 60, 1)
    return 0


def format_time(minutes):
    """分钟数转 HH:MM 格式"""
    h = int(minutes // 60)
    m = int(minutes % 60)
    return f"{h:02d}:{m:02d}:00"


@router.post("/excel")
async def import_excel(file: UploadFile = File(...)):
    if not file.filename.endswith((".xlsx", ".xls")):
        return {"ok": False, "error": "请上传 .xlsx 或 .xls 文件"}

    import io
    content = await file.read()
    wb = openpyxl.load_workbook(filename=io.BytesIO(content), data_only=True)

    ws = wb["时间明细"]
    imported = 0
    errors = []

    conn = get_db()

    for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        year, month, week, date_val, main_cat, sub_cat, note, start_t, end_t, duration = row

        # 跳过空行和无效数据
        if not date_val or not start_t or not end_t:
            continue
        if isinstance(date_val, datetime) and date_val.year == 1900:
            continue  # Excel 空行填充
        if not main_cat or not sub_cat:
            continue

        # 处理日期
        if isinstance(date_val, datetime):
            date_str = date_val.strftime("%Y-%m-%d")
        else:
            date_str = str(date_val)

        # 处理时间
        if isinstance(start_t, datetime):
            start_str = start_t.strftime("%H:%M:%S")
        elif isinstance(start_t, (int, float)):
            start_str = format_time(excel_time_to_minutes(start_t))
        else:
            start_str = str(start_t) if start_t else "00:00:00"

        if isinstance(end_t, datetime):
            end_str = end_t.strftime("%H:%M:%S")
        elif isinstance(end_t, (int, float)):
            end_str = format_time(excel_time_to_minutes(end_t))
        else:
            end_str = str(end_t) if end_t else "00:00:00"

        # 计算持续分钟
        if duration and isinstance(duration, (int, float)):
            minutes = round(duration * 24 * 60, 1)
        else:
            try:
                s = datetime.strptime(start_str, "%H:%M:%S") if ":" in start_str else datetime.strptime(start_str, "%H:%M")
                e = datetime.strptime(end_str, "%H:%M:%S") if ":" in end_str else datetime.strptime(end_str, "%H:%M")
                if e <= s:
                    e += timedelta(days=1)
                minutes = round((e - s).total_seconds() / 60, 1)
            except:
                minutes = 0

        # 保证主类名一致
        main_cat = str(main_cat).strip()
        sub_cat = str(sub_cat).strip()
        if main_cat in CATEGORY_MAP:
            main_cat = CATEGORY_MAP[main_cat]

        note = str(note).strip() if note else ""

        try:
            conn.execute(
                text("""INSERT INTO time_entries (date, main_category, sub_category, note, start_time, end_time, duration_minutes)
                       VALUES (:date, :main_cat, :sub_cat, :note, :start, :end, :dur)"""),
                {
                    "date": date_str, "main_cat": main_cat,
                    "sub_cat": sub_cat, "note": note,
                    "start": start_str, "end": end_str, "dur": minutes
                }
            )
            imported += 1
        except Exception as e:
            errors.append(f"第{row_idx}行: {str(e)}")

    conn.commit()
    conn.close()
    wb.close()

    return {
        "ok": True,
        "imported": imported,
        "errors": errors,
        "total_errors": len(errors),
    }
