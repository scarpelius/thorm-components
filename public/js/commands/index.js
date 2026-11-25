/**
 * Phase 2 — Editor Commands: top-level index.
 *
 * Imports all command group modules so every command class self-registers
 * in the COMMANDS registry. This file should be imported by the barrel
 * (commands.js) or directly by code that needs the full registry.
 */

import './base.js';
import './text/index.js';
import './heading/index.js';
import './list/index.js';
import './link/index.js';
import './image/index.js';
import './insert/index.js';
import './delete/index.js';
import './split-block/index.js';
import './merge-blocks/index.js';
import './move-block/index.js';
import './insert-block/index.js';
import './delete-block/index.js';
import './undo/index.js';
import './redo/index.js';
