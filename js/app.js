/* ELTECH Personality - Aplicação (SPA)
 * Roteamento por hash, telas e lógica de UI. Depende de db.js, auth.js, excel.js.
 */
(function () {
  "use strict";

  // Versão do app — manter igual em version.json e sw.js (CACHE_VERSION).
  const APP_VERSION = "1.15.0";

  // ---- Estado ------------------------------------------------------------
  const state = {
    user: null,
    plan: null,
    logs: {}, // mapa id -> log, carregado por treino
    currentWeek: null,
    currentDay: null,
    activeWorkout: null, // { typeName, startMs } enquanto o cronômetro roda
    agendaMonth: null // { y, m } mês exibido no calendário
  };

  const WEIGHT_STEP = 2.5;
  let wkInterval = null; // intervalo do cronômetro de treino

  // ---- Helpers de DOM ----------------------------------------------------
  const app = () => document.getElementById("app");
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  let toastTimer = null;
  function toast(msg, type = "") {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.className = "show " + type;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = ""), 2600);
  }

  function modal(html) {
    const root = document.getElementById("modal-root");
    root.innerHTML = `<div class="modal-back"><div class="modal">${html}</div></div>`;
    const back = qs(".modal-back", root);
    back.addEventListener("click", (e) => { if (e.target === back) closeModal(); });
    return root;
  }
  function closeModal() { document.getElementById("modal-root").innerHTML = ""; }

  function confirmModal(title, message, onYes, yesLabel = "Sim", danger = false) {
    modal(`
      <h2>${esc(title)}</h2>
      <p class="muted">${esc(message)}</p>
      <div class="stack" style="margin-top:18px">
        <button class="btn ${danger ? "danger" : ""}" id="cm-yes">${esc(yesLabel)}</button>
        <button class="btn secondary" id="cm-no">Cancelar</button>
      </div>`);
    qs("#cm-yes").addEventListener("click", () => { closeModal(); onYes(); });
    qs("#cm-no").addEventListener("click", closeModal);
  }

  // ---- Tema --------------------------------------------------------------
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const meta = qs('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#F4F6FB" : "#0D1117");
    localStorage.setItem("personality.theme", theme);
  }
  function currentTheme() { return localStorage.getItem("personality.theme") || "light"; }

  // ---- Som / vibração ----------------------------------------------------
  let audioCtx = null;
  function beep() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.type = "sine"; o.frequency.value = 880;
      g.gain.setValueAtTime(0.001, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      o.start(); o.stop(audioCtx.currentTime + 0.5);
    } catch (e) { /* silêncio */ }
    if (navigator.vibrate) navigator.vibrate([200, 80, 200]);
  }

  // ---- Router ------------------------------------------------------------
  const PUBLIC_ROUTES = ["login", "register"];

  function parseHash() {
    const raw = (location.hash || "#/home").replace(/^#\/?/, "");
    const parts = raw.split("/").filter(Boolean);
    const decode = (p) => { try { return decodeURIComponent(p); } catch (e) { return p; } };
    return { name: parts[0] || "home", params: parts.slice(1).map(decode) };
  }

  function navigate(path) {
    if (location.hash === "#/" + path) route();
    else location.hash = "#/" + path;
  }

  async function route() {
    if (wkInterval) { clearInterval(wkInterval); wkInterval = null; }
    const { name, params } = parseHash();
    if (!state.user && !PUBLIC_ROUTES.includes(name)) {
      return navigate("login");
    }
    if (state.user && PUBLIC_ROUTES.includes(name)) {
      return navigate("home");
    }
    const view = VIEWS[name] || VIEWS.home;
    await view(params);
    window.scrollTo(0, 0);
  }

  // Renderiza uma tela com barra superior (nome + ajuda) e, quando aplicável,
  // a barra de navegação inferior.
  function renderScreen(innerHtml, { nav = true, active = "", help = "" } = {}) {
    app().innerHTML =
      topBar() +
      `<div class="screen has-topbar ${nav ? "" : "no-nav"}">${innerHtml}</div>` +
      (nav ? navBar(active) : "");
    const hb = qs("#help-btn");
    if (hb) hb.addEventListener("click", () => openHelp(help || active || "home"));
  }

  function topBar() {
    return `<header class="top-bar glass">
      <span class="tb-spacer"></span>
      <div class="tb-brand"><span class="grad-text">ELTECH</span><span class="tb-sub">Personality</span></div>
      <button class="help-btn" id="help-btn" aria-label="Ajuda" title="Ajuda">?</button>
    </header>`;
  }

  // Ícones de linha (estilo Lucide) — herdam a cor via currentColor,
  // então ficam brancos no tema escuro e pretos no tema claro.
  const NAV_ICONS = {
    home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V9.5"/></svg>`,
    treinos: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8v8M8 6v12M16 6v12M20 8v8M8 12h8"/></svg>`,
    evolucao: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V4M4 20h16"/><polyline points="7 14 11 10 14 13 20 6.5"/><polyline points="20 10 20 6.5 16.5 6.5"/></svg>`,
    agenda: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 3v3M16 3v3"/></svg>`,
    perfil: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>`
  };

  function navBar(active) {
    const items = [
      { key: "home", label: "Home" },
      { key: "treinos", label: "Treinos" },
      { key: "evolucao", label: "Evolução" },
      { key: "agenda", label: "Agenda" },
      { key: "perfil", label: "Perfil" }
    ];
    return `<nav class="bottom-nav">${items
      .map(
        (i) =>
          `<a href="#/${i.key}" class="${active === i.key ? "active" : ""}">
            <span class="nav-ico">${NAV_ICONS[i.key]}</span><span>${i.label}</span></a>`
      )
      .join("")}</nav>`;
  }

  function onlineBadge() {
    const off = !navigator.onLine;
    return `<span class="online-badge"><span class="dot ${off ? "off" : ""}"></span>${
      off ? "Offline" : "Dados salvos no aparelho"
    }</span>`;
  }

  // ======================================================================
  //  VIEWS
  // ======================================================================
  const VIEWS = {};

  // ---- Autenticação (login + cadastro com abas, estilo ELTECH) ----------
  const EYE_SVG =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

  function renderAuth(activeTab) {
    const rulesHtml = Auth.PASSWORD_RULES.map(
      (r) => `<li data-rule="${r.key}"><span class="mark">✖</span>${esc(r.label)}</li>`
    ).join("");
    const isReg = activeTab === "register";

    app().innerHTML = `
      <div class="auth-wrap">
        <div class="login-logo">
          <h1>ELTECH</h1>
          <p>PERSONALITY</p>
        </div>
        <div class="login-box glass">
          <div class="login-tabs">
            <button class="login-tab ${isReg ? "" : "active"}" data-tab="login">Entrar</button>
            <button class="login-tab ${isReg ? "active" : ""}" data-tab="register">Cadastrar</button>
          </div>

          <div class="login-form ${isReg ? "" : "active"}" id="form-login">
            <div class="form-group"><label>E-mail ou nome</label>
              <input class="form-input" id="l-email" type="text" autocomplete="username" placeholder="voce@email.com ou seu nome" /></div>
            <div class="form-group"><label>Senha</label>
              <div class="pass-wrap">
                <input class="form-input" id="l-pass" type="password" autocomplete="current-password" placeholder="Sua senha" />
                <button class="pass-toggle" data-target="l-pass" type="button">${EYE_SVG}</button>
              </div>
            </div>
            <label class="checkbox-row" style="margin-bottom:14px"><input type="checkbox" id="l-keep" checked /> Manter conectado</label>
            <div class="error-text" id="l-error"></div>
            <button class="btn" id="l-submit">Entrar</button>
          </div>

          <div class="login-form ${isReg ? "active" : ""}" id="form-register">
            <div class="form-group"><label>Nome completo</label>
              <input class="form-input" id="r-name" placeholder="Seu nome" /></div>
            <div class="form-group"><label>E-mail</label>
              <input class="form-input" id="r-email" type="email" placeholder="voce@email.com" /></div>
            <div class="form-group"><label>Senha</label>
              <div class="pass-wrap">
                <input class="form-input" id="r-pass" type="password" placeholder="Crie uma senha forte" />
                <button class="pass-toggle" data-target="r-pass" type="button">${EYE_SVG}</button>
              </div>
              <div class="pw-meter" id="pw-meter"><span></span></div>
              <div class="pw-strength-label muted" id="pw-label">Digite uma senha</div>
              <ul class="pw-checklist" id="pw-checklist">${rulesHtml}</ul>
            </div>
            <div class="form-group"><label>Confirmar senha</label>
              <div class="pass-wrap">
                <input class="form-input" id="r-pass2" type="password" placeholder="Repita a senha" />
                <button class="pass-toggle" data-target="r-pass2" type="button">${EYE_SVG}</button>
              </div>
              <div class="small" id="match-msg" style="margin-top:6px;min-height:1em"></div>
            </div>
            <div class="error-text" id="r-error"></div>
            <button class="btn" id="r-submit" disabled>Criar conta</button>
          </div>
        </div>
      </div>`;

    bindPasswordToggles();

    // Alternância de abas (sem recarregar / sem perder o que foi digitado)
    qsa(".login-tab").forEach((tab) =>
      tab.addEventListener("click", () => {
        const target = tab.dataset.tab;
        qsa(".login-tab").forEach((t) => t.classList.toggle("active", t === tab));
        qs("#form-login").classList.toggle("active", target === "login");
        qs("#form-register").classList.toggle("active", target === "register");
        if (location.hash !== "#/" + target) history.replaceState(null, "", "#/" + target);
      })
    );

    bindLogin();
    bindRegister();
  }

  function bindLogin() {
    async function doLogin() {
      const email = qs("#l-email").value;
      const password = qs("#l-pass").value;
      const keep = qs("#l-keep").checked;
      const err = qs("#l-error");
      err.textContent = "";
      try {
        state.user = await Auth.login({ email, password, keep });
        toast("Bem-vindo, " + state.user.name.split(" ")[0] + "!", "success");
        navigate("home");
      } catch (e) {
        err.textContent = e.message;
      }
    }
    qs("#l-submit").addEventListener("click", doLogin);
  }

  function bindRegister() {
    const passEl = qs("#r-pass");
    const pass2El = qs("#r-pass2");
    const submit = qs("#r-submit");

    function refresh() {
      const val = passEl.value;
      const { results, valid } = Auth.checkPassword(val);
      results.forEach((r) => {
        const li = qs(`#pw-checklist li[data-rule="${r.key}"]`);
        if (li) {
          li.classList.toggle("ok", r.ok);
          qs(".mark", li).textContent = r.ok ? "✔" : "✖";
        }
      });
      const strength = Auth.passwordStrength(val);
      qs("#pw-meter").className = "pw-meter " + strength.className;
      qs("#pw-label").textContent = val ? "Força: " + strength.label : "Digite uma senha";

      const match = pass2El.value.length > 0 && pass2El.value === val;
      const matchMsg = qs("#match-msg");
      if (!pass2El.value) matchMsg.textContent = "";
      else {
        matchMsg.textContent = match ? "✔ As senhas coincidem" : "✖ As senhas são diferentes";
        matchMsg.style.color = match ? "var(--success)" : "var(--danger)";
      }
      submit.disabled = !(valid && match && qs("#r-name").value.trim() && Auth.isValidEmail(qs("#r-email").value));
    }

    [passEl, pass2El, qs("#r-name"), qs("#r-email")].forEach((el) =>
      el.addEventListener("input", refresh)
    );

    submit.addEventListener("click", async () => {
      const err = qs("#r-error");
      err.textContent = "";
      try {
        const user = await Auth.register({
          name: qs("#r-name").value,
          email: qs("#r-email").value,
          password: passEl.value
        });
        Auth.setSession(user.email, true);
        state.user = user;
        toast("Conta criada com sucesso!", "success");
        navigate("home");
      } catch (e) {
        err.textContent = e.message;
      }
    });
  }

  VIEWS.login = async function () { renderAuth("login"); };
  VIEWS.register = async function () { renderAuth("register"); };

  // ---- Home (somente data/hora + saudação + nome) -----------------------
  VIEWS.home = async function () {
    const first = state.user.name;
    const bsb = localNow();
    const greet = bsb.hour < 12 ? "Bom dia" : bsb.hour < 18 ? "Boa tarde" : "Boa noite";
    renderScreen(
      `
      <div class="top-header">
        <div>
          <div class="muted small" id="home-clock">${bsb.dateStr}</div>
          <div class="home-greet">${greet},</div>
          <h1 class="home-name">${esc(first)}</h1>
        </div>
      </div>`,
      { active: "home" }
    );
    startHomeClock();
  };

  // ---- Treinos (um card por treino/tipo) --------------------------------
  VIEWS.treinos = async function () {
    await loadPlan();
    const types = (state.plan && state.plan.types) || [];
    if (!types.length) {
      renderScreen(
        `<h1>Treinos</h1>${emptyState("🏋️", "Sem treino ainda", "Seu personal ainda não importou o treino. Ele envia a planilha e você importa em Perfil → Área do Professor.")}`,
        { active: "treinos" }
      );
      return;
    }
    const cards = types
      .map(
        (tp, i) => `
        <div class="card tap prof-card" data-i="${i}">
          <div>
            <h3>${esc(tp.name)}</h3>
            <div class="muted small">${tp.exercises.length} exercícios</div>
          </div>
          <span class="chev">›</span>
        </div>`
      )
      .join("");
    renderScreen(`<h1>Treinos</h1>${cards}`, { active: "treinos" });
    qsa(".card[data-i]").forEach((c) =>
      c.addEventListener("click", () => navigate("workout/" + c.dataset.i))
    );
  };

  // ---- Execução do treino -----------------------------------------------
  VIEWS.workout = async function (params) {
    await loadPlan();
    const idx = parseInt(params[0], 10);
    const tp = state.plan && state.plan.types && state.plan.types[idx];
    if (!tp) return navigate("treinos");
    await loadLogs();

    const exCards = tp.exercises
      .map((ex) => {
        const w = getWeight(tp.name, ex.name);
        return `
        <div class="card ex-card">
          <div class="ex-head">
            <div>
              <h3>${esc(ex.name)}</h3>
              <div class="ex-meta">
                <span class="pill">${ex.sets} × ${esc(ex.reps)}</span>
                <span class="pill info">⏱ ${ex.rest}s</span>
              </div>
              ${ex.video ? `<button class="btn secondary xs play-btn" data-video="${esc(ex.video)}" data-title="${esc(ex.name)}">▶ Ver vídeo</button>` : ""}
            </div>
            <div class="weight-box">
              <label>Peso (kg)</label>
              <input class="w-input" type="number" inputmode="decimal" data-ex="${esc(ex.name)}" value="${w == null ? "" : w}" placeholder="0" />
            </div>
          </div>
          ${ex.obs ? `<p class="ex-obs">📝 ${esc(ex.obs)}</p>` : ""}
        </div>`;
      })
      .join("");

    renderScreen(
      `
      <div class="top-header">
        <button class="btn sm back-green" id="back">← Treinos</button>
      </div>
      <div class="wk-title">
        <h1>${esc(tp.name)}</h1>
        <div class="wk-timer">
          <span class="wk-time" id="wk-time">00:00</span>
          <button class="btn xs" id="wk-toggle">Começar</button>
        </div>
      </div>
      ${exCards}`,
      { nav: true, active: "treinos", help: "workout" }
    );

    qs("#back").addEventListener("click", () => navigate("treinos"));
    qsa(".w-input").forEach((inp) =>
      inp.addEventListener("change", () => saveWeight(tp.name, inp.dataset.ex, inp.value))
    );
    qsa(".play-btn").forEach((b) =>
      b.addEventListener("click", () => openVideo(b.dataset.video, b.dataset.title))
    );
    setupWorkoutTimer(tp);
  };

  function fmtDuration(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }
  function localDateISO(d) {
    d = d || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function setupWorkoutTimer(tp) {
    const timeEl = qs("#wk-time");
    const toggle = qs("#wk-toggle");
    if (!toggle) return;
    const isActive = () => state.activeWorkout && state.activeWorkout.typeName === tp.name;
    const tick = () => {
      if (!isActive()) return;
      const s = (Date.now() - state.activeWorkout.startMs) / 1000;
      if (timeEl) timeEl.textContent = fmtDuration(s);
    };
    const setRunning = () => {
      toggle.textContent = "Finalizar";
      toggle.classList.add("danger");
      tick();
      if (wkInterval) clearInterval(wkInterval);
      wkInterval = setInterval(tick, 1000);
    };
    if (isActive()) setRunning();
    else { timeEl.textContent = "00:00"; toggle.textContent = "Começar"; toggle.classList.remove("danger"); }

    toggle.addEventListener("click", () => {
      if (!isActive()) {
        state.activeWorkout = { typeName: tp.name, startMs: Date.now() };
        setRunning();
      } else {
        confirmModal(
          "Finalizar treino?",
          "Deseja finalizar e salvar o tempo deste treino?",
          async () => {
            const durationSec = Math.floor((Date.now() - state.activeWorkout.startMs) / 1000);
            if (wkInterval) { clearInterval(wkInterval); wkInterval = null; }
            state.activeWorkout = null;
            await saveSession(tp, durationSec);
            toast("Treino finalizado! ⏱ " + fmtDuration(durationSec), "success");
            navigate("agenda");
          },
          "Finalizar"
        );
      }
    });
  }

  async function saveSession(tp, durationSec) {
    await loadLogs();
    const date = localDateISO();
    const exercises = tp.exercises.map((ex) => ({
      name: ex.name, sets: ex.sets, reps: ex.reps, weight: getWeight(tp.name, ex.name)
    }));
    const rec = {
      id: `${state.user.email}|${date}|${tp.name}|${Date.now()}`,
      owner: state.user.email,
      date,
      type: tp.name,
      durationSec,
      exercises,
      finishedAt: new Date().toISOString()
    };
    await DB.put("history", rec);
  }

  // Vídeo do exercício (YouTube) — abre embutido num modal.
  function ytId(url) {
    const m = String(url || "").match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([A-Za-z0-9_-]{6,})/
    );
    return m ? m[1] : null;
  }
  function openVideo(url, title) {
    const id = ytId(url);
    if (!id) { window.open(url, "_blank", "noopener"); return; }
    modal(`
      <h2 style="margin-bottom:12px">${esc(title || "Vídeo")}</h2>
      <div class="video-wrap"><iframe src="https://www.youtube.com/embed/${id}" title="${esc(title || "")}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
      <button class="btn" style="margin-top:14px" id="vid-ok">Fechar</button>`);
    qs("#vid-ok").addEventListener("click", closeModal);
  }

  function renderExercise(weekNum, dayKey, ex, exi) {
    let sets = "";
    for (let s = 0; s < ex.sets; s++) {
      const log = getLog(weekNum, dayKey, exi, s);
      const weight = log && log.weight != null ? log.weight : "";
      const reps = log && log.reps != null ? log.reps : ex.reps.replace(/\D/g, "") || "";
      const done = log && log.done;
      sets += `
        <div class="set-row" data-set="${s}">
          <span class="set-n">${s + 1}ª</span>
          <div class="field-mini">
            <label>Peso (kg)</label>
            <div class="stepper">
              <button data-act="w-" type="button">−</button>
              <input class="w-input" type="number" inputmode="decimal" value="${weight}" placeholder="0" />
              <button data-act="w+" type="button">+</button>
            </div>
          </div>
          <div class="field-mini">
            <label>Reps</label>
            <div class="stepper">
              <button data-act="r-" type="button">−</button>
              <input class="r-input" type="number" inputmode="numeric" value="${reps}" placeholder="${esc(ex.reps)}" />
              <button data-act="r+" type="button">+</button>
            </div>
          </div>
          <button class="check-btn ${done ? "done" : ""}" data-act="check" title="Concluir série">✔</button>
        </div>`;
    }
    return `
      <div class="card ex-card" data-exi="${exi}">
        <div class="ex-head">
          <div>
            <h3>${esc(ex.name)}</h3>
            <div class="ex-meta">
              <span class="pill">${ex.sets} × ${esc(ex.reps)}</span>
              <span class="pill info">⏱ ${ex.rest}s descanso</span>
            </div>
          </div>
        </div>
        ${ex.obs ? `<p class="muted small">📝 ${esc(ex.obs)}</p>` : ""}
        ${sets}
      </div>`;
  }

  function bindExerciseCard(card, weekNum, dayKey, day) {
    const exi = parseInt(card.dataset.exi, 10);
    const ex = day.exercises[exi];

    qsa(".set-row", card).forEach((row) => {
      const setIdx = parseInt(row.dataset.set, 10);
      const wInput = qs(".w-input", row);
      const rInput = qs(".r-input", row);
      const checkBtn = qs(".check-btn", row);

      function save(done) {
        saveLog(weekNum, dayKey, exi, setIdx, ex.name, {
          weight: wInput.value === "" ? null : parseFloat(wInput.value),
          reps: rInput.value === "" ? null : parseInt(rInput.value, 10),
          done: done != null ? done : checkBtn.classList.contains("done")
        });
      }

      qsa("[data-act]", row).forEach((btn) => {
        btn.addEventListener("click", () => {
          const act = btn.dataset.act;
          if (act === "w-") wInput.value = Math.max(0, (parseFloat(wInput.value) || 0) - WEIGHT_STEP);
          else if (act === "w+") wInput.value = (parseFloat(wInput.value) || 0) + WEIGHT_STEP;
          else if (act === "r-") rInput.value = Math.max(0, (parseInt(rInput.value, 10) || 0) - 1);
          else if (act === "r+") rInput.value = (parseInt(rInput.value, 10) || 0) + 1;
          else if (act === "check") {
            const nowDone = !checkBtn.classList.contains("done");
            checkBtn.classList.toggle("done", nowDone);
            save(nowDone);
            updateWorkoutProgress(weekNum, day);
            if (nowDone) startTimer(ex.rest);
            return;
          }
          save();
        });
      });

      wInput.addEventListener("change", () => save());
      rInput.addEventListener("change", () => save());
    });
  }

  function updateWorkoutProgress(weekNum, day) {
    const prog = dayProgress(weekNum, day);
    const bar = qs("#w-progress");
    const label = qs("#w-progress-label");
    if (bar) bar.style.width = prog + "%";
    if (label) label.textContent = prog + "% concluído";
  }

  // ---- Cronômetro --------------------------------------------------------
  let timerInterval = null;
  let timerRemaining = 0;
  function startTimer(seconds) {
    stopTimer();
    timerRemaining = seconds;
    renderTimer();
    timerInterval = setInterval(() => {
      timerRemaining--;
      renderTimer();
      if (timerRemaining <= 0) {
        stopTimer();
        beep();
        toast("Descanso concluído! Próxima série 💪");
      }
    }, 1000);
  }
  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    timerRemaining = 0;
    renderTimer();
  }
  function renderTimer() {
    const d = qs("#timer-display");
    if (!d) return;
    const m = String(Math.floor(Math.max(0, timerRemaining) / 60)).padStart(2, "0");
    const s = String(Math.max(0, timerRemaining) % 60).padStart(2, "0");
    d.textContent = `${m}:${s}`;
    d.style.color = timerRemaining > 0 && timerRemaining <= 5 ? "var(--warn)" : "var(--text)";
  }

  // ---- Evolução (placeholder do próximo módulo) --------------------------
  VIEWS.evolucao = async function () {
    renderScreen(
      `<h1>Evolução</h1>${emptyState("📈", "Em breve", "Esta área estará disponível em breve.")}`,
      { active: "evolucao" }
    );
  };

  // ---- Agenda (placeholder) ---------------------------------------------
  VIEWS.agenda = async function () {
    const sessions = await DB.getAllByIndex("history", "owner", state.user.email);
    const byDate = {};
    sessions.forEach((s) => { (byDate[s.date] = byDate[s.date] || []).push(s); });

    if (!state.agendaMonth) {
      const n = new Date();
      state.agendaMonth = { y: n.getFullYear(), m: n.getMonth() };
    }
    const { y, m } = state.agendaMonth;
    const first = new Date(y, m, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(first);
    const todayISO = localDateISO();
    const dows = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    let cells = "";
    for (let i = 0; i < startDow; i++) cells += `<span class="cal-cell empty"></span>`;
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const done = !!byDate[iso];
      const cls = ["cal-cell", done ? "done" : "", iso === todayISO ? "today" : ""].join(" ").trim();
      cells += `<button class="${cls}" data-date="${iso}" ${done ? "" : "disabled"}>${day}</button>`;
    }

    const total = sessions.length;
    renderScreen(
      `
      <h1>Agenda</h1>
      <div class="card cal">
        <div class="cal-head">
          <button class="cal-nav" id="cal-prev" aria-label="Mês anterior">‹</button>
          <div class="cal-title">${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</div>
          <button class="cal-nav" id="cal-next" aria-label="Próximo mês">›</button>
        </div>
        <div class="cal-grid cal-dows">${dows.map((d) => `<span>${d}</span>`).join("")}</div>
        <div class="cal-grid cal-days">${cells}</div>
        <div class="cal-legend"><span class="dot"></span> Dia com treino finalizado</div>
      </div>
      <p class="muted small center">${total} treino(s) finalizado(s) no total</p>`,
      { active: "agenda" }
    );

    qs("#cal-prev").addEventListener("click", () => {
      state.agendaMonth = m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 };
      VIEWS.agenda();
    });
    qs("#cal-next").addEventListener("click", () => {
      state.agendaMonth = m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 };
      VIEWS.agenda();
    });
    qsa(".cal-cell.done").forEach((c) =>
      c.addEventListener("click", () => showDayDetail(c.dataset.date, byDate[c.dataset.date]))
    );
  };

  function showDayDetail(iso, list) {
    const [yy, mm, dd] = iso.split("-");
    const dateLabel = `${dd}/${mm}/${yy}`;
    const body = (list || [])
      .map((s) => {
        const exs = (s.exercises || [])
          .map(
            (ex) =>
              `<div class="ficha-row"><span class="ficha-k">${esc(ex.name)}</span><span class="ficha-v">${ex.weight != null ? ex.weight + " kg" : "—"}</span></div>`
          )
          .join("");
        return `
        <div class="card" style="margin-bottom:12px">
          <div class="row between">
            <h3>${esc(s.type)}</h3>
            <span class="pill primary">⏱ ${fmtDuration(s.durationSec || 0)}</span>
          </div>
          <div style="margin-top:8px">${exs || '<span class="muted small">Sem exercícios.</span>'}</div>
        </div>`;
      })
      .join("");
    modal(`
      <h2 style="margin-bottom:12px">${dateLabel}</h2>
      ${body}
      <button class="btn" id="dd-ok">Fechar</button>`);
    qs("#dd-ok").addEventListener("click", closeModal);
  }

  // ---- Dados do aluno (ficha, só leitura) -------------------------------
  function isMarked(v) {
    const s = (v == null ? "" : String(v)).trim().toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "");
    return s !== "" && !["nao", "n", "0", "false", "-", "x nao"].includes(s);
  }

  function fichaRow(label, value) {
    return `<div class="ficha-row"><span class="ficha-k">${esc(label)}</span><span class="ficha-v">${esc(value)}</span></div>`;
  }

  function renderFichaSection(section, data) {
    // Objetivos: mostra só os marcados
    if (section.type === "objetivos") {
      const chosen = section.fields.filter((f) => isMarked(data[f.key]));
      if (!chosen.length) return "";
      const pills = chosen.map((f) => `<span class="pill primary">${esc(f.label)}</span>`).join("");
      return `<div class="card"><h3>${esc(section.title)}</h3><div class="ficha-objs" style="margin-top:10px">${pills}</div></div>`;
    }
    // SIM/NÃO com descrição (histórico de saúde, hábitos de vida)
    if (section.type === "simnao") {
      const rows = section.fields
        .filter((f) => isMarked(data[f.key]))
        .map((f) => fichaRow(f.label, data[f.key + "_desc"] || "Sim"));
      if (!rows.length) return "";
      return `<div class="card"><h3>${esc(section.title)}</h3><div style="margin-top:6px">${rows.join("")}</div></div>`;
    }
    // Seção com subseções (avaliação antropométrica) — unidade cm/mm
    if (section.subsections) {
      let inner = "";
      section.subsections.forEach((sub) => {
        const rows = sub.fields
          .filter((f) => (data[f.key] || "").toString().trim() !== "")
          .map((f) => fichaRow(f.label.replace(" (dobra)", ""), data[f.key] + (sub.unit ? " " + sub.unit : "")));
        if (rows.length) inner += `<div class="ficha-sub">${esc(sub.subtitle)}</div>${rows.join("")}`;
      });
      if (!inner) return "";
      return `<div class="card"><h3>${esc(section.title)}</h3>${inner}</div>`;
    }
    // Seção simples
    const rows = section.fields
      .filter((f) => (data[f.key] || "").toString().trim() !== "")
      .map((f) => fichaRow(f.label, data[f.key] + (f.unit ? " " + f.unit : "")));
    if (!rows.length) return "";
    return `<div class="card"><h3>${esc(section.title)}</h3><div style="margin-top:6px">${rows.join("")}</div></div>`;
  }

  VIEWS.aluno = async function () {
    const ficha = await DB.get("settings", "ficha:" + state.user.email);
    const data = (ficha && ficha.data) || null;

    let body = "";
    if (data) body = Excel.STUDENT_SCHEMA.map((s) => renderFichaSection(s, data)).join("");
    if (!body) {
      body = emptyState(
        "📋",
        "Ficha ainda não disponível",
        "Seu personal vai te enviar um arquivo Excel. Importe-o em Perfil → Área do Professor para ver sua ficha aqui."
      );
    }

    renderScreen(
      `
      <div class="top-header">
        <button class="btn sm back-green" id="back">← Perfil</button>
      </div>
      <h1>Dados do aluno</h1>
      ${body}`,
      { nav: true, active: "perfil", help: "aluno" }
    );
    qs("#back").addEventListener("click", () => navigate("perfil"));
  };

  // ---- Perfil ------------------------------------------------------------
  const DOOR_SVG =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
  const USER_ICON =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>`;
  const SUN_SVG =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;
  const MOON_SVG =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;
  const SAVE_SVG =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`;

  VIEWS.perfil = async function () {
    const u = state.user;
    const theme = currentTheme();
    const photo = (u.profile && u.profile.photo) || "";
    renderScreen(
      `
      <h1>Perfil</h1>
      <div class="card center">
        <div class="avatar-field" id="avatar-field" title="Toque para adicionar sua foto">
          ${photo ? `<img src="${photo}" alt="foto" />` : `<span class="avatar-ph">${USER_ICON}</span>`}
        </div>
        <input type="file" id="avatar-input" accept="image/*" hidden />
        <input class="name-edit" id="name-edit" value="${esc(u.name)}" maxlength="40" aria-label="Seu nome" />
      </div>

      <div class="card">
        <div class="row between">
          <div>
            <h3>Aparência do app</h3>
            <div class="muted small" id="theme-label">${theme === "dark" ? "Tema escuro" : "Tema claro"}</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="theme-toggle" ${theme === "dark" ? "checked" : ""}/>
            <span class="switch-track"><span class="switch-knob">
              <span class="ic-sun">${SUN_SVG}</span><span class="ic-moon">${MOON_SVG}</span>
            </span></span>
          </label>
        </div>
      </div>

      <div class="card tap prof-card" id="aluno-area">
        <div>
          <h3>Dados do aluno</h3>
          <div class="muted small">Sua ficha: dados, objetivos, avaliação física</div>
        </div>
        <span class="chev">›</span>
      </div>

      <div class="card tap prof-card" id="prof-area">
        <div>
          <h3>Área do Professor</h3>
          <div class="muted small">Importar planilha de treino, gerenciar o plano</div>
        </div>
        <span class="chev">›</span>
      </div>

      <div class="card">
        <h3>Alterar senha</h3>
        <div class="field" style="margin-top:12px">
          <label>Senha atual</label>
          <div class="pass-wrap">
            <input class="form-input" id="cp-old" type="password" placeholder="Sua senha atual" autocomplete="new-password" autocapitalize="off" autocorrect="off" />
            <button class="pass-toggle" data-target="cp-old" type="button">${EYE_SVG}</button>
          </div>
        </div>
        <div class="field">
          <label>Nova senha</label>
          <div class="pass-wrap">
            <input class="form-input" id="cp-new" type="password" placeholder="Crie uma nova senha" autocomplete="new-password" autocapitalize="off" autocorrect="off" />
            <button class="pass-toggle" data-target="cp-new" type="button">${EYE_SVG}</button>
          </div>
          <div class="muted small" style="margin-top:6px">Mín. 8 caracteres, com maiúscula, minúscula, número e caractere especial.</div>
        </div>
        <div class="error-text" id="cp-error"></div>
        <button class="btn" id="cp-save">${SAVE_SVG} Salvar nova senha</button>
      </div>

      <button class="btn danger" id="logout">${DOOR_SVG} Sair da conta</button>
      <p class="center muted small" style="margin-top:14px">ELTECH Personality · v${APP_VERSION}</p>`,
      { active: "perfil" }
    );

    // Foto (campo redondo)
    const field = qs("#avatar-field");
    const avInput = qs("#avatar-input");
    field.addEventListener("click", () => avInput.click());
    avInput.addEventListener("change", (e) => {
      if (e.target.files[0]) setUserPhoto(e.target.files[0]);
    });

    // Nome editável (atualiza em todo lugar e no login)
    const nameEl = qs("#name-edit");
    nameEl.addEventListener("change", () => saveUserName(nameEl.value));
    nameEl.addEventListener("keydown", (e) => { if (e.key === "Enter") nameEl.blur(); });

    // Tema (botão disjuntor com sol/lua)
    qs("#theme-toggle").addEventListener("change", (e) => {
      const dark = e.target.checked;
      applyTheme(dark ? "dark" : "light");
      qs("#theme-label").textContent = dark ? "Tema escuro" : "Tema claro";
    });

    qs("#aluno-area").addEventListener("click", () => navigate("aluno"));
    qs("#prof-area").addEventListener("click", () => navigate("professor"));

    // Alterar senha
    bindPasswordToggles();
    qs("#cp-old").value = "";
    qs("#cp-new").value = "";
    qs("#cp-save").addEventListener("click", async () => {
      const err = qs("#cp-error");
      err.textContent = "";
      const oldP = qs("#cp-old").value;
      const newP = qs("#cp-new").value;
      if (!oldP || !newP) { err.textContent = "Preencha os dois campos."; return; }
      try {
        await Auth.changePassword({ email: state.user.email, currentPassword: oldP, newPassword: newP });
        qs("#cp-old").value = "";
        qs("#cp-new").value = "";
        toast("Senha alterada com sucesso!", "success");
      } catch (e) {
        err.textContent = e.message;
      }
    });

    qs("#logout").addEventListener("click", () =>
      confirmModal("Sair?", "Você precisará entrar novamente. Seus dados continuam salvos.", () => {
        Auth.logout();
        state.user = null;
        state.plan = null;
        navigate("login");
      }, "Sair", true)
    );
  };

  // Salva o nome no banco e no estado (reflete em toda a interface e no login).
  async function saveUserName(name) {
    name = (name || "").trim();
    if (!name) { toast("Informe um nome.", "error"); return; }
    const full = await DB.get("users", state.user.email);
    if (!full) return;
    full.name = name;
    await DB.put("users", full);
    state.user.name = name;
    toast("Nome atualizado!", "success");
  }

  // Redimensiona e comprime a imagem, salvando como foto de perfil.
  async function setUserPhoto(file) {
    try {
      const dataUrl = await resizeImage(file, 320, 0.82);
      const full = await DB.get("users", state.user.email);
      if (!full) return;
      full.profile = full.profile || {};
      full.profile.photo = dataUrl;
      await DB.put("users", full);
      state.user.profile = state.user.profile || {};
      state.user.profile.photo = dataUrl;
      toast("Foto atualizada!", "success");
      VIEWS.perfil();
    } catch (e) {
      toast("Não foi possível carregar a imagem.", "error");
    }
  }

  function resizeImage(file, maxSize, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const img = new Image();
      reader.onload = () => (img.src = reader.result);
      reader.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width >= height && width > maxSize) { height = Math.round((height * maxSize) / width); width = maxSize; }
        else if (height > maxSize) { width = Math.round((width * maxSize) / height); height = maxSize; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ---- Área do Professor -------------------------------------------------
  VIEWS.professor = async function () {
    await loadPlan();
    const planSummary = state.plan
      ? `<div class="card">
          <div class="row between"><h3>Treino atual</h3><span class="pill primary">${state.plan.totalExercises} exercícios</span></div>
          <p class="muted small">${state.plan.totalTypes || (state.plan.types ? state.plan.types.length : 0)} tipo(s) · importado em ${new Date(state.plan.importedAt).toLocaleDateString("pt-BR")}</p>
        </div>`
      : `<div class="card muted">Nenhum treino importado ainda.</div>`;

    const fichaRec = await DB.get("settings", "ficha:" + state.user.email);
    const fichaSummary = fichaRec
      ? `<div class="card">
          <div class="row between"><h3>Ficha atual</h3><span class="pill primary">${fichaRec.count} campos</span></div>
          <p class="muted small">Importada em ${new Date(fichaRec.importedAt).toLocaleDateString("pt-BR")}</p>
        </div>`
      : `<div class="card muted">Nenhuma ficha importada ainda.</div>`;

    renderScreen(
      `
      <div class="top-header">
        <button class="btn sm back-green" id="back">← Perfil</button>
      </div>
      <h1>Área do Professor</h1>

      <div class="card">
        <h3>Importar dados</h3>
        <p class="muted small">Selecione a planilha (.xlsx) enviada pelo personal, com as abas
        <b>Treino</b> e <b>Ficha do Aluno</b>.</p>
        <div class="file-drop" id="drop">
          <div style="font-size:2rem">📄</div>
          <p>Toque para escolher o arquivo <b>.xlsx</b><br/><span class="small">ou arraste aqui</span></p>
        </div>
        <input type="file" id="xlsx-file" accept=".xlsx,.xls,.csv" hidden />
      </div>

      ${planSummary}
      ${fichaSummary}`,
      { nav: true, active: "perfil", help: "professor" }
    );

    qs("#back").addEventListener("click", () => navigate("perfil"));

    const drop = qs("#drop");
    const fileInput = qs("#xlsx-file");
    drop.addEventListener("click", () => fileInput.click());
    ["dragover", "dragenter"].forEach((ev) =>
      drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("drag"); })
    );
    ["dragleave", "drop"].forEach((ev) =>
      drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("drag"); })
    );
    drop.addEventListener("drop", (e) => {
      if (e.dataTransfer.files[0]) handleImport(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener("change", (e) => {
      if (e.target.files[0]) handleImport(e.target.files[0]);
    });

    async function handleImport(file) {
      toast("Lendo planilha…");
      try {
        const { plan, ficha } = await Excel.parseWorkbook(file);
        if (!plan && !ficha)
          throw new Error("Nenhum dado reconhecido. Use o modelo (abas 'Treino' e 'Ficha do Aluno').");

        const doSave = async () => {
          const parts = [];
          if (plan) {
            const rec = { id: state.user.email, owner: state.user.email, ...plan, importedAt: new Date().toISOString() };
            await DB.put("plans", rec);
            state.plan = rec;
            parts.push(`treino: ${plan.totalExercises} exercícios`);
          }
          if (ficha) {
            await DB.put("settings", {
              key: "ficha:" + state.user.email,
              owner: state.user.email,
              data: ficha.data,
              count: ficha.count,
              importedAt: new Date().toISOString()
            });
            parts.push(`ficha: ${ficha.count} campos`);
          }
          toast("Importado — " + parts.join(" · "), "success");
          VIEWS.professor();
        };

        if ((plan && state.plan) || (ficha && fichaRec)) {
          const msg = [
            plan ? `${plan.totalExercises} exercícios` : null,
            ficha ? `${ficha.count} campos de ficha` : null
          ].filter(Boolean).join(" e ");
          confirmModal("Substituir dados atuais?", `O arquivo traz ${msg}. Deseja substituir o que já existe?`, doSave, "Substituir");
        } else {
          await doSave();
        }
      } catch (e) {
        modal(`<h2>Erro ao importar</h2><p class="muted">${esc(e.message)}</p>
          <button class="btn" onclick="document.getElementById('modal-root').innerHTML=''">Ok</button>`);
      }
    }
  };

  // ======================================================================
  //  Dados / cálculos
  // ======================================================================
  async function loadPlan() {
    if (!state.user) return;
    state.plan = (await DB.get("plans", state.user.email)) || null;
  }

  function logId(week, day, exi, set) {
    return `${state.user.email}|${week}|${day}|${exi}|${set}`;
  }
  async function loadLogs() {
    const all = await DB.getAllByIndex("logs", "owner", state.user.email);
    state.logs = {};
    all.forEach((l) => (state.logs[l.id] = l));
  }

  // Peso por exercício (um valor por exercício de cada treino).
  function weightId(type, ex) { return `${state.user.email}|w|${type}|${ex}`; }
  function getWeight(type, ex) {
    const l = state.logs[weightId(type, ex)];
    return l && l.weight != null ? l.weight : null;
  }
  async function saveWeight(type, ex, val) {
    const id = weightId(type, ex);
    const weight = val === "" ? null : parseFloat(val);
    const log = { id, owner: state.user.email, type, exercise: ex, weight, updatedAt: new Date().toISOString() };
    state.logs[id] = log;
    await DB.put("logs", log);
    toast("Peso salvo", "success");
  }
  function getLog(week, day, exi, set) {
    return state.logs[logId(week, day, exi, set)];
  }
  async function saveLog(week, day, exi, set, exName, data) {
    const id = logId(week, day, exi, set);
    const log = {
      id,
      owner: state.user.email,
      exerciseKey: `${state.user.email}|${exName}`,
      week, day, exi, set,
      exercise: exName,
      weight: data.weight,
      reps: data.reps,
      done: !!data.done,
      updatedAt: new Date().toISOString()
    };
    state.logs[id] = log;
    await DB.put("logs", log);
  }

  function dayProgress(week, day) {
    const total = day.exercises.reduce((a, e) => a + e.sets, 0);
    if (!total) return 0;
    let done = 0;
    day.exercises.forEach((ex, exi) => {
      for (let s = 0; s < ex.sets; s++) {
        const l = getLog(week, day.day, exi, s);
        if (l && l.done) done++;
      }
    });
    return Math.round((done / total) * 100);
  }
  function weekProgress(week) {
    const totals = week.days.map((d) => dayProgress(week.week, d));
    if (!totals.length) return 0;
    return Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
  }
  function nextIncompleteDay(week) {
    return week.days.find((d) => dayProgress(week.week, d) < 100) || null;
  }

  async function computeStats() {
    const logs = await DB.getAllByIndex("logs", "owner", state.user.email);
    const done = logs.filter((l) => l.done);
    const volume = done.reduce((a, l) => a + (l.weight || 0) * (l.reps || 0), 0);
    // "Treinos concluídos" = sessões (week|day) com pelo menos uma série feita.
    const sessions = new Set(done.map((l) => `${l.week}|${l.day}`)).size;
    return {
      sessions,
      sets: done.length,
      volume: Math.round(volume).toLocaleString("pt-BR")
    };
  }

  // ======================================================================
  //  Backup
  // ======================================================================
  async function exportBackup() {
    const dump = { app: "ELTECH Personality", version: 1, exportedAt: new Date().toISOString(), data: {} };
    for (const store of DB.stores) dump.data[store] = await DB.getAll(store);
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `personality-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Backup exportado!", "success");
  }

  async function importBackup(file) {
    confirmModal("Importar backup?", "Isso vai mesclar/sobrescrever os dados deste aparelho com os do arquivo.", async () => {
      try {
        const text = await file.text();
        const dump = JSON.parse(text);
        if (!dump.data) throw new Error("Arquivo de backup inválido.");
        for (const store of DB.stores) {
          if (Array.isArray(dump.data[store])) {
            for (const item of dump.data[store]) await DB.put(store, item);
          }
        }
        toast("Backup importado!", "success");
        state.user = await Auth.currentUser();
        route();
      } catch (e) {
        toast("Erro: " + e.message, "error");
      }
    }, "Importar");
  }

  // ======================================================================
  //  Utilitários de UI
  // ======================================================================
  function emptyState(icon, title, text) {
    return `<div class="empty"><div class="big">${icon}</div><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
  }

  // Data e hora do próprio aparelho do usuário (dd/mm/aaaa, hh:mm) + hora p/ a saudação.
  function localNow() {
    const now = new Date();
    const d = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(now);
    const t = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
    return { dateStr: `${d}, ${t}`, hour: now.getHours() };
  }

  let homeClockTimer = null;
  function startHomeClock() {
    if (homeClockTimer) clearInterval(homeClockTimer);
    homeClockTimer = setInterval(() => {
      const el = document.getElementById("home-clock");
      if (!el) { clearInterval(homeClockTimer); homeClockTimer = null; return; }
      el.textContent = localNow().dateStr;
    }, 20000);
  }

  // ---- Ajuda por página (botão ? da barra superior) ---------------------
  const HELP = {
    home: {
      title: "Início",
      items: [
        ["👋", "Sua tela inicial, com a data, a hora e as boas-vindas."]
      ]
    },
    treinos: {
      title: "Treinos",
      items: [
        ["🏋️", "Cada card é um treino montado pelo seu personal. Toque para abrir."],
        ["📋", "A quantidade de treinos depende do que o personal definiu na planilha."]
      ]
    },
    workout: {
      title: "Treino",
      items: [
        ["⏱️", "Toque em <b>Começar</b> para cronometrar. Ao terminar, toque em <b>Finalizar</b> — o tempo vai para a Agenda e o dia fica verde."],
        ["🏋️", "Cada card é um exercício, com séries, repetições e descanso."],
        ["⚖️", "Digite no campo <b>Peso</b> (ao lado) a carga que você usou."],
        ["▶️", "Se o personal anexou um vídeo, toque em <b>Ver vídeo</b> (precisa de internet)."],
        ["📝", "As observações do personal aparecem abaixo do exercício."]
      ]
    },
    evolucao: {
      title: "Evolução",
      items: [["🚧", "Esta área estará disponível em breve."]]
    },
    agenda: {
      title: "Agenda",
      items: [
        ["📅", "O calendário marca em <b>verde</b> os dias em que você finalizou um treino."],
        ["👆", "Toque num dia verde para ver o treino, os pesos usados e o tempo total."],
        ["‹ ›", "Use as setas para navegar entre os meses."]
      ]
    },
    perfil: {
      title: "Perfil",
      items: [
        ["🎨", "Ative ou desative o <b>tema escuro</b>."],
        ["👨‍🏫", "Abra a <b>Área do Professor</b> para importar o treino em Excel."],
        ["💾", "Faça <b>backup</b> dos seus dados (exportar/importar) ao trocar de aparelho."],
        ["🚪", "Use <b>Sair da conta</b> para trocar de usuário — seus dados continuam salvos."]
      ]
    },
    aluno: {
      title: "Dados do aluno",
      items: [
        ["📋", "Aqui aparece sua <b>ficha</b>: dados pessoais, objetivos, histórico, hábitos e avaliação física."],
        ["👨‍🏫", "Esses dados são preenchidos e enviados pelo seu personal (via Excel)."],
        ["👁️", "Só os campos preenchidos aparecem — o que estiver em branco fica oculto."]
      ]
    },
    professor: {
      title: "Área do Professor",
      items: [
        ["📄", "Toque em <b>Importar dados</b> e escolha a planilha <b>.xlsx</b> enviada pelo personal."],
        ["📊", "O mesmo arquivo abastece o <b>treino</b> (aba Treino) e a <b>ficha</b> (aba Ficha do Aluno)."],
        ["👁️", "Na ficha, só aparecem os campos preenchidos — o resto fica oculto."],
        ["🔁", "Ao importar de novo, o app pergunta antes de substituir os dados atuais."]
      ]
    }
  };

  function openHelp(key) {
    const h = HELP[key] || HELP.home;
    const list = h.items
      .map((it) => `<li><span class="hi">${it[0]}</span><span>${it[1]}</span></li>`)
      .join("");
    modal(`
      <div class="row between" style="margin-bottom:6px">
        <h2>Ajuda · ${esc(h.title)}</h2>
      </div>
      <ul class="help-list">${list}</ul>
      <button class="btn" style="margin-top:16px" id="help-ok">Entendi</button>`);
    qs("#help-ok").addEventListener("click", closeModal);
  }

  // Banner "Nova versão disponível" (acionado pelo service worker).
  function showUpdateBanner(onUpdate) {
    if (document.getElementById("update-banner")) return;
    const bar = document.createElement("div");
    bar.id = "update-banner";
    bar.className = "update-banner glass";
    bar.innerHTML = `<span class="bn-text">Eltech Personality</span>
      <button class="btn xs" id="ub-btn">Atualizar app</button>`;
    document.body.appendChild(bar);
    requestAnimationFrame(() => bar.classList.add("show"));
    document.getElementById("ub-btn").addEventListener("click", (e) => {
      e.currentTarget.textContent = "Atualizando…";
      e.currentTarget.disabled = true;
      onUpdate();
    });
  }
  window.PersonalityUpdate = showUpdateBanner;

  function bindPasswordToggles() {
    qsa(".pass-toggle, .toggle-pass").forEach((btn) =>
      btn.addEventListener("click", () => {
        const input = document.getElementById(btn.dataset.target);
        if (!input) return;
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        // Botões com ícone SVG mantêm o ícone; botões com emoji alternam.
        if (!btn.querySelector("svg")) btn.textContent = show ? "🙈" : "👁";
        btn.style.color = show ? "var(--primary)" : "var(--text3)";
      })
    );
  }

  // ======================================================================
  //  Instalação do app (PWA) — banner "Baixar app"
  // ======================================================================
  let deferredInstall = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstall = e; // guardado para o botão "Baixar app"
  });
  window.addEventListener("appinstalled", () => {
    deferredInstall = null;
    removeInstallBanner();
  });

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  function showInstallBanner() {
    if (isStandalone()) return; // já instalado: não mostra
    if (document.getElementById("install-banner")) return;
    const bar = document.createElement("div");
    bar.id = "install-banner";
    bar.className = "install-banner glass";
    bar.innerHTML = `<span class="bn-text">Eltech Personality</span>
      <button class="btn xs" id="ib-btn">Baixar app</button>
      <button class="ib-close" id="ib-close" aria-label="Fechar">×</button>`;
    document.body.appendChild(bar);
    requestAnimationFrame(() => bar.classList.add("show"));
    document.getElementById("ib-close").addEventListener("click", removeInstallBanner);
    document.getElementById("ib-btn").addEventListener("click", async () => {
      if (deferredInstall) {
        deferredInstall.prompt();
        await deferredInstall.userChoice;
        deferredInstall = null;
        removeInstallBanner();
      } else {
        modal(`<h2>Instalar o app</h2>
          <p class="muted"><b>iPhone/iPad (Safari):</b> toque em <b>Compartilhar</b> (quadrado com seta) e depois em <b>Adicionar à Tela de Início</b>.<br><br>
          <b>Android / computador:</b> abra o menu do navegador (⋮) e escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</p>
          <button class="btn" onclick="document.getElementById('modal-root').innerHTML=''">Entendi</button>`);
      }
    });
  }
  function removeInstallBanner() {
    const b = document.getElementById("install-banner");
    if (b) b.remove();
  }

  // ======================================================================
  //  Boot
  // ======================================================================
  async function boot() {
    applyTheme(currentTheme()); // mantém o tema salvo (padrão: claro) ao recarregar
    try {
      state.user = await Auth.currentUser();
    } catch (e) {
      console.error("Erro ao ler sessão:", e);
    }
    window.addEventListener("hashchange", route);
    window.addEventListener("online", () => { const b = qs(".online-badge"); if (b) route(); });
    window.addEventListener("offline", () => { const b = qs(".online-badge"); if (b) route(); });
    document.addEventListener("keydown", handleEnterKey);
    route();
    // Mostra o convite para instalar sempre que abrir (se ainda não instalado).
    setTimeout(() => { if (!isStandalone()) showInstallBanner(); }, 800);
  }

  // Enter (celular e PC) = confirmar / entrar / ok.
  function handleEnterKey(e) {
    if (e.key !== "Enter" || e.shiftKey) return;
    const ae = document.activeElement;
    if (ae && ae.tagName === "TEXTAREA") return; // textarea: quebra de linha normal

    // 1) Se há um modal aberto, aciona o botão principal (Sim/Ok/Entrar).
    const modalBtn = document.querySelector(
      "#modal-root .modal .btn:not(.secondary):not([disabled])"
    );
    if (modalBtn) { e.preventDefault(); modalBtn.click(); return; }

    // 2) Aciona o botão principal do bloco (card/formulário) onde está o cursor.
    if (!ae) return;
    const scope = ae.closest(".card, .login-form");
    if (!scope) return;
    const btn = scope.querySelector(".btn:not(.secondary):not(.ghost):not([disabled])");
    if (btn) { e.preventDefault(); btn.click(); }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
