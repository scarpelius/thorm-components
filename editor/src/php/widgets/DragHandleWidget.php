<?php

declare(strict_types=1);

namespace Thorm\Components\Editor\Widgets;

use function Thorm\{div, span, text};
use Thorm\Components\Editor\EditorNode;
use Thorm\Components\Editor\EditorWidget;

/**
 * Renders a drag handle for reordering blocks.
 */
final class DragHandleWidget extends EditorWidget
{
    public function render(): array
    {
        $node = $this->node;
        if ($node === null) {
            return [];
        }
        $block = $node->block;

        return [
            div(
                [['attrs', [
                    'data-widget' => 'drag-handle',
                    'data-block-id' => $block->id,
                    'data-order' => (string) $block->order,
                    'title' => 'Drag to reorder',
                ]]],
                [text('⋮⋮')]
            ),
        ];
    }
}