/**
 * Analyze - Ferramenta de análise de dependências, impacto e áreas funcionais
 *
 * Usa Skott + Knip + ts-morph internamente via pacote @justmpm/ai-tool.
 *
 * COMANDOS:
 *   - map         Mapa do projeto para contexto do modelo
 *   - dead        Detecção de código morto (arquivos órfãos)
 *   - impact      Análise de impacto antes de modificar um arquivo
 *   - suggest     Sugere arquivos para ler antes de modificar um arquivo
 *   - context     Extrai assinaturas de funções/tipos (sem implementação)
 *   - find        Busca símbolos no código (definição + usos)
 *   - functions   Lista Cloud Functions Firebase do projeto (v0.7.0)
 *   - areas       Lista todas as áreas/domínios funcionais do projeto
 *   - area        Mostra arquivos de uma área específica
 *   - areas-init  Gera arquivo de configuração de áreas
 */

import { tool } from "@opencode-ai/plugin";
import { execSync } from "child_process";

const TOOL_DESCRIPTION = `
Analisa dependências, impacto e áreas funcionais do projeto.

═══════════════════════════════════════════════════════════════
COMANDOS SEM ARQUIVO (rodam sozinhos):
═══════════════════════════════════════════════════════════════

• map → Resumo compacto: contagens, áreas, alertas (otimizado p/ tokens).
• dead → Encontra código morto/arquivos órfãos.
• areas → Lista todas as áreas/domínios funcionais.
• areas-init → Gera .analyze/areas.config.json para configurar áreas.
• functions → Lista Cloud Functions Firebase (agrupadas por trigger).

═══════════════════════════════════════════════════════════════
COMANDOS COM ARQUIVO (OBRIGATÓRIO passar target):
═══════════════════════════════════════════════════════════════

• suggest <target> → Lista arquivos para ler ANTES de editar.
• context <target> → Extrai assinaturas/tipos SEM implementação.
• context --areaName=<area> → Contexto consolidado de toda uma área.
• impact <target> → Análise de quem usa e dependências.
• area <target> → Mostra arquivos de uma área específica.
• find <target> → Busca símbolos no código (definição + usos).

IMPORTANTE: Para suggest/context/impact/area/find, o parâmetro "target" é OBRIGATÓRIO.

═══════════════════════════════════════════════════════════════
BUSCA DE SÍMBOLOS (find):
═══════════════════════════════════════════════════════════════

• find <target> → Busca definição + referências/usos de um símbolo.
• Diferente de grep: entende o AST do TypeScript.

Filtros disponíveis:
  - symbolType: function, type, const, component, hook, trigger, all
  - areaName: filtrar por área específica
  - defOnly: mostrar apenas definições
  - refsOnly: mostrar apenas referências/usos

Exemplos:
  command="find", target="useAuth"                    → Definição + usos
  command="find", target="User", symbolType="type"   → Busca apenas tipos
  command="find", target="login", areaName="auth"    → Busca na área auth
  command="find", target="submit", defOnly=true      → Apenas definições
  command="find", target="createUser", symbolType="trigger" → Busca Cloud Function

═══════════════════════════════════════════════════════════════
FIREBASE CLOUD FUNCTIONS (functions) - NOVO EM v0.7.0:
═══════════════════════════════════════════════════════════════

• functions → Lista todas as Cloud Functions do projeto Firebase.
• Agrupa por tipo de trigger (onCall, onDocumentCreated, onSchedule, etc).
• Mostra metadados: path (Firestore), schedule (cron).

Filtros disponíveis:
  - trigger: filtra por tipo de trigger (ex: onCall, onDocumentCreated)

Exemplos:
  command="functions"                        → Lista todas as Cloud Functions
  command="functions", trigger="onCall"      → Apenas triggers onCall
  command="functions", trigger="onSchedule"  → Apenas scheduled functions

Triggers suportados (40+):
  HTTPS: onCall, onRequest
  Firestore: onDocumentCreated, onDocumentUpdated, onDocumentDeleted, onDocumentWritten
  RTDB: onValueCreated, onValueUpdated, onValueDeleted, onValueWritten
  Storage: onObjectFinalized, onObjectArchived, onObjectDeleted, onMetadataUpdated
  Scheduler: onSchedule
  Pub/Sub: onMessagePublished
  Identity: beforeUserCreated, beforeUserSignedIn
  E mais: Crashlytics, Performance, Remote Config, Eventarc, Tasks, Test Lab

═══════════════════════════════════════════════════════════════
CONTEXTO DE ÁREA (context --areaName) - NOVO EM v0.6.0:
═══════════════════════════════════════════════════════════════

• context --areaName=<area> → Contexto consolidado de toda uma área.
• Uma chamada = entender toda a feature (tipos, hooks, funções, componentes).
• Muito mais eficiente que chamar context em cada arquivo.

Exemplo:
  command="context", areaName="auth"  → Contexto de toda a área auth

═══════════════════════════════════════════════════════════════
DIFERENÇA: CATEGORIAS vs ÁREAS
═══════════════════════════════════════════════════════════════

• CATEGORIA = tipo técnico (hook, component, page, service...)
  → Use "map" para ver categorias

• ÁREA = domínio funcional (auth, meus-pets, stripe, dashboard...)
  → Use "areas" para ver áreas
  → Use "area <nome>" para ver arquivos de uma área

Um arquivo pode pertencer a MÚLTIPLAS áreas!

═══════════════════════════════════════════════════════════════
EXEMPLOS DE USO:
═══════════════════════════════════════════════════════════════

Início de sessão:
  command="map"                → Resumo com contagens + áreas + alertas

Entender uma feature:
  command="area", target="auth"           → Todos arquivos de auth
  command="area", target="auth", type="hook"  → Apenas hooks de auth
  command="context", areaName="auth"      → Contexto consolidado de auth

Buscar símbolos:
  command="find", target="useAuth"        → Onde useAuth é definido/usado
  command="find", target="Pet", symbolType="type"  → Busca tipo Pet
  command="find", target="createUser", symbolType="trigger" → Busca Cloud Function

Firebase Cloud Functions:
  command="functions"                     → Lista todas as Cloud Functions
  command="functions", trigger="onCall"   → Filtra por tipo de trigger

Antes de modificar arquivo:
  command="suggest", target="useAuth"     → O que ler antes
  command="impact", target="useAuth"      → Quem será afetado
  command="context", target="useAuth"     → API do arquivo

Configurar áreas manualmente:
  command="areas-init"         → Gera .analyze/areas.config.json
  (depois edite o arquivo para ajustar áreas)

═══════════════════════════════════════════════════════════════
CONFIGURAÇÃO MANUAL DE ÁREAS (.analyze/areas.config.json):
═══════════════════════════════════════════════════════════════

Após rodar "areas-init", você pode editar o arquivo para:

1. ADICIONAR ÁREAS que não foram detectadas:
   "areas": {
     "beta": {
       "name": "Programa Beta",
       "description": "Sistema de beta testers",
       "patterns": ["components/beta/**", "app/**/beta/**"],
       "keywords": ["beta", "tester"]
     }
   }

2. AJUSTAR PADRÕES de áreas existentes:
   "areas": {
     "auth": {
       "patterns": ["components/auth/**", "hooks/useAuth.ts"],
       "exclude": ["components/auth/legacy/**"]
     }
   }

3. ADICIONAR DESCRIÇÕES de arquivos específicos:
   "descriptions": {
     "components/pets/PetForm.tsx": "Formulário multi-step de pets",
     "hooks/useAuth.ts": "Hook principal de autenticação"
   }

O arquivo é EDITÁVEL e será respeitado nas próximas execuções!
`.trim();

