import sys
import os
import uvicorn

# Ensure the backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings

if __name__ == "__main__":
    print(f"Launching {settings.PROJECT_NAME} on http://localhost:{settings.PORT}")
    print(f"Interactive Swagger Docs: http://localhost:{settings.PORT}/docs")
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
