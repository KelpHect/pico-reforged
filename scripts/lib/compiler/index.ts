export { compile, compileBoth } from "./compile.ts";
export { buildMatrix, matrixNames, MATRIX_VARIANTS } from "./matrix.ts";
export {
  MODULES,
  THEMES,
  DEFAULT_TARGETS,
  DEFAULT_THEME,
  findConfigFile,
  loadConfigFile,
  packageInfo,
} from "./config.ts";
export { formatStats, formatTable } from "./report.ts";
export type {
  CompileOptions,
  CompileResult,
  CompileStats,
  EntryName,
  PurgeOptions,
  ThemeOption,
} from "./types.ts";
