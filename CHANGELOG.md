# Histórico de versões

O formato segue, de forma simplificada, o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

> Ao publicar uma nova versão, mantenha o mesmo número em **3 lugares**:
> `version.json`, `sw.js` (`CACHE_VERSION`) e `js/app.js` (`APP_VERSION`).

## [1.6.5] — 2026-07-15

### Ajustes do Perfil
- Ícone de **disquete** no botão "Salvar nova senha".
- Seta (›) do card "Área do Professor" **centralizada na vertical**.

## [1.6.4] — 2026-07-15

### Ajuste
- Texto sobre fundo verde (botões, abas ativas, chips, ✔ de série) agora é **branco**.

## [1.6.3] — 2026-07-15

### Correção
- Os campos de "Alterar senha" não são mais preenchidos automaticamente pelo navegador
  e ficam **limpos ao recarregar** a página.

## [1.6.2] — 2026-07-15

### Ajuste
- Tamanho da saudação ("Boa tarde,") agora fica entre o da data e o do nome.

## [1.6.1] — 2026-07-15

### Ajuste
- Removido o emoji do banner "Nova versão disponível".

## [1.6.0] — 2026-07-15

### Comportamento
- Ao **recarregar a página**, o app fica intacto: mantém a **página atual** e o **tema**
  (o tema agora é lembrado; claro continua sendo o padrão para quem nunca escolheu).
- O **"voltar" do celular** navega passo a passo pelas telas visitadas (em vez de fechar o app).
- A tecla **Enter** (celular e PC) funciona como **confirmar/entrar/ok**: aciona o botão
  principal do formulário/modal em foco (login, cadastro, alterar senha, confirmações).

## [1.5.2] — 2026-07-15

### Ajuste
- Removido o emoji de celular do banner "Instale o ELTECH Personality".

## [1.5.1] — 2026-07-15

### Correção
- A Home agora mostra o **nome completo** do usuário (antes exibia só o primeiro nome,
  o que dava impressão de que a alteração do nome não tinha sido aplicada).

## [1.5.0] — 2026-07-15

### Tema, instalação e senha
- O app agora **inicia sempre no tema claro** (ao abrir o link ou o app instalado).
- **Convite para instalar** o app aparece sempre que o link é aberto (se ainda não instalado):
  botão "Baixar app" (instalação nativa no Android/PC; instruções no iPhone).
- Novo campo **"Alterar senha"** no Perfil (abaixo da Área do Professor): senha atual,
  nova senha e botão "Salvar nova senha" (valida a senha atual e as regras da nova).

## [1.4.3] — 2026-07-15

### Tema
- O interruptor de tema agora tem o **fundo esverdeado nos dois estados** (claro e escuro).

## [1.4.2] — 2026-07-15

### Tipografia
- Nome do usuário na Home e os títulos das páginas (Treinos, Evolução, Agenda, Perfil)
  agora têm o **mesmo tamanho** (1.4rem; 1.55rem em telas grandes) — tamanho intermediário.

## [1.4.1] — 2026-07-15

### Ajustes do Perfil
- Removido o lápis do círculo da foto; quando **sem foto**, mostra um **ícone de usuário**
  na cor do tema (branco no escuro, preto no claro).
- "Aparência do app" agora tem o subtítulo **Tema escuro / Tema claro**.
- O interruptor de tema mostra **sol** (claro) e **lua** (escuro).
- Confirmado: alterar o nome atualiza também a saudação da Home.

## [1.4.0] — 2026-07-15

### Perfil reformulado
- **Foto de perfil**: campo redondo para o usuário inserir a própria imagem (comprimida
  automaticamente e salva no aparelho). No celular abre a câmera/galeria.
- **Nome editável** direto na tela; a alteração reflete em todo o app e no login.
- No **login**, é possível entrar com **e-mail ou nome/usuário** (mesma senha).
- Escolha de tema virou um **botão tipo interruptor** (claro/escuro) ao lado de "Aparência do app".
- Removidos: e-mail, "Dono deste aparelho" e a seção de Backup.
- **Área do Professor** mantida (sem o emoji) e **"Sair da conta"** agora tem ícone de porta.

## [1.3.3] — 2026-07-15

### Ajuste do título
- "ELTECH" um pouco menor e **"Personality" de volta ao lado** (na mesma linha).
- Barras do topo e rodapé de volta a 72px.

## [1.3.2] — 2026-07-15

### Ajustes visuais
- Título da barra superior **duas vezes maior**, empilhado (ELTECH grande + PERSONALITY
  menor embaixo) e centralizado; barras engrossadas para 80px.
- **Home:** nome do usuário reduzido em 1/3 e saudação ("Boa tarde,") agora em
  branco/preto conforme o tema, diferenciando-se da data.

## [1.3.1] — 2026-07-15

### Data/hora
- A data e hora na Home agora seguem o **fuso do próprio aparelho do usuário**
  (antes era fixo no horário de Brasília).

## [1.3.0] — 2026-07-15

### Cabeçalho e Home
- **Título "ELTECH Personality" maior e centralizado** na barra superior.
- Barras do **topo e do rodapé com a mesma altura** (72px).
- **Home:** removida a mãozinha 👋; agora mostra a **data e hora de Brasília**
  (dd/mm/aaaa, hh:mm) acima da saudação, atualizando sozinha.
- Removido o texto "Dados salvos no aparelho".

## [1.2.1] — 2026-07-15

### Ícones da navegação
- Ícones da barra inferior trocados de emoji para **SVGs de linha** (estilo Lucide).
- Agora seguem o tema: **brancos** no tema escuro e **pretos** no tema claro; a aba
  ativa fica em **verde**.

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
