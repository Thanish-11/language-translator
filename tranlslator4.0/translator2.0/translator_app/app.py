import os
import sqlite3
import uuid
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory, url_for
from deep_translator import GoogleTranslator
from gtts import gTTS

# ----- Config -----
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "translations.db")
AUDIO_DIR = os.path.join(BASE_DIR, "static", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

app = Flask(__name__, static_folder="static", template_folder="templates")


# ----- DB helpers -----
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS translations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_text TEXT,
            translated_text TEXT,
            source_lang TEXT,
            target_lang TEXT,
            audio_file TEXT,
            created_at TEXT
        )
        """
    )
    conn.commit()
    conn.close()


def save_translation(source_text, translated_text, src_lang, tgt_lang, audio_file):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "INSERT INTO translations (source_text, translated_text, source_lang, target_lang, audio_file, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (source_text, translated_text, src_lang, tgt_lang, audio_file, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()


def get_history(limit=50):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, source_text, translated_text, source_lang, target_lang, audio_file, created_at FROM translations ORDER BY id DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    history = [
        {
            "id": r[0],
            "source_text": r[1],
            "translated_text": r[2],
            "source_lang": r[3],
            "target_lang": r[4],
            "audio_file": r[5],
            "created_at": r[6],
        }
        for r in rows
    ]
    return history


# ----- Routes -----
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/translate", methods=["POST"])
def translate():
    data = request.get_json(force=True)
    text = data.get("text", "").strip()
    src_lang = data.get("src_lang", "auto")
    tgt_lang = data.get("tgt_lang", "en")

    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        translated = GoogleTranslator(source=src_lang, target=tgt_lang).translate(text)
    except Exception as e:
        # fallback to error message
        translated = f"[Translation error: {str(e)}]"

    # create unique filename for audio
    uid = uuid.uuid4().hex
    filename = f"translated_{uid}.mp3"
    filepath = os.path.join(AUDIO_DIR, filename)

    try:
        # gTTS supports many language codes supported by Google TTS — pass tgt_lang
        tts = gTTS(text=translated, lang=tgt_lang if tgt_lang != "auto" else "en")
        tts.save(filepath)
        audio_url = url_for("static", filename=f"audio/{filename}")
    except Exception as e:
        audio_url = None

    # save history
    try:
        save_translation(text, translated, src_lang, tgt_lang, filename if audio_url else None)
    except Exception:
        pass

    return jsonify({"translated_text": translated, "audio_url": audio_url})


@app.route("/history", methods=["GET"])
def history_route():
    history = get_history(limit=100)
    return jsonify({"history": history})


# Optional route to download audio by filename (served by static normally)
@app.route("/audio/<path:fname>")
def audio_file(fname):
    return send_from_directory(AUDIO_DIR, fname)


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
