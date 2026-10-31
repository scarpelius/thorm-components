<?php

declare(strict_types=1);

namespace Thorm\Components\Editor;

interface Command
{
    public function execute(array $state): array;
    public function undo(array $state): array;
    public function type(): string;
    public function blockId(): ?string;
    public function nodeId(): ?string;
}