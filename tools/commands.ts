/**
 * Commands - Tool para invocar slash commands proativamente
 *
 * O modelo pode usar essa tool para executar qualquer comando
 * disponível em ~/.config/opencode/command/*.md
 *
 * A descrição é gerada dinamicamente na inicialização,
 * listando todos os commands disponíveis com suas descrições.
 */

import { tool } from "@opencode-ai/plugin";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";

// Diretórios onde commands podem estar
const COMMAND_DIRS = [
  join(homedir(), ".config", "opencode", "command"),
  join(process.cwd(), ".opencode", "command"),
];

interface CommandInfo {
  name: string;
  description: string;
  argumentHint?: string;
  path: string;
}

/**
 * Extrai frontmatter YAML de um arquivo markdown
 */
function extractFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const frontmatter: Record<string, string> = {};
  const lines = match[1].split(/\r?\n/);

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      // Remove aspas se existirem
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      frontmatter[key] = value;
    }
  }

  return frontmatter;
}

/**
 * Extrai o conteúdo do command (após o frontmatter)
 */
function extractContent(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  return match ? match[1].trim() : content;
}

/**
 * Descobre todos os commands disponíveis
 */
function discoverCommands(): CommandInfo[] {
  const commands: CommandInfo[] = [];
  const seen = new Set<string>();

  for (const dir of COMMAND_DIRS) {
    if (!existsSync(dir)) continue;

    try {
      const files = readdirSync(dir).filter(f => f.endsWith(".md"));

      for (const file of files) {
        const name = basename(file, ".md");

        // Primeiro encontrado tem prioridade (projeto > global)
        if (seen.has(name)) continue;
        seen.add(name);

        const filePath = join(dir, file);
        const content = readFileSync(filePath, "utf-8");
        const frontmatter = extractFrontmatter(content);

        commands.push({
          name,
          description: frontmatter.description || "Sem descrição",
          argumentHint: frontmatter["argument-hint"],
          path: filePath,
        });
      }
    } catch {
      // Ignora erros de leitura
    }
  }

  // Ordena alfabeticamente
  return commands.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Gera a descrição da tool dinamicamente
 */
function generateDescription(): string {
  const commands = discoverCommands();

  if (commands.length === 0) {
    return `Executa slash commands do usuário.

Nenhum command encontrado em:
• ~/.config/opencode/command/
• .opencode/command/`;
  }

  const commandList = commands
    .map(cmd => {
      const hint = cmd.argumentHint ? ` ${cmd.argumentHint}` : "";
      return `• ${cmd.name}${hint}\n  └─ ${cmd.description}`;
    })
    .join("\n\n");

  return `Executa slash commands do usuário proativamente.

Use quando a tarefa do usuário se encaixar em um command existente.
O conteúdo do command será retornado para você seguir as instruções.

═══════════════════════════════════════════════════════════════
COMMANDS DISPONÍVEIS:
═══════════════════════════════════════════════════════════════

${commandList}

═══════════════════════════════════════════════════════════════
COMO USAR:
═══════════════════════════════════════════════════════════════

1. Chame esta tool com o nome do command
2. Opcionalmente passe argumentos (ex: escopo, flags)
3. Siga as instruções retornadas no conteúdo do command

Exemplo: command="audit", arguments="src/components --diff"`;
}

export default tool({
  description: generateDescription(),
  args: {
    command: tool.schema.string().describe(
      "Nome do command a executar (ex: 'audit', 'fix', 'scan')"
    ),
    arguments: tool.schema.string().optional().describe(
      "Argumentos para passar ao command (substitui $ARGUMENTS no template)"
    ),
  },
  async execute(args, context) {
    const commands = discoverCommands();
    const cmd = commands.find(c => c.name === args.command);

    if (!cmd) {
      const available = commands.map(c => c.name).join(", ");
      return `❌ Command "${args.command}" não encontrado.

Commands disponíveis: ${available || "nenhum"}`;
    }

    try {
      const content = readFileSync(cmd.path, "utf-8");
      const template = extractContent(content);

      // Substitui $ARGUMENTS pelo valor passado
      const processedContent = args.arguments
        ? template.replace(/\$ARGUMENTS/g, args.arguments)
        : template.replace(/\$ARGUMENTS/g, "(nenhum argumento fornecido)");

      return `# /${cmd.name}

**Descrição:** ${cmd.description}
${cmd.argumentHint ? `**Argumentos:** ${args.arguments || "(nenhum)"}` : ""}

---

${processedContent}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `❌ Erro ao ler command "${args.command}": ${message}`;
    }
  },
});
