import type { TaskCategory } from "@/lib/domain/types";

export const categoryLabels: Record<TaskCategory, string> = {
  TEST_GENERATION: "Test generation",
  BUG_FIX: "Bug fixes",
  API_CHANGE: "API changes",
  FRONTEND_CHANGE: "Frontend changes",
  REFACTOR: "Refactoring",
  DATABASE_CHANGE: "Database changes",
  ARCHITECTURE: "Architecture",
};
export const money = (value: number) => `$${value.toFixed(2)}`;
export const percent = (value: number) => `${Math.round(value * 100)}%`;
export function duration(ms: number) {
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}
export const humanize = (value: string) =>
  value.toLowerCase().replaceAll("_", " ");
