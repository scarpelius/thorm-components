<?php

declare(strict_types=1);

namespace Thorm\Components\Editor;

/**
 * Base class for display widgets attached to an EditorNode.
 *
 * A widget is a small piece of UI (e.g. block header badge, drag handle) that
 * renders as part of the block's page IR.
 */
abstract class EditorWidget
{
    /** @var EditorNode|null */
    protected ?EditorNode $node = null;

    public function mount(EditorNode $node): void
    {
        $this->node = $node;
    }

    /**
     * Render the widget's IR contribution.
     *
     * @return array<int, mixed> Thorm IR nodes.
     */
    abstract public function render(): array;

    /**
     * Release any server-side resources held by the widget.
     */
    public function destroy(): void
    {
        $this->node = null;
    }
}