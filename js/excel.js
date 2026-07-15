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

  global.Excel = { parseFile, downloadTemplate, loadXLSX };
})(window);
