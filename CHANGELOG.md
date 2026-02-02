# Changelog

Todas as mudanças notáveis neste projeto serão documentadas aqui.

## [0.7.0] - 2026-02-02

### Adicionado
- **Nova tool `quest`**: Sistema de gerenciamento de quests para orquestração de trabalho
  - Quests compartilhadas entre parent e subagents (encontra sessão raiz automaticamente)
  - Comandos: `create`, `update`, `list`, `get`
  - Sistema de bloqueios entre quests (blockedBy)
  - Enforcement rígido: impede avançar status se houver bloqueadores pendentes
  - Formato compacto para listas grandes (20+ quests)
  - Context bridges: transferência de contexto entre grupos de trabalho
  - Projetado para o sistema de Context Relay

### Alterado
- **Tool `analyze`**: Atualizada para usar `@justmpm/ai-tool@0.7.0`
  - Novo comando `find` - busca símbolos no código (definição + referências)
    - Entende AST do TypeScript (diferente de grep)
    - Filtros: `symbolType` (function, type, const, component, hook, trigger)
    - Opções: `defOnly` (só definições), `refsOnly` (só usos), `areaName` (filtrar por área)
  - Novo comando `functions` - lista Cloud Functions Firebase
    - Agrupa por tipo de trigger (onCall, onDocumentCreated, onSchedule, etc)
    - Filtrável por trigger específico
    - Suporta 40+ tipos de triggers
  - Comando `context` agora aceita `areaName` para contexto consolidado de área inteira
  - Sanitização de argumentos para evitar injeção de comandos
  - Tratamento de erros melhorado (timeout, comando não encontrado, buffer excedido)
  - Timeout reduzido de 3 para 2 minutos

## [0.5.0] - 2025-01-31

### Alterado
- **Tool `analyze`**: Atualizada para usar `@justmpm/ai-tool@0.5.0`
  - Comando `map` agora retorna resumo compacto por padrão (otimizado para tokens)
  - Resumo inclui: contagens por categoria, áreas detectadas, alertas contextuais
  - Removida opção `full` do map na tool (LLM sempre recebe resumo)
  - Dicas de próximos passos guiam o modelo a usar as outras tools

## [0.4.0] - 2025-01-31

### Adicionado
- **Nova tool `commands`**: Permite ao modelo invocar slash commands proativamente
  - Lê dinamicamente todos os `.md` em `~/.config/opencode/command/` e `.opencode/command/`
  - Extrai frontmatter (description, argument-hint) de cada command
  - Gera descrição dinâmica listando todos commands disponíveis
  - Modelo pode executar qualquer command passando argumentos
  - Novos commands aparecem automaticamente na próxima sessão (sem hardcode)

## [0.3.0] - 2025-01-30

### Adicionado
- **Novos comandos na tool `analyze`**:
  - `suggest <target>` - Lista arquivos recomendados para ler ANTES de editar um arquivo
  - `context <target>` - Extrai assinaturas de funções/tipos SEM implementação (útil para entender APIs)
- **Novo parâmetro `limit`**: Controla quantidade de sugestões no comando `suggest`

### Alterado
- **Descrição da tool reescrita**: Separação clara entre comandos que precisam de `target` e os que não precisam
- **Parâmetro `target` agora é obrigatório** para `suggest`, `context` e `impact`
- **Exemplos de uso melhorados** na descrição da tool

## [0.2.0] - 2025-01-29

### Adicionado
- **Plugin `analyze-context`**: Novo plugin que injeta automaticamente a estrutura do projeto no system prompt
  - Carrega cache do `.analyze/` se disponível
  - Exibe mapa de arquivos organizado por pasta e categoria
  - Detecta dependências circulares
  - Verifica se cache está desatualizado via hash de arquivos
  - Usa hook `experimental.chat.system.transform` para injeção limpa

### Alterado
- **Estrutura reorganizada**: Separação em pastas `tools/` e `plugins/`
  - `tools/analyze.ts` - Tool de análise
  - `plugins/analyze-context.ts` - Plugin de contexto
- **Documentação atualizada**: CLAUDE.md e README.md refletem nova estrutura

### Removido
- `analyze.ts` da raiz (movido para `tools/`)

## [0.1.0] - 2025-01-29

### Adicionado
- **Tool `analyze`**: Wrapper para `@justmpm/ai-tool`
  - Comando `map` - Mapa do projeto com categorização
  - Comando `dead` - Detecção de código morto
  - Comando `impact` - Análise de impacto antes de modificar arquivos
- Documentação inicial (CLAUDE.md)
