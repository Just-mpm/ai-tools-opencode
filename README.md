# tools-open-code

Coleção de tools e plugins para [OpenCode AI](https://opencode.ai).

## O que tem aqui?

| Tipo | Nome | Descrição |
|------|------|-----------|
| Tool | `analyze` | Análise de dependências, impacto e áreas funcionais usando Skott + Knip + ts-morph |
| Tool | `commands` | Invocar slash commands proativamente (modelo descobre e executa sem usuário digitar `/`) |
| Plugin | `analyze-context` | Injeta estrutura do projeto no contexto automaticamente |

## Instalação Rápida

```bash
# Clonar o repositório
git clone https://github.com/mthspimenta/tools-open-code.git
cd tools-open-code

# Copiar tools
cp tools/analyze.ts ~/.config/opencode/tools/
cp tools/commands.ts ~/.config/opencode/tools/

# Copiar plugin
cp plugins/analyze-context.ts ~/.config/opencode/plugins/
```

Reinicie o OpenCode para carregar.

## Tools

### analyze

Analisa dependências, código morto e áreas funcionais do projeto. Usa `@justmpm/ai-tool` internamente.

**Comandos sem arquivo:**

| Comando | Descrição | Uso |
|---------|-----------|-----|
| `map` | Gera mapa do projeto (categorias técnicas) | Ver estrutura técnica |
| `dead` | Detecta arquivos órfãos e código morto | Limpeza de projeto |
| `areas` | Lista áreas/domínios funcionais | Início de sessão |
| `areas-init` | Gera config para áreas manuais | Configurar áreas |

**Comandos com arquivo (target obrigatório):**

| Comando | Descrição | Uso |
|---------|-----------|-----|
| `suggest <target>` | Sugere arquivos para ler | **ANTES** de modificar |
| `context <target>` | Extrai assinaturas (sem implementação) | Entender API de um arquivo |
| `impact <target>` | Analisa upstream/downstream | **ANTES** de refatorar |
| `area <target>` | Mostra arquivos de uma área | Trabalhar em feature específica |

**Exemplos:**

```bash
# Sem arquivo
analyze map                    # Mapa do projeto (categorias)
analyze areas                  # Lista áreas funcionais
analyze dead                   # Encontra código morto
analyze areas-init             # Gera .analyze/areas.config.json

# Com arquivo
analyze suggest useAuth        # O que ler antes de modificar
analyze context useAuth        # Assinaturas do arquivo
analyze impact useAuth         # Quem usa esse hook?
analyze area auth              # Todos arquivos de auth
analyze area auth --type=hook  # Só hooks de auth
```

**IMPORTANTE - Diferença:**
- **CATEGORIA** = tipo técnico (hook, component, page) → use `map`
- **ÁREA** = domínio funcional (auth, stripe, meus-pets) → use `areas`

**Opções:**
- `format`: `text` (padrão) ou `json`
- `target`: Arquivo ou área (aceita nome parcial ou caminho completo)
- `type`: Filtrar por categoria (para `area`)
- `full`: Mostrar todos os arquivos (para `area`)
- `limit`: Limite de sugestões (para `suggest`)

### commands

Permite ao modelo invocar slash commands proativamente, sem o usuário precisar digitar `/comando`.

**Como funciona:**
1. Na inicialização, lê todos os `.md` em `command/` (global e projeto)
2. Extrai frontmatter e gera descrição dinâmica com lista de commands
3. O modelo vê a lista e pode executar qualquer command

**Parâmetros:**

| Parâmetro | Descrição |
|-----------|-----------|
| `command` | Nome do command (ex: "audit", "fix", "scan") |
| `arguments` | Argumentos opcionais (substitui $ARGUMENTS) |

**Exemplos:**

```bash
# Modelo chama internamente:
commands command="audit" arguments="src/components --diff"
commands command="fix" arguments="1.md --critical"
commands command="scan"
```

**Vantagem:** Lista dinâmica - ao criar novo `.md` em `command/`, ele aparece automaticamente.

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
  analyze.ts           # Tool de análise de dependências e áreas
  commands.ts          # Tool para invocar slash commands proativamente

plugins/
  analyze-context.ts   # Plugin de contexto automático
```

## Configuração Manual de Áreas

O comando `areas-init` gera `.analyze/areas.config.json` para customizar detecção:

```json
{
  "areas": {
    "beta": {
      "name": "Programa Beta",
      "patterns": ["components/beta/**"],
      "keywords": ["beta"]
    }
  },
  "descriptions": {
    "hooks/useAuth.ts": "Hook principal de autenticação"
  }
}
```

A detecção automática funciona para ~70-80%. O resto configura manualmente.

## Requisitos

- [OpenCode AI](https://opencode.ai)
- Node.js >= 18.0.0

## Licença

MIT - [Koda AI Studio](https://kodaai.app)
