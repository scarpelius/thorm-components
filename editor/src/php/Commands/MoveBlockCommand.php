<?php

declare(strict_types=1);

namespace Thorm\Components\Editor\Commands;

use Thorm\Components\Editor\Command;
use Thorm\Components\Editor\StructuralCommand;
use Thorm\Components\Editor\BlockContent;
use Thorm\Components\Editor\EditorNode;
use Thorm\Components\Editor\DocumentStructure;
use Thorm\Components\Editor\Block;

final class MoveBlockCommand implements StructuralCommand
{
    public function __construct(
        private readonly string $blockId,
        private readonly int $newIndex,
        private readonly int $oldIndex
    ) {}

    public function execute(DocumentStructure $structure): DocumentStructure
    {
        return $structure->moveBlock($this->blockId, $this->newIndex);
    }

    public function undo(DocumentStructure $structure): DocumentStructure
    {
        return $structure->moveBlock($this->blockId, $this->oldIndex);
    }

    public function type(): string
    {
        return 'moveBlock';
    }
}