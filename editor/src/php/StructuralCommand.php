<?php

declare(strict_types=1);

namespace Thorm\Components\Editor;

interface StructuralCommand
{
    public function execute(DocumentStructure $structure): DocumentStructure;
    public function undo(DocumentStructure $structure): DocumentStructure;
    public function type(): string;
}