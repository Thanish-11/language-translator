/* GlassTranslate client script
 - handles translate request
 - controls audio (speed & volume)
 - speech recognition (browser Web Speech API)
 - loads history
*/

const inputText = document.getElementById("inputText");
const translateBtn = document.getElementById("translateBtn");
const outputText = document.getElementById("outputText");
const playBtn = document.getElementById("playBtn");
const speedRange = document.getElementById("speedRange");
const volumeRange = document.getElementById("volumeRange");
const downloadBtn = document.getElementById("downloadBtn");
const playerTitle = document.getElementById("playerTitle");
const playerLang = document.getElementById("playerLang");

const micBtn = document.getElementById("micBtn");
const clearBtn = document.getElementById("clearBtn");
const srcLang = document.getElementById("srcLang");
const tgtLang = document.getElementById("tgtLang");

const btnHistory = document.getElementById("btn-history");
const historyPanel = document.getElementById("historyPanel");
const historyTable = document.getElementById("historyTable");
const closeHistory = document.getElementById("closeHistory");

let audio = new Audio();
let currentAudioUrl = null;
let isPlaying = false;

// Translate (AJAX)
async function doTranslate() {
  const text = inputText.value.trim();
  if (!text) {
    outputText.innerText = "Please type or speak something to translate.";
    return;
  }

  translateBtn.disabled = true;
  translateBtn.innerText = "Translating...";

  try {
    const res = await fetch("/translate", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        text,
        src_lang: srcLang.value,
        tgt_lang: tgtLang.value
      })
    });
    const data = await res.json();
    if (data.error) {
      outputText.innerText = data.error;
    } else {
      outputText.innerText = data.translated_text;
      playerTitle.innerText = data.translated_text.length > 40 ? data.translated_text.slice(0, 40) + "…" : data.translated_text;
      playerLang.innerText = `Lang: ${tgtLang.value}`;
      if (data.audio_url) {
        // audio_url is path like /static/audio/filename
        currentAudioUrl = data.audio_url;
        audio.src = currentAudioUrl;
        audio.load();
        downloadBtn.disabled = false;
        downloadBtn.onclick = () => {
          const link = document.createElement("a");
          link.href = currentAudioUrl;
          link.download = "translated_audio.mp3";
          link.click();
        };
      } else {
        currentAudioUrl = null;
        audio.src = "";
        downloadBtn.disabled = true;
      }
      // refresh history to show the new record
      loadHistory();
    }
  } catch (err) {
    console.error(err);
    outputText.innerText = "Network error while translating.";
  } finally {
    translateBtn.disabled = false;
    translateBtn.innerText = "Translate";
  }
}

// play/pause toggler
playBtn.addEventListener("click", () => {
  if (!audio.src) { return; }
  if (!isPlaying) {
    audio.play();
  } else {
    audio.pause();
  }
});

// update isPlaying state
audio.addEventListener("play", () => {
  isPlaying = true;
  playBtn.innerText = "⏸️";
});
audio.addEventListener("pause", () => {
  isPlaying = false;
  playBtn.innerText = "▶️";
});
audio.addEventListener("ended", () => {
  isPlaying = false;
  playBtn.innerText = "▶️";
});

// speed and volume controls
speedRange.addEventListener("input", () => {
  const v = parseFloat(speedRange.value);
  audio.playbackRate = v;
});
volumeRange.addEventListener("input", () => {
  const v = parseFloat(volumeRange.value);
  audio.volume = v;
});

// Speech recognition (browser)
let recognition = null;
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new Rec();
  recognition.lang = "en-US"; // you could change this or make UI to set it
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (ev) => {
    const spoken = ev.results[0][0].transcript;
    if (inputText.value && !inputText.value.endsWith(" ")) inputText.value += " ";
    inputText.value += spoken;
  };
  recognition.onerror = (ev) => {
    console.warn("Speech error", ev);
  };
} else {
  micBtn.disabled = true;
  micBtn.title = "Speech recognition not supported in this browser";
}

micBtn.addEventListener("click", () => {
  if (!recognition) return;
  try { recognition.start(); } catch (e) { console.warn(e); }
});

clearBtn.addEventListener("click", () => { inputText.value = ""; outputText.innerText = "Your translated text will appear here..."; });

// history panel
btnHistory.addEventListener("click", () => {
  historyPanel.classList.toggle("hidden");
  loadHistory();
});
closeHistory?.addEventListener("click", () => historyPanel.classList.add("hidden"));

async function loadHistory() {
  historyTable.innerHTML = "Loading history...";
  try {
    const res = await fetch("/history");
    const data = await res.json();
    historyTable.innerHTML = "";
    if (!data.history || data.history.length === 0) {
      historyTable.innerText = "No history yet.";
      return;
    }
    data.history.forEach(h => {
      const div = document.createElement("div");
      div.className = "hist-row";
      div.innerHTML = `<div><strong>${h.source_text.length>60 ? h.source_text.slice(0,60)+'…' : h.source_text}</strong></div>
                       <div style="margin-top:6px">${h.translated_text.length>120 ? h.translated_text.slice(0,120)+'…' : h.translated_text}</div>
                       <div class="small muted" style="margin-top:8px">${(new Date(h.created_at)).toLocaleString()} · ${h.source_lang} → ${h.target_lang} 
                       ${h.audio_file ? ` · <a href="/static/audio/${h.audio_file}" target="_blank" rel="noopener">listen</a>` : ''}</div>`;
      historyTable.appendChild(div);
    });
  } catch (e) {
    historyTable.innerText = "Could not load history.";
  }
}

// wire translate button
translateBtn.addEventListener("click", doTranslate);

// initial load
loadHistory();
