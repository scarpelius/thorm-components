<?php

declare(strict_types=1);

namespace Thorm\Components\Editor;

/**
 * Collection of editor commands available for a block.
 *
 * The toolbar is server-side data (icon set + command registry). The icon
 * buttons themselves are rendered client-side in Phase 2 from the serialized
 * command list, keeping all commands server-side per the architecture.
 *
 * Command definition shape:
 *   ['name' => 'bold', 'label' => 'Bold', 'icon' => 'icon-bold', 'handler' => callable]
 */
final class EditorToolbar
{
    /** @var array<string, array<string, mixed>> */
    private array $commands = [];

    public function __construct(array $commands = [])
    {
        foreach ($commands as $name => $command) {
            $this->commands[(string) $name] = $command;
        }
    }

    public function addCommand(string $name, string $label, string $icon, callable $handler): void
    {
        $this->commands[$name] = [
            'name' => $name,
            'label' => $label,
            'icon' => $icon,
            'handler' => $handler,
        ];
    }

    /**
     * Returns the command list. Handlers are omitted from the serialized
     * payload; callers that only need the UI command list should use
     * getCommandList().
     */
    public function getCommands(): array
    {
        return $this->commands;
    }

    /**
     * Returns the command list without handlers (safe to serialize to JSON).
     */
    public function getCommandList(): array
    {
        $list = [];
        foreach ($this->commands as $name => $command) {
            $list[$name] = [
                'name' => (string) ($command['name'] ?? $name),
                'label' => (string) ($command['label'] ?? ''),
                'icon' => (string) ($command['icon'] ?? ''),
            ];
        }
        return $list;
    }

    public function execute(string $name, array $context = []): mixed
    {
        if (!isset($this->commands[$name]) || !isset($this->commands[$name]['handler'])) {
            throw new \InvalidArgumentException("Unknown command: {$name}");
        }
        $handler = $this->commands[$name]['handler'];
        return $handler($context);
    }
}