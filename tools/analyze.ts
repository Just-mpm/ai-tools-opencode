/**
 * Analyze - Ferramenta de análise de dependências e impacto
 *
 * Usa Skott + Knip + ts-morph internamente via pacote @justmpm/ai-tool.
 *
 * COMANDOS:
 *   - map      Mapa do projeto para contexto do modelo
 *   - dead     Detecção de código morto (arquivos órfãos)
 *   - impact   Análise de impacto antes de modificar um arquivo
 *   - suggest  Sugere arquivos para ler antes de modificar um arquivo
 *   - context  Extrai assinaturas de funções/tipos (sem implementação)
 */

import { tool } from "@opencode-ai/plugin";
import { execSync } from "child_process";

const TOOL_DESCRIPTION = `
Analisa dependências e impacto antes de modificar código compartilhado.

COMANDOS SEM ARQUIVO (rodam sozinhos):
- map → Visão geral do projeto. Use no início da sessão.
- dead → Encontra código morto/arquivos órfãos.

COMANDOS COM ARQUIVO (OBRIGATÓRIO passar target):
- suggest <target> → Lista arquivos para ler ANTES de editar.
- context <target> → Extrai assinaturas/tipos SEM implementação.
- impact <target> → Análise de quem usa e dependências.

IMPORTANTE: Para suggest/context/impact, o parâmetro "target" é OBRIGATÓRIO.
Aceita: nome parcial ("Button"), nome completo ("useAuth.ts"), ou caminho ("src/hooks/useAuth.ts").

EXEMPLOS DE USO CORRETO:
- command="map" (sem target)
- command="dead" (sem target)
- command="suggest", target="useAuth"
- command="context", target="Button"
- command="impact", target="src/services/api.ts"

QUANDO USAR:
- Início de sessão → map
- Antes de refatorar/modificar → suggest ou impact COM o arquivo
- Entender API de um arquivo → context COM o arquivo
- Limpar código não usado → dead
`.trim();

export default tool({
  description: TOOL_DESCRIPTION,
  args: {
    command: tool.schema.enum(["map", "dead", "impact", "suggest", "context"]).describe(
      "map = visão geral | dead = código morto | impact = análise de impacto | suggest = arquivos para ler | context = assinaturas/tipos"
    ),
    target: tool.schema.string().optional().describe(
      "OBRIGATÓRIO para suggest/context/impact. Arquivo a analisar. Ex: 'useAuth', 'Button.tsx', 'src/hooks/useAuth.ts'"
    ),
    format: tool.schema.enum(["text", "json"]).optional().describe(
      "text = formatado para leitura (default) | json = dados estruturados"
    ),
    limit: tool.schema.number().optional().describe(
      "Para 'suggest': limite de sugestões (default: 10)"
    )
  },
  async execute(args, context) {
    const root = context.directory || process.cwd();
    const format = args.format || "text";

    try {
      let cmd = `npx --yes @justmpm/ai-tool@latest ${args.command}`;

      // Adicionar target se for comando que precisa
      if (["impact", "suggest", "context"].includes(args.command) && args.target) {
        cmd += ` "${args.target}"`;
      }

      // Adicionar flags
      cmd += ` --format=${format}`;
      cmd += ` --cwd="${root}"`;

      // Flag específica do suggest
      if (args.command === "suggest" && args.limit) {
        cmd += ` --limit=${args.limit}`;
      }

      const result = execSync(cmd, {
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024, // 50MB
        timeout: 180000, // 3 minutos (npx pode demorar na primeira vez)
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
