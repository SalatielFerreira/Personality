# Histórico de versões

O formato segue, de forma simplificada, o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

> Ao publicar uma nova versão, mantenha o mesmo número em **3 lugares**:
> `version.json`, `sw.js` (`CACHE_VERSION`) e `js/app.js` (`APP_VERSION`).

## [1.2.0] — 2026-07-15

### Barra superior e ajuda (estilo ELTECH)
- Nova **barra superior fixa** com o nome do app (ELTECH Personality) e um botão **?** de ajuda.
- O botão **?** abre uma **ajuda específica de cada página** (Início, Treinos, execução do
  treino, Evolução, Agenda, Perfil e Área do Professor).

## [1.1.0] — 2026-07-15

### Visual e avisos
- Identidade visual "glass" esportiva inspirada no ELTECH: fonte **Sora** (+ JetBrains Mono
  nos números), efeito de vidro fosco em cards/modais/nav, fundo com brilho verde/azul.
- **Login/cadastro** reformulados com abas **Entrar / Cadastrar**, campo "E-mail ou nome",
  opção **"Manter conectado"** e olho para mostrar a senha.
- Logo removida da tela de login, nome **ELTECH** ampliado e "Esqueci minha senha" removido.
- **Avisos (toast)** agora aparecem como **balão centralizado no topo** da tela.

### Controle de versão (novo)
- Adicionados `version.json` e `CHANGELOG.md`.
- Número da versão exibido no **Perfil**.
- Service worker passou a ser **network-first** e mostra o aviso
  **"Nova versão disponível → Atualizar"** quando há atualização.

## [1.0.0] — 2026-07-15

### Build inicial (base do PWA)
- PWA instalável e offline (manifest + service worker).
- Cadastro/login 100% offline com hash de senha **PBKDF2/SHA-256** e validação
  (8+ caracteres, maiúscula, minúscula, número e especial).
- Banco local **IndexedDB** (`PERSONALITY_DB`) com stores reservadas para os próximos módulos.
- **Área do Professor**: baixar modelo de Excel e importar a planilha do treino.
- **Execução do treino** por semana/tipo (A/B/C), ajuste de peso e repetições,
  marcar série concluída e barra de progresso.
- **Cronômetro** de descanso com som e vibração.
- **Dashboard** com estatísticas e **backup** (exportar/importar `.json`).
- Tema escuro (padrão) e claro.
