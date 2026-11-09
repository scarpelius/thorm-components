#!/usr/bin/env python3
import json
import re
import sys
import os
import hashlib
from pathlib import Path

data = json.load(sys.stdin)

tool = (
    data.get("tool_call", {}).get("name")
    or data.get("preToolUse", {}).get("toolName")
)

params = (
    data.get("tool_call", {}).get("input")
    or data.get("preToolUse", {}).get("parameters")
    or {}
)

if isinstance(params, str):
    try:
        params = json.loads(params)
    except json.JSONDecodeError:
        params = {}

task_id = data.get("taskId", "unknown")
state_path = Path("/tmp/bonsai-cline-loop-guard.json")

def output(cancel=False, message=None):
    result = {"cancel": cancel}
    if message:
        result["errorMessage"] = message
    print(json.dumps(result))

def normalize(command):
    return re.sub(
        r"/tmp/check\d+\.php",
        "/tmp/checkN.php",
        command
    ).strip()

if tool != "run_commands":
    output()
    sys.exit(0)

commands = params.get("commands", [])
if not isinstance(commands, list):
    output()
    sys.exit(0)

normalized = "\n".join(normalize(str(c)) for c in commands)
fingerprint = hashlib.sha256(normalized.encode()).hexdigest()

try:
    state = json.loads(state_path.read_text())
except (FileNotFoundError, json.JSONDecodeError):
    state = {}

if state.get("task_id") == task_id and state.get("fingerprint") == fingerprint:
    count = state.get("count", 0) + 1
else:
    count = 1

# Save the counter BEFORE deciding whether to warn or block.
state_path.write_text(json.dumps({
    "task_id": task_id,
    "fingerprint": fingerprint,
    "count": count
}))

if count == 3:
    print(json.dumps({
        "cancel": False,
        "contextModification": (
            "LOOP WARNING: You have issued the same operation "
            "three times without making progress. "
            "Do not repeat this operation again. "
            "Choose a different strategy, continue with the "
            "main task, or report the blocker."
        )
    }))
    sys.exit(0)

if count > 3:
    print(json.dumps({
        "cancel": True,
        "errorMessage": (
            "LOOP GUARD: Task terminated after four "
            "equivalent tool calls."
        )
    }))
    sys.exit(0)

output()