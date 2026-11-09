# Tool-use reliability rules

1. Before calling an editing tool, distinguish between creating a new file, inserting content, and replacing existing text.
2. Never use search-and-replace with `old_text` unless that exact nonempty text exists in the target file.
3. If a file is empty, use an insertion operation or another supported whole-file write method.
4. For multiline source code written through shell commands, use a quoted heredoc (`<<'EOF'`) to preserve literal content.
5. After a tool failure, inspect the error and change the approach. Never retry identical failed arguments.
6. Treat tool execution results as evidence. If an expected byte count or test result matches, accept success.
7. Never execute the same command more than twice with unchanged inputs and unchanged environment state.
8. If two different repair strategies fail, stop and report the exact errors rather than continuing indefinitely.
9. Do not infer tool payload truncation without comparing the submitted input, actual execution, and resulting file size.
10. Verify file changes with appropriate checks such as `php -l`, but do not repeat successful verification commands without a reason.
11. Before editing an existing file, inspect its contents and use the editing tool's exact replacement or insertion semantics. Prefer a minimal replacement over rewriting the entire file.
12. When running tests or linters, preserve and inspect the actual process exit code. Avoid piping through `head` or `tail` unless `pipefail` is enabled.
13. When a test fails, check whether the test expectation is incorrect before modifying production code. Confirm the expected behavior from the source implementation or specification.
14. After tests pass, distinguish successful assertions from warnings and deprecations. Report unresolved issues explicitly rather than describing the run as entirely clean.