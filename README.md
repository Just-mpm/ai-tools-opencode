# tools-open-code

Coleção de tools para [OpenCode AI](https://opencode.ai).

## Propósito

Este repositório contém tools personalizadas que estendem as capacidades do OpenCode AI. Cada tool é um arquivo TypeScript standalone que pode ser usado diretamente.

## Tools Disponíveis

### analyze.ts

Ferramenta de análise de dependências e impacto para projetos TypeScript/JavaScript.

**Comandos:**

| Comando | Descrição | Uso |
|---------|-----------|-----|
| `map` | Gera mapa do projeto com categorização de arquivos | Início de sessão, entender estrutura |
| `dead` | Detecta arquivos órfãos e código não utilizado | Limpeza, refatoração geral |
| `impact` | Analisa upstream/downstream de um arquivo | **ANTES** de modificar código compartilhado |

**Exemplos:**

```bash
# Ver estrutura do projeto
analyze map

# Encontrar código morto
analyze dead

# Verificar impacto antes de refatorar
analyze impact useAuth
analyze impact src/components/Button.tsx
```

**Opções:**
- `format`: `text` (padrão) ou `json`
- `target`: Arquivo para análise de impacto (aceita nome parcial ou caminho completo)

**Stack interna:** Usa [Skott](https://github.com/antoine-coulon/skott) + [Knip](https://knip.dev) via pacote `@justmpm/ai-tool`.

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

A tool estará disponível automaticamente na próxima sessão do OpenCode.

## Requisitos

- Node.js >= 18.0.0
- Projeto TypeScript/JavaScript (para analyze.ts)

## Licença

MIT - [Koda AI Studio](https://kodaai.app)
