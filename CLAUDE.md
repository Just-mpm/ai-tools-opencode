# tools-open-code

Coleção de tools para OpenCode AI.

## Tools disponíveis

### `analyze.ts` - Análise de Dependências e Impacto

Wrapper para o pacote `@justmpm/ai-tool` que fornece análise de dependências e código morto.

**Comandos:**
- `map` - Mapa do projeto com categorização de arquivos
- `dead` - Detecta arquivos órfãos e código não utilizado
- `impact <arquivo>` - Analisa quem usa/depende de um arquivo antes de modificá-lo

**Quando usar:**
- `impact` ANTES de refatorar hooks, utils, services compartilhados
- `dead` quando pedirem limpeza de código
- `map` no início da sessão para contexto

**Stack interna:** Skott + Knip

## Estrutura

```
analyze.ts    # Tool de análise de dependências
```

## Instalação

Copie a tool desejada para a pasta de tools do OpenCode:

```bash
# Windows
~\.config\opencode\tools\

# Linux/Mac
~/.config/opencode/tools/
```

Exemplo:
```bash
# Copiar analyze.ts
cp analyze.ts ~/.config/opencode/tools/
```

A tool estará disponível automaticamente na próxima sessão.

## Como adicionar novas tools

1. Criar arquivo `.ts` na raiz
2. Usar `@opencode-ai/plugin` para definir a tool
3. Documentar neste CLAUDE.md
