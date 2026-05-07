// =============================================
//  TAHADY - Daily Challenge App
//  Main App Logic
// =============================================

// ---- CONSTANTS ----
// استبدل هذه القيم ببيانات مشروعك من Supabase لاحقاً
const SUPABASE_URL = 'https://your-project-id.supabase.co'; // الرابط الخاص بك هنا
const SUPABASE_KEY = 'your-anon-key-here'; // المفتاح الخاص بك هنا

let supabaseClient = null;
if (typeof supabase !== 'undefined' && !SUPABASE_URL.includes('your-project-id')) {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ---- AUDIO FEEDBACK ----
const sounds = {
  click: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'),
  success: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'),
  levelUp: new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'),
  timerEnd: new Audio('https://assets.mixkit.co/active_storage/sfx/1003/1003-preview.mp3')
};

const LEVELS = [
  { name: "مبتدئ ⭐",       min: 0 },
  { name: "متحمّس 🔥",      min: 100 },
  { name: "مجتهد 💪",      min: 250 },
  { name: "محترف 🏅",      min: 500 },
  { name: "بطل 🏆",        min: 1000 },
  { name: "أسطورة 👑",     min: 2000 },
  { name: "خارق 🌟",       min: 5000 },
  { name: "عنتيل🌟",       min: 10000 },
];

const DEFAULT_GOALS = [
  { id: "study",   icon: "📚", name: "مذاكرة",              desc: "ادرس مادة مهمة",                   points: 20, category: "مذاكرة", duration: "30 دقيقة" },
  { id: "sport",   icon: "🏃", name: "رياضة",              desc: "نشاط بدني لرفع اللياقة",            points: 40, category: "رياضة", duration: "20 دقيقة" },
  { id: "read",    icon: "📖", name: "قراءة",               desc: "من أي كتاب مفيد",                   points: 20, category: "قراءة", duration: "10 صفحات" },
  { id: "noPhone", icon: "📵", name: "بعيد عن الموبايل",     desc: "وقت مستقطع بدون شاشات",            points: 30, category: "تطوير ذات", duration: "1 ساعة" },
  { id: "water",   icon: "💧", name: "شرب الماء",           desc: "حافظ على ترطيب جسمك",               points: 15, category: "صحة", duration: "8 أكواب" },
];

function playSound(name) {
  try {
    if (sounds[name]) {
      sounds[name].currentTime = 0;
      sounds[name].play().catch(() => {}); // التجاهل إذا منعه المتصفح
    }
  } catch (e) {}
}

// ---- STATE ----
let state = loadState();
let activeTimers = {}; // لتتبع العدادات الجارية

function loadState() {
  try {
    const saved = localStorage.getItem("tahady_state");
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return {
    username: null,
    totalPoints: 0,
    streak: 0,
    lastActiveDate: null,
    level: 1,
    totalDone: 0,
    dailyGoals: [],
    todayDate: null,
    profileImageUrl: null, // Added for profile image
    groupName: null, // Added for user groups
  };
}

function saveState() {
  localStorage.setItem("tahady_state", JSON.stringify(state));
  syncLeaderboard();
}

// ---- LEADERBOARD (Sync with Cloud Database) ----
async function syncLeaderboard() {
  if (!state.username) return;
  
  const data = {
    name: state.username,
    points: state.totalPoints,
    streak: state.streak,
    level: state.level,
    last_active: new Date().toISOString(),
    profile_image_url: state.profileImageUrl, // Added profile image URL
    group_name: state.groupName, // Added group name
  };

  if (supabaseClient) {
    await supabaseClient.from('leaderboard').upsert(data, { onConflict: 'name' });
  }
}

let currentLeaderboardFilter = null; // To keep track of the current filter

async function getLeaderboard(filterGroup = null) {
  if (!supabaseClient) return [];
  
  let query = supabaseClient
    .from('leaderboard')
    .select('*')
    .order('points', { ascending: false });
    
  if (filterGroup) {
    query = query.eq('group_name', filterGroup);
  }
  const { data, error } = await query;
  return data || [];
}

// ---- INIT ----
function startApp() {
  const name = document.getElementById("username-input").value.trim();
  if (!name) {
    document.getElementById("username-input").style.borderColor = "#e74c3c";
    document.getElementById("username-input").placeholder = "لازم تكتب اسمك يا بطل!";
    return;
  }
  playSound('click');
  state.username = name;
  initDailyGoals();
  saveState();
  hideSplash();
  initApp();
}

function hideSplash() {
  const splash = document.getElementById("splash-screen");
  splash.style.opacity = "0";
  splash.style.transform = "scale(0.95)";
  setTimeout(() => splash.classList.add("hidden"), 500);
  document.getElementById("app").classList.remove("hidden");
}

function initDailyGoals() {
  const today = getTodayStr();
  if (state.todayDate !== today) {
    // New day! Reset daily goals but keep progress
    updateStreak(today);
    // الاحتفاظ بالتحديات المخصصة وإعادة ضبط حالتها، مع إضافة التحديات الافتراضية
    const customs = (state.dailyGoals || []).filter(g => g.isCustom).map(g => ({ ...g, done: false }));
    state.dailyGoals = [...DEFAULT_GOALS.map(g => ({ ...g, done: false })), ...customs];
    state.todayDate = today;
  }
  if (!state.dailyGoals || state.dailyGoals.length === 0) {
    state.dailyGoals = DEFAULT_GOALS.map(g => ({ ...g, done: false }));
  }
}

function updateStreak(today) {
  if (!state.lastActiveDate) {
    state.streak = 1;
  } else {
    const last = new Date(state.lastActiveDate);
    const curr = new Date(today);
    const diff = Math.floor((curr - last) / (1000 * 60 * 60 * 24));
    if (diff === 1) state.streak = (state.streak || 0) + 1;
    else if (diff > 1) state.streak = 1;
    // diff === 0 means same day, no change
  }
  state.lastActiveDate = today;
}

function getTodayStr() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

function initApp() {
  // Check if already has username
  if (state.username) {
    hideSplash();
  }

  updateHomeUI();
  renderDailyGoals();
  updateLeaderboardUI();
  startCountdown();
  updateProfileUI();
}

// ---- HOME UI ----
function updateHomeUI() {
  const hour = new Date().getHours();
  let greet = "صباح النور";
  if (hour >= 12 && hour < 17) greet = "مساء الخير";
  else if (hour >= 17) greet = "مساء النور";

  document.getElementById("greeting-text").textContent = greet;
  document.getElementById("hero-name").textContent = state.username || "بطل";
  document.getElementById("streak-days").textContent = state.streak || 0;
  document.getElementById("total-points-hero").textContent = state.totalPoints || 0;
  document.getElementById("header-points").textContent = state.totalPoints || 0;

  // Level
  const lvl = getCurrentLevel();
  const nextLvl = LEVELS[lvl.idx + 1];
  const pct = nextLvl
    ? Math.min(100, ((state.totalPoints - lvl.level.min) / (nextLvl.min - lvl.level.min)) * 100)
    : 100;

  document.getElementById("level-badge").textContent = lvl.level.name;
  document.getElementById("current-level").textContent = lvl.idx + 1;
  document.getElementById("xp-bar").style.width = pct + "%";
  document.getElementById("xp-current").textContent = state.totalPoints;
  document.getElementById("xp-next").textContent = nextLvl ? nextLvl.min : "MAX";

  // Summary
  const done = state.dailyGoals.filter(g => g.done).length;
  const pending = state.dailyGoals.filter(g => !g.done).length;
  const todayPts = state.dailyGoals.filter(g => g.done).reduce((s, g) => s + g.points, 0);

  document.getElementById("done-count").textContent = done;
  document.getElementById("pending-count").textContent = pending;
  document.getElementById("today-points").textContent = todayPts;
}

function getCurrentLevel() {
  let idx = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if ((state.totalPoints || 0) >= LEVELS[i].min) { idx = i; break; }
  }
  return { idx, level: LEVELS[idx] };
}

// ---- DAILY GOALS ----
function renderDailyGoals() {
  const container = document.getElementById("daily-goals-list");
  container.innerHTML = "";

  state.dailyGoals.forEach((goal, i) => {
    const div = document.createElement("div");
    div.className = "goal-item" + (goal.done ? " completed" : "");
    div.onclick = () => completeGoal(i);
    div.innerHTML = `
      <div class="goal-check">${goal.done ? "✓" : ""}</div>
      <div class="goal-info">
        <div class="goal-name">${goal.icon} ${goal.name}</div>
        <div class="goal-desc">${goal.desc}</div>
        <div class="goal-duration-tag">
          ${!goal.done ? `<div class="time-control-btn" onclick="adjustTime(event, ${i}, -5)">-</div>` : ''}
          <span onclick="toggleGoalTimer(event, ${i})" style="cursor:pointer">
            ${activeTimers[i] ? '⏹' : '⏱'} 
            <span id="timer-display-${i}">${goal.duration || 'إضافة وقت'}</span>
          </span>
          ${!goal.done ? `<div class="time-control-btn" onclick="adjustTime(event, ${i}, 5)">+</div>` : ''}
          <span onclick="changeGoalDuration(event, ${i})" style="cursor:pointer; margin-right:5px">✏️</span>
        </div>
      </div>
      <div class="goal-points">${goal.done ? "✓" : "+" + goal.points} ⚡</div>
    `;
    container.appendChild(div);
  });
}

function toggleGoalTimer(event, index) {
  event.stopPropagation();
  const goal = state.dailyGoals[index];
  if (goal.done) return;

  if (activeTimers[index]) {
    clearInterval(activeTimers[index]);
    delete activeTimers[index];
    renderDailyGoals();
    return;
  }

  const match = goal.duration.match(/\d+/);
  if (!match) {
    changeGoalDuration(event, index);
    return;
  }

  let seconds = parseInt(match[0]) * 60;
  if (goal.duration.includes("ساعة")) seconds = parseInt(match[0]) * 3600;

  activeTimers[index] = setInterval(() => {
    seconds--;
    if (seconds <= 0) {
      clearInterval(activeTimers[index]);
      delete activeTimers[index];
      playSound('timerEnd');
      completeGoal(index);
    } else {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      const display = document.getElementById(`timer-display-${index}`);
      if (display) display.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }
  }, 1000);

  renderDailyGoals();
}

function adjustTime(event, index, delta) {
  event.stopPropagation();
  const goal = state.dailyGoals[index];
  if (goal.done) return;

  // إيقاف العداد إذا كان يعمل لتجنب التداخل
  if (activeTimers[index]) {
    clearInterval(activeTimers[index]);
    delete activeTimers[index];
  }

  const match = goal.duration.match(/\d+/);
  let currentMins = match ? parseInt(match[0]) : 0;
  if (goal.duration.includes("ساعة") && match) currentMins *= 60;

  let newMins = currentMins + delta;
  if (newMins < 5) newMins = 5; // الحد الأدنى للتحدي 5 دقائق

  state.dailyGoals[index].duration = `${newMins} دقيقة`;
  
  // حسب طلبك: كل 10 دقائق = 3 نقاط. إذن كل 5 دقائق = 1.5 نقطة.
  // سنستخدم Math.round للحصول على نقاط صحيحة معقولة (2 ثم 1 بالتبادل)
  const pointChange = (delta > 0) ? 2 : -2;
  state.dailyGoals[index].points = Math.max(5, state.dailyGoals[index].points + pointChange);

  saveState();
  renderDailyGoals();
  updateHomeUI();
}

function changeGoalDuration(event, index) {
  event.stopPropagation(); // منع إتمام التحدي عند النقر على الوقت
  const goal = state.dailyGoals[index];
  if (goal.done) return;

  const newDuration = prompt("حدد الوقت أو الكمية لهذا التحدي (مثلاً: 45 دقيقة):", goal.duration || "");
  if (newDuration !== null && newDuration.trim() !== "") {
    state.dailyGoals[index].duration = newDuration.trim();
    saveState();
    renderDailyGoals();
  }
}

function completeGoal(index) {
  const goal = state.dailyGoals[index];
  if (goal.done) return;

  const oldLevel = getCurrentLevel().idx;
  goal.done = true;
  state.totalPoints = (state.totalPoints || 0) + goal.points;
  state.totalDone = (state.totalDone || 0) + 1;

  const newLevel = getCurrentLevel().idx;
  if (newLevel > oldLevel) playSound('levelUp'); else playSound('success');

  saveState();
  renderDailyGoals();
  updateHomeUI();
  showCompletionModal(goal);
}

// ---- CUSTOM CHALLENGES ----
function createCustomChallenge() {
  playSound('click');
  const name = prompt("اسم التحدي (مثلاً: تعلم لغة جديدة):");
  if (!name || name.trim() === "") return;

  const icon = prompt("أيقونة التحدي (مثلاً: 🌍):", "✨");
  if (!icon || icon.trim() === "") return;

  const desc = prompt("وصف التحدي (مثلاً: ادرس 30 دقيقة يومياً):");
  if (!desc || desc.trim() === "") return;

  let points = parseInt(prompt("النقاط (مثلاً: 30):", "30"));
  if (isNaN(points) || points < 10) points = 30;

  const category = prompt("الفئة (مثلاً: مذاكرة، رياضة، تطوير ذات):", "تطوير ذات");
  if (!category || category.trim() === "") return;

  const duration = prompt("المدة/الكمية (مثلاً: 30 دقيقة، 10 صفحات):", "30 دقيقة");
  if (!duration || duration.trim() === "") return;

  const id = "custom_" + Date.now();
  const newGoal = {
    id,
    icon: icon.trim(),
    name: name.trim(),
    desc: desc.trim(),
    points,
    category: category.trim(),
    duration: duration.trim(),
    done: false,
    isCustom: true // Mark as custom for potential future features (e.g., editing/deleting)
  };

  state.dailyGoals.push(newGoal);
  saveState();
  renderDailyGoals();
  updateHomeUI();
  alert("تم إضافة التحدي المخصص بنجاح!");
  showPage("home"); // Go back to home page to see the new goal
}

// ---- AI COACH ----
async function getAICoachAdvice() {
  const bubble = document.getElementById("coach-bubble");
  const btn = document.querySelector(".coach-ask-btn");
  
  bubble.classList.remove("hidden");
  bubble.textContent = "جاري تحليل أدائك... 🤔";
  btn.disabled = true;

  const doneCount = state.dailyGoals.filter(g => g.done).length;
  const pendingCount = state.dailyGoals.filter(g => !g.done).length;

  const promptText = `المستخدم اسمه ${state.username}. 
  نقاطه الحالية: ${state.totalPoints}. 
  الـ Streak: ${state.streak}. 
  أنجز اليوم ${doneCount} تحديات ومتبقي له ${pendingCount}.
  أعطه نصيحة محفزة جداً وقصيرة جداً (جملة واحدة) واقترح عليه فئة تحدي (مثل الرياضة أو القراءة) يركز عليها الآن لزيادة مستواه.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-api-key": "YOUR_API_KEY_HERE" // سيحتاج المستخدم لوضع مفتاحه أو استخدامه عبر Netlify
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 200,
        messages: [{ role: "user", content: promptText }]
      })
    });

    const data = await response.json();
    if (data.content && data.content[0]) {
      bubble.textContent = "🤖 " + data.content[0].text;
    } else {
      throw new Error("Invalid response");
    }
  } catch (err) {
    console.error("Coach Error:", err);
    bubble.textContent = "🤖 يا بطل، استمر في التقدم! النقاط اللي جمعتها اليوم ممتازة، كمل التحدي الجاي عشان تقرب من المستوى الأسطوري! 🔥";
  } finally {
    btn.disabled = false;
    // إخفاء الفقاعة بعد 15 ثانية تلقائياً
    setTimeout(() => {
      bubble.classList.add("hidden");
    }, 15000);
  }
}

function showCompletionModal(goal) {
  const emojis = { "مذاكرة": "🧠", "رياضة": "💪", "قراءة": "📖", "صحة": "💧", "تطوير ذات": "📈" };
  const emoji = emojis[goal.category] || "🎉";

  document.getElementById("modal-emoji").textContent = emoji;
  document.getElementById("modal-title").textContent = "رائع يا " + state.username + "!";
  document.getElementById("modal-sub").textContent = 'أنجزت: "' + goal.name + '"';
  document.getElementById("modal-points").textContent = "+" + goal.points + " ⚡";
  document.getElementById("complete-modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("complete-modal").classList.add("hidden");
}

// ---- COUNTDOWN ----
function startCountdown() {
  function update() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight - now;

    const h = Math.floor(diff / 3600000).toString().padStart(2, "0");
    const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, "0");
    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, "0");

    const el = document.getElementById("countdown-timer");
    if (el) el.textContent = `${h}:${m}:${s}`;
  }
  update();
  setInterval(update, 1000);
}

// ---- AI SEARCH ----
async function searchChallenge() {
  const query = document.getElementById("challenge-search").value.trim();
  if (!query) return;
  await runAISearch(query);
}

function quickSearch(query) {
  document.getElementById("challenge-search").value = query;
  runAISearch(query);
  showPage("challenges");
}

async function runAISearch(query) {
  const resultsEl = document.getElementById("search-results");
  document.getElementById("ai-loading").classList.remove("hidden");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `أنت مساعد لتطبيق تحديات يومية.
المستخدم يبحث عن: "${query}"

أنشئ 3 تحديات يومية مناسبة لهذا البحث.
لكل تحدٍّ حدد:
- الاسم (مختصر 3-6 كلمات)
- الأيقونة (emoji واحدة)
- الوصف (جملة أو جملتين عملية)
- النقاط من 10 إلى 100 حسب الأهمية والصعوبة:
  * صحة/رياضة: 40-80 نقطة (أهمية عالية)
  * مذاكرة/تعلّم: 30-60 نقطة
  * إبداع/ترفيه: 15-35 نقطة
  * تواصل اجتماعي: 10-25 نقطة
- فئة: واحدة من [مذاكرة، رياضة، إبداع، صحة، تطوير ذات، تواصل]
- الوقت المقدر: مثل "30 دقيقة"
- الصعوبة: سهل / متوسط / صعب

رد فقط بـ JSON بدون أي نص قبله أو بعده:
{
  "challenges": [
    {
      "name": "...",
      "icon": "...",
      "desc": "...",
      "points": 30,
      "category": "...",
      "duration": "...",
      "difficulty": "..."
    }
  ]
}`
        }]
      })
    });

    const data = await response.json();
    let text = data.content.map(c => c.text || "").join("");
    text = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);

    renderSearchResults(resultsEl, parsed.challenges, query);
  } catch (err) {
    resultsEl.innerHTML = `
      <div class="search-placeholder">
        <div class="placeholder-icon">😕</div>
        <p>حصل خطأ. تأكد من اتصالك بالإنترنت وحاول تاني.</p>
      </div>
    `;
    console.error("AI Error:", err);
  } finally {
    document.getElementById("ai-loading").classList.add("hidden");
  }
}

function renderSearchResults(container, challenges, query) {
  if (!challenges || challenges.length === 0) {
    container.innerHTML = `<div class="search-placeholder"><div class="placeholder-icon">🤷</div><p>ما لقيناش نتائج لـ "${query}"</p></div>`;
    return;
  }

  container.innerHTML = `<div class="section-title" style="margin-top:0">✨ نتائج البحث عن "${query}"</div>`;

  challenges.forEach(c => {
    const pts = c.points || 20;
    const bonusClass = pts >= 60 ? "bonus-high" : pts >= 35 ? "bonus-mid" : "bonus-low";

    const card = document.createElement("div");
    card.className = "challenge-result-card";
    card.innerHTML = `
      <div class="result-top">
        <div class="result-name">${c.icon} ${c.name}</div>
        <div class="result-bonus ${bonusClass}">+${pts} ⚡</div>
      </div>
      <div class="result-desc">${c.desc}</div>
      <div class="result-meta">
        <span class="result-tag">📂 ${c.category}</span>
        <span class="result-tag">⏱ ${c.duration}</span>
        <span class="result-tag">${c.difficulty === "سهل" ? "🟢" : c.difficulty === "متوسط" ? "🟡" : "🔴"} ${c.difficulty}</span>
      </div>
      <button class="add-challenge-btn" onclick="addChallengeToGoals(this, ${JSON.stringify(c).replace(/"/g, "&quot;")})">
        ➕ أضف لأهدافي اليومية
      </button>
    `;
    container.appendChild(card);
  });
}

function addChallengeToGoals(btn, challenge) {
  const id = "custom_" + Date.now();
  const newGoal = {
    id,
    icon: challenge.icon,
    name: challenge.name,
    desc: challenge.desc,
    points: challenge.points,
    category: challenge.category,
    duration: challenge.duration,
    done: false,
  };

  state.dailyGoals.push(newGoal);
  saveState();
  renderDailyGoals();
  updateHomeUI();

  btn.textContent = "✅ تمت الإضافة!";
  btn.disabled = true;

  setTimeout(() => showPage("home"), 800);
}

// ---- LEADERBOARD UI ----
async function updateLeaderboardUI() {
  const entries = await getLeaderboard();
  const list = document.getElementById("leaderboard-list");
  list.innerHTML = "";

  const medals = ["🥇", "🥈", "🥉"];

  entries.forEach((e, i) => {
    const isMe = e.name === state.username;
    const card = document.createElement("div");
    card.className = "leaderboard-card" + (isMe ? " my-rank-card" : "");
    card.innerHTML = `
      <div class="rank-position">${medals[i] || (i + 1)}</div>
      <div class="rank-info">
        <div class="rank-name">${e.name}${isMe ? " (أنت)" : ""}</div>
        <div class="rank-streak">${e.streak || 0} يوم 🔥</div>
      </div>
      <div class="rank-points">${e.points} ⚡</div>
    `;
    list.appendChild(card);
  });

  if (entries.length === 0) {
    list.innerHTML = `<div class="search-placeholder"><p>ما في أصدقاء بعد!<br/>شارك الرابط عشان يظهروا هنا 👥</p></div>`;
  }

  // My rank card
  document.getElementById("my-rank-name").textContent = state.username || "أنت";
  document.getElementById("my-rank-streak").textContent = (state.streak || 0) + " يوم 🔥";
  document.getElementById("my-rank-points").textContent = (state.totalPoints || 0) + " ⚡";
}

// ---- PROFILE UI ----
function updateProfileUI() {
  const lvl = getCurrentLevel();
  document.getElementById("profile-username").textContent = state.username || "البطل";
  document.getElementById("profile-level-badge").textContent = `المستوى ${lvl.idx + 1} - ${lvl.level.name}`;
  document.getElementById("stat-total-points").textContent = state.totalPoints || 0;
  document.getElementById("stat-streak").textContent = state.streak || 0;
  document.getElementById("stat-done").textContent = state.totalDone || 0;

  // تحديث الصورة الشخصية في الواجهة
  const profileImageEl = document.getElementById("profile-image");
  if (profileImageEl) {
    profileImageEl.src = state.profileImageUrl || 'images/default-avatar.png';
  }

  // Display group name
  const groupNameEl = document.getElementById("profile-group-name");
  if (groupNameEl) {
    groupNameEl.textContent = state.groupName ? `مجموعتي: ${state.groupName}` : "لا توجد مجموعة";
  }
}

// ---- PROFILE IMAGE UPLOAD ----
async function uploadProfileImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!supabaseClient) {
    alert("Supabase client not initialized. Cannot upload image.");
    return;
  }

  // Optional: Add a loading indicator here, e.g., document.getElementById("profile-image-loading").classList.remove("hidden");

  const fileExt = file.name.split('.').pop();
  // Use username and a timestamp to ensure unique file names in storage
  const fileName = `${state.username}_${Date.now()}.${fileExt}`;
  const filePath = `avatars/${fileName}`; // Supabase Storage path (e.g., 'avatars' is your bucket name)

  try {
    // Upload file to Supabase Storage
    const { data, error } = await supabaseClient.storage
      .from('avatars') // Assuming you have a bucket named 'avatars' in Supabase Storage
      .upload(filePath, file, {
        cacheControl: '3600', // Cache for 1 hour
        upsert: true // Overwrite if a file with the same path exists
      });

    if (error) throw error;

    // Get the public URL of the uploaded file
    const { data: publicUrlData } = supabaseClient.storage
      .from('avatars')
      .getPublicUrl(filePath);

    state.profileImageUrl = publicUrlData.publicUrl;
    saveState(); // This will also call syncLeaderboard() to update the DB
    updateProfileUI(); // Refresh the profile UI to show the new image
    alert("تم تحديث الصورة الشخصية بنجاح!");
  } catch (error) {
    console.error("Error uploading profile image:", error);
    alert("فشل رفع الصورة: " + error.message);
  } finally {
    // Optional: Hide loading indicator, e.g., document.getElementById("profile-image-loading").classList.add("hidden");
  }
}

// ---- NAVIGATION ----
function showPage(name) {
  playSound('click');
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));

  document.getElementById("page-" + name).classList.add("active");
  document.querySelector(`[data-page="${name}"]`)?.classList.add("active");

  if (name === "friends") updateLeaderboardUI();
  if (name === "friends") {
    // Default to showing all groups, or user's group if set
    updateLeaderboardUI(state.groupName || null);
    // Also update the filter UI element
    const groupFilterSelect = document.getElementById("leaderboard-group-filter");
    if (groupFilterSelect) {
      // Clear existing dynamic options
      Array.from(groupFilterSelect.options).forEach(option => {
        if (option.value !== "all") {
          option.remove();
        }
      });
      if (state.groupName) {
        const myGroupOption = document.createElement("option");
        myGroupOption.value = state.groupName;
        myGroupOption.textContent = `مجموعتي: ${state.groupName}`;
        groupFilterSelect.appendChild(myGroupOption);
      }
      groupFilterSelect.value = currentLeaderboardFilter || "all";
    }
  }
  if (name === "profile") { updateProfileUI(); }
  if (name === "home") { updateHomeUI(); renderDailyGoals(); }
}

// ---- SHARE ----
function shareApp(type) {
  const url = window.location.href;
  const text = `🔥 أنا بستخدم تحدّي! تطبيق يومي بيخليني أكمل أهدافي وأجمع نقاط. انضم معايا!\n${url}`;

  if (type === "whatsapp") {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  } else {
    navigator.clipboard.writeText(url).then(() => {
      const toast = document.getElementById("copy-toast");
      toast.classList.remove("hidden");
      setTimeout(() => toast.classList.add("hidden"), 2000);
    });
  }
}

// ---- SETTINGS ----
function resetDailyGoals() {
  if (confirm("هتبدأ تحديات اليوم من الأول؟")) {
    state.dailyGoals = DEFAULT_GOALS.map(g => ({ ...g, done: false }));
    saveState();
    renderDailyGoals();
    updateHomeUI();
    showPage("home");
  }
}

function changeName() {
  const newName = prompt("اكتب اسمك الجديد:", state.username);
  if (newName && newName.trim()) {
    state.username = newName.trim();
    saveState();
    updateHomeUI();
    updateProfileUI();
  }
}

// ---- GROUPS ----
function changeGroup() {
  playSound('click');
  const newGroup = prompt("ادخل اسم مجموعتك (اتركه فارغاً للخروج من أي مجموعة):", state.groupName || "");
  if (newGroup !== null) { // User didn't cancel
    state.groupName = newGroup.trim() === "" ? null : newGroup.trim();
    saveState();
    updateProfileUI(); // Refresh profile to show new group
    updateLeaderboardUI(); // Refresh leaderboard
    alert(state.groupName ? `تم الانضمام إلى مجموعة: ${state.groupName}` : "تم الخروج من المجموعة.");
  }
}

function clearAllData() {
  if (confirm("هتمسح كل بياناتك؟ مش هترجع تاني!")) {
    const lbKey = "tahady_lb_" + state.username;
    localStorage.removeItem("tahady_state");
    localStorage.removeItem(lbKey);
    location.reload();
  }
}

// ---- ADMIN FUNCTIONS ----
async function checkAdminPassword() {
  const pass = prompt("أدخل كلمة مرور الإدارة:");
  if (pass === "admin123") { // يمكنك تغيير كلمة السر هنا
    alert("أهلاً بك يا مدير! تم تفعيل لوحة التحكم في أسفل الصفحة.");
    document.getElementById("admin-section").classList.remove("hidden");
    await renderAdminUsers();
    // Scroll to admin section
    document.getElementById("admin-section").scrollIntoView({ behavior: 'smooth' });
  } else {
    alert("كلمة مرور خاطئة!");
  }
}

async function renderAdminUsers() {
  const users = await getLeaderboard();
  const container = document.getElementById("admin-users-list");
  container.innerHTML = "<h4>إدارة المستخدمين المحليين:</h4>";

  users.forEach(u => {
    const div = document.createElement("div");
    div.className = "setting-item";
    div.innerHTML = `
      <div>
        <strong>${u.name}</strong> 
        <span style="font-size:0.7rem; color:var(--text-muted)">(${u.points}⚡)</span>
      </div>
      <button onclick="adminDeleteUser('${u.name}')" class="setting-action-btn danger" style="padding: 2px 8px;">حذف</button>
    `;
    container.appendChild(div);
  });
}

async function adminDeleteUser(username) {
  if (confirm(`هل أنت متأكد من حذف المستخدم "${username}" نهائياً؟`)) {
    // حذف من Supabase إذا كان مفعلاً
    if (supabaseClient) {
      await supabaseClient.from('leaderboard').delete().eq('name', username);
    }
    
    if (state.username === username) {
      localStorage.removeItem("tahady_state");
      location.reload();
    } else {
      await renderAdminUsers();
      await updateLeaderboardUI();
      alert("تم حذف المستخدم بنجاح.");
    }
  }
}

function closeAdminPanel() {
  document.getElementById("admin-section").classList.add("hidden");
}

// ---- BOOT ----
window.addEventListener("DOMContentLoaded", () => {
  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  if (state.username) {
    initDailyGoals();
    saveState();
    hideSplash();
    initApp();
  } else {
    // Show splash
    document.getElementById("app").classList.add("hidden");
    // Enter on username field
    document.getElementById("username-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") startApp();
    });
  }
});

// Search on Enter
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("challenge-search");
  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") searchChallenge();
    });
  }
});
