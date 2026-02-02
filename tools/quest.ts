/**
 * Quest - Sistema de gerenciamento de quests para orquestração de trabalho
 *
 * Permite criar, atualizar, listar e ler quests com descrições ricas.
 * Projetado para o sistema de Context Relay e orquestração de agents.
 *
 * IMPORTANTE: Quests são compartilhadas entre parent e subagents!
 * A tool encontra automaticamente a sessão raiz para garantir que todos
 * os agents trabalhem com o mesmo QuestLog.
 *
 * COMANDOS:
 *   - create    Cria nova quest com subject e description
 *   - update    Atualiza status, description ou bloqueios
 *   - list      Lista todas as quests (ou só disponíveis)
 *   - get       Retorna detalhes completos de uma quest
 */

import { tool } from "@opencode-ai/plugin";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// Diretórios
const QUESTS_DIR = join(homedir(), ".config", "opencode", "quests");
const OPENCODE_STORAGE = join(homedir(), ".local", "share", "opencode", "storage");

// Interface para metadados de sessão do OpenCode
interface OpenCodeSession {
  id: string;
  projectID: string;
  parentID?: string;
  directory: string;
  title: string;
}

/**
 * Encontra a sessão raiz seguindo a cadeia de parentID.
 * Isso garante que parent e subagents usem o mesmo QuestLog.
 *
 * IMPORTANTE: Só busca dentro do mesmo projeto para evitar
 * misturar QuestLogs de projetos diferentes.
 */
function findRootSessionId(sessionId: string): string {
  const sessionDir = join(OPENCODE_STORAGE, "session");

  if (!existsSync(sessionDir)) {
    return sessionId; // Fallback se não encontrar storage
  }

  // Primeiro, encontra em qual projeto está a sessão atual
  let currentProjectId: string | null = null;

  try {
    const projects = readdirSync(sessionDir);
    for (const proj of projects) {
      const sessionPath = join(sessionDir, proj, `${sessionId}.json`);
      if (existsSync(sessionPath)) {
        currentProjectId = proj;
        break;
      }
    }
  } catch {
    return sessionId; // Erro ao ler, usa sessionId atual
  }

  if (!currentProjectId) {
    return sessionId; // Não encontrou o projeto, usa sessionId atual
  }

  // Função para ler uma sessão APENAS do projeto atual
  const readSession = (sesId: string): OpenCodeSession | null => {
    const sessionPath = join(sessionDir, currentProjectId!, `${sesId}.json`);
    if (existsSync(sessionPath)) {
      try {
        return JSON.parse(readFileSync(sessionPath, "utf-8")) as OpenCodeSession;
      } catch {
        return null;
      }
    }
    return null;
  };

  // Segue a cadeia de parentID até a raiz (dentro do mesmo projeto)
  let currentId = sessionId;
  const visited = new Set<string>(); // Previne loops infinitos

  while (true) {
    if (visited.has(currentId)) {
      break; // Loop detectado, para aqui
    }
    visited.add(currentId);

    const session = readSession(currentId);
    if (!session) {
      break; // Não encontrou a sessão, usa o último conhecido
    }

    if (!session.parentID) {
      // Encontrou a raiz!
      return session.id;
    }

    // Continua subindo na hierarquia
    currentId = session.parentID;
  }

  return currentId; // Retorna o último ID válido encontrado
}

// Tipos
interface Quest {
  id: string;
  subject: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
  activeForm?: string;
  blockedBy: string[];
  createdAt: string;
  updatedAt: string;
}

interface QuestLog {
  sessionId: string;
  quests: Quest[];
}


// Helpers
function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function getLogPath(sessionId: string): string {
  ensureDir(QUESTS_DIR);
  return join(QUESTS_DIR, `${sessionId}.json`);
}

function loadQuestLog(sessionId: string): QuestLog {
  const path = getLogPath(sessionId);
  if (!existsSync(path)) {
    return { sessionId, quests: [] };
  }
  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content) as QuestLog;
  } catch {
    return { sessionId, quests: [] };
  }
}

function saveQuestLog(log: QuestLog): void {
  const path = getLogPath(log.sessionId);
  writeFileSync(path, JSON.stringify(log, null, 2), "utf-8");
}

