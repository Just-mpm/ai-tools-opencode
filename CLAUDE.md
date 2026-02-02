# tools-open-code

Coleção de tools e plugins para OpenCode AI.

## Estrutura

```
tools/
  analyze.ts           # Tool de análise de dependências, áreas e Cloud Functions
  quest.ts             # Sistema de quests para orquestração (Context Relay)
  commands.ts          # Tool para invocar slash commands proativamente

plugins/
  analyze-context.ts   # Plugin de contexto automático
```

---

## Tools

### `tools/analyze.ts` - Análise de Dependências, Impacto e Áreas

Wrapper para o pacote `@justmpm/ai-tool` que fornece análise de dependências, código morto e navegação por domínios funcionais.

**Comandos sem arquivo (rodam sozinhos):**
- `map` - Resumo compacto: contagens por categoria, áreas detectadas, alertas (otimizado para tokens)
- `dead` - Detecta arquivos órfãos e código não utilizado
- `areas` - Lista todas as áreas/domínios funcionais do projeto
- `areas-init` - Gera `.analyze/areas.config.json` para configurar áreas manualmente
- `functions` - Lista Cloud Functions Firebase (agrupadas por trigger)

**Comandos com arquivo (OBRIGATÓRIO passar target):**
- `suggest <arquivo>` - Sugere arquivos para ler ANTES de modificar
- `context <arquivo>` - Extrai assinaturas de funções/tipos (sem implementação)
- `context --areaName=<area>` - Contexto consolidado de toda uma área
- `impact <arquivo>` - Analisa upstream/downstream de um arquivo
- `area <nome>` - Mostra arquivos de uma área específica
- `find <símbolo>` - Busca símbolos no código (definição + usos)

**IMPORTANTE - Diferença entre CATEGORIAS e ÁREAS:**
- CATEGORIA = tipo técnico (hook, component, page, service...) → use `map`
- ÁREA = domínio funcional (auth, meus-pets, stripe, dashboard...) → use `areas`

**Quando usar:**
- `map` no início da sessão para resumo rápido (contagens + áreas + alertas)
- `areas` para entender domínios funcionais detalhados
- `area auth` quando for trabalhar em autenticação
- `suggest` ANTES de modificar para saber o que ler primeiro
- `impact` ANTES de refatorar hooks, utils, services compartilhados
- `dead` quando pedirem limpeza de código
- `find` para localizar onde um símbolo é definido e usado
- `functions` para listar Cloud Functions Firebase do projeto

**Stack interna:** Skott + Knip + ts-morph

---

### `tools/commands.ts` - Invocar Slash Commands Proativamente

Permite ao modelo descobrir e executar slash commands do usuário sem que o usuário precise digitar `/comando`.

**Como funciona:**
- Na inicialização, lê todos os `.md` em `~/.config/opencode/command/` e `.opencode/command/`
- Extrai frontmatter (description, argument-hint) de cada command
- Gera descrição dinâmica listando todos os commands disponíveis
- O modelo vê a lista e pode invocar qualquer command passando argumentos

**Parâmetros:**
- `command` - Nome do command a executar (ex: "audit", "fix", "scan")
- `arguments` - Argumentos opcionais (substitui $ARGUMENTS no template)

**Exemplo de uso pelo modelo:**
```typescript
commands({ command: "audit", arguments: "src/components --diff" })
commands({ command: "fix", arguments: "1.md --critical" })
commands({ command: "scan" })
```

**Quando usar:**
- Quando a tarefa do usuário se encaixa em um command existente
- Para automatizar fluxos sem o usuário precisar digitar `/`
- Ideal para orquestração de tarefas complexas

**Vantagem:** A lista de commands é gerada dinamicamente. Ao criar um novo `.md` em `command/`, ele aparece automaticamente na próxima sessão.

---

### `tools/quest.ts` - Sistema de Quests para Orquestração

Sistema de gerenciamento de quests para orquestração de trabalho. Projetado para o sistema de Context Relay.

**Características principais:**
- Quests compartilhadas entre parent e subagents (encontra sessão raiz automaticamente)
- Sistema de bloqueios entre quests (blockedBy)
- Enforcement rígido: impede avançar status se bloqueadores pendentes
- Context bridges para transferir contexto entre grupos de trabalho

**Comandos:**
- `create` - Cria nova quest com subject e description
- `update` - Atualiza status, description ou bloqueios
- `list` - Lista todas as quests (ou só disponíveis com `available=true`)
- `get` - Retorna detalhes completos de uma quest

**Parâmetros principais:**
- `subject` - Título da quest (obrigatório para create)
- `description` - Descrição completa (obrigatório para create)
- `activeForm` - Gerúndio para exibição, ex: "Implementando login"
- `id` - ID da quest (obrigatório para update/get)
- `status` - "pending" | "in_progress" | "completed"
- `addBlockedBy` / `removeBlockedBy` - Gerenciar bloqueios
- `available` - Lista só quests disponíveis (pending + sem bloqueios)
- `compact` - Lista ultra-compacta (ideal para 20+ quests)

**Workflow típico (Sistema Relay):**

```typescript
// 1. Criar quests com descrições ricas
quest({ command: "create", subject: "[Grupo 1.1] Implementar login", description: "## Objetivo..." })

// 2. Configurar bloqueios após criar todas
quest({ command: "update", id: "quest-004", addBlockedBy: ["quest-001", "quest-002"] })

// 3. Ver quests disponíveis
quest({ command: "list", available: true })

// 4. Iniciar trabalho (retorna contexto completo)
quest({ command: "update", id: "quest-001", status: "in_progress" })

// 5. Completar (desbloqueia quests dependentes automaticamente)
quest({ command: "update", id: "quest-001", status: "completed" })

// 6. Context bridge (transferir contexto para próximo grupo)
quest({ command: "update", id: "quest-005", newDescription: "## Contexto do Grupo 1\n..." })
```

**Quando usar:**
- Tarefas multi-step complexas (3+ etapas)
- Orquestração de grupos com context bridges
- Rastrear progresso em implementações longas
- Preservar contexto entre agents

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

## Configuração Manual de Áreas

O comando `areas-init` gera um arquivo `.analyze/areas.config.json` que permite:

1. **Adicionar áreas** que não foram detectadas automaticamente
2. **Renomear áreas** (campo "name")
3. **Ajustar padrões** de detecção (campo "patterns" e "keywords")
4. **Excluir arquivos** de uma área (campo "exclude")
5. **Descrever arquivos** específicos (campo "descriptions")

**Exemplo de configuração:**
```json
{
  "areas": {
    "beta": {
      "name": "Programa Beta",
      "description": "Sistema de beta testers",
      "patterns": ["components/beta/**", "app/**/beta/**"],
      "keywords": ["beta", "tester"]
    }
  },
  "descriptions": {
    "components/pets/PetForm.tsx": "Formulário multi-step de pets"
  }
}
```

A detecção automática funciona para ~70-80% dos arquivos. O resto pode ser configurado manualmente.

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
