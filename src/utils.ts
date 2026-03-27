import { homedir } from "os";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";

export type TodoStatus = "todo" | "in_progress" | "done" | "blocked";

export interface TodoItem {
  text: string;
  status: TodoStatus;
  line: number;
  category?: string;
  completedAt?: string;
  isArchived?: boolean;
  isInProgress?: boolean;
  modifiedAt?: string;
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
  { value: "bip", title: "bip", description: "Build in public" },
  { value: "client", title: "client", description: "Client work" },
  { value: "release", title: "release", description: "Release tasks" },
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
  let inCompletedSection = false;
  let inInProgressSection = false;

  lines.forEach((line, index) => {
    // Check if we're entering the In-progress section
    if (line.trim() === "## In-progress") {
      inInProgressSection = true;
      inCompletedSection = false;
      return;
    }

    // Check if we're entering the Completed section
    if (line.trim() === "## Completed") {
      inCompletedSection = true;
      inInProgressSection = false;
      return;
    }

    // When entering any other ## section, leave in-progress
    if (line.trim().startsWith("## ")) {
      inInProgressSection = false;
    }

    // Skip week sub-headers inside Completed section (e.g. ### Week 12 — 2026)
    if (inCompletedSection && line.trim().startsWith("### ")) {
      return;
    }

    // Match any checkbox pattern, optionally with timestamps
    const checkboxMatch = line.match(/^- \[(.)\] (.+?)(?:\s+\[completed:\s*(.+?)\])?(?:\s+\[modified:\s*(.+?)\])?$/);

    if (checkboxMatch) {
      const checkboxChar = checkboxMatch[1];
      const fullText = checkboxMatch[2];
      const completedAt = checkboxMatch[3];
      const modifiedAt = checkboxMatch[4];
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

      // Only include tasks that have a valid category
      const validCategories = CATEGORIES.map((c) => c.value);
      if (category && validCategories.includes(category)) {
        todos.push({
          text: fullText,
          status,
          line: index,
          category,
          completedAt,
          modifiedAt,
          isArchived: inCompletedSection,
          isInProgress: inInProgressSection,
        });
      }
    }
  });

  return todos;
}

function parseCategory(text: string): { category?: string; text: string } {
  // Match "category(scope): text" or "category: text"
  const match = text.match(/^(\w+)(?:\([^)]*\))?:\s*(.+)$/);
  if (match) {
    return {
      category: match[1],
      text: match[2],
    };
  }
  return { text };
}

function ensureCompletedSection(): void {
  const filePath = getTodoFilePath();
  const content = readFileSync(filePath, "utf-8");

  if (!content.includes("## Completed")) {
    writeFileSync(filePath, content + "\n\n## Completed\n\n", "utf-8");
  }
}

export function addTodo(text: string, category?: string, status: TodoStatus = "todo", scope?: string): void {
  ensureTodoFileExists();
  const filePath = getTodoFilePath();
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Find where to insert (before ## In-progress or ## Completed section if they exist)
  let insertIndex = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "## In-progress" || lines[i].trim() === "## Completed") {
      insertIndex = i;
      break;
    }
  }

  const categoryPrefix = category ? (scope?.trim() ? `${category}(${scope.trim()})` : category) : undefined;
  const todoText = categoryPrefix ? `${categoryPrefix}: ${text}` : text;
  // Always insert as [ ] first so we have a known line to hand to archiveCompletedTask
  const newTodo = `- [ ] ${todoText}`;

  lines.splice(insertIndex, 0, newTodo);
  writeFileSync(filePath, lines.join("\n"), "utf-8");
  reorganizeFile();

  // If the desired status is "done", find the freshly-written task and archive it
  if (status === "done") {
    const freshContent = readFileSync(filePath, "utf-8");
    const freshLines = freshContent.split("\n");
    const lineIndex = freshLines.findIndex((l) => l === newTodo);
    if (lineIndex !== -1) {
      archiveCompletedTask({ text: todoText, status: "todo", line: lineIndex, category });
      return;
    }
  }

  // For non-done statuses other than todo, update the checkbox
  if (status !== "todo") {
    const freshContent = readFileSync(filePath, "utf-8");
    const freshLines = freshContent.split("\n");
    const lineIndex = freshLines.findIndex((l) => l === newTodo);
    if (lineIndex !== -1) {
      const statusObj = STATUSES.find((s) => s.value === status);
      const checkbox = statusObj ? statusObj.checkbox : "[ ]";
      freshLines[lineIndex] = `- ${checkbox} ${todoText}`;
      writeFileSync(filePath, freshLines.join("\n"), "utf-8");
      reorganizeFile();
    }
  }
}