function generateId(quests: Quest[]): string {
  const maxId = quests.reduce((max, q) => {
    const num = parseInt(q.id.replace("quest-", ""), 10);
    return num > max ? num : max;
  }, 0);
  return `quest-${String(maxId + 1).padStart(3, "0")}`;
}

function getBlockedByResolved(quest: Quest, allQuests: Quest[]): boolean {
  if (quest.blockedBy.length === 0) return true;
  return quest.blockedBy.every((blockerId) => {
    const blocker = allQuests.find((q) => q.id === blockerId);
    return blocker?.status === "completed";
  });
}

function formatQuestForList(quest: Quest, allQuests: Quest[], compact = false): string {
  const statusIcon =
    quest.status === "completed"
      ? "✅"
      : quest.status === "in_progress"
        ? "🔄"
        : "⏳";

  const isBlocked =
    quest.blockedBy.length > 0 && !getBlockedByResolved(quest, allQuests);

  if (compact) {
    // Formato ultra-compacto: ✅001 | 🔄002 | ⏳003🔒
    const shortId = quest.id.replace("quest-", "");
    const lockIcon = isBlocked ? "🔒" : "";
    return `${statusIcon}${shortId}${lockIcon}`;
  }

  const blockIndicator = isBlocked ? ` 🔒 [blocked by: ${quest.blockedBy.join(", ")}]` : "";
  return `${statusIcon} ${quest.id}: ${quest.subject}${blockIndicator}`;
}

// Descrição da tool
const TOOL_DESCRIPTION = `
Gerencia quests para rastrear progresso em tarefas complexas.

IMPORTANTE: Quests são COMPARTILHADAS entre parent e subagents!
A tool encontra automaticamente a sessão raiz, então todos os agents
(principal e subagents) trabalham com o mesmo QuestLog.

═══════════════════════════════════════════════════════════════
COMANDOS:
═══════════════════════════════════════════════════════════════

• create → Cria nova quest
  - subject (obrigatório): Título acionável, ex: "[Grupo 1.1] Implementar login"
  - description (obrigatório): Contexto COMPLETO (arquivos, critérios, detalhes)
  - activeForm (opcional): Gerúndio para exibição, ex: "Implementando login"

• update → Atualiza quest existente
  - id (obrigatório): ID da quest
  - status: "pending" | "in_progress" | "completed"
  - newSubject: Atualizar título
  - newDescription: Novo conteúdo (para context bridges!)
  - activeForm: Atualizar gerúndio (ex: corrigir "Crinado" → "Criando")
  - addBlockedBy: IDs de quests que bloqueiam esta
  - removeBlockedBy: IDs para remover dos bloqueios

• list → Lista todas as quests
  - available=true: Só quests prontas (pending + sem bloqueios)
  - compact=true: Formato ultra-compacto (ideal para 20+ quests)

• get → Detalhes completos de uma quest
  - id (obrigatório): ID da quest

═══════════════════════════════════════════════════════════════
WORKFLOW TÍPICO (Sistema Relay):
═══════════════════════════════════════════════════════════════

1. CRIAR QUESTS com descrições ricas:
   command="create"
   subject="[Grupo 1.1] Implementar autenticação JWT"
   description="## Objetivo\\nImplementar...\\n\\n## Critérios\\n- ..."
   activeForm="Implementando autenticação JWT"

2. CONFIGURAR BLOQUEIOS após criar todas:
   command="update", id="quest-004", addBlockedBy=["quest-001","quest-002","quest-003"]

3. VER QUESTS DISPONÍVEIS:
   command="list", available=true

4. LER DESCRIÇÃO COMPLETA:
   command="get", id="quest-001"

5. INICIAR TRABALHO:
   command="update", id="quest-001", status="in_progress"

6. COMPLETAR:
   command="update", id="quest-001", status="completed"
   → Quests que dependiam desta ficam disponíveis automaticamente!

7. CONTEXT BRIDGE (transferir contexto para próximo grupo):
   command="update", id="quest-005"
   newDescription="## Contexto do Grupo 1\\n- Arquivos criados: ...\\n- Decisões: ..."

═══════════════════════════════════════════════════════════════
QUANDO USAR:
═══════════════════════════════════════════════════════════════

✅ Tarefas multi-step complexas (3+ etapas)
✅ Orquestração de grupos com context bridges
✅ Rastrear progresso em implementações longas
✅ Preservar contexto entre agents

❌ Tarefa trivial de uma linha
❌ Menos de 3 passos simples
❌ Tarefas puramente conversacionais
`.trim();

