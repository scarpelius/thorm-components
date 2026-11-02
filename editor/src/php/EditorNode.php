<?php

declare(strict_types=1);

namespace Thorm\Components\Editor;

use function Thorm\{div, fragment, h2, text};
use Thorm\IR\Node\FragmentNode;

/**
 * Server-side helper wrapping a single block's IR tree.
 *
 * Standardizes the block → page IR conversion (title heading + contenteditable
 * wrapper div) that was inlined in examples/editor/phase0-and-phase1.php, and
 * carries the block's editor toolbar and display widgets.
 */
final class EditorNode
{
    /** @var Block */
    public readonly Block $block;

    /** @var array<int, mixed>|null Cached Thorm IR nodes for the block content. */
    private ?array $thormNodes = null;

    /** @var EditorToolbar|null */
    private ?EditorToolbar $toolbar = null;

    /** @var array<int, EditorWidget> */
    private array $widgets = [];

    public function __construct(Block $block)
    {
        $this->block = $block;
    }

    /**
     * Convert the block's stored IR tree to Thorm IR nodes (cached until content changes).
     */
    public function getThormNodes(): array
    {
        if ($this->thormNodes === null) {
            $this->thormNodes = irToThormNodes($this->block->content);
        }
        return $this->thormNodes;
    }

    /**
     * Rebuild cached Thorm nodes (call after mutating block->content).
     */
    public function refreshThormNodes(): void
    {
        $this->thormNodes = null;
    }

    /**
     * Build the block's page IR:
     *   fragment([
     *       h2([], [text($block->title)]),
     *       div([['attrs', ['contenteditable' => 'true', 'data-block-id' => $block->id]]], $thormNodes),
     *   ])
     *
     * This is exactly what examples/editor/phase0-and-phase1.php inlined.
     *
     * @return FragmentNode
     */
    public function render(): FragmentNode
    {
        return fragment([
            h2([], [text($this->block->title)]),
            div(
                [['attrs', ['contenteditable' => 'true', 'data-block-id' => $this->block->id]]],
                $this->getThormNodes()
            ),
        ]);
    }

    /**
     * Editor state payload for embedding in the page script: ['id' => $content].
     */
    public function getState(): array
    {
        return [
            $this->block->id => $this->block->content,
        ];
    }

    public function setToolbar(EditorToolbar $toolbar): void
    {
        $this->toolbar = $toolbar;
    }

    public function getToolbar(): ?EditorToolbar
    {
        return $this->toolbar;
    }

    public function addWidget(EditorWidget $widget): void
    {
        $this->widgets[] = $widget;
    }

    public function getWidgets(): array
    {
        return $this->widgets;
    }
}