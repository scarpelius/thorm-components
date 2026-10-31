<?php

declare(strict_types=1);

namespace Thorm\Components\Editor\Commands;

use Thorm\Components\Editor\Command;
use Thorm\Components\Editor\StructuralCommand;
use Thorm\Components\Editor\BlockContent;
use Thorm\Components\Editor\EditorNode;
use Thorm\Components\Editor\DocumentStructure;
use Thorm\Components\Editor\Block;

final class SplitBlockCommand implements StructuralCommand
{
    public function __construct(
        private readonly string $blockId,
        private readonly int $index
    ) {}

    public function execute(DocumentStructure $structure): DocumentStructure
    {
        return $structure->splitBlock($this->blockId, $this->index);
    }

    public function undo(DocumentStructure $structure): DocumentStructure
    {
        $blocks = $structure->blocks;
        $ids = array_map(fn (Block $b) => $b->id, $blocks);
        $pos = array_search($this->blockId, $ids, true);
        if ($pos === false || $pos >= count($blocks) - 1) {
            return $structure;
        }
        $first = $blocks[$pos];
        $second = $blocks[$pos + 1];
        $merged = new Block(
            $first->id,
            $first->type,
            $first->title,
            $first->order,
            array_merge($first->content, $second->content)
        );
        $result = array_values(array_filter(
            $blocks,
            fn (Block $b) => $b->id !== $first->id && $b->id !== $second->id
        ));
        array_splice($result, $pos, 0, [$merged]);
        return new DocumentStructure($result);
    }

    public function type(): string
    {
        return 'splitBlock';
    }
}