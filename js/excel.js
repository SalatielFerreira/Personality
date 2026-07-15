/* ELTECH Personality - Importação/Exportação de Excel (SheetJS)
 * Formato esperado da planilha (uma linha por série de exercício):
 *   Semana | Dia | Exercício | Séries | Repetições | Descanso | Observação
 * "Dia" é o tipo de treino (A, B, C, ...). O app agrupa por Semana e Dia.
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

  // Aceita variações de acento/caixa nos cabeçalhos.
  const HEADER_MAP = {
    semana: "week", week: "week",
    dia: "day", treino: "day", day: "day",
    exercicio: "exercise", exercício: "exercise", exercise: "exercise",
    serie: "sets", série: "sets", series: "sets", séries: "sets", sets: "sets",
    repeticoes: "reps", repetições: "reps", repeticao: "reps", rep: "reps", reps: "reps",
    descanso: "rest", rest: "rest",
    observacao: "obs", observação: "obs", obs: "obs", observacoes: "obs", observações: "obs"
  };

  function normalizeKey(k) {
    return String(k || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  function mapRow(row) {
    const out = {};
    Object.keys(row).forEach((k) => {
      const norm = normalizeKey(k);
      const field = HEADER_MAP[norm];
      if (field) out[field] = row[k];
    });
    return out;
  }

  // Lê um File e devolve uma estrutura de plano pronta para salvar.
  async function parseFile(file) {
    const XLSX = await loadXLSX();
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows.length) throw new Error("A planilha está vazia.");

    const weeksMap = {};
    let count = 0;

    rows.forEach((raw) => {
      const r = mapRow(raw);
      if (!r.exercise || String(r.exercise).trim() === "") return; // ignora linhas vazias
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

    if (count === 0) throw new Error("Nenhum exercício válido encontrado. Confira os cabeçalhos da planilha.");

    // Ordena semanas e dias.
    const weeks = Object.keys(weeksMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map((weekNum) => {
        const days = Object.keys(weeksMap[weekNum])
          .sort()
          .map((dayKey) => ({ day: dayKey, exercises: weeksMap[weekNum][dayKey] }));
        return { week: weekNum, days };
      });

    return {
      fileName: file.name,
      totalExercises: count,
      totalWeeks: weeks.length,
      weeks
    };
  }

  // Gera e baixa um modelo .xlsx já preenchido com exemplos.
  async function downloadTemplate() {
    const XLSX = await loadXLSX();
    const rows = [
      { Semana: 1, Dia: "A", Exercício: "Supino Reto", Séries: 4, Repetições: "10", Descanso: 60, Observação: "Controle na descida" },
      { Semana: 1, Dia: "A", Exercício: "Crucifixo", Séries: 3, Repetições: "12", Descanso: 45, Observação: "Movimento lento" },
      { Semana: 1, Dia: "A", Exercício: "Tríceps Barra", Séries: 3, Repetições: "15", Descanso: 45, Observação: "" },
      { Semana: 1, Dia: "B", Exercício: "Agachamento", Séries: 4, Repetições: "10", Descanso: 90, Observação: "Amplitude total" },
      { Semana: 1, Dia: "B", Exercício: "Leg Press", Séries: 4, Repetições: "12", Descanso: 90, Observação: "" },
      { Semana: 2, Dia: "A", Exercício: "Supino Reto", Séries: 4, Repetições: "8", Descanso: 75, Observação: "Aumentar carga" }
    ];
    const ws = XLSX.utils.json_to_sheet(rows, {
      header: ["Semana", "Dia", "Exercício", "Séries", "Repetições", "Descanso", "Observação"]
    });
    ws["!cols"] = [
      { wch: 8 }, { wch: 6 }, { wch: 24 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 28 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Treino");
    XLSX.writeFile(wb, "treino_modelo.xlsx");
  }

  // =====================================================================
  //  FICHA DO ALUNO (dados vindos de um Excel preenchido pelo personal)
  // =====================================================================
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
          subtitle: "Circunferências (cm)",
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
          subtitle: "Dobras cutâneas (mm)",
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

  function fichaFields() {
    const out = [];
    STUDENT_SCHEMA.forEach((s) => {
      if (s.subsections) s.subsections.forEach((sub) => sub.fields.forEach((f) => out.push(f)));
      else s.fields.forEach((f) => out.push(f));
    });
    return out;
  }

  async function parseFichaFile(file) {
    const XLSX = await loadXLSX();
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    const lookup = {};
    fichaFields().forEach((f) => (lookup[normalizeKey(f.label)] = f.key));

    const out = {};
    let count = 0;
    rows.forEach((r) => {
      if (!r || r.length < 2) return;
      const key = lookup[normalizeKey(r[0])];
      if (!key) return;
      const raw = r[1];
      let val;
      if (raw instanceof Date) val = raw.toLocaleDateString("pt-BR");
      else val = String(raw == null ? "" : raw).trim();
      if (val === "") return;
      out[key] = val;
      count++;
    });

    if (count === 0)
      throw new Error("Nenhum dado reconhecido. Use o modelo e preencha a coluna Valor.");
    return { data: out, count };
  }

  async function downloadFichaTemplate() {
    const XLSX = await loadXLSX();
    const aoa = [
      ["FICHA DO ALUNO — ELTECH Personality"],
      ["Preencha apenas a coluna VALOR. Campos em branco não aparecem no app."],
      ["Em OBJETIVOS, escreva X (ou Sim) nos desejados. Não altere os nomes dos campos."],
      []
    ];
    STUDENT_SCHEMA.forEach((s) => {
      aoa.push([s.title.toUpperCase()]);
      if (s.type === "objetivos") {
        aoa.push(["Objetivo", "Marcar (X)"]);
        s.fields.forEach((f) => aoa.push([f.label, ""]));
      } else if (s.subsections) {
        s.subsections.forEach((sub) => {
          aoa.push([sub.subtitle]);
          aoa.push(["Campo", "Valor"]);
          sub.fields.forEach((f) => aoa.push([f.label, ""]));
        });
      } else {
        aoa.push(["Campo", "Valor", "Unidade"]);
        s.fields.forEach((f) => aoa.push([f.label, "", f.unit || ""]));
      }
      aoa.push([]);
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 34 }, { wch: 26 }, { wch: 12 }];

    const guide = [
      ["COMO PREENCHER A FICHA DO ALUNO"],
      [""],
      ["1. Preencha somente a coluna VALOR (ao lado de cada campo), na aba 'Ficha do Aluno'."],
      ["2. NÃO altere os nomes dos campos (coluna da esquerda) — o app usa eles para ler."],
      ["3. Campos deixados em branco não aparecem no app do aluno."],
      ["4. Em OBJETIVOS, escreva X ou Sim nos objetivos que o aluno deseja."],
      ["5. Circunferências em centímetros (cm); dobras cutâneas em milímetros (mm)."],
      ["6. Datas no formato dd/mm/aaaa."],
      ["7. Salve o arquivo e importe em: Perfil > Área do Professor > Ficha do aluno."]
    ];
    const gws = XLSX.utils.aoa_to_sheet(guide);
    gws["!cols"] = [{ wch: 80 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ficha do Aluno");
    XLSX.utils.book_append_sheet(wb, gws, "Instruções");
    XLSX.writeFile(wb, "ficha_do_aluno_modelo.xlsx");
  }

  global.Excel = {
    parseFile,
    downloadTemplate,
    loadXLSX,
    STUDENT_SCHEMA,
    parseFichaFile,
    downloadFichaTemplate
  };
})(window);
