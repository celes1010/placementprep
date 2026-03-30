from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
from database import get_db
import os

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/login", methods=["POST"])
def admin_login():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if (username != os.getenv("ADMIN_USERNAME") or
            password != os.getenv("ADMIN_PASSWORD")):
        return jsonify({"error": "Invalid admin credentials"}), 401

    token = create_access_token(identity="admin")
    return jsonify({"token": token, "role": "admin"})


@admin_bp.route("/users", methods=["GET"])
@jwt_required()
def get_all_users():
    if get_jwt_identity() != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    conn = get_db()

    users = conn.execute(
        "SELECT id, name, email, created_at FROM users ORDER BY created_at DESC"
    ).fetchall()

    result = []
    for u in users:
        # Per-topic stats for this user
        stats = conn.execute(
            "SELECT * FROM user_topic_stats WHERE user_id = ?", (u["id"],)
        ).fetchall()

        # Overall totals
        totals = conn.execute(
            """SELECT COUNT(*) as total_q, SUM(is_correct) as total_c
               FROM question_attempts WHERE user_id = ?""",
            (u["id"],)
        ).fetchone()

        total_q = totals["total_q"] or 0
        total_c = totals["total_c"] or 0

        result.append({
            "id": u["id"],
            "name": u["name"],
            "email": u["email"],
            "joined": u["created_at"],
            "total_questions": total_q,
            "total_correct": total_c,
            "overall_accuracy": round(total_c / max(total_q, 1) * 100, 1),
            "topics": [dict(s) for s in stats]
        })

    conn.close()
    return jsonify({"users": result})


@admin_bp.route("/stats", methods=["GET"])
@jwt_required()
def overall_stats():
    if get_jwt_identity() != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    conn = get_db()

    total_users = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
    total_sessions = conn.execute("SELECT COUNT(*) as c FROM sessions").fetchone()["c"]
    total_questions = conn.execute("SELECT COUNT(*) as c FROM question_attempts").fetchone()["c"]
    total_correct = conn.execute(
        "SELECT SUM(is_correct) as c FROM question_attempts"
    ).fetchone()["c"] or 0

    # Questions per topic
    topic_breakdown = conn.execute(
        """SELECT topic, COUNT(*) as attempts, SUM(is_correct) as correct
           FROM question_attempts GROUP BY topic"""
    ).fetchall()

    conn.close()
    return jsonify({
        "total_users": total_users,
        "total_sessions": total_sessions,
        "total_questions": total_questions,
        "total_correct": total_correct,
        "overall_accuracy": round(total_correct / max(total_questions, 1) * 100, 1),
        "topic_breakdown": [dict(t) for t in topic_breakdown]
    })