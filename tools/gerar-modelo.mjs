/* Gera o modelo Excel do ELTECH Personality na raiz do projeto.
 * Ordem das abas: 1) Ficha do Aluno  2) Treino (por Tipo)  3) Instruções.
 * Mantém a MESMA estrutura lida pelo app (js/excel.js).
 * Uso:  npm run modelo    (ou: node tools/gerar-modelo.mjs)
 */
import * as XLSX from "xlsx";
import { fileURLToPath } from "url";
import path from "path";

const STUDENT_SCHEMA = [
  {
    title: "Dados pessoais",
    fields: [
      { label: "Nome" }, { label: "Idade", unit: "anos" }, { label: "Altura", unit: "m" },
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
    title: "Hábitos de vida", type: "texto",
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

// 1) Ficha do Aluno
const fichaAoa = [
  ["FICHA DO ALUNO — ELTECH Personality"],
  ["Preencha as colunas em branco. Campos vazios não aparecem no app."],
  []
];
STUDENT_SCHEMA.forEach((s) => {
  fichaAoa.push([s.title.toUpperCase()]);
  if (s.type === "objetivos") {
    fichaAoa.push(["Objetivo", "Marcar (X)"]);
    s.fields.forEach((f) => fichaAoa.push([f.label, ""]));
  } else if (s.type === "simnao") {
    fichaAoa.push(["Campo", "Valor (SIM/NÃO)", "Descrição"]);
    s.fields.forEach((f) => fichaAoa.push([f.label, "", ""]));
  } else if (s.type === "texto") {
    fichaAoa.push(["Campo", "Descrição"]);
    s.fields.forEach((f) => fichaAoa.push([f.label, ""]));
  } else if (s.subsections) {
    s.subsections.forEach((sub) => {
      fichaAoa.push([sub.subtitle]);
      fichaAoa.push(["Campo", "Dados", "Unidade"]);
      sub.fields.forEach((f) => fichaAoa.push([f.label, "", sub.unit || ""]));
    });
  } else {
    fichaAoa.push(["Campo", "Dados", "Unidade"]);
    s.fields.forEach((f) => fichaAoa.push([f.label, "", f.unit || ""]));
  }
  fichaAoa.push([]);
});
const wsFicha = XLSX.utils.aoa_to_sheet(fichaAoa);
wsFicha["!cols"] = [{ wch: 34 }, { wch: 20 }, { wch: 30 }];
XLSX.utils.book_append_sheet(wb, wsFicha, "Ficha do Aluno");

// 2) Treino (por Tipo livre)
const T = () => ["-", "TÍTULO DO TREINO (MUDAR NOME)", "-", "-", "-", "-", "-"];
const treinoAoa = [
  ["TREINO DO ALUNO — ELTECH Personality"],
  [],
  ["Tipo", "Exercício", "Séries", "Repetições", "Descanso", "Observação", "Vídeo"],
  T(),
  ["A", "Agachamento", 4, "10 - 12", 60, "", ""],
  ["A", "Cadeira Extensora", 4, "10 - 12", 60, "", ""],
  ["A", "Cadeira Flexora", 4, "10 - 12", 60, "", ""],
  T(),
  ["B", "Rosca Direta", 3, "12", 60, "", ""],
  ["B", "Rosca Alternada", 3, "12", 60, "", ""],
  T(),
  ["C", "Supino Inclinado", 4, "15", 60, "", ""],
  ["C", "Crossover", 4, "15", 60, "", ""]
];
const wsTreino = XLSX.utils.aoa_to_sheet(treinoAoa);
wsTreino["!cols"] = [{ wch: 10 }, { wch: 26 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 30 }, { wch: 40 }];
XLSX.utils.book_append_sheet(wb, wsTreino, "Treino");

// 3) Biblioteca de exercícios (nome -> vídeo)
const libAoa = [
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
const wsLib = XLSX.utils.aoa_to_sheet(libAoa);
wsLib["!cols"] = [{ wch: 28 }, { wch: 45 }];
XLSX.utils.book_append_sheet(wb, wsLib, "Exercícios");

// 4) Instruções
const guide = [
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
  ["• Vídeo: cole o link do YouTube (opcional) OU deixe em branco e cadastre na aba 'Exercícios'."],
  [""],
  ["ABA 'EXERCÍCIOS' (biblioteca de vídeos)"],
  ["• Cadastre cada exercício e o link do YouTube uma única vez."],
  ["• No Treino, ao escrever o mesmo nome do exercício, o vídeo é puxado automaticamente."],
  ["• Maiúsculas/minúsculas e acentos não importam para o casamento do nome."],
  [""],
  ["Depois é só enviar o arquivo ao aluno. Ele importa em: Perfil > Área do Professor > Importar dados."]
];
const wsGuide = XLSX.utils.aoa_to_sheet(guide);
wsGuide["!cols"] = [{ wch: 95 }];
XLSX.utils.book_append_sheet(wb, wsGuide, "Instruções");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "..", "eltech_personality_modelo.xlsx");
XLSX.writeFile(wb, out);
console.log("Modelo gerado em:", out);