export default tool({
  description: TOOL_DESCRIPTION,
  args: {
    command: tool.schema
      .enum(["create", "update", "list", "get"])
      .describe("Comando a executar"),

    // Para CREATE
    subject: tool.schema
      .string()
      .optional()
      .describe("Título da quest (obrigatório para create)"),
    description: tool.schema
      .string()
      .optional()
      .describe("Descrição completa da quest (obrigatório para create)"),
    activeForm: tool.schema
      .string()
      .optional()
      .describe("Gerúndio para exibição, ex: 'Implementando login'"),

    // Para UPDATE e GET
    id: tool.schema
      .string()
      .optional()
      .describe("ID da quest (obrigatório para update/get)"),
    status: tool.schema
      .enum(["pending", "in_progress", "completed"])
      .optional()
      .describe("Novo status da quest"),
    newSubject: tool.schema
      .string()
      .optional()
      .describe("Novo título da quest"),
    newDescription: tool.schema
      .string()
      .optional()
      .describe("Nova descrição (crucial para context bridges!)"),
    addBlockedBy: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("IDs de quests para adicionar como bloqueadores"),
    removeBlockedBy: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("IDs de quests para remover dos bloqueadores"),

    // Para LIST
    available: tool.schema
      .boolean()
      .optional()
      .describe("Se true, lista só quests disponíveis (pending + sem bloqueios)"),
    compact: tool.schema
      .boolean()
      .optional()
      .describe("Se true, lista ultra-compacta (uma linha por quest, ideal para 20+ quests)"),
  },

  async execute(args, context) {
    // Encontra a sessão raiz para compartilhar quests entre parent e subagents
    const currentSessionId = context.sessionID || "default";
    const rootSessionId = findRootSessionId(currentSessionId);
    const log = loadQuestLog(rootSessionId);

    switch (args.command) {
      // ═══════════════════════════════════════════════════════════════
      // CREATE
      // ═══════════════════════════════════════════════════════════════
      case "create": {
        if (!args.subject) {
          return `❌ Erro: "subject" é obrigatório para criar quest.

Exemplo:
  command="create"
  subject="[Grupo 1.1] Implementar login"
  description="## Objetivo\\n..."`;
        }
        if (!args.description) {
          return `❌ Erro: "description" é obrigatório para criar quest.

A descrição deve conter TODO o contexto necessário para executar a quest.
Agents não têm acesso à conversa - só ao que está na description.`;
        }

        const now = new Date().toISOString();
        const newQuest: Quest = {
          id: generateId(log.quests),
          subject: args.subject,
          description: args.description,
          status: "pending",
          activeForm: args.activeForm,
          blockedBy: [],
          createdAt: now,
          updatedAt: now,
        };

        log.quests.push(newQuest);
        saveQuestLog(log);

        return `✅ Quest criada: ${newQuest.id}

**Subject:** ${newQuest.subject}
${newQuest.activeForm ? `**Active Form:** ${newQuest.activeForm}` : ""}
**Status:** pending

Use \`command="update", id="${newQuest.id}", addBlockedBy=[...]\` para configurar dependências.`;
      }

      // ═══════════════════════════════════════════════════════════════
      // UPDATE
      // ═══════════════════════════════════════════════════════════════
      case "update": {
        if (!args.id) {
          return `❌ Erro: "id" é obrigatório para atualizar quest.

Exemplo:
  command="update"
  id="quest-001"
  status="in_progress"`;
        }

        const questIndex = log.quests.findIndex((q) => q.id === args.id);
        if (questIndex === -1) {
          const available = log.quests.map((q) => q.id).join(", ");
          return `❌ Quest "${args.id}" não encontrada.

Quests disponíveis: ${available || "nenhuma"}`;
        }

        const quest = log.quests[questIndex];
        const changes: string[] = [];

        // ═══════════════════════════════════════════════════════════════
        // VALIDAÇÃO DE BLOQUEIO (Enforcement Rígido)
        // Impede mudança de status se houver bloqueadores não completados
        // ═══════════════════════════════════════════════════════════════
        if (args.status && args.status !== quest.status) {
          const isAdvancingStatus =
            args.status === "in_progress" || args.status === "completed";

          if (isAdvancingStatus && quest.blockedBy.length > 0) {
            const pendingBlockers = quest.blockedBy
              .map((blockerId) => {
                const blocker = log.quests.find((q) => q.id === blockerId);
                return blocker && blocker.status !== "completed"
                  ? blocker
                  : null;
              })
              .filter((b): b is Quest => b !== null);

            if (pendingBlockers.length > 0) {
              const blockersList = pendingBlockers
                .map((b) => `  • ${b.id}: ${b.subject} (${b.status})`)
                .join("\n");

              return `🚫 **Ação negada!** Quest "${quest.id}" está bloqueada.

**Bloqueadores pendentes:**
${blockersList}

Complete as quests acima antes de avançar "${quest.subject}".

💡 Use \`command="list", available=true\` para ver quests disponíveis.`;
            }
          }

          quest.status = args.status;
          changes.push(`status → ${args.status}`);
        }

        if (args.newSubject && args.newSubject !== quest.subject) {
          quest.subject = args.newSubject;
          changes.push(`subject atualizado`);
        }

        if (args.newDescription) {
          quest.description = args.newDescription;
          changes.push(`description atualizada`);
        }

        if (args.activeForm) {
          quest.activeForm = args.activeForm;
          changes.push(`activeForm → ${args.activeForm}`);
        }

        if (args.addBlockedBy && args.addBlockedBy.length > 0) {
          for (const blockerId of args.addBlockedBy) {
            if (!quest.blockedBy.includes(blockerId)) {
              // Verificar se o bloqueador existe
              const blockerExists = log.quests.some((q) => q.id === blockerId);
              if (blockerExists) {
                quest.blockedBy.push(blockerId);
              }
            }
          }
          changes.push(`blockedBy += [${args.addBlockedBy.join(", ")}]`);
        }

        if (args.removeBlockedBy && args.removeBlockedBy.length > 0) {
          quest.blockedBy = quest.blockedBy.filter(
            (id) => !args.removeBlockedBy!.includes(id)
          );
          changes.push(`blockedBy -= [${args.removeBlockedBy.join(", ")}]`);
        }

        if (changes.length === 0) {
          return `⚠️ Nenhuma alteração feita em ${args.id}.

Parâmetros disponíveis para update:
- status: "pending" | "in_progress" | "completed"
- newSubject: string
- newDescription: string
- activeForm: string
- addBlockedBy: string[]
- removeBlockedBy: string[]`;
        }

        quest.updatedAt = new Date().toISOString();
        log.quests[questIndex] = quest;
        saveQuestLog(log);

        // Verificar se quests foram desbloqueadas
        let unblocked: string[] = [];
        if (args.status === "completed") {
          unblocked = log.quests
            .filter(
              (q) =>
                q.status === "pending" &&
                q.blockedBy.includes(args.id!) &&
                getBlockedByResolved(q, log.quests)
            )
            .map((q) => q.id);
        }

        let result = `✅ Quest ${args.id} atualizada:
${changes.map((c) => `  • ${c}`).join("\n")}`;

        // Se mudou para in_progress, incluir contexto completo para o agent
        if (args.status === "in_progress") {
          result += `\n\n---\n\n# 📋 Contexto da Quest\n\n**Subject:** ${quest.subject}`;
          if (quest.activeForm) {
            result += `\n**Fazendo:** ${quest.activeForm}`;
          }
          if (quest.blockedBy.length > 0) {
            result += `\n**Dependências (já resolvidas):** ${quest.blockedBy.join(", ")}`;
          }
          result += `\n\n${quest.description}`;
        }

        if (unblocked.length > 0) {
          result += `\n\n🔓 Quests desbloqueadas: ${unblocked.join(", ")}`;
        }

        // Verifica se todas as quests foram completadas
        const allCompleted = log.quests.every((q) => q.status === "completed");
        if (allCompleted && log.quests.length > 0) {
          result += `\n\n🎉 **Todas as quests foram completadas!**`;
        }

        return result;
      }

      // ═══════════════════════════════════════════════════════════════
      // LIST
      // ═══════════════════════════════════════════════════════════════
      case "list": {
        // Indica se está usando sessão compartilhada (subagent acessando quests do parent)
        const isSharedSession = currentSessionId !== rootSessionId;
        const sharedNote = isSharedSession
          ? `\n🔗 *Sessão compartilhada com parent (root: ${rootSessionId.slice(0, 20)}...)*\n`
          : "";

        if (log.quests.length === 0) {
          return `📋 Nenhuma quest encontrada.${sharedNote}

Use \`command="create"\` para criar uma nova quest.`;
        }

        let questsToShow = log.quests;

        if (args.available) {
          questsToShow = log.quests.filter(
            (q) =>
              q.status === "pending" && getBlockedByResolved(q, log.quests)
          );

          if (questsToShow.length === 0) {
            const inProgress = log.quests.filter(
              (q) => q.status === "in_progress"
            );
            const pending = log.quests.filter((q) => q.status === "pending");
            const completed = log.quests.filter(
              (q) => q.status === "completed"
            );

            return `📋 Nenhuma quest disponível no momento.${sharedNote}

**Status atual:**
- Em progresso: ${inProgress.length}
- Pendentes (bloqueadas): ${pending.length}
- Completadas: ${completed.length}

Use \`command="list"\` (sem available) para ver todas.`;
          }
        }

        const summary = {
          total: log.quests.length,
          pending: log.quests.filter((q) => q.status === "pending").length,
          inProgress: log.quests.filter((q) => q.status === "in_progress")
            .length,
          completed: log.quests.filter((q) => q.status === "completed").length,
        };

        // Formato compact para muitas quests
        if (args.compact) {
          const questCodes = questsToShow.map((q) =>
            formatQuestForList(q, log.quests, true)
          );
          // Agrupa em linhas de ~15 quests
          const lines: string[] = [];
          for (let i = 0; i < questCodes.length; i += 15) {
            lines.push(questCodes.slice(i, i + 15).join(" | "));
          }
          return `📋 Quests (${summary.completed}✅ ${summary.inProgress}🔄 ${summary.pending}⏳)${sharedNote}
${lines.join("\n")}
Legenda: ✅=done 🔄=progress ⏳=pending 🔒=blocked`;
        }

        const questLines = questsToShow.map((q) =>
          formatQuestForList(q, log.quests)
        );

        return `📋 Quests${args.available ? " Disponíveis" : ""} (${questsToShow.length}${args.available ? ` de ${summary.total}` : ""})${sharedNote}

${questLines.join("\n")}

${
  !args.available
    ? `**Resumo:** ${summary.completed} completadas, ${summary.inProgress} em progresso, ${summary.pending} pendentes`
    : ""
}
Use \`command="get", id="quest-XXX"\` para ver descrição completa.`;
      }

      // ═══════════════════════════════════════════════════════════════
      // GET
      // ═══════════════════════════════════════════════════════════════
      case "get": {
        if (!args.id) {
          return `❌ Erro: "id" é obrigatório para ler quest.

Exemplo:
  command="get"
  id="quest-001"`;
        }

        const quest = log.quests.find((q) => q.id === args.id);
        if (!quest) {
          const available = log.quests.map((q) => q.id).join(", ");
          return `❌ Quest "${args.id}" não encontrada.

Quests disponíveis: ${available || "nenhuma"}`;
        }

        const statusIcon =
          quest.status === "completed"
            ? "✅"
            : quest.status === "in_progress"
              ? "🔄"
              : "⏳";

        const isBlocked =
          quest.blockedBy.length > 0 &&
          !getBlockedByResolved(quest, log.quests);

        return `# ${statusIcon} ${quest.id}: ${quest.subject}

**Status:** ${quest.status}${isBlocked ? " (🔒 bloqueada)" : ""}
${quest.activeForm ? `**Active Form:** ${quest.activeForm}` : ""}
${quest.blockedBy.length > 0 ? `**Blocked By:** ${quest.blockedBy.join(", ")}` : ""}
**Criada:** ${quest.createdAt}
**Atualizada:** ${quest.updatedAt}

---

${quest.description}`;
      }

      default:
        return `❌ Comando desconhecido: ${args.command}

Comandos disponíveis: create, update, list, get`;
    }
  },
});
