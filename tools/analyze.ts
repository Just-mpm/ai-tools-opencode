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

• map → Visão geral do projeto (categorias técnicas).
• dead → Encontra código morto/arquivos órfãos.
• areas → Lista todas as áreas/domínios funcionais.
• areas-init → Gera .analyze/areas.config.json para configurar áreas.

═══════════════════════════════════════════════════════════════
COMANDOS COM ARQUIVO (OBRIGATÓRIO passar target):
═══════════════════════════════════════════════════════════════

• suggest <target> → Lista arquivos para ler ANTES de editar.
• context <target> → Extrai assinaturas/tipos SEM implementação.
• impact <target> → Análise de quem usa e dependências.
• area <target> → Mostra arquivos de uma área específica.

IMPORTANTE: Para suggest/context/impact/area, o parâmetro "target" é OBRIGATÓRIO.

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
  command="areas"              → Ver domínios do projeto
  command="map"                → Ver estrutura técnica

Entender uma feature:
  command="area", target="auth"           → Todos arquivos de auth
  command="area", target="auth", type="hook"  → Apenas hooks de auth

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
      "areas",
      "area",
      "areas-init"
    ]).describe(
      "map = estrutura técnica | dead = código morto | areas = domínios funcionais | area = arquivos de uma área | suggest = arquivos para ler | context = assinaturas | impact = análise de impacto | areas-init = gerar config"
    ),
    target: tool.schema.string().optional().describe(
      "OBRIGATÓRIO para suggest/context/impact/area. Para area: nome da área (ex: 'auth', 'meus-pets'). Para outros: arquivo (ex: 'useAuth', 'Button.tsx')"
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

    try {
      let cmd = `npx --yes @justmpm/ai-tool@latest`;

      // Montar comando baseado no tipo
      switch (args.command) {
        case "areas-init":
          cmd += ` areas init`;
          if (args.force) cmd += ` --force`;
          break;

        case "area":
          if (!args.target) {
            return `❌ Erro: parâmetro "target" é OBRIGATÓRIO para o comando "area".

Exemplos:
  command="area", target="auth"
  command="area", target="meus-pets"
  command="area", target="stripe", type="hook"

Use command="areas" (sem target) para listar todas as áreas disponíveis.`;
          }
          cmd += ` area "${args.target}"`;
          if (args.type) cmd += ` --type=${args.type}`;
          if (args.full) cmd += ` --full`;
          break;

        case "areas":
          cmd += ` areas`;
          break;

        case "suggest":
        case "context":
        case "impact":
          if (!args.target) {
            return `❌ Erro: parâmetro "target" é OBRIGATÓRIO para o comando "${args.command}".

Exemplos:
  command="${args.command}", target="useAuth"
  command="${args.command}", target="Button.tsx"
  command="${args.command}", target="src/hooks/useAuth.ts"`;
          }
          cmd += ` ${args.command} "${args.target}"`;
          if (args.command === "suggest" && args.limit) {
            cmd += ` --limit=${args.limit}`;
          }
          break;

        default:
          cmd += ` ${args.command}`;
      }

      // Adicionar flags comuns
      cmd += ` --format=${format}`;
      cmd += ` --cwd="${root}"`;

      const result = execSync(cmd, {
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024, // 50MB
        timeout: 180000, // 3 minutos
        stdio: ["pipe", "pipe", "pipe"]
      });

      return result;
    } catch (error) {
      if (error instanceof Error && "stdout" in error) {
        const stdout = (error as { stdout?: string }).stdout;
        if (stdout) return stdout;
      }

      const message = error instanceof Error ? error.message : String(error);
      return `❌ Erro ao executar analyze: ${message}`;
    }
  }
});
