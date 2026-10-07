import sys
import os

# Point to backend directory
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
sys.path.insert(0, backend_dir)

import uvicorn
from app.core.config import settings

if __name__ == "__main__":
    print(f"Launching {settings.PROJECT_NAME} from root directory...")
    print(f"Swagger Documentation: http://localhost:{settings.PORT}/docs")
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
