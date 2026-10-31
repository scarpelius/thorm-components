<?php

declare(strict_types=1);

namespace Thorm\Components\Editor\Commands;

use Thorm\Components\Editor\Command;
use Thorm\Components\Editor\StructuralCommand;
use Thorm\Components\Editor\BlockContent;
use Thorm\Components\Editor\EditorNode;
use Thorm\Components\Editor\DocumentStructure;
use Thorm\Components\Editor\Block;

final class RemoveBlockCommand implements StructuralCommand
{
    public function __construct(
        private readonly string $blockId,
        private readonly Block $block
    ) {}

    public function execute(DocumentStructure $structure): DocumentStructure
    {
        return $structure->removeBlock($this->blockId);
    }

    public function undo(DocumentStructure $structure): DocumentStructure
    {
        return $structure->addBlock($this->block);
    }

    public function type(): string
    {
        return 'removeBlock';
    }
}