<?php

declare(strict_types=1);

namespace Thorm\Components\Editor\Commands;

use Thorm\Components\Editor\Command;
use Thorm\Components\Editor\StructuralCommand;
use Thorm\Components\Editor\BlockContent;
use Thorm\Components\Editor\EditorNode;
use Thorm\Components\Editor\DocumentStructure;
use Thorm\Components\Editor\Block;

final class MergeBlocksCommand implements StructuralCommand
{
    public function __construct(
        private readonly array $blockIds,
        private readonly array $contents
    ) {}

    public function execute(DocumentStructure $structure): DocumentStructure
    {
        return $structure->mergeBlocks($this->blockIds);
    }

    public function undo(DocumentStructure $structure): DocumentStructure
    {
        $result = $structure;
        $ids = array_map(fn (Block $b) => $b->id, $structure->blocks);
        $firstId = $this->blockIds[0];
        $firstPos = array_search($firstId, $ids, true);
        if ($firstPos === false) {
            return $structure;
        }
        $first = $structure->blocks[$firstPos];
        $newBlock = new Block(
            $firstId,
            $first->type,
            $first->title,
            $first->order,
            $this->contents[$firstId] ?? []
        );
        $result = $result->removeBlock($firstId);
        $result = $result->addBlock($newBlock);
        return $result;
    }

    public function type(): string
    {
        return 'mergeBlocks';
    }
}