// Reorganize and sort the entire file
function reorganizeFile(): void {
  const filePath = getTodoFilePath();
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const activeTasks: string[] = [];
  const inProgressTasks: string[] = [];
  const completedTasks: string[] = [];
  const noLongerRelevantTasks: string[] = [];
  const rejectedTasks: string[] = [];
  let currentSection = "active";

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed === "## In-progress") {
      currentSection = "inprogress";
      return;
    }
    if (trimmed === "## Completed") {
      currentSection = "completed";
      return;
    }
    if (trimmed === "## No Longer Relevant") {
      currentSection = "nolonger";
      return;
    }
    if (trimmed === "## Rejected") {
      currentSection = "rejected";
      return;
    }
    if (trimmed.startsWith("# ") || trimmed.startsWith("### ")) {
      return; // Skip headers and week sub-headers
    }
    if (trimmed === "") {
      return; // Skip empty lines
    }

    // Parse task lines based on current section
    if (line.match(/^- \[.\] /)) {
      if (currentSection === "active") {
        // In-progress tasks (- [~] ...) in the active section go to inProgressTasks
        if (line.match(/^- \[~\] /)) {
          inProgressTasks.push(line);
        } else {
          activeTasks.push(line);
        }
      } else if (currentSection === "inprogress") {
        inProgressTasks.push(line);
      } else if (currentSection === "completed") {
        completedTasks.push(line);
      }
    } else if (line.match(/^- /)) {
      if (currentSection === "nolonger") {
        noLongerRelevantTasks.push(line);
      } else if (currentSection === "rejected") {
        rejectedTasks.push(line);
      }
    }
  });

  // Sort active tasks alphabetically
  activeTasks.sort((a, b) => a.localeCompare(b));

  // Sort in-progress tasks alphabetically
  inProgressTasks.sort((a, b) => a.localeCompare(b));

  // Sort completed tasks by date (newest first)
  completedTasks.sort((a, b) => {
    const dateA = a.match(/\[completed:\s*(.+?)\]/)?.[1] || "";
    const dateB = b.match(/\[completed:\s*(.+?)\]/)?.[1] || "";
    return dateB.localeCompare(dateA);
  });

  // Group completed tasks by ISO week
  function getISOWeekKey(taskLine: string): { year: number; week: number; label: string } {
    const match = taskLine.match(/\[completed:\s*(\d{4}-\d{2}-\d{2})/);
    if (!match) return { year: 0, week: 0, label: "Week ? — ?" };
    const date = new Date(match[1] + "T00:00:00");
    // ISO week: week starts Monday, week 1 contains the first Thursday
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7; // make Sunday = 7
    d.setUTCDate(d.getUTCDate() + 4 - day); // shift to Thursday of this week
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    const year = d.getUTCFullYear();

    // Monday of this ISO week
    const monday = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() || 7) - 1));
    // Sunday of this ISO week
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const ordinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const monStr = `${ordinal(monday.getUTCDate())} ${monthNames[monday.getUTCMonth()]}`;
    const sunStr = `${ordinal(sunday.getUTCDate())} ${monthNames[sunday.getUTCMonth()]}`;
    const label = `Week ${week} — ${monStr} – ${sunStr}, ${year}`;

    return { year, week, label };
  }

  // Build grouped completed section
  const weekGroups = new Map<string, { year: number; week: number; lines: string[] }>();
  for (const line of completedTasks) {
    const { year, week, label } = getISOWeekKey(line);
    if (!weekGroups.has(label)) {
      weekGroups.set(label, { year, week, lines: [] });
    }
    weekGroups.get(label)!.lines.push(line);
  }

  // Sort week groups newest first
  const sortedWeeks = [...weekGroups.entries()].sort((a, b) => {
    const ay = a[1].year * 100 + a[1].week;
    const by = b[1].year * 100 + b[1].week;
    return by - ay;
  });

  // Rebuild file
  const result = ["# My Todos", "", ...activeTasks];

  if (inProgressTasks.length > 0) {
    result.push("", "## In-progress", "", ...inProgressTasks);
  }

  if (completedTasks.length > 0) {
    result.push("", "## Completed");
    for (const [label, { lines }] of sortedWeeks) {
      result.push("", `### ${label}`, "", ...lines);
    }
  }

  if (noLongerRelevantTasks.length > 0) {
    result.push("", "## No Longer Relevant", "", ...noLongerRelevantTasks);
  }

  if (rejectedTasks.length > 0) {
    result.push("", "## Rejected", "", ...rejectedTasks);
  }

  writeFileSync(filePath, result.join("\n"), "utf-8");
}

export function updateTodoStatus(todo: TodoItem, newStatus: TodoStatus): void {
  if (newStatus === "done") {
    archiveCompletedTask(todo);
    return;
  }

  const filePath = getTodoFilePath();
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  if (todo.line < lines.length) {
    const statusObj = STATUSES.find((s) => s.value === newStatus);
    const checkbox = statusObj ? statusObj.checkbox : "[ ]";
    lines[todo.line] = `- ${checkbox} ${todo.text}`;
    writeFileSync(filePath, lines.join("\n"), "utf-8");
    reorganizeFile();
  }
}

