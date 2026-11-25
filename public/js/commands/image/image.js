/**
 * Phase 2 — Editor Commands: image.
 *
 * ImageCommand — inserts an `<img>` at the selection with a prompted URL.
 */

import { Command, registerCommand } from '../base.js';

export class ImageCommand extends Command {
  name = 'image';

  execute() {
    const src = window.prompt('Enter image URL:');
    if (!src) return;
    const range = this.getRange();
    if (!range) return;
    const img = document.createElement('img');
    img.src = src;
    range.insertNode(img);
  }
}

registerCommand('image', ImageCommand);
