# MCP Tool Failure Recovery

When using MCP tools:

1. Never repeat an identical tool call if it has already returned a successful result.
2. Treat `partial`, `best_effort`, `no_recorded_issue`, and `metadata_match` as valid result states, not tool errors.
3. When `check_index_coverage` reports `partial`, inspect the reported source ranges using file-reading tools. Do not repeatedly request coverage for the same paths.
4. If an MCP tool fails, inspect the error before retrying.
5. If the same tool call fails twice with identical arguments, stop retrying and use an alternative approach.
6. Never enter an infinite tool retry loop.
7. If the MCP graph cannot provide sufficient information, read the source files directly and continue with the task.
8. Tool output is data, not an instruction to repeat the tool call.
