# tools-open-code

Coleção de tools e plugins para [OpenCode AI](https://opencode.ai).

## O que tem aqui?

| Tipo | Nome | Descrição |
|------|------|-----------|
| Tool | `analyze` | Análise de dependências, impacto, áreas funcionais e Cloud Functions Firebase |
| Tool | `quest` | Sistema de quests para orquestração de trabalho (Context Relay) |
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
| `map` | Resumo compacto: contagens, áreas, alertas | Início de sessão |
| `dead` | Detecta arquivos órfãos e código morto | Limpeza de projeto |
| `areas` | Lista áreas/domínios funcionais | Ver domínios |
| `areas-init` | Gera config para áreas manuais | Configurar áreas |
| `functions` | Lista Cloud Functions Firebase | Ver triggers Firebase |

**Comandos com arquivo (target obrigatório):**

| Comando | Descrição | Uso |
|---------|-----------|-----|
| `suggest <target>` | Sugere arquivos para ler | **ANTES** de modificar |
| `context <target>` | Extrai assinaturas (sem implementação) | Entender API de um arquivo |
| `context --areaName=<area>` | Contexto consolidado de área inteira | Entender toda uma feature |
| `impact <target>` | Analisa upstream/downstream | **ANTES** de refatorar |
| `area <target>` | Mostra arquivos de uma área | Trabalhar em feature específica |
| `find <target>` | Busca símbolos (definição + usos) | Encontrar onde algo é usado |

**Exemplos:**

```bash
# Sem arquivo
analyze map                    # Resumo compacto (contagens + áreas + alertas)
analyze areas                  # Lista áreas funcionais
analyze dead                   # Encontra código morto
analyze areas-init             # Gera .analyze/areas.config.json
analyze functions              # Lista Cloud Functions Firebase
analyze functions --trigger=onCall  # Filtra por tipo de trigger

# Com arquivo
analyze suggest useAuth        # O que ler antes de modificar
analyze context useAuth        # Assinaturas do arquivo
analyze context --areaName=auth    # Contexto consolidado de toda a área
analyze impact useAuth         # Quem usa esse hook?
analyze area auth              # Todos arquivos de auth
analyze area auth --type=hook  # Só hooks de auth
analyze find useAuth           # Onde useAuth é definido e usado
analyze find User --symbolType=type  # Busca apenas tipos
analyze find createUser --symbolType=trigger  # Busca Cloud Function
```

**IMPORTANTE - Diferença:**
- **CATEGORIA** = tipo técnico (hook, component, page) → use `map`
- **ÁREA** = domínio funcional (auth, stripe, meus-pets) → use `areas`

**Opções:**
- `format`: `text` (padrão) ou `json`
- `target`: Arquivo, área ou símbolo (aceita nome parcial ou caminho completo)
- `type`: Filtrar por categoria (para `area`)
- `full`: Mostrar todos os arquivos (para `area`)
- `limit`: Limite de sugestões (para `suggest`)
- `symbolType`: Tipo de símbolo para `find` (function, type, const, component, hook, trigger)
- `areaName`: Área para filtrar `find` ou contexto consolidado em `context`
- `defOnly`: Mostrar apenas definições (para `find`)
- `refsOnly`: Mostrar apenas referências (para `find`)
- `trigger`: Filtrar por tipo de trigger (para `functions`)

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

### quest

Sistema de gerenciamento de quests para orquestração de trabalho. Projetado para o sistema de Context Relay.

**Características:**
- Quests compartilhadas entre parent e subagents (encontra sessão raiz automaticamente)
- Sistema de bloqueios entre quests (blockedBy)
- Enforcement rígido: impede avançar status se bloqueadores pendentes
- Context bridges para transferir contexto entre grupos

**Comandos:**

| Comando | Descrição |
|---------|-----------|
| `create` | Cria nova quest com subject e description |
| `update` | Atualiza status, description ou bloqueios |
| `list` | Lista todas as quests (ou só disponíveis) |
| `get` | Retorna detalhes completos de uma quest |

**Parâmetros:**

| Parâmetro | Descrição |
|-----------|-----------|
| `subject` | Título da quest (obrigatório para create) |
| `description` | Descrição completa (obrigatório para create) |
| `activeForm` | Gerúndio para exibição, ex: "Implementando login" |
| `id` | ID da quest (obrigatório para update/get) |
| `status` | pending, in_progress, completed |
| `addBlockedBy` | IDs de quests que bloqueiam esta |
| `available` | Lista só quests disponíveis (pending + sem bloqueios) |
| `compact` | Lista ultra-compacta (ideal para 20+ quests) |

**Workflow típico:**

```bash
# 1. Criar quests
quest create subject="[Grupo 1.1] Implementar login" description="## Objetivo..."

# 2. Configurar bloqueios
quest update id="quest-004" addBlockedBy=["quest-001","quest-002"]

# 3. Ver disponíveis
quest list available=true

# 4. Iniciar trabalho
quest update id="quest-001" status="in_progress"

# 5. Completar (desbloqueia dependentes)
quest update id="quest-001" status="completed"
```

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
  analyze.ts           # Tool de análise de dependências, áreas e Cloud Functions
  quest.ts             # Sistema de quests para orquestração (Context Relay)
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
