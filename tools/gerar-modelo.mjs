/* Gera o modelo Excel do ELTECH Personality na raiz do projeto.
 * Mantém a MESMA estrutura lida pelo app (js/excel.js).
 * Uso:  npm run modelo    (ou: node tools/gerar-modelo.mjs)
 * Ao mudar a ficha/treino em js/excel.js, atualize também este arquivo e rode de novo.
 */
import * as XLSX from "xlsx";
import { fileURLToPath } from "url";
import path from "path";

const STUDENT_SCHEMA = [
  {
    title: "Dados pessoais",
    fields: [
      { label: "Nome" }, { label: "Idade", unit: "anos" }, { label: "Altura", unit: "cm" },
      { label: "Peso", unit: "kg" }, { label: "Sexo" }, { label: "Data de nascimento" },
      { label: "Telefone" }, { label: "E-mail" }, { label: "Profissão" }, { label: "Contato de emergência" }
    ]
  },
  {
    title: "Objetivos", type: "objetivos",
    fields: [
      { label: "Emagrecimento" }, { label: "Ganho de massa muscular" },
      { label: "Melhora do condicionamento físico" }, { label: "Hipertrofia" },
      { label: "Reabilitação" }, { label: "Performance esportiva" }, { label: "Saúde e qualidade de vida" }
    ]
  },
  {
    title: "Histórico de saúde", type: "simnao",
    fields: [
      { label: "Doenças diagnosticadas" }, { label: "Cirurgias anteriores" }, { label: "Lesões" },
      { label: "Dores atuais" }, { label: "Uso de medicamentos" }, { label: "Alergias" }
    ]
  },
  {
    title: "Hábitos de vida", type: "simnao",
    fields: [
      { label: "Frequência de atividade física" }, { label: "Modalidade praticada" },
      { label: "Tempo de prática" }, { label: "Horas de sono" }, { label: "Qualidade do sono" },
      { label: "Consumo de água" }, { label: "Consumo de álcool" }, { label: "Tabagismo" },
      { label: "Nível de estresse" }, { label: "Alimentação" }
    ]
  },
  {
    title: "Avaliação antropométrica",
    subsections: [
      {
        subtitle: "Circunferências", unit: "cm",
        fields: [
          { label: "Pescoço" }, { label: "Ombros" }, { label: "Tórax" }, { label: "Cintura" },
          { label: "Abdômen" }, { label: "Quadril" }, { label: "Braço relaxado" },
          { label: "Braço contraído" }, { label: "Antebraço" }, { label: "Coxa" }, { label: "Panturrilha" }
        ]
      },
      {
        subtitle: "Dobras cutâneas", unit: "mm",
        fields: [
          { label: "Tricipital" }, { label: "Bicipital" }, { label: "Subescapular" },
          { label: "Supra-ilíaca" }, { label: "Abdominal" }, { label: "Axilar média" },
          { label: "Coxa (dobra)" }, { label: "Panturrilha (dobra)" }
        ]
      }
    ]
  },
  {
    title: "Composição corporal",
    fields: [
      { label: "Percentual de gordura", unit: "%" }, { label: "Massa muscular", unit: "kg" },
      { label: "Massa magra", unit: "kg" }, { label: "Massa óssea", unit: "kg" },
      { label: "Água corporal", unit: "%" }, { label: "Gordura visceral" },
      { label: "Taxa metabólica basal (TMB)", unit: "kcal" }
    ]
  }
];

const wb = XLSX.utils.book_new();

// --- Aba Treino (Semana do mês 1-4 · Dia da semana) ---
const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const treinoAoa = [
  ["MODELO DE TREINO — Semana = semana do mês (1 a 4) · Dia = dia da semana"],
  ["Semana", "Dia", "Exercício", "Séries", "Repetições", "Descanso", "Observação"]
];
for (let s = 1; s <= 4; s++) {
  DIAS.forEach((dia) => {
    if (s === 1 && dia === "Domingo") {
      treinoAoa.push([1, "Domingo", "Cadeira Extensora", 4, "10-12", 65, ""]);
      treinoAoa.push([1, "Domingo", "Cadeira Flexora", 4, "10-15", 45, ""]);
      treinoAoa.push([1, "Domingo", "Agachamento", 4, "12-15", 30, ""]);
    } else if (s === 1 && dia === "Segunda") {
      treinoAoa.push([1, "Segunda", "Rosca Direta", 3, "20", 20, ""]);
    } else {
      treinoAoa.push([s, dia, "", "", "", "", ""]);
    }
  });
}
const wsTreino = XLSX.utils.aoa_to_sheet(treinoAoa);
wsTreino["!cols"] = [{ wch: 8 }, { wch: 10 }, { wch: 24 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 28 }];
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
  ["Depois é só enviar este arquivo ao aluno. Ele importa em: Perfil > Área do Professor > Importar dados."]
];
const wsGuide = XLSX.utils.aoa_to_sheet(guide);
wsGuide["!cols"] = [{ wch: 95 }];
XLSX.utils.book_append_sheet(wb, wsGuide, "Instruções");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "..", "eltech_personality_modelo.xlsx");
XLSX.writeFile(wb, out);
console.log("Modelo gerado em:", out);
