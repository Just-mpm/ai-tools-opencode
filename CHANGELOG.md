# Changelog

Todas as mudanças notáveis neste projeto serão documentadas aqui.

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
