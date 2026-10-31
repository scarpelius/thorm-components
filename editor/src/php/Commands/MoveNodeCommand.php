<?php

declare(strict_types=1);

namespace Thorm\Components\Editor\Commands;

use Thorm\Components\Editor\Command;
use Thorm\Components\Editor\StructuralCommand;
use Thorm\Components\Editor\BlockContent;
use Thorm\Components\Editor\EditorNode;
use Thorm\Components\Editor\DocumentStructure;
use Thorm\Components\Editor\Block;

final class MoveNodeCommand implements Command
{
    public function __construct(
        private readonly string $blockId,
        private readonly string $nodeId,
        private readonly string $parentId,
        private readonly int $index,
        private readonly array $before,
        private readonly array $after
    ) {}

    public function execute(array $state): array
    {
        $content = $state[$this->blockId] ?? [];
        $new = (new BlockContent($this->blockId, $content))->moveNode($this->nodeId, $this->parentId, $this->index);
        $state[$this->blockId] = $new->toIR();
        return $state;
    }

    public function undo(array $state): array
    {
        $content = $state[$this->blockId] ?? [];
        $node = (new BlockContent($this->blockId, $content))->findNode($this->nodeId);
        if ($node === null) {
            return $state;
        }
        $new = (new BlockContent($this->blockId, $content))->moveNode($this->nodeId, $this->parentId, $this->index);
        $state[$this->blockId] = $new->toIR();
        return $state;
    }

    public function type(): string
    {
        return 'moveNode';
    }

    public function blockId(): ?string
    {
        return $this->blockId;
    }

    public function nodeId(): ?string
    {
        return $this->nodeId;
    }
}