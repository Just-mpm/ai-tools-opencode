# Changelog

Todas as mudanças notáveis neste projeto serão documentadas aqui.

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
