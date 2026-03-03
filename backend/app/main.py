from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import asset
from app.utils.generate_strategy import generate_strategy

app = FastAPI(title="AI Investment Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(asset.router)

@app.get("/api/strategy")
def get_strategy():
    return generate_strategy()