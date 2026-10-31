<?php

declare(strict_types=1);

namespace Thorm\Components\Editor;

final class CommandStack
{
    /** @var array<int, Command> */
    private array $commands = [];

    /** @var array<int, Command> */
    private array $redo = [];

    public function push(Command $cmd): void
    {
        $this->commands[] = $cmd;
        $this->redo = [];
    }

    public function pop(): ?Command
    {
        if ($this->commands === []) {
            return null;
        }
        return array_pop($this->commands);
    }

    public function peek(): ?Command
    {
        return $this->commands === [] ? null : $this->commands[count($this->commands) - 1];
    }

    public function clear(): void
    {
        $this->commands = [];
        $this->redo = [];
    }

    public function count(): int
    {
        return count($this->commands);
    }

    public function redoCount(): int
    {
        return count($this->redo);
    }

    public function undo(array $state): array
    {
        $cmd = $this->pop();
        if ($cmd === null) {
            return $state;
        }
        $this->redo[] = $cmd;
        return $cmd->undo($state);
    }

    public function redo(array $state): array
    {
        if ($this->redo === []) {
            return $state;
        }
        $cmd = array_pop($this->redo);
        $this->commands[] = $cmd;
        return $cmd->execute($state);
    }

    public function canUndo(): bool
    {
        return $this->commands !== [];
    }

    public function canRedo(): bool
    {
        return $this->redo !== [];
    }
}