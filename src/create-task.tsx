import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { addTodo, CATEGORIES } from "./utils";

interface FormValues {
  task: string;
}

export default function CreateTask() {
  const [task, setTask] = useState("");

  async function handleSubmit(values: FormValues) {
    const trimmed = values.task.trim();

    if (!trimmed) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Task cannot be empty",
      });
      return;
    }

    // Validate category prefix format
    const match = trimmed.match(/^(\w+):\s*(.+)$/);
    if (!match) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid format",
        message: "Task must start with category prefix (e.g., fix: bug description)",
      });
      return;
    }

    const [, category, taskText] = match;
    const validCategories = CATEGORIES.map((c) => c.value);

    if (!validCategories.includes(category)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid category",
        message: `"${category}" is not valid. Use: ${validCategories.join(", ")}`,
      });
      return;
    }

    if (!taskText.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Task description required",
        message: "Add text after the category prefix",
      });
      return;
    }

    try {
      addTodo(taskText.trim(), category, "todo");
      await showToast({
        style: Toast.Style.Success,
        title: "Task created",
        message: `${category}: ${taskText}`,
      });
      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add task",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
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
