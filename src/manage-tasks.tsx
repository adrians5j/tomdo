import { Action, ActionPanel, List, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { readTodos, updateTodoStatus, cycleStatus, TodoItem, CATEGORIES, STATUSES, TodoStatus } from "./utils";

export default function ManageTasks() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  function loadTodos() {
    try {
      const items = readTodos();
      setTodos(items);
      setIsLoading(false);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load todos",
        message: error instanceof Error ? error.message : String(error),
      });
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTodos();
  }, []);

  async function handleCycleStatus(todo: TodoItem) {
    try {
      const newStatus = cycleStatus(todo.status);
      updateTodoStatus(todo, newStatus);
      const statusObj = STATUSES.find((s) => s.value === newStatus);
      await showToast({
        style: Toast.Style.Success,
        title: `Status changed to ${statusObj?.title || newStatus}`,
      });
      loadTodos();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update status",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleSetStatus(todo: TodoItem, newStatus: TodoStatus) {
    try {
      updateTodoStatus(todo, newStatus);
      const statusObj = STATUSES.find((s) => s.value === newStatus);
      await showToast({
        style: Toast.Style.Success,
        title: `Status changed to ${statusObj?.title || newStatus}`,
      });
      loadTodos();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update status",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function getStatusIcon(status: TodoStatus): Icon {
    switch (status) {
      case "done":
        return Icon.CheckCircle;
      case "in_progress":
        return Icon.CircleProgress;
      case "blocked":
        return Icon.XMarkCircle;
      default:
        return Icon.Circle;
    }
  }

  function getStatusText(status: TodoStatus): string {
    const statusObj = STATUSES.find((s) => s.value === status);
    return statusObj?.title || status;
  }

  const filteredTodos =
    selectedCategory === "all"
      ? todos
      : selectedCategory === "none"
        ? todos.filter((todo) => !todo.category)
        : todos.filter((todo) => todo.category === selectedCategory);

  // Group todos by category
  const groupedTodos = filteredTodos.reduce(
    (acc, todo) => {
      const category = todo.category || "No Category";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(todo);
      return acc;
    },
    {} as Record<string, TodoItem[]>,
  );

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Category" value={selectedCategory} onChange={setSelectedCategory}>
          <List.Dropdown.Item title="All Categories" value="all" />
          <List.Dropdown.Item title="No Category" value="none" />
          {CATEGORIES.map((cat) => (
            <List.Dropdown.Item key={cat.value} title={cat.title} value={cat.value} />
          ))}
        </List.Dropdown>
      }
    >
      {selectedCategory === "all"
        ? Object.entries(groupedTodos).map(([category, items]) => (
            <List.Section key={category} title={category}>
              {items.map((todo, index) => (
                <List.Item
                  key={`${category}-${index}`}
                  icon={getStatusIcon(todo.status)}
                  title={todo.text}
                  accessories={[{ text: getStatusText(todo.status) }]}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Cycle Status (Todo → In Progress → Done)"
                        onAction={() => handleCycleStatus(todo)}
                      />
                      <ActionPanel.Section title="Set Status">
                        {STATUSES.map((status) => (
                          <Action
                            key={status.value}
                            title={`Set as ${status.title}`}
                            icon={status.icon}
                            onAction={() => handleSetStatus(todo, status.value)}
                          />
                        ))}
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          ))
        : filteredTodos.map((todo, index) => (
            <List.Item
              key={index}
              icon={getStatusIcon(todo.status)}
              title={todo.text}
              accessories={[{ text: getStatusText(todo.status) }]}
              actions={
                <ActionPanel>
                  <Action title="Cycle Status (Todo → In Progress → Done)" onAction={() => handleCycleStatus(todo)} />
                  <ActionPanel.Section title="Set Status">
                    {STATUSES.map((status) => (
                      <Action
                        key={status.value}
                        title={`Set as ${status.title}`}
                        icon={status.icon}
                        onAction={() => handleSetStatus(todo, status.value)}
                      />
                    ))}
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
      {filteredTodos.length === 0 && !isLoading && (
        <List.EmptyView title="No todos found" description="Use 'Create Task' to add your first todo" />
      )}
    </List>
  );
}
