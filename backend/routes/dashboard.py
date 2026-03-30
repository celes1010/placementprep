from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/overview", methods=["GET"])
@jwt_required()
def overview():
    user_id = int(get_jwt_identity())
    conn = get_db()

    # Topic stats
    topic_stats = conn.execute(
        "SELECT * FROM user_topic_stats WHERE user_id = ?", (user_id,)
    ).fetchall()

    # Recent sessions (last 10)
    recent_sessions = conn.execute(
        """SELECT * FROM sessions WHERE user_id = ? AND ended_at IS NOT NULL
           ORDER BY started_at DESC LIMIT 10""",
        (user_id,)
    ).fetchall()

    # Total stats
    totals = conn.execute(
        """SELECT 
             COUNT(*) as total_questions,
             SUM(is_correct) as total_correct,
             COUNT(DISTINCT session_id) as total_sessions
           FROM question_attempts WHERE user_id = ?""",
        (user_id,)
    ).fetchone()

    conn.close()

    topics_data = []
    for ts in topic_stats:
        accuracy = round(ts["total_correct"] / max(ts["total_attempted"], 1) * 100, 1)
        topics_data.append({
            "topic": ts["topic"],
            "difficulty": ts["current_difficulty"],
            "total_attempted": ts["total_attempted"],
            "total_correct": ts["total_correct"],
            "accuracy": accuracy,
            "best_streak": ts["best_streak"],
            "current_streak": ts["current_streak"]
        })

    sessions_data = [dict(s) for s in recent_sessions]

    return jsonify({
        "topics": topics_data,
        "recent_sessions": sessions_data,
        "totals": {
            "total_questions": totals["total_questions"] or 0,
            "total_correct": totals["total_correct"] or 0,
            "total_sessions": totals["total_sessions"] or 0,
            "overall_accuracy": round((totals["total_correct"] or 0) / max(totals["total_questions"] or 1, 1) * 100, 1)
        }
    })


@dashboard_bp.route("/topic/<topic_name>", methods=["GET"])
@jwt_required()
def topic_detail(topic_name):
    user_id = int(get_jwt_identity())
    conn = get_db()

    # Last 20 attempts for this topic
    attempts = conn.execute(
        """SELECT difficulty, is_correct, time_taken_seconds, attempted_at
           FROM question_attempts
           WHERE user_id = ? AND topic = ?
           ORDER BY attempted_at DESC LIMIT 20""",
        (user_id, topic_name)
    ).fetchall()

    conn.close()
    return jsonify({"attempts": [dict(a) for a in attempts]})
