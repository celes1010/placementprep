from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from database import get_db
import bcrypt

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({"error": "All fields required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (name, email, password_hash)
        )
        conn.commit()
        user = conn.execute("SELECT id, name, email FROM users WHERE email = ?", (email,)).fetchone()

        # Initialize topic stats for all topics
        topics = ["DSA & Algorithms", "CS Fundamentals", "Aptitude & Reasoning", "Core CS (OOP)"]
        for topic in topics:
            conn.execute(
                "INSERT OR IGNORE INTO user_topic_stats (user_id, topic) VALUES (?, ?)",
                (user["id"], topic)
            )
        conn.commit()

        token = create_access_token(identity=str(user["id"]))
        return jsonify({
            "token": token,
            "user": {"id": user["id"], "name": user["name"], "email": user["email"]}
        }), 201
    except Exception as e:
        if "UNIQUE" in str(e):
            return jsonify({"error": "Email already registered"}), 409
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()

    if not user or not bcrypt.checkpw(password.encode(), user["password_hash"].encode()):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token(identity=str(user["id"]))
    return jsonify({
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]}
    })

@auth_bp.route("/me", methods=["GET"])
def me():
    from flask_jwt_extended import jwt_required, get_jwt_identity
    @jwt_required()
    def _inner():
        user_id = get_jwt_identity()
        conn = get_db()
        user = conn.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,)).fetchone()
        conn.close()
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"user": dict(user)})
    return _inner()
