#!/usr/bin/env python3
"""Conservative Cline pre-tool loop guard: exact repeats + inspection cycles.

PreToolUse cannot see results. This script detects redundant *requests*,
not genuine semantic progress. Changes to known read-files invalidate their signatures.
"""
import hashlib
import json
import os
import re
import sys
from pathlib import Path

INSPECTION_TOOLS = {'read_files', 'run_commands'}
HISTORY_LIMIT = 24


def reply(cancel=False, message=None, warning=False):
    result = {'cancel': cancel}
    if message:
        result['contextModification' if warning else 'errorMessage'] = message
    print(json.dumps(result))


def digest(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def normalize_command(command):
    # Preserve the test-equivalence rule from the existing hook.
    return re.sub(r'/tmp/check\d+\.php', '/tmp/checkN.php', str(command)).strip()


def file_version(path):
    # Filesystem metadata helps distinguish a reread after a file change.
    try:
        p = Path(path).expanduser()
        stat = p.stat()
        return [str(p.resolve()), stat.st_size, stat.st_mtime_ns]
    except (OSError, ValueError):
        return [str(path), None, None]


def read_paths(params):
    paths = []
    for entry in params.get('files', []):
        if isinstance(entry, dict) and isinstance(entry.get('path'), str):
            paths.append(entry['path'])
        elif isinstance(entry, str):
            paths.append(entry)
    return paths


def fingerprint(tool, params):
    if tool == 'read_files':
        resources = sorted(file_version(p) for p in read_paths(params))
        return digest(json.dumps([tool, resources], sort_keys=True))
    commands = params.get('commands', [])
    if not isinstance(commands, list):
        return None
    return digest(json.dumps([tool, [normalize_command(c) for c in commands]]))


def detect_cycle(history):
    """Find 2+ repetitions of a sequence of 2-4 inspections at the tail."""
    for size in range(2, 5):
        if len(history) >= 2 * size and history[-size:] == history[-2*size:-size]:
            return size
    return None


def main():
    try:
        data = json.load(sys.stdin)
    except (ValueError, OSError):
        reply()
        return
    call = data.get('tool_call') or data.get('preToolUse') or {}
    tool = call.get('name') or call.get('toolName')
    params = call.get('input') or call.get('parameters') or {}
    if isinstance(params, str):
        try:
            params = json.loads(params)
        except ValueError:
            params = {}
    if not isinstance(params, dict):
        params = {}

    task_id = str(data.get('taskId') or data.get('sessionId') or data.get('origin', {}).get('sessionId') or 'unknown')
    state_dir = Path(os.environ.get('BONSAI_LOOP_STATE_DIR', '/tmp/bonsai-cline-loop-guard'))
    state_dir.mkdir(parents=True, exist_ok=True)
    state_file = state_dir / (digest(task_id) + '.json')
    try:
        state = json.loads(state_file.read_text())
    except (OSError, ValueError):
        state = {}
    history = state.get('history', [])[-HISTORY_LIMIT:]

    # Any noninspection operation breaks the inspection cycle. We deliberately
    # do not claim to know whether it actually succeeded or changed the project.
    if tool not in INSPECTION_TOOLS:
        state_file.write_text(json.dumps({'history': [], 'last': None, 'streak': 0}))
        reply()
        return

    signature = fingerprint(tool, params)
    if signature is None:
        reply()
        return
    streak = state.get('streak', 0) + 1 if signature == state.get('last') else 1
    candidate = (history + [signature])[-HISTORY_LIMIT:]
    cycle = detect_cycle(candidate)

    state_file.write_text(json.dumps({
        'history': candidate,
        'last': signature,
        'streak': streak
    }))

    # Preserve yesterday's consecutive-duplicate warning/block behavior.
    if streak >= 4:
        reply(True,
            'INSPECTION BUDGET EXHAUSTED. '
            'This operation has already been requested repeatedly. '
            'Do not inspect this resource again. '
            'Produce the requested answer using the information '
            'already gathered, or explain specifically what '
            'information is missing. '
            'Do not repeat this inspection.')
        return

    # A-B-A-B: warn on second sequence; block on third, including when
    # interleaved with other previously observed inspection operations.
    if cycle and len(candidate) >= 3 * cycle and candidate[-cycle:] == candidate[-3*cycle:-2*cycle]:
        reply(
            True, 
            'INSPECTION BUDGET EXHAUSTED. '
            'This operation has already been requested repeatedly. '
            'Do not inspect this resource again. '
            'Produce the requested answer using the information '
            'already gathered, or explain specifically what '
            'information is missing. '
            'Do not repeat this inspection.'
        )
        return

    state_file.write_text(json.dumps({'history': candidate, 'last': signature, 'streak': streak}))
    if streak == 3:
        reply(
            False,
            'LOOP WARNING: Third equivalent inspection. Do not repeat '
            'without a change in the underlying resource.',
            True
        )
    elif cycle:
        reply(False, 'INSPECTION WARNING: A repeating inspection cycle was detected. '
              'Use the evidence already collected or inspect new resources.', True)
    else:
        reply()


if __name__ == '__main__':
    main()
