import { homedir } from "os";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";

export interface TodoItem {
  text: string;
  done: boolean;
  line: number;
  category?: string;
}

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
    const doneMatch = line.match(/^- \[x\] (.+)$/i);
    const notDoneMatch = line.match(/^- \[ \] (.+)$/);

    if (doneMatch) {
      const fullText = doneMatch[1];
      const { category, text } = parseCategory(fullText);
      todos.push({
        text: fullText,
        done: true,
        line: index,
        category,
      });
    } else if (notDoneMatch) {
      const fullText = notDoneMatch[1];
      const { category, text } = parseCategory(fullText);
      todos.push({
        text: fullText,
        done: false,
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

export function addTodo(text: string, category?: string): void {
  ensureTodoFileExists();
  const filePath = getTodoFilePath();
  const content = readFileSync(filePath, "utf-8");
  const todoText = category ? `${category}: ${text}` : text;
  const newTodo = `- [ ] ${todoText}\n`;
  writeFileSync(filePath, content + newTodo, "utf-8");
}

export function toggleTodo(todo: TodoItem): void {
  const filePath = getTodoFilePath();
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  if (todo.line < lines.length) {
    if (todo.done) {
      lines[todo.line] = `- [ ] ${todo.text}`;
    } else {
      lines[todo.line] = `- [x] ${todo.text}`;
    }
    writeFileSync(filePath, lines.join("\n"), "utf-8");
  }
}
