/* ELTECH Personality - Autenticação (100% offline)
 * As senhas NUNCA são salvas em texto puro. Usamos PBKDF2 (SHA-256, 150k
 * iterações) com salt aleatório por usuário via Web Crypto API.
 */
(function (global) {
  "use strict";

  const SESSION_KEY = "personality.session";
  const PBKDF2_ITERATIONS = 150000;

  // ---- Validação de senha ------------------------------------------------
  const PASSWORD_RULES = [
    { key: "length", label: "Pelo menos 8 caracteres", test: (v) => v.length >= 8 },
    { key: "upper", label: "Uma letra maiúscula", test: (v) => /[A-Z]/.test(v) },
    { key: "lower", label: "Uma letra minúscula", test: (v) => /[a-z]/.test(v) },
    { key: "number", label: "Um número", test: (v) => /\d/.test(v) },
    {
      key: "special",
      label: "Um caractere especial",
      test: (v) => /[@$!%*?&.#_\-+=(){}\[\]:;<>,/\\|~^]/.test(v)
    }
  ];

  function checkPassword(value) {
    const results = PASSWORD_RULES.map((r) => ({
      key: r.key,
      label: r.label,
      ok: r.test(value || "")
    }));
    const passed = results.filter((r) => r.ok).length;
    return { results, passed, total: PASSWORD_RULES.length, valid: passed === PASSWORD_RULES.length };
  }

  // Força 0..4 para o medidor visual.
  function passwordStrength(value) {
    if (!value) return { score: 0, label: "—", className: "s0" };
    const { passed } = checkPassword(value);
    let score = passed;
    if (value.length >= 12) score = Math.min(5, score + 1);
    const map = [
      { label: "Muito fraca", className: "s0" },
      { label: "Muito fraca", className: "s1" },
      { label: "Fraca", className: "s2" },
      { label: "Boa", className: "s3" },
      { label: "Forte", className: "s4" },
      { label: "Excelente", className: "s5" }
    ];
    const m = map[Math.min(score, 5)];
    return { score, label: m.label, className: m.className };
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((email || "").trim());
  }

  // ---- Hash de senha -----------------------------------------------------
  function bufToHex(buf) {
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  function hexToBuf(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    return bytes;
  }

  async function deriveHash(password, saltBytes) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
      keyMaterial, 256
    );
    return bufToHex(bits);
  }

  async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await deriveHash(password, salt);
    return { hash, salt: bufToHex(salt) };
  }

  async function verifyPassword(password, saltHex, expectedHash) {
    const hash = await deriveHash(password, hexToBuf(saltHex));
    // Comparação simples (offline, sem risco de timing relevante).
    return hash === expectedHash;
  }

  // ---- Contas ------------------------------------------------------------
  async function register({ name, email, password }) {
    email = (email || "").trim().toLowerCase();
    name = (name || "").trim();
    if (!name) throw new Error("Informe seu nome.");
    if (!isValidEmail(email)) throw new Error("E-mail inválido.");
    if (!checkPassword(password).valid) throw new Error("A senha não atende aos requisitos.");

    const existing = await DB.get("users", email);
    if (existing) throw new Error("Este e-mail já está cadastrado.");

    const { hash, salt } = await hashPassword(password);
    const isFirstUser = (await DB.count("users")) === 0;
    const user = {
      email,
      name,
      passwordHash: hash,
      salt,
      role: "aluno",
      isOwner: isFirstUser, // o primeiro cadastro vira "dono" do dispositivo
      createdAt: new Date().toISOString(),
      profile: {}
    };
    await DB.put("users", user);
    return sanitize(user);
  }

  // Aceita e-mail OU nome (como no ELTECH).
  async function findUser(identifier) {
    const id = (identifier || "").trim().toLowerCase();
    if (!id) return null;
    if (id.includes("@")) return DB.get("users", id);
    const all = await DB.getAll("users");
    return all.find((u) => (u.name || "").trim().toLowerCase() === id) || null;
  }

  async function login({ email, password, keep = true }) {
    const user = await findUser(email);
    if (!user) throw new Error("Conta não encontrada.");
    const ok = await verifyPassword(password, user.salt, user.passwordHash);
    if (!ok) throw new Error("Senha incorreta.");
    setSession(user.email, keep);
    return sanitize(user);
  }

  // keep=true  -> sessão persiste entre aberturas (localStorage)
  // keep=false -> sessão só até fechar o app (sessionStorage)
  function setSession(email, keep = true) {
    logout();
    (keep ? localStorage : sessionStorage).setItem(SESSION_KEY, email);
  }
  function logout() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }
  async function currentUser() {
    const email = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!email) return null;
    const user = await DB.get("users", email);
    return user ? sanitize(user) : null;
  }

  function sanitize(user) {
    const { passwordHash, salt, ...safe } = user;
    return safe;
  }

  global.Auth = {
    checkPassword,
    passwordStrength,
    isValidEmail,
    register,
    login,
    logout,
    currentUser,
    setSession,
    PASSWORD_RULES
  };
})(window);
