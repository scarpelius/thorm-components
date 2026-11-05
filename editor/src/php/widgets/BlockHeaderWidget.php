<?php

declare(strict_types=1);

namespace Thorm\Components\Editor\Widgets;

use function Thorm\{div, fragment, h2, span, text};
use Thorm\Components\Editor\EditorNode;
use Thorm\Components\Editor\EditorWidget;

/**
 * Renders a block header (title + type badge) above the block content.
 *
 * The title is already rendered by EditorNode::render() as an h2; this widget
 * adds a secondary badge row showing the block type and id.
 */
final class BlockHeaderWidget extends EditorWidget
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
                [['attrs', ['data-widget' => 'block-header', 'data-block-id' => $block->id]]],
                [
                    span([], [text($block->type)]),
                    span([], [text($block->id)]),
                ]
            ),
        ];
    }
}