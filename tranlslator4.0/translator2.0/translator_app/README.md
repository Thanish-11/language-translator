# Real-Time Translator (Flask)

## What this project contains
- A small Flask app that uses `googletrans` to translate text.
- Frontend with HTML, CSS and JavaScript that supports:
  - Typing input
  - Voice input (browser Web Speech API)
  - Selecting source/target languages
  - Playing translated text via browser Text-to-Speech
  - Saving and viewing translation history using SQLite

## Run locally (recommended: use a virtual environment)
1. Python 3.8+ installed.
2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # mac / linux
   .\.venv\Scripts\activate  # windows (PowerShell)
   ```
3. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```
4. Run app:
   ```bash
   python app.py
   ```
5. Open http://127.0.0.1:5000 in your browser.

## Notes & Caveats
- `googletrans` is a community library that may occasionally break due to changes in the underlying Google Translate service. For stable production use, consider a paid API (Google Cloud Translation or DeepL).
- Voice input uses the browser's Web Speech API — it works best in Chrome/Edge.
- Text-to-Speech uses the browser's `speechSynthesis` — language quality depends on available voices.
