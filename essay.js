/* OSSLT Opinion Essay Practice, application logic.
   Ported from the CELPIP-General simulator's writing.js pattern: a real
   countdown timer paired with a plain textarea and a live word counter.
   There is no way for a website to grade a written essay, so after the
   timer ends (or the student taps Finish) this reveals a model essay plus
   a reminder of what the real EQAO rubrics reward, for self-comparison
   only -- never an automated score. */

const ESSAY_SECONDS = 30 * 60; // ~30 min, matching Session B's real overall
                                // pacing; EQAO does not publish an official
                                // sub-time for the essay task alone.
const ESSAY_SOFT_MIN = 150;
const ESSAY_SOFT_MAX = 450;

let esCurrent = null;
let esTimerInterval = null;
let esRemaining = 0;
let esRunning = false;
let esTimeUp = false;
let esLeaveGuardBound = false;

function essayWordCount(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function pickRandomEssayPrompt() {
  const prompts = window.ESSAY_PROMPTS || [];
  if (!prompts.length) return null;
  return prompts[Math.floor(Math.random() * prompts.length)];
}

// ── menu ─────────────────────────────────────────────────────────────────────
function initEssayMenu() {
  document.getElementById("essay-menu").style.display = "flex";
  document.getElementById("essay-play").style.display = "none";

  const wrap = document.getElementById("essay-prompt-preview");
  wrap.innerHTML = "";
  const btn = document.createElement("button");
  btn.className = "station-card";
  btn.innerHTML =
    `<span class="station-card-section">Opinion Essay</span>` +
    `<span class="station-card-title">Start a Random Prompt</span>` +
    `<span class="station-card-meta">About 30 minutes, one of ${(window.ESSAY_PROMPTS || []).length} real OSSLT-style prompts</span>`;
  btn.addEventListener("click", () => {
    const p = pickRandomEssayPrompt();
    if (p) startEssayTask(p);
  });
  wrap.appendChild(btn);

  document.getElementById("essay-menu-back").onclick = () => {
    document.getElementById("essay-menu").style.display = "none";
    document.getElementById("mode-select").style.display = "flex";
  };
}

function bindEssayLeaveGuardOnce() {
  if (esLeaveGuardBound) return;
  esLeaveGuardBound = true;
  window.addEventListener("beforeunload", (e) => {
    if (esRunning) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}

// ── play ─────────────────────────────────────────────────────────────────────
function startEssayTask(prompt) {
  bindEssayLeaveGuardOnce();
  esCurrent = prompt;
  esRunning = false;
  esTimeUp = false;
  stopEssayTimer();
  esRemaining = ESSAY_SECONDS;

  document.getElementById("essay-menu").style.display = "none";
  document.getElementById("essay-play").style.display = "flex";
  document.getElementById("essay-instructions").textContent =
    "You have about 30 minutes. Tap Start Timer when you are ready to begin the real countdown clock, "
    + "just like Session B of the real test.";
  document.getElementById("essay-prompt-box").innerHTML =
    `<p>${escapeHTML(prompt.prompt || "")}</p>`;

  const textarea = document.getElementById("essay-textarea");
  textarea.value = "";
  textarea.disabled = true;
  textarea.oninput = updateEssayWordCounter;
  updateEssayWordCounter();
  updateEssayTimerDisplay();

  document.getElementById("essay-timesup-note").style.display = "none";
  document.getElementById("essay-compare-wrap").style.display = "none";
  const startBtn = document.getElementById("essay-start-btn");
  const finishBtn = document.getElementById("essay-finish-btn");
  startBtn.style.display = "block";
  startBtn.disabled = false;
  startBtn.textContent = "Start Timer";
  finishBtn.style.display = "none";

  startBtn.onclick = beginEssayTimer;
  finishBtn.onclick = finishEssay;

  document.getElementById("essay-back").onclick = () => {
    if (esRunning && !confirm("Leave this essay? Your timer will stop and your writing will not be saved.")) {
      return;
    }
    stopEssayTimer();
    esRunning = false;
    document.getElementById("essay-play").style.display = "none";
    initEssayMenu();
  };
}

function updateEssayWordCounter() {
  const text = document.getElementById("essay-textarea").value;
  const count = essayWordCount(text);
  const countEl = document.getElementById("essay-word-count");
  countEl.textContent = `${count} word${count === 1 ? "" : "s"}`;
  countEl.classList.remove("wc-ok", "wc-warn");
  countEl.classList.add(count >= ESSAY_SOFT_MIN && count <= ESSAY_SOFT_MAX ? "wc-ok" : "wc-warn");
}

function beginEssayTimer() {
  const startBtn = document.getElementById("essay-start-btn");
  startBtn.disabled = true;
  startBtn.style.display = "none";
  document.getElementById("essay-finish-btn").style.display = "block";
  document.getElementById("essay-textarea").disabled = false;
  document.getElementById("essay-textarea").focus();
  esRunning = true;
  esRemaining = ESSAY_SECONDS;
  updateEssayTimerDisplay();
  esTimerInterval = setInterval(essayTick, 1000);
}

function essayTick() {
  esRemaining--;
  if (esRemaining <= 0) {
    esRemaining = 0;
    updateEssayTimerDisplay();
    stopEssayTimer();
    // Time running out does not force-submit or lock the textarea -- this is
    // honest self-practice, not a proctored sitting, so the student keeps
    // full control and simply sees a clear "time's up" indicator instead.
    esTimeUp = true;
    esRunning = false;
    document.getElementById("essay-timesup-note").style.display = "block";
    return;
  }
  updateEssayTimerDisplay();
}

function updateEssayTimerDisplay() {
  const m = Math.floor(esRemaining / 60);
  const s = esRemaining % 60;
  document.getElementById("essay-timer-display").textContent = `${m}:${String(s).padStart(2, "0")}`;
}

function stopEssayTimer() {
  if (esTimerInterval) { clearInterval(esTimerInterval); esTimerInterval = null; }
}

function finishEssay() {
  stopEssayTimer();
  esRunning = false;
  const textarea = document.getElementById("essay-textarea");
  const finalText = textarea.value;
  textarea.disabled = true;
  document.getElementById("essay-finish-btn").style.display = "none";
  document.getElementById("essay-timesup-note").style.display = "none";
  document.getElementById("essay-instructions").textContent =
    "Compare what you wrote to the model essay and the rubric reminder below.";

  const compareWrap = document.getElementById("essay-compare-wrap");
  compareWrap.style.display = "block";
  document.getElementById("essay-final-word-count").textContent = essayWordCount(finalText);
  document.getElementById("essay-your-response").textContent = finalText || "(You did not write a response.)";
  document.getElementById("essay-model-answer").textContent = esCurrent ? (esCurrent.model_essay_strong || "") : "";

  document.getElementById("essay-next-btn").onclick = () => {
    document.getElementById("essay-play").style.display = "none";
    initEssayMenu();
  };
}
