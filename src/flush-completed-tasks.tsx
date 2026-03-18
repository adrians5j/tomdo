import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { archiveAllCompletedTasks } from "./utils";

export default async function FlushCompletedTasks() {
  try {
    const archivedCount = archiveAllCompletedTasks();

    await showToast({
      style: Toast.Style.Success,
      title: "Archived completed tasks",
      message: `Moved ${archivedCount} completed task${archivedCount === 1 ? "" : "s"} to Completed section`,
    });

    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to archive tasks",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
