/**
 * Analyze - Ferramenta de análise de dependências e impacto
 *
 * Usa Skott + Knip internamente via pacote @justmpm/ai-tool.
 *
 * COMANDOS:
 *   - map     Mapa do projeto para contexto do modelo
 *   - dead    Detecção de código morto (arquivos órfãos)
 *   - impact  Análise de impacto antes de modificar um arquivo
 */

import { tool } from "@opencode-ai/plugin";
import { execSync } from "child_process";

const TOOL_DESCRIPTION = `
ANTES de editar hooks, utils, services ou components compartilhados, rode "impact" para saber quantos arquivos serão afetados. Evita quebrar código sem querer.

Comandos (em ordem de uso):
1. impact <arquivo> - ESSENCIAL antes de editar. Mostra quem importa (upstream) e o que será afetado.
2. map - Use no INÍCIO da sessão para entender a estrutura do projeto.
3. dead - Encontra código morto. Use quando usuário pedir limpeza ou refatoração geral.

Gatilhos - Rode esta tool quando:
- Usuário pede para "refatorar", "modificar", "alterar" → impact ANTES de editar
- Usuário pede para "limpar código", "remover não usado" → dead
- Projeto novo ou início de sessão → map
- Dúvida sobre "quem usa esse arquivo?" → impact

Exemplos práticos:
- "Refatora o useAuth" → impact useAuth (descobre que 23 arquivos usam, cuidado!)
- "Modifica o Button" → impact Button (vê que Header, Footer, Card dependem)
- "Limpa o projeto" → dead (encontra 5 arquivos órfãos para remover)

Busca flexível: "Button", "useAuth", "src/hooks/useAuth.ts" - encontra automaticamente.

Evite usar quando: testes isolados, configs, edições triviais (typos).
`.trim();

export default tool({
  description: TOOL_DESCRIPTION,
  args: {
    command: tool.schema.enum(["map", "dead", "impact"]).describe(
      "map = visão geral do projeto | dead = arquivos não utilizados | impact = análise antes de modificar"
    ),
    target: tool.schema.string().optional().describe(
      "Para 'impact': arquivo a analisar. Aceita caminho completo, nome, ou parcial"
    ),
    format: tool.schema.enum(["text", "json"]).optional().describe(
      "text = formatado para leitura (default) | json = dados estruturados"
    )
  },
  async execute(args, context) {
    const root = context.directory || process.cwd();
    const format = args.format || "text";

    try {
      let cmd = `npx --yes @justmpm/ai-tool@latest ${args.command}`;

      // Adicionar target se for impact
      if (args.command === "impact" && args.target) {
        cmd += ` "${args.target}"`;
      }

      // Adicionar flags
      cmd += ` --format=${format}`;
      cmd += ` --cwd="${root}"`;

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
