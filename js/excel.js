/* ELTECH Personality - Importação/Exportação de Excel (SheetJS)
 * UM ÚNICO arquivo alimenta o app, com as abas:
 *   - "Treino": Semana | Dia | Exercício | Séries | Repetições | Descanso | Observação
 *   - "Ficha do Aluno": dados pessoais, objetivos, saúde, hábitos, avaliação, composição
 *   - "Instruções": como preencher
 */
(function (global) {
  "use strict";

  const XLSX_CDN =
    "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";

  let xlsxLoading = null;
  function loadXLSX() {
    if (global.XLSX) return Promise.resolve(global.XLSX);
    if (xlsxLoading) return xlsxLoading;
    xlsxLoading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = XLSX_CDN;
      s.onload = () => resolve(global.XLSX);
      s.onerror = () =>
        reject(new Error("Não foi possível carregar a biblioteca de Excel. Conecte-se à internet no primeiro uso."));
      document.head.appendChild(s);
    });
    return xlsxLoading;
  }

  function normalizeKey(k) {
    return String(k || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  // ===================================================================
  //  TREINO
  // ===================================================================
  const HEADER_MAP = {
    tipo: "type", type: "type",
    exercicio: "exercise", exercicios: "exercise", exercise: "exercise",
    serie: "sets", series: "sets", sets: "sets",
    repeticoes: "reps", repeticao: "reps", rep: "reps", reps: "reps", repeticao: "reps",
    descanso: "rest", rest: "rest",
    observacao: "obs", observacoes: "obs", obs: "obs",
    video: "video", videos: "video", link: "video"
  };

  // Lê a aba de treino agrupando por "Tipo" (livre: A, B, Peito, Segunda...).
  // Colunas: Tipo | Exercício | Séries | Repetições | Descanso | Observação.
  function parsePlanSheet(XLSX, sheet, fileName, videoMap) {
    if (!sheet) return null;
    videoMap = videoMap || {};
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (!aoa.length) return null;

    // Encontra a linha de cabeçalho (ignora um título acima, se houver).
    let headerIdx = -1;
    let col = null;
    for (let i = 0; i < aoa.length; i++) {
      const m = {};
      (aoa[i] || []).forEach((c, idx) => {
        const f = HEADER_MAP[normalizeKey(c)];
        if (f && m[f] == null) m[f] = idx;
      });
      if (m.exercise != null) { headerIdx = i; col = m; break; }
    }
    if (headerIdx < 0) return null;

    const order = [];
    const byKey = {};
    const titleByKey = {};
    let count = 0;
    let pendingTitle = null;
    const isPlaceholder = (s) => normalizeKey(s).includes("titulo do treino");

    for (let i = headerIdx + 1; i < aoa.length; i++) {
      const row = aoa[i] || [];
      const tipo = col.type != null ? String(row[col.type] == null ? "" : row[col.type]).trim() : "";
      const exercise = String(row[col.exercise] == null ? "" : row[col.exercise]).trim();

      // Linha de título do treino (Tipo = "-"): define o nome do próximo grupo.
      if (tipo === "-" || tipo === "—") {
        pendingTitle = exercise && !isPlaceholder(exercise) ? exercise : null;
        continue;
      }
      if (!exercise || isPlaceholder(exercise)) continue;

      const key = tipo || "Geral";
      if (!(key in byKey)) {
        byKey[key] = [];
        order.push(key);
        titleByKey[key] = pendingTitle;
        pendingTitle = null;
      } else if (pendingTitle && !titleByKey[key]) {
        titleByKey[key] = pendingTitle;
        pendingTitle = null;
      }
      const ownVideo = String(col.video != null ? row[col.video] : "").trim();
      byKey[key].push({
        name: exercise,
        sets: parseInt(row[col.sets], 10) || 3,
        reps: String(col.reps != null ? row[col.reps] : "").trim() || "10",
        rest: parseInt(row[col.rest], 10) || 60,
        obs: String(col.obs != null ? row[col.obs] : "").trim(),
        video: ownVideo || videoMap[normalizeKey(exercise)] || ""
      });
      count++;
    }
    if (count === 0) return null;

    const types = order.map((key) => ({ name: titleByKey[key] || ("Treino " + key), exercises: byKey[key] }));
    return { fileName: fileName || "", totalExercises: count, totalTypes: types.length, types };
  }

  // ===================================================================
  //  FICHA DO ALUNO
  //  Tipos de seção:
  //   - undefined  -> Campo | Valor | Unidade
  //   - "objetivos"-> Objetivo | Marcar (X)
  //   - "simnao"   -> Campo | Valor (SIM/NÃO) | Descrição
  //   - subsections com unit (cm/mm)
  // ===================================================================
  const STUDENT_SCHEMA = [
    {
      title: "Dados pessoais",
      fields: [
        { key: "nome", label: "Nome" },
        { key: "idade", label: "Idade", unit: "anos" },
        { key: "altura", label: "Altura", unit: "m" },
        { key: "peso", label: "Peso", unit: "kg" },
        { key: "sexo", label: "Sexo" },
        { key: "nascimento", label: "Data de nascimento" },
        { key: "telefone", label: "Telefone" },
        { key: "email", label: "E-mail" },
        { key: "profissao", label: "Profissão" },
        { key: "emergencia", label: "Contato de emergência" }
      ]
    },
    {
      title: "Objetivos",
      type: "objetivos",
      fields: [
        { key: "obj_emagrecimento", label: "Emagrecimento" },
        { key: "obj_massa", label: "Ganho de massa muscular" },
        { key: "obj_condicionamento", label: "Melhora do condicionamento físico" },
        { key: "obj_hipertrofia", label: "Hipertrofia" },
        { key: "obj_reabilitacao", label: "Reabilitação" },
        { key: "obj_performance", label: "Performance esportiva" },
        { key: "obj_saude", label: "Saúde e qualidade de vida" }
      ]
    },
    {
      title: "Histórico de saúde",
      type: "simnao",
      fields: [
        { key: "doencas", label: "Doenças diagnosticadas" },
        { key: "cirurgias", label: "Cirurgias anteriores" },
        { key: "lesoes", label: "Lesões" },
        { key: "dores", label: "Dores atuais" },
        { key: "medicamentos", label: "Uso de medicamentos" },
        { key: "alergias", label: "Alergias" }
      ]
    },
    {
      title: "Hábitos de vida",
      type: "texto",
      fields: [
        { key: "freq_ativ", label: "Frequência de atividade física" },
        { key: "modalidade", label: "Modalidade praticada" },
        { key: "tempo_pratica", label: "Tempo de prática" },
        { key: "horas_sono", label: "Horas de sono" },
        { key: "qual_sono", label: "Qualidade do sono" },
        { key: "agua", label: "Consumo de água" },
        { key: "alcool", label: "Consumo de álcool" },
        { key: "tabagismo", label: "Tabagismo" },
        { key: "estresse", label: "Nível de estresse" },
        { key: "alimentacao", label: "Alimentação" }
      ]
    },
    {
      title: "Avaliação antropométrica",
      subsections: [
        {
          subtitle: "Circunferências",
          unit: "cm",
          fields: [
            { key: "circ_pescoco", label: "Pescoço" },
            { key: "circ_ombros", label: "Ombros" },
            { key: "circ_torax", label: "Tórax" },
            { key: "circ_cintura", label: "Cintura" },
            { key: "circ_abdomen", label: "Abdômen" },
            { key: "circ_quadril", label: "Quadril" },
            { key: "circ_braco_rel", label: "Braço relaxado" },
            { key: "circ_braco_con", label: "Braço contraído" },
            { key: "circ_antebraco", label: "Antebraço" },
            { key: "circ_coxa", label: "Coxa" },
            { key: "circ_panturrilha", label: "Panturrilha" }
          ]
        },
        {
          subtitle: "Dobras cutâneas",
          unit: "mm",
          fields: [
            { key: "db_tricipital", label: "Tricipital" },
            { key: "db_bicipital", label: "Bicipital" },
            { key: "db_subescapular", label: "Subescapular" },
            { key: "db_suprailiaca", label: "Supra-ilíaca" },
            { key: "db_abdominal", label: "Abdominal" },
            { key: "db_axilar", label: "Axilar média" },
            { key: "db_coxa", label: "Coxa (dobra)" },
            { key: "db_panturrilha", label: "Panturrilha (dobra)" }
          ]
        }
      ]
    },
    {
      title: "Composição corporal",
      fields: [
        { key: "perc_gordura", label: "Percentual de gordura", unit: "%" },
        { key: "massa_muscular", label: "Massa muscular", unit: "kg" },
        { key: "massa_magra", label: "Massa magra", unit: "kg" },
        { key: "massa_ossea", label: "Massa óssea", unit: "kg" },
        { key: "agua_corporal", label: "Água corporal", unit: "%" },
        { key: "gordura_visceral", label: "Gordura visceral" },
        { key: "tmb", label: "Taxa metabólica basal (TMB)", unit: "kcal" }
      ]
    }
  ];

  // Lista achatada com metadado se o campo tem coluna "Descrição".
  function fichaFields() {
    const out = [];
    STUDENT_SCHEMA.forEach((s) => {
      const desc = s.type === "simnao";
      if (s.subsections) s.subsections.forEach((sub) => sub.fields.forEach((f) => out.push({ key: f.key, label: f.label, desc: false })));
      else s.fields.forEach((f) => out.push({ key: f.key, label: f.label, desc }));
    });
    return out;
  }

  function cellToStr(v) {
    if (v instanceof Date) return v.toLocaleDateString("pt-BR");
    return String(v == null ? "" : v).trim();
  }

  function parseFichaSheet(XLSX, sheet) {
    if (!sheet) return null;
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const lookup = {};
    fichaFields().forEach((f) => (lookup[normalizeKey(f.label)] = f));

    const out = {};
    let count = 0;
    rows.forEach((r) => {
      if (!r || r.length < 2) return;
      const entry = lookup[normalizeKey(r[0])];
      if (!entry) return;
      const val = cellToStr(r[1]);
      if (val === "") return;
      out[entry.key] = val;
      if (entry.desc) {
        const dval = cellToStr(r[2]);
        if (dval !== "") out[entry.key + "_desc"] = dval;
      }
      count++;
    });
    return count ? { data: out, count } : null;
  }

  // Biblioteca de exercícios: mapa nome-normalizado -> link do vídeo.
  function parseLibrarySheet(XLSX, sheet) {
    const map = {};
    if (!sheet) return map;
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    let hIdx = -1, exCol = -1, vidCol = -1;
    for (let i = 0; i < aoa.length; i++) {
      let e = -1, v = -1;
      (aoa[i] || []).forEach((c, idx) => {
        const f = HEADER_MAP[normalizeKey(c)];
        if (f === "exercise" && e < 0) e = idx;
        if (f === "video" && v < 0) v = idx;
      });
      if (e >= 0) { hIdx = i; exCol = e; vidCol = v; break; }
    }
    if (hIdx < 0 || vidCol < 0) return map;
    for (let i = hIdx + 1; i < aoa.length; i++) {
      const row = aoa[i] || [];
      const name = String(row[exCol] == null ? "" : row[exCol]).trim();
      const vid = String(row[vidCol] == null ? "" : row[vidCol]).trim();
      if (name && vid) map[normalizeKey(name)] = vid;
    }
    return map;
  }

  // Lê o arquivo inteiro e devolve { plan, ficha } (cada um pode ser null).
  async function parseWorkbook(file) {
    const XLSX = await loadXLSX();
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const names = wb.SheetNames;
    const treinoName = names.find((n) => normalizeKey(n).includes("treino")) || names[0];
    const fichaName = names.find((n) => normalizeKey(n).includes("ficha"));
    const libName = names.find((n) => {
      const k = normalizeKey(n);
      return k.includes("exerc") || k.includes("bibliotec") || k.includes("base");
    });
    const videoMap = libName ? parseLibrarySheet(XLSX, wb.Sheets[libName]) : {};
    return {
      plan: treinoName ? parsePlanSheet(XLSX, wb.Sheets[treinoName], file.name, videoMap) : null,
      ficha: fichaName ? parseFichaSheet(XLSX, wb.Sheets[fichaName]) : null
    };
  }

  // ===================================================================
  //  MODELO (um único arquivo com todas as abas)
  // ===================================================================
  function buildFichaAoa() {
    const aoa = [
      ["FICHA DO ALUNO — ELTECH Personality"],
      ["Preencha as colunas em branco. Campos vazios não aparecem no app."],
      []
    ];
    STUDENT_SCHEMA.forEach((s) => {
      aoa.push([s.title.toUpperCase()]);
      if (s.type === "objetivos") {
        aoa.push(["Objetivo", "Marcar (X)"]);
        s.fields.forEach((f) => aoa.push([f.label, ""]));
      } else if (s.type === "simnao") {
        aoa.push(["Campo", "Valor (SIM/NÃO)", "Descrição"]);
        s.fields.forEach((f) => aoa.push([f.label, "", ""]));
      } else if (s.type === "texto") {
        aoa.push(["Campo", "Descrição"]);
        s.fields.forEach((f) => aoa.push([f.label, ""]));
      } else if (s.subsections) {
        s.subsections.forEach((sub) => {
          aoa.push([sub.subtitle]);
          aoa.push(["Campo", "Dados", "Unidade"]);
          sub.fields.forEach((f) => aoa.push([f.label, "", sub.unit || ""]));
        });
      } else {
        aoa.push(["Campo", "Dados", "Unidade"]);
        s.fields.forEach((f) => aoa.push([f.label, "", f.unit || ""]));
      }
      aoa.push([]);
    });
    return aoa;
  }

  function buildTreinoAoa() {
    const T = () => ["-", "TÍTULO DO TREINO (MUDAR NOME)", "-", "-", "-", "-"];
    return [
      ["TREINO DO ALUNO — ELTECH Personality"],
      [],
      ["Tipo", "Exercício", "Séries", "Repetições", "Descanso", "Observação"],
      T(),
      ["A", "Agachamento", 4, "10 - 12", 60, ""],
      ["A", "Cadeira Extensora", 4, "10 - 12", 60, ""],
      ["A", "Cadeira Flexora", 4, "10 - 12", 60, ""],
      T(),
      ["B", "Rosca Direta", 3, "12", 60, ""],
      ["B", "Rosca Alternada", 3, "12", 60, ""],
      T(),
      ["C", "Supino Inclinado", 4, "15", 60, ""],
      ["C", "Crossover", 4, "15", 60, ""]
    ];
  }

  function buildLibraryAoa() {
    return [
      ["BIBLIOTECA DE EXERCÍCIOS — ELTECH Personality"],
      ["Cadastre aqui cada exercício e o link do vídeo (uma vez)."],
      ["No Treino, ao usar o mesmo nome, o vídeo é puxado automaticamente."],
      [],
      ["Exercício", "Vídeo"],
      ["Agachamento", ""],
      ["Cadeira Extensora", ""],
      ["Cadeira Flexora", ""],
      ["Rosca Direta", ""],
      ["Supino Inclinado", ""],
      ["Crossover", ""]
    ];
  }

  function buildGuideAoa() {
    return [
      ["COMO PREENCHER — ELTECH Personality"],
      [""],
      ["Este único arquivo alimenta o app do aluno. Preencha as abas 'Ficha do Aluno' e 'Treino'."],
      [""],
      ["ABA 'FICHA DO ALUNO'"],
      ["• Não altere os nomes dos campos (coluna da esquerda)."],
      ["• Campos deixados em branco NÃO aparecem no app."],
      ["• OBJETIVOS: escreva X (ou Sim) nos objetivos desejados."],
      ["• HISTÓRICO DE SAÚDE: escreva SIM ou NÃO e detalhe na coluna Descrição."],
      ["• HÁBITOS DE VIDA: escreva a informação na coluna Descrição."],
      ["• Altura em metros (m); circunferências em cm; dobras cutâneas em mm."],
      ["• Datas no formato dd/mm/aaaa."],
      [""],
      ["ABA 'TREINO'"],
      ["• Colunas: Tipo | Exercício | Séries | Repetições | Descanso | Observação."],
      ["• TIPO é livre: use o que quiser (A, B, C, Peito, Perna, Segunda...)."],
      ["• Uma linha por exercício, agrupados pelo Tipo."],
      ["• Repetições pode ser um número (10) ou uma faixa (10-12). Descanso em segundos."],
      ["• Observação: recado opcional para o aluno naquele exercício."],
      ["• O vídeo de cada exercício vem da aba 'Exercícios' (pelo nome) — não precisa aqui."],
      [""],
      ["ABA 'EXERCÍCIOS' (biblioteca de vídeos)"],
      ["• Cadastre cada exercício e o link do YouTube uma única vez."],
      ["• No Treino, ao escrever o mesmo nome do exercício, o vídeo é puxado automaticamente."],
      ["• Maiúsculas/minúsculas e acentos não importam para o casamento do nome."],
      [""],
      ["Depois é só enviar o arquivo ao aluno. Ele importa em: Perfil > Área do Professor > Importar dados."]
    ];
  }

  async function downloadTemplate() {
    const XLSX = await loadXLSX();
    const wb = XLSX.utils.book_new();

    // 1) Ficha do Aluno
    const wsFicha = XLSX.utils.aoa_to_sheet(buildFichaAoa());
    wsFicha["!cols"] = [{ wch: 34 }, { wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsFicha, "Ficha do Aluno");

    // 2) Treino (por Tipo)
    const wsTreino = XLSX.utils.aoa_to_sheet(buildTreinoAoa());
    wsTreino["!cols"] = [{ wch: 10 }, { wch: 26 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsTreino, "Treino");

    // 3) Biblioteca de exercícios (nome -> vídeo)
    const wsLib = XLSX.utils.aoa_to_sheet(buildLibraryAoa());
    wsLib["!cols"] = [{ wch: 28 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsLib, "Exercícios");

    // 4) Instruções
    const wsGuide = XLSX.utils.aoa_to_sheet(buildGuideAoa());
    wsGuide["!cols"] = [{ wch: 95 }];
    XLSX.utils.book_append_sheet(wb, wsGuide, "Instruções");

    XLSX.writeFile(wb, "eltech_personality_modelo.xlsx");
  }

  global.Excel = {
    loadXLSX,
    parseWorkbook,
    downloadTemplate,
    STUDENT_SCHEMA
  };
})(window);
