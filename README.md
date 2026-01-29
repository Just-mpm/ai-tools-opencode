# tools-open-code

Coleção de tools e plugins para [OpenCode AI](https://opencode.ai).

## O que tem aqui?

| Tipo | Nome | Descrição |
|------|------|-----------|
| Tool | `analyze` | Análise de dependências e impacto usando Skott + Knip |
| Plugin | `analyze-context` | Injeta estrutura do projeto no contexto automaticamente |

## Instalação Rápida

```bash
# Clonar o repositório
git clone https://github.com/mthspimenta/tools-open-code.git
cd tools-open-code

# Copiar tool
cp tools/analyze.ts ~/.config/opencode/tools/

# Copiar plugin
cp plugins/analyze-context.ts ~/.config/opencode/plugins/
```

Reinicie o OpenCode para carregar.

## Tools

### analyze

Analisa dependências e código morto do projeto. Usa `@justmpm/ai-tool` internamente.

| Comando | Descrição | Uso |
|---------|-----------|-----|
| `map` | Gera mapa do projeto com categorização | Início de sessão |
| `dead` | Detecta arquivos órfãos e código morto | Limpeza de projeto |
| `impact` | Analisa upstream/downstream de um arquivo | **ANTES** de modificar código compartilhado |

**Exemplos:**

```bash
analyze map                    # Mapa do projeto
analyze dead                   # Encontra código não utilizado
analyze impact useAuth         # Quem usa esse hook?
analyze impact Button.tsx      # Impacto de modificar componente
```

**Opções:**
- `format`: `text` (padrão) ou `json`
- `target`: Arquivo para análise (aceita nome parcial ou caminho completo)

## Plugins

### analyze-context

Carrega automaticamente a estrutura do projeto no system prompt quando a sessão inicia.

**Funcionalidades:**
- Usa cache em `.analyze/` gerado pelo `analyze map`
- Detecta quando cache está desatualizado
- Mostra dependências circulares como warning
- Organiza arquivos por pasta e categoria com ícones

**Categorias detectadas:**
- 📄 page | 🖼️ layout | 🛣️ route | 🧩 component
- 🪝 hook | ⚙️ service | 🗄️ store | 🔧 util
- 📝 type | ⚙️ config | 🧪 test | 📁 other

## Estrutura do Repositório

```
tools/
  analyze.ts           # Tool de análise de dependências

plugins/
  analyze-context.ts   # Plugin de contexto automático
```

## Requisitos

- [OpenCode AI](https://opencode.ai)
- Node.js >= 18.0.0

## Licença

MIT - [Koda AI Studio](https://kodaai.app)
