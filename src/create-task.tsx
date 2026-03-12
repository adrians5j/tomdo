import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { addTodo, CATEGORIES } from "./utils";

interface FormValues {
  task: string;
  category: string;
}

export default function CreateTask() {
  const [task, setTask] = useState("");
  const [category, setCategory] = useState("");

  async function handleSubmit(values: FormValues) {
    if (!values.task.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Task cannot be empty",
      });
      return;
    }

    try {
      const categoryValue = values.category || undefined;
      addTodo(values.task, categoryValue);
      const displayText = categoryValue ? `${categoryValue}: ${values.task}` : values.task;
      await showToast({
        style: Toast.Style.Success,
        title: "Task added",
        message: displayText,
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
          <Action.SubmitForm title="Add Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="category" title="Category" value={category} onChange={setCategory} storeValue>
        <Form.Dropdown.Item value="" title="No Category" />
        {CATEGORIES.map((cat) => (
          <Form.Dropdown.Item key={cat.value} value={cat.value} title={cat.title} icon="📁" />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="task"
        title="Task"
        placeholder="Enter your todo item"
        value={task}
        onChange={setTask}
        autoFocus
      />
    </Form>
  );
}
