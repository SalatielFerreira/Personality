# ELTECH Personality 🏋️

PWA (Progressive Web App) de treino personalizado para personal trainers e alunos.
Funciona **100% offline**, sem servidor, com todos os dados salvos no próprio navegador
(IndexedDB). Feito em **HTML + CSS + JavaScript puro** para hospedar no **GitHub Pages**.

## ✅ O que já funciona (build base — v1.0.0)

- **PWA instalável** (Android, iPhone, Windows, Mac) e **modo offline** via Service Worker.
- **Login e cadastro** com validação de senha em tempo real:
  - mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial;
  - checklist visual + medidor de força + confirmação de senha;
  - senha nunca salva em texto puro (hash **PBKDF2 / SHA-256** com salt via Web Crypto API).
- **Área do Professor**: baixa o modelo de Excel e importa a planilha do treino.
- **Execução do treino**: seleção por semana e tipo (A/B/C), ajuste de **peso** e repetições,
  marcar série como concluída e barra de progresso.
- **Cronômetro de descanso** com som e vibração.
- **Dashboard** com progresso da semana e estatísticas (treinos, séries, volume).
- **Backup**: exportar e importar todos os dados em `.json`.
- Tema **escuro** (padrão) e **claro**.

## 📋 Formato da planilha de treino

Uma linha por série de exercício. Cabeçalhos aceitos (com ou sem acento):

| Semana | Dia | Exercício | Séries | Repetições | Descanso | Observação |
|--------|-----|-----------|--------|------------|----------|------------|
| 1 | A | Supino Reto | 4 | 10 | 60 | Controle na descida |
| 1 | A | Crucifixo | 3 | 12 | 45 | |
| 1 | B | Agachamento | 4 | 10 | 90 | Amplitude total |

> Use o botão **"Baixar treino_modelo.xlsx"** dentro do app — ele gera a planilha já no formato certo.

## 🚀 Como testar localmente

O app usa Service Worker e módulos, então **não abra o `index.html` direto** (file://).
Suba um servidor local simples na pasta do projeto:

```bash
# opção 1 (Python)
python -m http.server 8080

# opção 2 (Node)
npx serve
```

Depois acesse `http://localhost:8080`.

## 🌐 Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie estes arquivos.
2. Em **Settings → Pages**, selecione a branch (`main`) e a pasta `/root`.
3. Acesse a URL gerada (ex.: `https://usuario.github.io/personality/`).
4. No celular, use "Adicionar à tela de início" para instalar como app.

> Observação: o SheetJS (leitura de Excel) é carregado de um CDN no primeiro uso e depois
> fica em cache para funcionar offline. É preciso ter internet na primeira importação.

## 🗂 Estrutura

```
PERSONALITY/
├── index.html          # shell da SPA
├── manifest.json       # configuração do PWA
├── sw.js               # service worker (offline)
├── css/style.css       # tema esportivo (escuro/claro)
├── js/
│   ├── db.js           # IndexedDB (banco PERSONALITY_DB)
│   ├── auth.js         # cadastro/login + hash de senha
│   ├── excel.js        # importar planilha + gerar modelo
│   └── app.js          # roteamento, telas e lógica
└── assets/             # ícones (SVG)
```

## 🛣 Próximos módulos (roadmap)

Gráficos de evolução · avaliação física · biblioteca de exercícios · calendário/agenda ·
recordes · hábitos · check-in diário · notificações · relatórios em PDF · gamificação.

A arquitetura (IndexedDB com stores já reservadas, código modular) foi pensada para crescer
sem reescrever a base.
