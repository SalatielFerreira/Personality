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
    semana: "week", week: "week",
    dia: "day", treino: "day", day: "day",
    exercicio: "exercise", exercise: "exercise",
    serie: "sets", series: "sets", sets: "sets",
    repeticoes: "reps", repeticao: "reps", rep: "reps", reps: "reps",
    descanso: "rest", rest: "rest",
    observacao: "obs", obs: "obs", observacoes: "obs"
  };

  function mapRow(row) {
    const out = {};
    Object.keys(row).forEach((k) => {
      const field = HEADER_MAP[normalizeKey(k)];
      if (field) out[field] = row[k];
    });
    return out;
  }

  function parsePlanSheet(XLSX, sheet, fileName) {
    if (!sheet) return null;
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (!rows.length) return null;

    const weeksMap = {};
    let count = 0;
    rows.forEach((raw) => {
      const r = mapRow(raw);
      if (!r.exercise || String(r.exercise).trim() === "") return;
      const week = parseInt(r.week, 10) || 1;
      const day = String(r.day || "A").trim().toUpperCase();
      weeksMap[week] = weeksMap[week] || {};
      weeksMap[week][day] = weeksMap[week][day] || [];
      weeksMap[week][day].push({
        name: String(r.exercise).trim(),
        sets: parseInt(r.sets, 10) || 3,
        reps: String(r.reps || "").trim() || "10",
        rest: parseInt(r.rest, 10) || 60,
        obs: String(r.obs || "").trim()
      });
      count++;
    });
    if (count === 0) return null;

    const weeks = Object.keys(weeksMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map((weekNum) => ({
        week: weekNum,
        days: Object.keys(weeksMap[weekNum])
          .sort()
          .map((dayKey) => ({ day: dayKey, exercises: weeksMap[weekNum][dayKey] }))
      }));

    return { fileName: fileName || "", totalExercises: count, totalWeeks: weeks.length, weeks };
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
        { key: "altura", label: "Altura", unit: "cm" },
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
      type: "simnao",
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

  // Lê o arquivo inteiro e devolve { plan, ficha } (cada um pode ser null).
  async function parseWorkbook(file) {
    const XLSX = await loadXLSX();
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const names = wb.SheetNames;
    const treinoName = names.find((n) => normalizeKey(n).includes("treino")) || names[0];
    const fichaName = names.find((n) => normalizeKey(n).includes("ficha"));
    return {
      plan: treinoName ? parsePlanSheet(XLSX, wb.Sheets[treinoName], file.name) : null,
      ficha: fichaName ? parseFichaSheet(XLSX, wb.Sheets[fichaName]) : null
    };
  }

  // ===================================================================
  //  MODELO (um único arquivo com todas as abas)
  // ===================================================================
  async function downloadTemplate() {
    const XLSX = await loadXLSX();
    const wb = XLSX.utils.book_new();

    // --- Aba Treino ---
    const treinoRows = [
      { Semana: 1, Dia: "A", Exercício: "Supino Reto", Séries: 4, Repetições: "10", Descanso: 60, Observação: "Controle na descida" },
      { Semana: 1, Dia: "A", Exercício: "Crucifixo", Séries: 3, Repetições: "12", Descanso: 45, Observação: "Movimento lento" },
      { Semana: 1, Dia: "A", Exercício: "Tríceps Barra", Séries: 3, Repetições: "15", Descanso: 45, Observação: "" },
      { Semana: 1, Dia: "B", Exercício: "Agachamento", Séries: 4, Repetições: "10", Descanso: 90, Observação: "Amplitude total" },
      { Semana: 1, Dia: "B", Exercício: "Leg Press", Séries: 4, Repetições: "12", Descanso: 90, Observação: "" },
      { Semana: 2, Dia: "A", Exercício: "Supino Reto", Séries: 4, Repetições: "8", Descanso: 75, Observação: "Aumentar carga" }
    ];
    const wsTreino = XLSX.utils.json_to_sheet(treinoRows, {
      header: ["Semana", "Dia", "Exercício", "Séries", "Repetições", "Descanso", "Observação"]
    });
    wsTreino["!cols"] = [{ wch: 8 }, { wch: 6 }, { wch: 24 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, wsTreino, "Treino");

    // --- Aba Ficha do Aluno ---
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
      } else if (s.subsections) {
        s.subsections.forEach((sub) => {
          aoa.push([sub.subtitle]);
          aoa.push(["Campo", "Valor", "Unidade"]);
          sub.fields.forEach((f) => aoa.push([f.label, "", sub.unit || ""]));
        });
      } else {
        aoa.push(["Campo", "Valor", "Unidade"]);
        s.fields.forEach((f) => aoa.push([f.label, "", f.unit || ""]));
      }
      aoa.push([]);
    });
    const wsFicha = XLSX.utils.aoa_to_sheet(aoa);
    wsFicha["!cols"] = [{ wch: 34 }, { wch: 18 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsFicha, "Ficha do Aluno");

    // --- Aba Instruções ---
    const guide = [
      ["COMO PREENCHER — ELTECH Personality"],
      [""],
      ["Este único arquivo alimenta o app do aluno. Preencha as duas abas:"],
      [""],
      ["ABA 'TREINO'"],
      ["• Uma linha por série de exercício."],
      ["• Colunas: Semana | Dia (A, B, C...) | Exercício | Séries | Repetições | Descanso | Observação."],
      ["• Pode repetir o mesmo exercício em semanas diferentes para progredir a carga."],
      [""],
      ["ABA 'FICHA DO ALUNO'"],
      ["• Não altere os nomes dos campos (coluna da esquerda)."],
      ["• Campos deixados em branco NÃO aparecem no app."],
      ["• OBJETIVOS: escreva X (ou Sim) nos objetivos desejados."],
      ["• HISTÓRICO DE SAÚDE e HÁBITOS DE VIDA: escreva SIM ou NÃO na coluna Valor e detalhe na Descrição."],
      ["• CIRCUNFERÊNCIAS em centímetros (cm); DOBRAS CUTÂNEAS em milímetros (mm)."],
      ["• Datas no formato dd/mm/aaaa."],
      [""],
      ["Depois é só salvar o arquivo e importar em: Perfil > Área do Professor > Importar dados."]
    ];
    const wsGuide = XLSX.utils.aoa_to_sheet(guide);
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
