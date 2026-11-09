
# Tool Usage and Progress Rules

## File Reading

- Before reading a file, determine which information is needed.
- For files under 800 lines, prefer reading the entire file
  in one operation unless only a known section is relevant.
- Never request the same file range twice unless the file
  has changed or the previous result was incomplete.
- Track file paths and ranges already read in this task.
- If a file read is truncated, request only the missing range.
- Do not split file reads into small sequential chunks
  without an explicit technical reason.

## Tool Call Discipline

- Every tool call must have a specific purpose.
- Before calling a tool, determine what new information
  its result is expected to provide.
- Do not repeat a tool call with identical arguments
  if it already succeeded.
- If two consecutive tool calls provide no new information,
  stop using tools and reassess the task.
- If an operation fails twice, do not repeat it unchanged.
  Explain the failure or choose a different approach.

## Progress

- After inspecting the required files, proceed to analysis,
  editing, testing, or a final response.
- Do not continue exploring once the information needed
  to perform the requested task is available.
- Prefer completing one small, testable change over
  repeatedly inspecting the project.
- When the task is complete, stop calling tools.
