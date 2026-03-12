import { homedir } from "os";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";

export type TodoStatus = "todo" | "in_progress" | "done" | "blocked";

export interface TodoItem {
  text: string;
  status: TodoStatus;
  line: number;
  category?: string;
}

// Task statuses with GitHub-style checkboxes
export const STATUSES = [
  { value: "todo" as TodoStatus, title: "Todo", checkbox: "[ ]", icon: "⭕" },
  { value: "in_progress" as TodoStatus, title: "In Progress", checkbox: "[~]", icon: "🔄" },
  { value: "done" as TodoStatus, title: "Done", checkbox: "[x]", icon: "✅" },
  { value: "blocked" as TodoStatus, title: "Blocked", checkbox: "[-]", icon: "🚫" },
] as const;

// Conventional commit categories
export const CATEGORIES = [
  { value: "feat", title: "feat", description: "New feature" },
  { value: "fix", title: "fix", description: "Bug fix" },
  { value: "docs", title: "docs", description: "Documentation" },
  { value: "style", title: "style", description: "Code style/formatting" },
  { value: "refactor", title: "refactor", description: "Code refactoring" },
  { value: "perf", title: "perf", description: "Performance improvements" },
  { value: "test", title: "test", description: "Testing" },
  { value: "build", title: "build", description: "Build system" },
  { value: "ci", title: "ci", description: "CI/CD" },
  { value: "chore", title: "chore", description: "Other changes" },
] as const;

export function getTodoFilePath(): string {
  return join(homedir(), "Desktop", "todos.md");
}

export function ensureTodoFileExists(): void {
  const filePath = getTodoFilePath();
  if (!existsSync(filePath)) {
    const desktopPath = join(homedir(), "Desktop");
    if (!existsSync(desktopPath)) {
      mkdirSync(desktopPath, { recursive: true });
    }
    writeFileSync(filePath, "# My Todos\n\n", "utf-8");
  }
}

export function readTodos(): TodoItem[] {
  ensureTodoFileExists();
  const filePath = getTodoFilePath();
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const todos: TodoItem[] = [];

  lines.forEach((line, index) => {
    // Match any checkbox pattern
    const checkboxMatch = line.match(/^- \[(.)\] (.+)$/);

    if (checkboxMatch) {
      const checkboxChar = checkboxMatch[1];
      const fullText = checkboxMatch[2];
      const { category } = parseCategory(fullText);

      // Determine status based on checkbox character
      let status: TodoStatus = "todo";
      if (checkboxChar.toLowerCase() === "x") {
        status = "done";
      } else if (checkboxChar === "~") {
        status = "in_progress";
      } else if (checkboxChar === "-") {
        status = "blocked";
      } else {
        status = "todo";
      }

      todos.push({
        text: fullText,
        status,
        line: index,
        category,
      });
    }
  });

  return todos;
}

function parseCategory(text: string): { category?: string; text: string } {
  const match = text.match(/^(\w+):\s*(.+)$/);
  if (match) {
    return {
      category: match[1],
      text: match[2],
    };
  }
  return { text };
}

export function addTodo(text: string, category?: string, status: TodoStatus = "todo"): void {
  ensureTodoFileExists();
  const filePath = getTodoFilePath();
  const content = readFileSync(filePath, "utf-8");
  const todoText = category ? `${category}: ${text}` : text;
  const statusObj = STATUSES.find((s) => s.value === status);
  const checkbox = statusObj ? statusObj.checkbox : "[ ]";
  const newTodo = `- ${checkbox} ${todoText}\n`;
  writeFileSync(filePath, content + newTodo, "utf-8");
}

export function updateTodoStatus(todo: TodoItem, newStatus: TodoStatus): void {
  const filePath = getTodoFilePath();
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  if (todo.line < lines.length) {
    const statusObj = STATUSES.find((s) => s.value === newStatus);
    const checkbox = statusObj ? statusObj.checkbox : "[ ]";
    lines[todo.line] = `- ${checkbox} ${todo.text}`;
    writeFileSync(filePath, lines.join("\n"), "utf-8");
  }
}

// Cycle through statuses: todo -> in_progress -> done -> todo
export function cycleStatus(currentStatus: TodoStatus): TodoStatus {
  const statusOrder: TodoStatus[] = ["todo", "in_progress", "done"];
  const currentIndex = statusOrder.indexOf(currentStatus);
  const nextIndex = (currentIndex + 1) % statusOrder.length;
  return statusOrder[nextIndex];
}
