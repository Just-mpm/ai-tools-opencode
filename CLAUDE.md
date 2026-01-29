# tools-open-code

Coleção de tools e plugins para OpenCode AI.

## Estrutura

```
tools/
  analyze.ts           # Tool de análise de dependências

plugins/
  analyze-context.ts   # Plugin de contexto automático
```

---

## Tools

### `tools/analyze.ts` - Análise de Dependências e Impacto

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

---

## Plugins

### `plugins/analyze-context.ts` - Contexto Automático do Projeto

Plugin que injeta automaticamente a estrutura do projeto no system prompt quando a sessão inicia.

**Funcionalidades:**
- Carrega o cache do `@justmpm/ai-tool` (pasta `.analyze/`) se disponível
- Exibe mapa completo de arquivos organizados por pasta e categoria
- Detecta dependências circulares e avisa no contexto
- Verifica se o cache está desatualizado comparando hash dos arquivos
- Ignora projetos sem `package.json` ou `tsconfig.json`

**Categorias detectadas:**
- 📄 page | 🖼️ layout | 🛣️ route | 🧩 component
- 🪝 hook | ⚙️ service | 🗄️ store | 🔧 util
- 📝 type | ⚙️ config | 🧪 test | 📁 other

**Como funciona:**
1. Ao iniciar sessão, verifica se existe cache em `.analyze/`
2. Se existir, formata e injeta no system prompt via hook `experimental.chat.system.transform`
3. Se não existir, sugere rodar `analyze map` para gerar

---

## Instalação

### Tools

Copie para a pasta de tools do OpenCode:

```bash
# Windows
cp tools/analyze.ts ~/.config/opencode/tools/

# Linux/Mac
cp tools/analyze.ts ~/.config/opencode/tools/
```

### Plugins

Copie para a pasta de plugins do OpenCode:

```bash
# Windows
cp plugins/analyze-context.ts ~/.config/opencode/plugins/

# Linux/Mac
cp plugins/analyze-context.ts ~/.config/opencode/plugins/
```

Tools e plugins estarão disponíveis automaticamente na próxima sessão.

---

## Como contribuir

### Adicionar nova tool
1. Criar arquivo `.ts` em `tools/`
2. Usar `@opencode-ai/plugin` para definir a tool
3. Documentar neste CLAUDE.md

### Adicionar novo plugin
1. Criar arquivo `.ts` em `plugins/`
2. Exportar um `Plugin` seguindo a API do OpenCode
3. Documentar neste CLAUDE.md
