/* ELTECH Personality - Aplicação (SPA)
 * Roteamento por hash, telas e lógica de UI. Depende de db.js, auth.js, excel.js.
 */
(function () {
  "use strict";

  // Versão do app — manter igual em version.json e sw.js (CACHE_VERSION).
  const APP_VERSION = "1.5.0";

  // ---- Estado ------------------------------------------------------------
  const state = {
    user: null,
    plan: null,
    logs: {}, // mapa id -> log, carregado por treino
    currentWeek: null,
    currentDay: null
  };

  const WEIGHT_STEP = 2.5;

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
  function currentTheme() { return localStorage.getItem("personality.theme") || "dark"; }

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
    return { name: parts[0] || "home", params: parts.slice(1) };
  }

  function navigate(path) {
    if (location.hash === "#/" + path) route();
    else location.hash = "#/" + path;
  }

  async function route() {
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
    qs("#l-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });
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

  // ---- Home / Dashboard --------------------------------------------------
  VIEWS.home = async function () {
    await loadPlan();
    const first = state.user.name.split(" ")[0];
    const bsb = localNow();
    const greet = bsb.hour < 12 ? "Bom dia" : bsb.hour < 18 ? "Boa tarde" : "Boa noite";

    let planCard;
    if (!state.plan) {
      planCard = `
        <div class="card">
          <h3>Nenhum treino ainda</h3>
          <p class="muted">Peça ao seu personal para importar o treino, ou vá em
          <b>Perfil → Área do Professor</b> para importar a planilha de Excel.</p>
          <button class="btn secondary sm" id="go-prof">Área do Professor</button>
        </div>`;
    } else {
      const week = state.plan.weeks[0];
      const next = nextIncompleteDay(week);
      const prog = weekProgress(week);
      planCard = `
        <div class="card tap" id="continue-card">
          <div class="row between">
            <span class="pill primary">${esc(state.plan.fileName ? "Plano ativo" : "Treino")}</span>
            <span class="muted small">Semana ${week.week}</span>
          </div>
          <h2 style="margin-top:10px">${next ? "Treino " + esc(next.day) : "Semana concluída 🎉"}</h2>
          <p class="muted">${next ? next.exercises.length + " exercícios" : "Ótimo trabalho!"}</p>
          <div class="progress" style="margin:12px 0 6px"><span style="width:${prog}%"></span></div>
          <div class="row between"><span class="muted small">Progresso da semana</span><span class="small" style="font-weight:700">${prog}%</span></div>
          ${next ? `<button class="btn" style="margin-top:14px" id="start-btn">▶ ${prog > 0 ? "Continuar treino" : "Iniciar treino"}</button>` : ""}
        </div>`;
    }

    const stats = await computeStats();

    renderScreen(
      `
      <div class="top-header">
        <div>
          <div class="muted small" id="home-clock">${bsb.dateStr}</div>
          <div class="home-greet small">${greet},</div>
          <h1 class="home-name">${esc(first)}</h1>
        </div>
      </div>
      ${planCard}
      <div class="grid-2">
        <div class="card"><div class="stat-value grad-text">${stats.sessions}</div><div class="stat-label">Treinos concluídos</div></div>
        <div class="card"><div class="stat-value grad-text">${stats.sets}</div><div class="stat-label">Séries registradas</div></div>
        <div class="card"><div class="stat-value grad-text">${stats.volume}</div><div class="stat-label">Volume total (kg)</div></div>
        <div class="card"><div class="stat-value grad-text">${state.plan ? state.plan.totalWeeks : 0}</div><div class="stat-label">Semanas no plano</div></div>
      </div>`,
      { active: "home" }
    );

    startHomeClock();

    const go = qs("#go-prof");
    if (go) go.addEventListener("click", () => navigate("professor"));
    const cont = qs("#continue-card");
    if (cont) cont.addEventListener("click", () => navigate("treinos"));
    const startBtn = qs("#start-btn");
    if (startBtn) {
      startBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const week = state.plan.weeks[0];
        const next = nextIncompleteDay(week) || week.days[0];
        navigate(`workout/${week.week}/${next.day}`);
      });
    }
  };

  // ---- Treinos (lista semanas/dias) -------------------------------------
  VIEWS.treinos = async function () {
    await loadPlan();
    if (!state.plan) {
      renderScreen(
        `<h1>Treinos</h1>${emptyState("🏋️", "Sem treino importado", "Importe a planilha na Área do Professor.")}
         <button class="btn secondary" id="go-prof">Ir para Área do Professor</button>`,
        { active: "treinos" }
      );
      qs("#go-prof").addEventListener("click", () => navigate("professor"));
      return;
    }

    if (state.currentWeek == null) state.currentWeek = state.plan.weeks[0].week;
    const week = state.plan.weeks.find((w) => w.week === state.currentWeek) || state.plan.weeks[0];

    const weekChips = state.plan.weeks
      .map(
        (w) =>
          `<button class="chip ${w.week === week.week ? "active" : ""}" data-week="${w.week}">Semana ${w.week}</button>`
      )
      .join("");

    const dayCards = week.days
      .map((d) => {
        const prog = dayProgress(week.week, d);
        return `
        <div class="card tap" data-day="${esc(d.day)}">
          <div class="row between">
            <h3>Treino ${esc(d.day)}</h3>
            <span class="pill ${prog === 100 ? "primary" : "info"}">${prog}%</span>
          </div>
          <p class="muted small">${d.exercises.length} exercícios · ${d.exercises.reduce((a, e) => a + e.sets, 0)} séries</p>
          <div class="progress" style="margin-top:8px"><span style="width:${prog}%"></span></div>
        </div>`;
      })
      .join("");

    renderScreen(
      `<h1>Treinos</h1>
       <div class="day-chips">${weekChips}</div>
       ${dayCards}`,
      { active: "treinos" }
    );

    qsa(".chip[data-week]").forEach((c) =>
      c.addEventListener("click", () => {
        state.currentWeek = parseInt(c.dataset.week, 10);
        VIEWS.treinos();
      })
    );
    qsa(".card[data-day]").forEach((c) =>
      c.addEventListener("click", () => navigate(`workout/${week.week}/${c.dataset.day}`))
    );
  };

  // ---- Execução do treino -----------------------------------------------
  VIEWS.workout = async function (params) {
    await loadPlan();
    const weekNum = parseInt(params[0], 10);
    const dayKey = params[1];
    const week = state.plan && state.plan.weeks.find((w) => w.week === weekNum);
    const day = week && week.days.find((d) => d.day === dayKey);
    if (!day) return navigate("treinos");

    state.currentWeek = weekNum;
    await loadLogs();

    const exCards = day.exercises
      .map((ex, exi) => renderExercise(weekNum, dayKey, ex, exi))
      .join("");

    renderScreen(
      `
      <div class="top-header">
        <button class="btn-link" id="back">← Treinos</button>
        <span class="pill primary">Semana ${weekNum} · Treino ${esc(dayKey)}</span>
      </div>
      <div class="progress" style="margin-bottom:4px"><span id="w-progress" style="width:${dayProgress(weekNum, day)}%"></span></div>
      <p class="muted small" id="w-progress-label">${dayProgress(weekNum, day)}% concluído</p>

      <div class="card" id="timer-card">
        <div class="timer-wrap">
          <div class="muted small">Descanso</div>
          <div class="timer-time" id="timer-display">00:00</div>
          <div class="timer-presets">
            <button class="btn secondary sm" data-sec="45">45s</button>
            <button class="btn secondary sm" data-sec="60">60s</button>
            <button class="btn secondary sm" data-sec="90">90s</button>
            <button class="btn secondary sm" data-sec="120">120s</button>
          </div>
          <div class="row"><button class="btn secondary sm" id="timer-stop">Parar</button></div>
        </div>
      </div>

      ${exCards}

      <button class="btn" id="finish" style="margin-top:8px">✔ Finalizar treino</button>`,
      { nav: false, help: "workout" }
    );

    qs("#back").addEventListener("click", () => navigate("treinos"));

    // Timer
    qsa("#timer-card [data-sec]").forEach((b) =>
      b.addEventListener("click", () => startTimer(parseInt(b.dataset.sec, 10)))
    );
    qs("#timer-stop").addEventListener("click", stopTimer);

    // Steppers + checks (delegação)
    qsa(".ex-card").forEach((card) => bindExerciseCard(card, weekNum, dayKey, day));

    qs("#finish").addEventListener("click", () => {
      stopTimer();
      const prog = dayProgress(weekNum, day);
      confirmModal(
        "Finalizar treino?",
        prog < 100
          ? `Você concluiu ${prog}% das séries. Deseja finalizar mesmo assim?`
          : "Parabéns! Você concluiu todas as séries.",
        () => { toast("Treino salvo! 💪", "success"); navigate("treinos"); },
        "Finalizar"
      );
    });
  };

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
      `<h1>Evolução</h1>
       ${emptyState("📈", "Gráficos em breve", "No próximo módulo entram os gráficos de carga, peso corporal, volume e frequência — usando os dados que você já está registrando nos treinos.")}`,
      { active: "evolucao" }
    );
  };

  // ---- Agenda (placeholder) ---------------------------------------------
  VIEWS.agenda = async function () {
    renderScreen(
      `<h1>Agenda</h1>
       ${emptyState("📅", "Calendário em breve", "Aqui vai aparecer o calendário com dias treinados, faltas e cardio.")}`,
      { active: "agenda" }
    );
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
        <input type="file" id="avatar-input" accept="image/*" capture="user" hidden />
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

      <div class="card tap" id="prof-area">
        <div class="row between"><h3>Área do Professor</h3><span>›</span></div>
        <div class="muted small">Importar planilha de treino, gerenciar o plano</div>
      </div>

      <div class="card">
        <h3>Alterar senha</h3>
        <div class="field" style="margin-top:12px">
          <label>Senha atual</label>
          <div class="pass-wrap">
            <input class="form-input" id="cp-old" type="password" placeholder="Sua senha atual" />
            <button class="pass-toggle" data-target="cp-old" type="button">${EYE_SVG}</button>
          </div>
        </div>
        <div class="field">
          <label>Nova senha</label>
          <div class="pass-wrap">
            <input class="form-input" id="cp-new" type="password" placeholder="Crie uma nova senha" />
            <button class="pass-toggle" data-target="cp-new" type="button">${EYE_SVG}</button>
          </div>
          <div class="muted small" style="margin-top:6px">Mín. 8 caracteres, com maiúscula, minúscula, número e caractere especial.</div>
        </div>
        <div class="error-text" id="cp-error"></div>
        <button class="btn" id="cp-save">Salvar nova senha</button>
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

    qs("#prof-area").addEventListener("click", () => navigate("professor"));

    // Alterar senha
    bindPasswordToggles();
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
          <div class="row between"><h3>Plano atual</h3><span class="pill primary">${state.plan.totalExercises} exercícios</span></div>
          <p class="muted small">Arquivo: ${esc(state.plan.fileName || "—")}</p>
          <p class="muted small">${state.plan.totalWeeks} semana(s) · importado em ${new Date(state.plan.importedAt).toLocaleDateString("pt-BR")}</p>
          <button class="btn danger sm" id="remove-plan" style="margin-top:10px">Remover plano</button>
        </div>`
      : `<div class="card muted">Nenhum plano importado ainda.</div>`;

    renderScreen(
      `
      <div class="top-header">
        <button class="btn-link" id="back">← Perfil</button>
        <span class="pill info">👨‍🏫 Professor</span>
      </div>
      <h1>Área do Professor</h1>

      <div class="card">
        <h3>1. Modelo de planilha</h3>
        <p class="muted small">Baixe o modelo, preencha no Excel e importe. Colunas:
        <b>Semana · Dia · Exercício · Séries · Repetições · Descanso · Observação</b>.</p>
        <button class="btn secondary" id="tpl">⬇ Baixar treino_modelo.xlsx</button>
      </div>

      <div class="card">
        <h3>2. Importar treino</h3>
        <div class="file-drop" id="drop">
          <div style="font-size:2rem">📄</div>
          <p>Toque para escolher o arquivo <b>.xlsx</b><br/><span class="small">ou arraste aqui</span></p>
        </div>
        <input type="file" id="xlsx-file" accept=".xlsx,.xls,.csv" hidden />
      </div>

      ${planSummary}`,
      { nav: false, help: "professor" }
    );

    qs("#back").addEventListener("click", () => navigate("perfil"));
    qs("#tpl").addEventListener("click", async () => {
      try { await Excel.downloadTemplate(); toast("Modelo baixado!", "success"); }
      catch (e) { toast(e.message, "error"); }
    });

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

    const removeBtn = qs("#remove-plan");
    if (removeBtn)
      removeBtn.addEventListener("click", () =>
        confirmModal("Remover plano?", "Isso apaga o treino importado (os registros de carga são mantidos).", async () => {
          await DB.delete("plans", state.user.email);
          state.plan = null;
          toast("Plano removido.");
          VIEWS.professor();
        }, "Remover", true)
      );

    async function handleImport(file) {
      toast("Lendo planilha…");
      try {
        const parsed = await Excel.parseFile(file);
        const doSave = async () => {
          const plan = { id: state.user.email, owner: state.user.email, ...parsed, importedAt: new Date().toISOString() };
          await DB.put("plans", plan);
          state.plan = plan;
          toast(`Treino importado: ${parsed.totalExercises} exercícios em ${parsed.totalWeeks} semana(s)!`, "success");
          VIEWS.professor();
        };
        if (state.plan) {
          confirmModal(
            "Substituir treino atual?",
            `A planilha tem ${parsed.totalExercises} exercícios (${parsed.totalWeeks} semanas). Deseja substituir o plano atual?`,
            doSave, "Substituir"
          );
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
        ["🏠", "Esta é sua tela inicial: veja o próximo treino e o progresso da semana."],
        ["▶️", "Toque em <b>Iniciar treino</b> para começar o treino do dia."],
        ["📊", "Os cards mostram treinos concluídos, séries, volume e semanas do plano."]
      ]
    },
    treinos: {
      title: "Treinos",
      items: [
        ["📅", "Escolha a <b>semana</b> nos botões do topo."],
        ["🅰️", "Cada card é um tipo de treino (A, B, C...). Toque para executá-lo."],
        ["✅", "A porcentagem mostra quanto daquele treino você já concluiu."]
      ]
    },
    workout: {
      title: "Executando o treino",
      items: [
        ["🏋️", "Para cada exercício, ajuste o <b>peso</b> e as <b>repetições</b> com os botões − e +."],
        ["✔️", "Toque no <b>✔</b> ao terminar cada série — o cronômetro de descanso inicia sozinho."],
        ["⏱️", "Use os botões do cronômetro (45s, 60s...) para controlar o descanso manualmente."],
        ["💾", "Seus pesos ficam salvos: na próxima vez já aparecem preenchidos."]
      ]
    },
    evolucao: {
      title: "Evolução",
      items: [["📈", "Em breve: gráficos de carga, peso corporal, volume e frequência."]]
    },
    agenda: {
      title: "Agenda",
      items: [["📆", "Em breve: calendário com os dias treinados, faltas e cardio."]]
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
    professor: {
      title: "Área do Professor",
      items: [
        ["⬇️", "Baixe o <b>modelo de Excel</b> já no formato certo."],
        ["📝", "Preencha uma linha por série: Semana, Dia, Exercício, Séries, Repetições, Descanso, Observação."],
        ["📄", "Toque na área de importar e escolha o arquivo <b>.xlsx</b> — o treino é montado automaticamente."],
        ["🔁", "Ao importar de novo, o app pergunta antes de substituir o treino atual."]
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
    bar.innerHTML = `<span>✨ Nova versão disponível</span>
      <button class="btn xs" id="ub-btn">Atualizar</button>`;
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
    bar.innerHTML = `<span>📲 Instale o ELTECH Personality no seu aparelho</span>
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
    applyTheme("light"); // sempre inicia no tema claro
    try {
      state.user = await Auth.currentUser();
    } catch (e) {
      console.error("Erro ao ler sessão:", e);
    }
    window.addEventListener("hashchange", route);
    window.addEventListener("online", () => { const b = qs(".online-badge"); if (b) route(); });
    window.addEventListener("offline", () => { const b = qs(".online-badge"); if (b) route(); });
    route();
    // Mostra o convite para instalar sempre que abrir (se ainda não instalado).
    setTimeout(() => { if (!isStandalone()) showInstallBanner(); }, 800);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