export default tool({
  description: TOOL_DESCRIPTION,
  args: {
    command: tool.schema.enum([
      "map",
      "dead",
      "impact",
      "suggest",
      "context",
      "find",
      "functions",
      "areas",
      "area",
      "areas-init"
    ]).describe(
      "map = estrutura técnica | dead = código morto | areas = domínios funcionais | area = arquivos de uma área | suggest = arquivos para ler | context = assinaturas | find = busca símbolos | functions = Cloud Functions Firebase | impact = análise de impacto | areas-init = gerar config"
    ),
    target: tool.schema.string().optional().describe(
      "OBRIGATÓRIO para suggest/context/impact/area/find. Para area: nome da área (ex: 'auth'). Para find: nome do símbolo (ex: 'useAuth'). Para outros: arquivo (ex: 'Button.tsx')"
    ),
    format: tool.schema.enum(["text", "json"]).optional().describe(
      "text = formatado para leitura (default) | json = dados estruturados"
    ),
    type: tool.schema.enum([
      "page", "layout", "route", "component", "hook",
      "service", "store", "util", "type", "config", "test", "other"
    ]).optional().describe(
      "Para 'area': filtrar por categoria técnica (ex: type='hook' mostra só hooks)"
    ),
    symbolType: tool.schema.enum([
      "function", "type", "const", "component", "hook", "trigger", "all"
    ]).optional().describe(
      "Para 'find': filtrar por tipo de símbolo. 'trigger' busca Cloud Functions (default: all)"
    ),
    trigger: tool.schema.string().optional().describe(
      "Para 'functions': filtrar por tipo de trigger (ex: onCall, onDocumentCreated, onSchedule)"
    ),
    areaName: tool.schema.string().optional().describe(
      "Para 'find': filtrar por área. Para 'context': contexto consolidado de toda uma área (ex: 'auth')"
    ),
    defOnly: tool.schema.boolean().optional().describe(
      "Para 'find': mostrar apenas definições (onde é declarado)"
    ),
    refsOnly: tool.schema.boolean().optional().describe(
      "Para 'find': mostrar apenas referências (onde é usado)"
    ),
    full: tool.schema.boolean().optional().describe(
      "Para 'area': mostrar TODOS os arquivos (default: resumido)"
    ),
    limit: tool.schema.number().optional().describe(
      "Para 'suggest': limite de sugestões (default: 10)"
    ),
    force: tool.schema.boolean().optional().describe(
      "Para 'areas-init': sobrescrever config existente"
    )
  },
  async execute(args, context) {
    const root = context.directory || process.cwd();
    const format = args.format || "text";

    // Sanitizar target para evitar injeção de comandos
    const sanitizeArg = (arg: string): string => {
      // Remove caracteres perigosos para shell
      return arg.replace(/[;&|`$(){}[\]<>\\!#*?'"]/g, "");
    };

    try {
      const cmdParts: string[] = ["ai-tool"];

      // Montar comando baseado no tipo
      switch (args.command) {
        case "areas-init":
          cmdParts.push("areas", "init");
          if (args.force) cmdParts.push("--force");
          break;

        case "area":
          if (!args.target) {
            return `Erro: parâmetro "target" é OBRIGATÓRIO para o comando "area".

Exemplos:
  command="area", target="auth"
  command="area", target="meus-pets"
  command="area", target="stripe", type="hook"

Use command="areas" (sem target) para listar todas as áreas disponíveis.`;
          }
          cmdParts.push("area", `"${sanitizeArg(args.target)}"`);
          if (args.type) cmdParts.push(`--type=${args.type}`);
          if (args.full) cmdParts.push("--full");
          break;

        case "areas":
          cmdParts.push("areas");
          break;

        case "functions":
          cmdParts.push("functions");
          if (args.trigger) cmdParts.push(`--trigger=${sanitizeArg(args.trigger)}`);
          break;

        case "find":
          if (!args.target) {
            return `Erro: parâmetro "target" é OBRIGATÓRIO para o comando "find".

Exemplos:
  command="find", target="useAuth"           → Definição + usos
  command="find", target="User", symbolType="type"   → Busca tipos
  command="find", target="login", areaName="auth"    → Busca na área auth
  command="find", target="submit", defOnly=true      → Apenas definições`;
          }
          cmdParts.push("find", `"${sanitizeArg(args.target)}"`);
          if (args.symbolType && args.symbolType !== "all") {
            cmdParts.push(`--type=${args.symbolType}`);
          }
          if (args.areaName) cmdParts.push(`--area=${sanitizeArg(args.areaName)}`);
          if (args.defOnly) cmdParts.push("--def");
          if (args.refsOnly) cmdParts.push("--refs");
          break;

        case "context":
          // Se areaName for passado sem target, usa context --area=<nome>
          if (args.areaName && !args.target) {
            cmdParts.push("context", `--area=${sanitizeArg(args.areaName)}`);
          } else if (args.target) {
            cmdParts.push("context", `"${sanitizeArg(args.target)}"`);
          } else {
            return `Erro: parâmetro "target" ou "areaName" é OBRIGATÓRIO para o comando "context".

Exemplos:
  command="context", target="useAuth"        → Assinaturas do arquivo
  command="context", areaName="auth"         → Contexto consolidado da área`;
          }
          break;

        case "suggest":
        case "impact":
          if (!args.target) {
            return `Erro: parâmetro "target" é OBRIGATÓRIO para o comando "${args.command}".

Exemplos:
  command="${args.command}", target="useAuth"
  command="${args.command}", target="Button.tsx"
  command="${args.command}", target="src/hooks/useAuth.ts"`;
          }
          cmdParts.push(args.command, `"${sanitizeArg(args.target)}"`);
          if (args.command === "suggest" && args.limit) {
            cmdParts.push(`--limit=${args.limit}`);
          }
          break;

        default:
          cmdParts.push(args.command);
      }

      // Adicionar flags comuns
      cmdParts.push(`--format=${format}`);
      cmdParts.push(`--cwd="${root}"`);

      const cmd = cmdParts.join(" ");

      const result = execSync(cmd, {
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024, // 50MB
        timeout: 120000, // 2 minutos
        stdio: ["pipe", "pipe", "pipe"]
      });

      return result;
    } catch (error) {
      // Tentar extrair stdout mesmo em caso de erro (alguns comandos retornam código != 0 mas tem output útil)
      if (error instanceof Error && "stdout" in error) {
        const stdout = (error as { stdout?: string }).stdout;
        if (stdout && stdout.trim().length > 0) {
          return stdout;
        }
      }

      // Tratamento específico por tipo de erro
      if (error instanceof Error) {
        const errorWithCode = error as NodeJS.ErrnoException & { killed?: boolean; signal?: string };

        // Timeout
        if (errorWithCode.killed && errorWithCode.signal === "SIGTERM") {
          return `Timeout: O comando demorou mais de 2 minutos.

Sugestões:
- Use "map" em vez de comandos mais pesados
- Tente com um target mais específico
- O projeto pode ser muito grande para análise completa`;
        }

        // Comando não encontrado
        if (errorWithCode.code === "ENOENT" || error.message.includes("not found") || error.message.includes("ENOENT")) {
          return `Comando "ai-tool" não encontrado.

Certifique-se de que @justmpm/ai-tool está instalado globalmente:
  npm install -g @justmpm/ai-tool`;
        }

        // Buffer excedido (projeto muito grande)
        if (error.message.includes("maxBuffer")) {
          return `Saída muito grande (excedeu 50MB).

Sugestões:
- Use format="json" e processe os dados
- Use comandos mais específicos (area, context)
- O projeto pode ter muitos arquivos para análise`;
        }

        // Erro genérico com stderr
        if ("stderr" in error) {
          const stderr = (error as { stderr?: string }).stderr;
          if (stderr && stderr.trim().length > 0) {
            return `Erro ao executar analyze:\n${stderr}`;
          }
        }

        return `Erro ao executar analyze: ${error.message}`;
      }

      return `Erro desconhecido ao executar analyze: ${String(error)}`;
    }
  }
});
