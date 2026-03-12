import { showToast, Toast, open, closeMainWindow } from "@raycast/api";
import { getTodoFilePath, ensureTodoFileExists } from "./utils";

export default async function OpenInZed() {
  try {
    ensureTodoFileExists();
    const filePath = getTodoFilePath();
    await open(filePath, "Zed");
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open file",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
