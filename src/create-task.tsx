import { Action, ActionPanel, Form, Icon, showToast, Toast, popToRoot, useNavigation } from "@raycast/api";
import { useState } from "react";
import { addTodo, CATEGORIES, STATUSES, TodoStatus } from "./utils";

interface QuickFormValues {
  task: string;
}

interface FullFormValues {
  description: string;
  category: string;
  status: string;
}

/** If the user already typed "fix: something" on screen 1, pre-fill accordingly. */
function parseInitialTask(raw: string): { description: string; category: string } {
  const trimmed = raw.trim();
  const validCategories = CATEGORIES.map((c) => c.value);
  const match = trimmed.match(/^(\w+):\s*(.*)$/);
  if (match && validCategories.includes(match[1])) {
    return { category: match[1], description: match[2].trim() };
  }
  return { category: "feat", description: trimmed };
}

async function saveTask(description: string, category: string, status: TodoStatus): Promise<boolean> {
  const trimmed = description.trim();

  if (!trimmed) {
    await showToast({ style: Toast.Style.Failure, title: "Task description cannot be empty" });
    return false;
  }

  try {
    addTodo(trimmed, category, status);
    await showToast({
      style: Toast.Style.Success,
      title: "Task created",
      message: `${category}: ${trimmed}`,
    });
    return true;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to add task",
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function saveTaskFromRaw(rawInput: string, status: TodoStatus): Promise<boolean> {
  const trimmed = rawInput.trim();

  if (!trimmed) {
    await showToast({ style: Toast.Style.Failure, title: "Task cannot be empty" });
    return false;
  }

  const match = trimmed.match(/^(\w+):\s*(.+)$/);
  if (!match) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid format",
      message: "Task must start with a category prefix (e.g., fix: bug description)",
    });
    return false;
  }

  const [, category, taskText] = match;
  const validCategories = CATEGORIES.map((c) => c.value);

  if (!validCategories.includes(category)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid category",
      message: `"${category}" is not valid. Use: ${validCategories.join(", ")}`,
    });
    return false;
  }

  return saveTask(taskText, category, status);
}

function FullCreateForm({ initialTask }: { initialTask: string }) {
  const { description: initialDescription, category: initialCategory } = parseInitialTask(initialTask);
  const [description, setDescription] = useState(initialDescription);
  const [category, setCategory] = useState<string>(initialCategory);
  const [status, setStatus] = useState<string>("todo");

  async function handleSubmit(values: FullFormValues) {
    const saved = await saveTask(values.description, values.category, values.status as TodoStatus);
    if (saved) popToRoot();
  }

  return (
    <Form
      navigationTitle="Create Task"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="description"
        title="Description"
        placeholder="e.g., fix broken header alignment"
        value={description}
        onChange={setDescription}
        autoFocus
      />
      <Form.Dropdown id="category" title="Category" value={category} onChange={setCategory}>
        {CATEGORIES.map((c) => (
          <Form.Dropdown.Item key={c.value} value={c.value} title={`${c.value} — ${c.description}`} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="status" title="Initial Status" value={status} onChange={setStatus}>
        {STATUSES.map((s) => (
          <Form.Dropdown.Item key={s.value} value={s.value} title={s.title} icon={s.icon} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default function CreateTask() {
  const [task, setTask] = useState("");
  const { push } = useNavigation();

  async function handleQuickSave(values: QuickFormValues) {
    const saved = await saveTaskFromRaw(values.task, "todo");
    if (saved) popToRoot();
  }

  function handleOpenFullForm(values: QuickFormValues) {
    push(<FullCreateForm initialTask={values.task} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open Full Create Form" icon={Icon.ArrowRight} onSubmit={handleOpenFullForm} />
          <Action.SubmitForm
            title="Quick Save as Todo"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            onSubmit={handleQuickSave}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="task"
        title="Task"
        placeholder="category: task description (e.g., fix: bug in header)"
        value={task}
        onChange={setTask}
        autoFocus
      />
    </Form>
  );
}
