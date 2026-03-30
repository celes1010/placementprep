from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db
from groq import Groq
import json
import os

quiz_bp = Blueprint("quiz", __name__)

DIFFICULTY_LEVELS = ["easy", "medium", "hard"]

PROMOTE_STREAK = 3
DEMOTE_STREAK = 2

TOPIC_DESCRIPTIONS = {
    "DSA & Algorithms": "Data Structures (arrays, linked lists, trees, graphs, heaps, hash maps) and Algorithms (sorting, searching, dynamic programming, greedy, recursion, time/space complexity)",
    "CS Fundamentals": "Operating Systems (processes, threads, scheduling, memory management, deadlocks), Database Management Systems (SQL, normalization, transactions, indexing), Computer Networks (OSI model, TCP/IP, HTTP, DNS, routing)",
    "Aptitude & Reasoning": "Quantitative aptitude (percentages, profit/loss, time-speed-distance, permutations, probability), Logical reasoning (syllogisms, puzzles, coding-decoding, blood relations, series)",
    "Core CS (OOP)": "Object Oriented Programming (classes, objects, inheritance, polymorphism, encapsulation, abstraction), Design patterns, SOLID principles, C++/Java/Python OOP concepts"
}

def generate_question(topic: str, difficulty: str, recent_questions: list) -> dict:
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    recent_q_text = ""
    if recent_questions:
        recent_q_text = "\n\nIMPORTANT: Do NOT repeat any of these recently asked questions:\n" + "\n".join(f"- {q}" for q in recent_questions[-5:])

    prompt = f"""Generate a unique {difficulty}-level multiple choice question for placement/technical interview preparation.

Topic: {topic}
Topic scope: {TOPIC_DESCRIPTIONS.get(topic, topic)}
Difficulty: {difficulty}
- easy: basic concepts, definitions, simple applications
- medium: multi-step reasoning, moderate application
- hard: tricky edge cases, complex problems, deep understanding required
{recent_q_text}

Return ONLY valid JSON with this exact structure, no markdown, no extra text:
{{
  "question": "The full question text",
  "options": {{
    "A": "First option",
    "B": "Second option",
    "C": "Third option",
    "D": "Fourth option"
  }},
  "correct": "A",
  "explanation": "Clear explanation of why the answer is correct and why others are wrong (2-3 sentences)"
}}

Make the question genuinely useful for placement interviews. Make wrong options plausible, not obviously wrong."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You are a placement interview question generator. Always respond with valid JSON only. No markdown, no code blocks, no extra text."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        max_tokens=1000,
        temperature=0.9,
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown code fences if model adds them anyway
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    return json.loads(raw)


@quiz_bp.route("/start", methods=["POST"])
@jwt_required()
def start_session():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    topic = data.get("topic")

    if topic not in TOPIC_DESCRIPTIONS:
        return jsonify({"error": "Invalid topic"}), 400

    conn = get_db()
    stats = conn.execute(
        "SELECT * FROM user_topic_stats WHERE user_id = ? AND topic = ?",
        (user_id, topic)
    ).fetchone()

    if not stats:
        conn.execute(
            "INSERT OR IGNORE INTO user_topic_stats (user_id, topic) VALUES (?, ?)",
            (user_id, topic)
        )
        conn.commit()
        current_difficulty = "easy"
        current_streak = 0
    else:
        current_difficulty = stats["current_difficulty"]
        current_streak = stats["current_streak"]

    cur = conn.execute(
        "INSERT INTO sessions (user_id, topic, difficulty) VALUES (?, ?, ?)",
        (user_id, topic, current_difficulty)
    )
    session_id = cur.lastrowid
    conn.commit()
    conn.close()

    return jsonify({
        "session_id": session_id,
        "topic": topic,
        "difficulty": current_difficulty,
        "streak": current_streak
    })


@quiz_bp.route("/question", methods=["POST"])
@jwt_required()
def get_question():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    session_id = data.get("session_id")
    topic = data.get("topic")

    conn = get_db()
    stats = conn.execute(
        "SELECT * FROM user_topic_stats WHERE user_id = ? AND topic = ?",
        (user_id, topic)
    ).fetchone()
    current_difficulty = stats["current_difficulty"] if stats else "easy"

    recent = conn.execute(
        """SELECT question_text FROM question_attempts
           WHERE user_id = ? AND topic = ?
           ORDER BY attempted_at DESC LIMIT 5""",
        (user_id, topic)
    ).fetchall()
    recent_questions = [r["question_text"] for r in recent]
    conn.close()

    try:
        q = generate_question(topic, current_difficulty, recent_questions)
    except Exception as e:
        return jsonify({"error": f"Question generation failed: {str(e)}"}), 500

    return jsonify({
        "question": q["question"],
        "options": q["options"],
        "difficulty": current_difficulty,
        "_meta": {
            "correct": q["correct"],
            "explanation": q["explanation"]
        }
    })


@quiz_bp.route("/answer", methods=["POST"])
@jwt_required()
def submit_answer():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    session_id = data.get("session_id")
    topic = data.get("topic")
    question_text = data.get("question_text")
    correct_option = data.get("correct_option")
    selected_option = data.get("selected_option")
    explanation = data.get("explanation")
    time_taken = data.get("time_taken_seconds", 0)
    difficulty = data.get("difficulty")

    is_correct = selected_option == correct_option

    conn = get_db()

    conn.execute(
        """INSERT INTO question_attempts
           (session_id, user_id, topic, difficulty, question_text, correct_option, selected_option, is_correct, time_taken_seconds)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (session_id, user_id, topic, difficulty, question_text, correct_option, selected_option, int(is_correct), time_taken)
    )

    conn.execute(
        """UPDATE sessions SET
           total_questions = total_questions + 1,
           correct_answers = correct_answers + ?
           WHERE id = ?""",
        (int(is_correct), session_id)
    )

    stats = conn.execute(
        "SELECT * FROM user_topic_stats WHERE user_id = ? AND topic = ?",
        (user_id, topic)
    ).fetchone()

    current_difficulty = stats["current_difficulty"] if stats else "easy"
    current_streak = stats["current_streak"] if stats else 0
    best_streak = stats["best_streak"] if stats else 0

    new_streak = 0
    new_difficulty = current_difficulty
    difficulty_changed = False
    direction = None

    if is_correct:
        new_streak = current_streak + 1 if current_streak >= 0 else 1
        if new_streak >= PROMOTE_STREAK:
            diff_idx = DIFFICULTY_LEVELS.index(current_difficulty)
            if diff_idx < len(DIFFICULTY_LEVELS) - 1:
                new_difficulty = DIFFICULTY_LEVELS[diff_idx + 1]
                new_streak = 0
                difficulty_changed = True
                direction = "up"
    else:
        new_streak = current_streak - 1 if current_streak <= 0 else -1
        if abs(new_streak) >= DEMOTE_STREAK:
            diff_idx = DIFFICULTY_LEVELS.index(current_difficulty)
            if diff_idx > 0:
                new_difficulty = DIFFICULTY_LEVELS[diff_idx - 1]
                new_streak = 0
                difficulty_changed = True
                direction = "down"

    new_best = max(best_streak, new_streak) if new_streak > 0 else best_streak

    conn.execute(
        """UPDATE user_topic_stats SET
           current_difficulty = ?,
           total_attempted = total_attempted + 1,
           total_correct = total_correct + ?,
           current_streak = ?,
           best_streak = ?,
           last_updated = CURRENT_TIMESTAMP
           WHERE user_id = ? AND topic = ?""",
        (new_difficulty, int(is_correct), new_streak, new_best, user_id, topic)
    )

    conn.commit()
    conn.close()

    return jsonify({
        "is_correct": is_correct,
        "correct_option": correct_option,
        "explanation": explanation,
        "difficulty": new_difficulty,
        "difficulty_changed": difficulty_changed,
        "difficulty_direction": direction,
        "streak": new_streak
    })


@quiz_bp.route("/end", methods=["POST"])
@jwt_required()
def end_session():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    session_id = data.get("session_id")

    conn = get_db()
    conn.execute(
        "UPDATE sessions SET ended_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
        (session_id, user_id)
    )
    session = conn.execute(
        "SELECT * FROM sessions WHERE id = ?", (session_id,)
    ).fetchone()
    conn.commit()
    conn.close()

    return jsonify({
        "total_questions": session["total_questions"],
        "correct_answers": session["correct_answers"],
        "accuracy": round(session["correct_answers"] / max(session["total_questions"], 1) * 100, 1)
    })
