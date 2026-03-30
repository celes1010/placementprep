from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from database import init_db
from routes.auth import auth_bp
from routes.quiz import quiz_bp
from routes.dashboard import dashboard_bp
from routes.admin import admin_bp
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "placementprep-super-secret-2026")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False

CORS(app, origins=["http://localhost:5173"])
JWTManager(app)

init_db()

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(quiz_bp, url_prefix="/api/quiz")
app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
app.register_blueprint(admin_bp, url_prefix="/api/admin")

if __name__ == "__main__":
    app.run(debug=True, port=5000)
