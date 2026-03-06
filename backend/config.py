import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "assets.json")
PREF_FILE = os.path.join(BASE_DIR, "preferences.json")

# 缓存文件（由定时任务周期性更新）
SCHEDULER_CACHE_FILE = os.path.join(BASE_DIR, "scheduler_cache.json")