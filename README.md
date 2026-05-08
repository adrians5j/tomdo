# tomdo

A [Raycast](https://raycast.com) extension for managing todos stored in a plain markdown file (`~/Desktop/todos.md`).

<img width="771" height="500" alt="image" src="https://github.com/user-attachments/assets/bab85f2e-6fad-43cb-861a-4e6f8d7f7564" />

<img width="766" height="492" alt="image" src="https://github.com/user-attachments/assets/26030ff9-8788-4277-a825-b71cb361cfa3" />

## How it works

Todos are stored as GitHub-style task checkboxes in a markdown file on your Desktop. Each task has a status, an optional category, and optional metadata like links and timestamps — all written directly into the markdown so the file stays readable outside of Raycast.

### Task statuses

| Symbol | Status | Meaning |
|--------|--------|---------|
| `[ ]` | Todo | Not started |
| `[>]` | Next | Up next |
| `[~]` | In Progress | Currently being worked on |
| `[x]` | Done | Completed |
| `[-]` | Blocked | Blocked |

### Categories

Tasks can be tagged with a conventional-commit-style category:

`feat` · `fix` · `docs` · `style` · `refactor` · `perf` · `test` · `build` · `ci` · `chore` · `bip` · `client` · `release`

## Commands

| Command | Description |
|---------|-------------|
| **Create Task** | Add a new todo with a category and optional link |
| **Manage Tasks** | Browse, filter, and update existing todos |
| **Archive Completed Tasks** | Move all done tasks to a Completed section |
| **Open in Zed** | Open `todos.md` directly in Zed editor |

## Getting started

1. Install the extension in Raycast.
2. Run any command — the `~/Desktop/todos.md` file is created automatically if it doesn't exist.
3. Use **Create Task** to add your first todo and **Manage Tasks** to view and update them.

## License

MIT
