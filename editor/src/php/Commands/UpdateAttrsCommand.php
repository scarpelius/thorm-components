<?php

declare(strict_types=1);

namespace Thorm\Components\Editor\Commands;

use Thorm\Components\Editor\Command;
use Thorm\Components\Editor\StructuralCommand;
use Thorm\Components\Editor\BlockContent;
use Thorm\Components\Editor\EditorNode;
use Thorm\Components\Editor\DocumentStructure;
use Thorm\Components\Editor\Block;

final class UpdateAttrsCommand implements Command
{
    public function __construct(
        private readonly string $blockId,
        private readonly string $nodeId,
        private readonly array $before,
        private readonly array $after
    ) {}

    public function execute(array $state): array
    {
        $content = $state[$this->blockId] ?? [];
        $new = (new BlockContent($this->blockId, $content))->updateAttrs($this->nodeId, $this->after);
        $state[$this->blockId] = $new->toIR();
        return $state;
    }

    public function undo(array $state): array
    {
        $content = $state[$this->blockId] ?? [];
        $new = (new BlockContent($this->blockId, $content))->updateAttrs($this->nodeId, $this->before);
        $state[$this->blockId] = $new->toIR();
        return $state;
    }

    public function type(): string
    {
        return 'updateAttrs';
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