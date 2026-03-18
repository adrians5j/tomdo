import { Action, ActionPanel, List, showToast, Toast, Icon, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  readTodos,
  updateTodoStatus,
  cycleStatus,
  archiveCompletedTask,
  archiveAllCompletedTasks,
  markAsNoLongerRelevant,
  markAsRejected,
  addTodo,
  TodoItem,
  CATEGORIES,
  STATUSES,
  TodoStatus,
} from "./utils";

export default function ManageTasks() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showingDetail, setShowingDetail] = useState(false);

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

      // If cycling to "done", archive it instead
      if (newStatus === "done") {
        archiveCompletedTask(todo);
        await showToast({
          style: Toast.Style.Success,
          title: "Task completed and archived",
        });
      } else {
        updateTodoStatus(todo, newStatus);
        const statusObj = STATUSES.find((s) => s.value === newStatus);
        await showToast({
          style: Toast.Style.Success,
          title: `Status changed to ${statusObj?.title || newStatus}`,
        });
      }
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
      // If setting to "done", archive it instead
      if (newStatus === "done") {
        archiveCompletedTask(todo);
        await showToast({
          style: Toast.Style.Success,
          title: "Task completed and archived",
        });
      } else {
        updateTodoStatus(todo, newStatus);
        const statusObj = STATUSES.find((s) => s.value === newStatus);
        await showToast({
          style: Toast.Style.Success,
          title: `Status changed to ${statusObj?.title || newStatus}`,
        });
      }
      loadTodos();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update status",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleArchiveTask(todo: TodoItem) {
    try {
      archiveCompletedTask(todo);
      await showToast({
        style: Toast.Style.Success,
        title: "Task archived",
        message: "Moved to Completed section",
      });
      loadTodos();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to archive task",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleArchiveAll() {
    const confirmed = await confirmAlert({
      title: "Archive All Completed Tasks?",
      message: "This will move all tasks marked as done to the Completed section with timestamps.",
      primaryAction: {
        title: "Archive All",
        style: Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) return;

    try {
      const count = archiveAllCompletedTasks();
      await showToast({
        style: Toast.Style.Success,
        title: "Tasks archived",
        message: `${count} task${count !== 1 ? "s" : ""} moved to Completed section`,
      });
      loadTodos();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to archive tasks",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleNoLongerRelevant(todo: TodoItem) {
    try {
      markAsNoLongerRelevant(todo);
      await showToast({
        style: Toast.Style.Success,
        title: "Marked as no longer relevant",
      });
      loadTodos();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to move task",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleRejected(todo: TodoItem) {
    try {
      markAsRejected(todo);
      await showToast({
        style: Toast.Style.Success,
        title: "Marked as rejected",
      });
      loadTodos();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to move task",
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

  // Separate active and archived todos
  const activeTodos = todos.filter((todo) => !todo.isArchived);
  const archivedTodos = todos.filter((todo) => todo.isArchived);

  // Calculate statistics (only for active tasks)
  const totalTasks = activeTodos.length;
  const completedTasks = activeTodos.filter((todo) => todo.status === "done").length;
  const inProgressTasks = activeTodos.filter((todo) => todo.status === "in_progress").length;
  const blockedTasks = activeTodos.filter((todo) => todo.status === "blocked").length;
  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Build navigation subtitle with statistics
  const navigationSubtitle = `${completedTasks}/${totalTasks} (${percentage}%)${inProgressTasks > 0 ? ` • ${inProgressTasks} in progress` : ""}${blockedTasks > 0 ? ` • ${blockedTasks} blocked` : ""}`;

  // Group active todos by status - memoized
  const groupedByStatus = useMemo(() => {
    const groups: Record<string, TodoItem[]> = {
      in_progress: [],
      todo: [],
      blocked: [],
      done: [],
    };

    activeTodos.forEach((todo) => {
      if (groups[todo.status]) {
        groups[todo.status].push(todo);
      }
    });

    // Sort TODO section alphabetically by text
    groups.todo.sort((a, b) => a.text.localeCompare(b.text));

    return groups;
  }, [activeTodos]);

  function renderTodoItem(todo: TodoItem, key: string) {
    const categoryObj = CATEGORIES.find((cat) => cat.value === todo.category);
    const statusObj = STATUSES.find((s) => s.value === todo.status);

    return (
      <List.Item
        key={key}
        icon={getStatusIcon(todo.status)}
        title={todo.text}
        accessories={showingDetail ? [] : [{ text: getStatusText(todo.status) }]}
        detail={
          showingDetail ? (
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Task" text={todo.text} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Status"
                    text={statusObj?.title || todo.status}
                    icon={statusObj?.icon}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Category"
                    text={categoryObj?.title || todo.category || "No Category"}
                    icon={todo.category ? "📁" : undefined}
                  />
                  {todo.modifiedAt && (
                    <List.Item.Detail.Metadata.Label title="Last Modified" text={todo.modifiedAt} icon="🕐" />
                  )}
                  {todo.completedAt && (
                    <List.Item.Detail.Metadata.Label title="Completed At" text={todo.completedAt} icon="✅" />
                  )}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Checkbox" text={statusObj?.checkbox || "[ ]"} />
                  <List.Item.Detail.Metadata.Label title="Line" text={`${todo.line + 1}`} />
                  {todo.isArchived && <List.Item.Detail.Metadata.Label title="Archived" text="Yes" icon="📦" />}
                </List.Item.Detail.Metadata>
              }
            />
          ) : undefined
        }
        actions={
          <ActionPanel>
            {!todo.isArchived && (
              <>
                <Action title="Cycle Status (Todo → In Progress → Done)" onAction={() => handleCycleStatus(todo)} />
                {todo.status === "done" && (
                  <Action
                    title="Archive Task"
                    icon={Icon.Tray}
                    shortcut={{ modifiers: ["cmd"], key: "a" }}
                    onAction={() => handleArchiveTask(todo)}
                  />
                )}
              </>
            )}
            <Action
              title={showingDetail ? "Hide Details" : "Show Details"}
              icon={Icon.Eye}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => setShowingDetail(!showingDetail)}
            />
            {!todo.isArchived && (
              <ActionPanel.Section title="Set Status">
                {STATUSES.map((status) => (
                  <Action
                    key={status.value}
                    title={`Set as ${status.title}`}
                    icon={status.icon}
                    onAction={() => handleSetStatus(todo, status.value)}
                  />
                ))}
                <Action
                  title="Set as No Longer Relevant"
                  icon={Icon.XMarkCircle}
                  onAction={() => handleNoLongerRelevant(todo)}
                />
                <Action title="Set as Rejected" icon={Icon.XMarkCircle} onAction={() => handleRejected(todo)} />
              </ActionPanel.Section>
            )}
            {!todo.isArchived && completedTasks > 0 && (
              <ActionPanel.Section title="Bulk Actions">
                <Action
                  title="Archive All Completed Tasks"
                  icon={Icon.Tray}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  onAction={handleArchiveAll}
                />
              </ActionPanel.Section>
            )}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      navigationTitle={totalTasks > 0 ? `Manage Tasks - ${navigationSubtitle}` : "Manage Tasks"}
      searchBarPlaceholder="Search tasks..."
      filtering={true}
    >
      {/* In Progress */}
      {groupedByStatus.in_progress.length > 0 && (
        <List.Section title="🔄 In Progress" subtitle={`${groupedByStatus.in_progress.length}`}>
          {groupedByStatus.in_progress.map((todo, index) => renderTodoItem(todo, `in-progress-${index}`))}
        </List.Section>
      )}

      {/* Todo */}
      {groupedByStatus.todo.length > 0 && (
        <List.Section title="⭕ Todo" subtitle={`${groupedByStatus.todo.length}`}>
          {groupedByStatus.todo.map((todo, index) => renderTodoItem(todo, `todo-${index}`))}
        </List.Section>
      )}

      {/* Blocked */}
      {groupedByStatus.blocked.length > 0 && (
        <List.Section title="🚫 Blocked" subtitle={`${groupedByStatus.blocked.length}`}>
          {groupedByStatus.blocked.map((todo, index) => renderTodoItem(todo, `blocked-${index}`))}
        </List.Section>
      )}

      {/* Done */}
      {groupedByStatus.done.length > 0 && (
        <List.Section title="✅ Done" subtitle={`${groupedByStatus.done.length}`}>
          {groupedByStatus.done.map((todo, index) => renderTodoItem(todo, `done-${index}`))}
        </List.Section>
      )}

      {activeTodos.length === 0 && !isLoading && (
        <List.EmptyView title="No active todos" description="Open Create Task to add your first todo" />
      )}
    </List>
  );
}
