import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .database import init_db
from .auth import router as auth_router
from .routers import entries, categories, import_data

app = FastAPI(title="月视图时间记录手账", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(entries.router)
app.include_router(categories.router)
app.include_router(import_data.router)


@app.on_event("startup")
def startup():
    # 数据库连不上时也要让服务起来，否则连诊断接口都看不到
    try:
        init_db()
        print("[startup] 数据库初始化完成", flush=True)
    except Exception as e:
        print(f"[startup] 数据库初始化失败: {type(e).__name__}: {e}", flush=True)


@app.get("/api/health")
def health():
    """健康检查 + 数据诊断（打开这个网址即可看到数据存在哪、有多少条）"""
    from .database import db_info
    try:
        return {"status": "ok", **db_info()}
    except Exception as e:
        return {"status": "ok", "diag_error": f"{type(e).__name__}: {e}"[:200]}


# 前端静态文件服务（生产环境）
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(FRONTEND_DIR):
    from fastapi.routing import Mount
    # 挂载 assets 目录
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

    # SPA 路由回退：所有非 API 路径返回 index.html
    @app.api_route("/{path:path}", include_in_schema=False)
    async def serve_spa(path: str):
        if path.startswith("api/"):
            from fastapi.responses import JSONResponse
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        index_path = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path, media_type="text/html")
        from fastapi.responses import JSONResponse
        return JSONResponse({"detail": "Not Found"}, status_code=404)
else:
    @app.get("/")
    def dev_mode():
        return {"message": "开发模式：请用 Vite dev server 或先 npm run build"}

