# tools-open-code

Coleção de tools e plugins para OpenCode AI.

## Tools disponíveis

### `analyze.ts` - Análise de Dependências, Impacto e Áreas

Wrapper para `@justmpm/ai-tool` que fornece análise de dependências, código morto e navegação por domínios funcionais.

**Comandos sem arquivo:**
- `map` - Resumo compacto: contagens, áreas, alertas (otimizado para tokens)
- `dead` - Detecta arquivos órfãos e código morto
- `areas` - Lista áreas/domínios funcionais
- `areas-init` - Gera config de áreas

**Comandos com arquivo (target obrigatório):**
- `suggest <arquivo>` - O que ler antes de modificar
- `context <arquivo>` - Assinaturas sem implementação
- `impact <arquivo>` - Upstream/downstream
- `area <nome>` - Arquivos de uma área

**Quando usar:**
- `map` no início da sessão para resumo rápido
- `suggest` ANTES de modificar para saber o que ler
- `impact` ANTES de refatorar hooks, utils, services compartilhados
- `dead` quando pedirem limpeza de código

### `commands.ts` - Invocar Slash Commands

Permite ao modelo executar slash commands proativamente.

## Plugins

### `analyze-context.ts` - Contexto Automático

Injeta estrutura do projeto no system prompt automaticamente.

## Estrutura

```
tools/
  analyze.ts           # Análise de dependências e áreas
  commands.ts          # Invocar slash commands

plugins/
  analyze-context.ts   # Contexto automático
```

## Instalação

```bash
cp tools/analyze.ts ~/.config/opencode/tools/
cp tools/commands.ts ~/.config/opencode/tools/
cp plugins/analyze-context.ts ~/.config/opencode/plugins/
```
