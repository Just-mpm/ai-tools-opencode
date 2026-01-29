/**
 * Plugin: Analyze Context Loader
 *
 * Carrega automaticamente a estrutura do projeto no system prompt
 * quando a sessão inicia. Usa o cache do ai-tool (.analyze/) se disponível.
 *
 * Usa o hook experimental.chat.system.transform para injetar no system prompt
 * em vez de enviar mensagem, evitando side effects como mudança de modelo.
 */

import { existsSync, readFileSync, statSync, readdirSync } from "fs";
import { join, extname } from "path";
import type { PluginInput, Plugin } from "@opencode-ai/plugin";

// ============================================================================
// TIPOS (baseados no ai-tool)
// ============================================================================

interface CacheMeta {
  version: string;
  createdAt: string;
  lastCheck: string;
  filesHash: string;
}

interface MapResult {
  version: string;
  timestamp: string;
  cwd: string;
  summary: {
    totalFiles: number;
    totalFolders: number;
    categories: Record<string, number>;
  };
  folders: Array<{
    path: string;
    fileCount: number;
    categories: Record<string, number>;
  }>;
  files: Array<{
    path: string;
    category: string;
    size: number;
  }>;
  circularDependencies: string[][];
  fromCache?: boolean;
}

// ============================================================================
// CACHE UTILS
// ============================================================================

const CACHE_DIR = ".analyze";
const META_FILE = "meta.json";
const MAP_FILE = "map.json";

function getCacheDir(cwd: string): string {
  return join(cwd, CACHE_DIR);
}

function calculateFilesHash(cwd: string): string {
  const extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
  const timestamps: number[] = [];

  function scanDir(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          if (
            entry.name === "node_modules" ||
            entry.name === ".git" ||
            entry.name === ".next" ||
            entry.name === "dist" ||
            entry.name === ".analyze"
          ) {
            continue;
          }
          scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            try {
              const stat = statSync(fullPath);
              timestamps.push(stat.mtimeMs);
            } catch {
              // Ignorar arquivos inacessíveis
            }
          }
        }
      }
    } catch {
      // Ignorar diretórios inacessíveis
    }
  }

  scanDir(cwd);
  const sum = timestamps.reduce((a, b) => a + b, 0);
  return `${timestamps.length}-${Math.floor(sum)}`;
}

function readJsonFile<T>(path: string): T | null {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function getTimeDiff(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d atrás`;
  if (hours > 0) return `${hours}h atrás`;
  if (minutes > 0) return `${minutes}min atrás`;
  return "agora";
}

// ============================================================================
// FORMATAÇÃO DO CONTEXTO
// ============================================================================

const CATEGORY_ICONS: Record<string, string> = {
  page: "📄",
  layout: "🖼️",
  route: "🛣️",
  component: "🧩",
  hook: "🪝",
  service: "⚙️",
  store: "🗄️",
  util: "🔧",
  type: "📝",
  config: "⚙️",
  test: "🧪",
  other: "📁",
};

function formatCategories(categories: Record<string, number>): string {
  return Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => `${CATEGORY_ICONS[cat] || "📁"} ${cat}: ${count}`)
    .join(" | ");
}

function formatFilesByFolder(
  files: MapResult["files"],
  folders: MapResult["folders"]
): string {
  // Agrupar arquivos por pasta
  const filesByFolder = new Map<string, MapResult["files"]>();

  for (const file of files) {
    const parts = file.path.split("/");
    const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : ".";

    if (!filesByFolder.has(folder)) {
      filesByFolder.set(folder, []);
    }
    filesByFolder.get(folder)!.push(file);
  }

  // Ordenar pastas por quantidade de arquivos
  const sortedFolders = Array.from(filesByFolder.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  let output = "";

  for (const [folder, folderFiles] of sortedFolders) {
    output += `\n📁 ${folder}/\n`;

    // Ordenar arquivos por categoria
    const sortedFiles = folderFiles.sort((a, b) =>
      a.category.localeCompare(b.category)
    );

    for (const file of sortedFiles) {
      const icon = CATEGORY_ICONS[file.category] || "📄";
      const fileName = file.path.split("/").pop();
      output += `  ${icon} ${fileName}\n`;
    }
  }

  return output;
}

function buildContextMessage(
  map: MapResult,
  meta: CacheMeta | null,
  isOutdated: boolean
): string {
  const timestamp = meta?.lastCheck || map.timestamp;
  const timeAgo = getTimeDiff(timestamp);
  const statusIcon = isOutdated ? "⚠️" : "✅";

  const circularWarning =
    map.circularDependencies.length > 0
      ? `\n⚠️ DEPENDÊNCIAS CIRCULARES (${map.circularDependencies.length}):\n${map.circularDependencies
          .slice(0, 5)
          .map((cycle) => `  ${cycle.join(" → ")}`)
          .join("\n")}${map.circularDependencies.length > 5 ? `\n  ... e mais ${map.circularDependencies.length - 5}` : ""}`
      : "";

  return `<project-structure>
# 📊 Estrutura do Projeto (cache: ${timeAgo}) ${statusIcon}

**Resumo:** ${map.summary.totalFiles} arquivos em ${map.summary.totalFolders} pastas

**Por categoria:**
${formatCategories(map.summary.categories)}
${circularWarning}

## 📁 Mapa Completo de Arquivos
${formatFilesByFolder(map.files, map.folders)}

---
${isOutdated
    ? "📦 Cache desatualizado. Use `analyze map` para regenerar."
    : "💡 Use `analyze impact <arquivo>` antes de modificar código compartilhado."}
</project-structure>`;
}

// ============================================================================
// PLUGIN
// ============================================================================

export const AnalyzeContextPlugin: Plugin = async (ctx: PluginInput) => {
  const { directory } = ctx;

  // Verificar se é um projeto válido (tem package.json ou tsconfig)
  const hasPackageJson = existsSync(join(directory, "package.json"));
  const hasTsConfig = existsSync(join(directory, "tsconfig.json"));

  if (!hasPackageJson && !hasTsConfig) {
    // Não é um projeto JS/TS, ignorar
    return {};
  }

  function getProjectContext(): string | null {
    const cacheDir = getCacheDir(directory);
    const metaPath = join(cacheDir, META_FILE);
    const mapPath = join(cacheDir, MAP_FILE);

    const meta = readJsonFile<CacheMeta>(metaPath);
    const map = readJsonFile<MapResult>(mapPath);

    if (map && meta) {
      const currentHash = calculateFilesHash(directory);
      const isOutdated = meta.filesHash !== currentHash;
      return buildContextMessage(map, meta, isOutdated);
    }

    // Sem cache disponível
    return `<project-structure>
## 📊 Estrutura do Projeto

⚠️ Cache não disponível. Use \`analyze map\` para gerar a estrutura do projeto.
</project-structure>`;
  }

  // Cache do contexto para não recalcular em cada mensagem
  let cachedContext: string | null = null;

  return {
    // Injeta no system prompt a cada mensagem (necessário para funcionar)
    "experimental.chat.system.transform": async (_input, output) => {
      // Usar cache se já calculou
      if (!cachedContext) {
        cachedContext = getProjectContext();
      }

      if (cachedContext) {
        output.system.push(cachedContext);
      }
    },
  };
};