// Cycle through statuses: todo -> in_progress -> done -> todo
export function cycleStatus(currentStatus: TodoStatus): TodoStatus {
  const statusOrder: TodoStatus[] = ["todo", "in_progress", "done"];
  const currentIndex = statusOrder.indexOf(currentStatus);
  const nextIndex = (currentIndex + 1) % statusOrder.length;
  return statusOrder[nextIndex];
}

// Archive a completed task to the Completed section
export function archiveCompletedTask(todo: TodoItem): void {
  ensureTodoFileExists();
  ensureCompletedSection();
  const filePath = getTodoFilePath();
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  if (todo.line >= lines.length) return;

  // Get the task line
  const taskLine = lines[todo.line];

  // Add timestamp
  const now = new Date();
  const timestamp = now.toISOString().split("T")[0] + " " + now.toTimeString().split(" ")[0];
  const archivedTask = `- [x] ${todo.text} [completed: ${timestamp}]`;

  // Remove from current position
  lines.splice(todo.line, 1);

  // Find the Completed section and add there
  let completedIndex = lines.findIndex((line) => line.trim() === "## Completed");
  if (completedIndex === -1) {
    // Should not happen due to ensureCompletedSection, but just in case
    lines.push("", "## Completed", "");
    completedIndex = lines.length - 1;
  }

  // Insert after the ## Completed header (skip empty lines)
  let insertIndex = completedIndex + 1;
  while (insertIndex < lines.length && lines[insertIndex].trim() === "") {
    insertIndex++;
  }

  lines.splice(insertIndex, 0, archivedTask);
  writeFileSync(filePath, lines.join("\n"), "utf-8");
  reorganizeFile();
}

// Remove all completed tasks from active section and move to Completed
export function archiveAllCompletedTasks(): number {
  ensureTodoFileExists();
  ensureCompletedSection();
  const filePath = getTodoFilePath();
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const completedSectionIndex = lines.findIndex((line) => line.trim() === "## Completed");
  const activeTodos: string[] = [];
  const completedTasks: string[] = [];
  let archivedCount = 0;

  const now = new Date();
  const timestamp = now.toISOString().split("T")[0] + " " + now.toTimeString().split(" ")[0];

  // Process lines before Completed section (includes ## In-progress section)
  for (let i = 0; i < completedSectionIndex; i++) {
    const line = lines[i];
    const checkboxMatch = line.match(/^- \[(.)\] (.+)$/);

    if (checkboxMatch && checkboxMatch[1].toLowerCase() === "x") {
      // This is a completed task - archive it
      completedTasks.push(`- [x] ${checkboxMatch[2]} [completed: ${timestamp}]`);
      archivedCount++;
    } else {
      // Preserve everything else (active tasks, ## In-progress header, in-progress tasks, etc.)
      activeTodos.push(line);
    }
  }

  // Combine: active/in-progress section + completed section with new tasks
  const result = [...activeTodos, "", "## Completed", "", ...completedTasks, ...lines.slice(completedSectionIndex + 1)];

  writeFileSync(filePath, result.join("\n"), "utf-8");
  reorganizeFile();
  return archivedCount;
}

// Move task to "No Longer Relevant" section
export function markAsNoLongerRelevant(todo: TodoItem): void {
  ensureTodoFileExists();
  const filePath = getTodoFilePath();
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  if (todo.line >= lines.length) return;

  // Remove from current position
  lines.splice(todo.line, 1);

  // Ensure "No Longer Relevant" section exists
  let sectionIndex = lines.findIndex((line) => line.trim() === "## No Longer Relevant");
  if (sectionIndex === -1) {
    // Add section at the end
    lines.push("", "## No Longer Relevant", "");
    sectionIndex = lines.length - 1;
  }

  // Insert after the section header
  let insertIndex = sectionIndex + 1;
  while (insertIndex < lines.length && lines[insertIndex].trim() === "") {
    insertIndex++;
  }

  lines.splice(insertIndex, 0, `- ${todo.text}`);
  writeFileSync(filePath, lines.join("\n"), "utf-8");
  reorganizeFile();
}

// Move task to "Rejected" section
export function markAsRejected(todo: TodoItem): void {
  ensureTodoFileExists();
  const filePath = getTodoFilePath();
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  if (todo.line >= lines.length) return;

  // Remove from current position
  lines.splice(todo.line, 1);

  // Ensure "Rejected" section exists
  let sectionIndex = lines.findIndex((line) => line.trim() === "## Rejected");
  if (sectionIndex === -1) {
    // Add section at the end
    lines.push("", "## Rejected", "");
    sectionIndex = lines.length - 1;
  }

  // Insert after the section header
  let insertIndex = sectionIndex + 1;
  while (insertIndex < lines.length && lines[insertIndex].trim() === "") {
    insertIndex++;
  }

  lines.splice(insertIndex, 0, `- ${todo.text}`);
  writeFileSync(filePath, lines.join("\n"), "utf-8");
  reorganizeFile();
}
