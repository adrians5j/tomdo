import { Action, ActionPanel, List, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { readTodos, toggleTodo, TodoItem, CATEGORIES } from "./utils";

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

  async function handleToggle(todo: TodoItem) {
    try {
      toggleTodo(todo);
      await showToast({
        style: Toast.Style.Success,
        title: todo.done ? "Marked as not done" : "Marked as done",
      });
      loadTodos();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle task",
        message: error instanceof Error ? error.message : String(error),
      });
    }
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
                  icon={todo.done ? Icon.CheckCircle : Icon.Circle}
                  title={todo.text}
                  accessories={[{ text: todo.done ? "Done" : "Not Done" }]}
                  actions={
                    <ActionPanel>
                      <Action
                        title={todo.done ? "Mark as Not Done" : "Mark as Done"}
                        onAction={() => handleToggle(todo)}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          ))
        : filteredTodos.map((todo, index) => (
            <List.Item
              key={index}
              icon={todo.done ? Icon.CheckCircle : Icon.Circle}
              title={todo.text}
              accessories={[{ text: todo.done ? "Done" : "Not Done" }]}
              actions={
                <ActionPanel>
                  <Action title={todo.done ? "Mark as Not Done" : "Mark as Done"} onAction={() => handleToggle(todo)} />
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
