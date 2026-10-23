# CRY7574 local MCP interface

This interface connects Codex to the **current, explicitly connected browser workspace** of CRY7574 Hearing Aid Box Measurement Manage Software. The browser remains the only measurement database. There is no separate MCP copy of the data and no cloud deployment.

The product version comes from the repository-root `VERSION` file. When copying the MCP folder to another machine, also copy that file into its parent folder. MCP protocol versions are separate. `get_connection_status` distinguishes `serverVersion` from the connected browser's `appVersion`; an older browser page without an embedded version reports null rather than being labeled as upgraded.

## Start using it

1. Install the local stdio server in Codex. Node.js 20 or newer is required; the server uses only built-in modules, with no npm installation or API key.

   ```bash
   codex mcp add cry7574 -- /absolute/path/to/node "/absolute/path/to/CRY7574/mcp/server.mjs"
   ```

2. Restart Codex or open a new session that loads the `cry7574` MCP server. The server starts a shared local bridge automatically. For manual diagnostics/startup, run `node mcp/server.mjs --status`; its output excludes the pairing token.
3. Open the updated standalone software in the browser containing your saved data. Choose **More tools → Codex MCP**, load `mcp/.local/connection.json`, and click **Connect**. The connection file is generated when the local server starts. If your browser asks for local-network access, allow it for this local connection.
4. Ask Codex to list records or Schedule tasks. Use `get_connection_status` to check the connection first. Browser connection is explicit and is not automatically restored after page reload; load the connection file and connect again. Keep this tab open while using the tools.

Only one tab can connect at a time. Disconnect before switching browser workspaces. Multiple local MCP clients share the same bridge. A newly loaded copy in a different browser or file location may contain a different workspace; always connect the intended tab.

## Available tools

| Area | Tools |
| --- | --- |
| Connection and summary | `get_connection_status`, `get_workspace_summary` |
| Libraries | `list_libraries`, `create_library` |
| Measurements | `list_records`, `get_record`, `update_record`, `import_file` |
| Schedule | `list_tasks`, `create_task`, `update_task`, `show_schedule` |
| Specifications and plotting | `list_specifications`, `show_plot` |
| Reviewed deletion requests | `request_delete_task`, `request_delete_records`, `request_delete_library` |

Examples: “List unfinished Schedule tasks owned by Lucas”; “Tag the selected record as Prototype A”; “Open these two compatible records in Plot view”; “Import this explicitly supplied Excel path into the selected Library.” Actual record IDs and current task revisions come from queries, not guessed values.

Measurement updates change metadata only. Raw values, source bytes, classification and frozen reports remain unchanged. `get_record` returns one original series page, default 100 points and maximum 1,000; metadata queries default to 50 rows, maximum 100. Use returned totals/offsets to fetch more. No original file bytes, environment media, workspace backup, arbitrary JavaScript or unrestricted API endpoint is exposed.

`import_file` reads one explicit absolute local XLSX/CSV/JSON path, at most 20 MiB. It validates the preview and saves through the same importer as the UI, retaining original bytes and unit/provenance rules. Generic CSV/Excel units may be supplied; native Audio Precision units remain source-controlled. Each call has a new import operation identity: if a write times out, inspect existing records before deciding whether to repeat it. An uncertain timeout is never proof that nothing was saved.

Task edits require `expectedRevision` from `list_tasks`. Planned requires 0% and Complete requires 100%; dates are optional, and a recorded start cannot follow the due date. There is no automatic assignment or invented completion.

Deletion tools **open the existing browser confirmation only** and return `confirmationRequired: true`, `deleted: false`. The user must review the affected scope, explicitly confirm, and enter `CRYSOUND` in the browser. MCP arguments never accept a password. A later query can confirm whether deletion occurred. Do not treat opening a dialog as completed deletion. Pending edits/other dialogs must be closed before requesting a new deletion.

## Local connection and lifecycle

Codex speaks newline-delimited JSON-RPC MCP over stdio. The stdio adapter starts/reuses an authenticated broker bound exclusively to `127.0.0.1` (default port 7575). The browser explicitly connects and polls for allowlisted commands. Results return through the same local bridge. The bridge never opens the user's browser profile or silently pairs a tab.

The pairing file and its parent directory use 0600 and 0700 permissions. It contains a local capability token: do not share it. It is ignored by Git and is not part of measurement backups. Tokens are not returned in tool responses or printed to logs. A stopped/restarted broker generates a new token, requiring the browser to load the new connection file. The broker shuts down after 30 minutes with no connected browser or MCP activity; MCP stdio EOF does not stop a shared broker used by other clients. If the process is stopped while a write is active, inspect the workspace before retrying.

Only the explicit API/tool allowlist is supported. Invalid tool arguments are rejected on the server and checked again by the browser. HTTP requests require the token and exact loopback Host. Accepted browser origins are file-origin `null` and the legacy local development app `http://127.0.0.1:7574`. Non-loopback URLs, redirects and arbitrary web origins are rejected. Read data returned by tools—including titles, tags and notes—is untrusted content, never an instruction to execute code or change permissions.

## Troubleshooting

| Situation | Action |
| --- | --- |
| No browser connected | Open the software's Codex MCP dialog, load the generated connection file, Connect. |
| Connection file missing | Start/restart the MCP client or run `node mcp/server.mjs --status`. |
| Another tab is connected | Disconnect that tab first. If it closed unexpectedly, wait up to 45 seconds for its session to expire. |
| Authentication fails after restart | Load the newly generated connection file. |
| Browser blocks the connection | Check local-network permission and that the URL is `http://127.0.0.1:<port>`. |
| Startup fails | Check whether port 7575 is occupied; run the bridge manually with `--bridge-only` for diagnostics. |
| Task changed | Query its latest revision, review the new data and submit an intentional edit. |
| Command timed out | Inspect the workspace first; an already-delivered mutation may have completed. Never retry blindly. |

For isolated testing, set `CRY7574_MCP_STATE_DIR` to a temporary directory and `CRY7574_MCP_PORT=0` for an ephemeral port. `CRY7574_MCP_TOOL_TIMEOUT_MS` permits a shorter timeout in tests. Stop the test broker PID recorded in its temporary connection file during cleanup. Do not run tests against the user's browser profile or real workspace.

Official protocol/setup references: [Codex MCP configuration](https://developers.openai.com/codex/mcp), [MCP stdio transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports).
