<?php

declare(strict_types=1);

namespace Thorm\Components\Editor\Commands;

use Thorm\Components\Editor\Command;
use Thorm\Components\Editor\StructuralCommand;
use Thorm\Components\Editor\BlockContent;
use Thorm\Components\Editor\EditorNode;
use Thorm\Components\Editor\DocumentStructure;
use Thorm\Components\Editor\Block;

final class RemoveNodeCommand implements Command
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
        $new = (new BlockContent($this->blockId, $content))->removeNode($this->nodeId);
        $state[$this->blockId] = $new->toIR();
        return $state;
    }

    public function undo(array $state): array
    {
        $content = $state[$this->blockId] ?? [];
        $new = (new BlockContent($this->blockId, $content))->insertNode(
            $this->findParentId($content),
            EditorNode::fromJson($this->before),
            0
        );
        $state[$this->blockId] = $new->toIR();
        return $state;
    }

    public function type(): string
    {
        return 'removeNode';
    }

    public function blockId(): ?string
    {
        return $this->blockId;
    }

    public function nodeId(): ?string
    {
        return $this->nodeId;
    }

    private function findParentId(array $nodes): string
    {
        foreach ($nodes as $n) {
            if (!is_array($n)) {
                continue;
            }
            if (isset($n['children']) && is_array($n['children'])) {
                foreach ($n['children'] as $c) {
                    if (is_array($c) && ($c['id'] ?? null) === $this->nodeId) {
                        return $n['id'] ?? '';
                    }
                }
            }
        }
        return '';
    }
}