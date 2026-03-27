import { Action, ActionPanel, Form, Icon, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { addTodo, CATEGORIES, STATUSES, TodoStatus } from "./utils";

interface FormValues {
  description: string;
  category: string;
  scope: string;
  status: string;
}

export default function CreateTask() {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("feat");
  const [scope, setScope] = useState<string>("");
  const [status, setStatus] = useState<string>("todo");

  async function handleSubmit(values: FormValues) {
    const trimmed = values.description.trim();

    if (!trimmed) {
      await showToast({ style: Toast.Style.Failure, title: "Task description cannot be empty" });
      return;
    }

    try {
      addTodo(trimmed, values.category, values.status as TodoStatus, values.scope.trim() || undefined);

      const scopePart = values.scope.trim() ? `(${values.scope.trim()})` : "";
      await showToast({
        style: Toast.Style.Success,
        title: "Task created",
        message: `${values.category}${scopePart}: ${trimmed}`,
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
        placeholder="e.g., broken header alignment"
        value={description}
        onChange={setDescription}
        autoFocus
      />
      <Form.Dropdown id="category" title="Category" value={category} onChange={setCategory}>
        {CATEGORIES.map((c) => (
          <Form.Dropdown.Item key={c.value} value={c.value} title={`${c.value} — ${c.description}`} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="scope"
        title="Scope"
        placeholder="e.g., cli, sdk, admin (optional)"
        value={scope}
        onChange={setScope}
      />
      <Form.Dropdown id="status" title="Initial Status" value={status} onChange={setStatus}>
        {STATUSES.map((s) => (
          <Form.Dropdown.Item key={s.value} value={s.value} title={s.title} icon={s.icon} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
