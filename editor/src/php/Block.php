<?php

declare(strict_types=1);

namespace Thorm\Components\Editor;

/**
 * A single user-defined content unit (chapter, section, lesson, ...).
 *
 * Content is the IR tree of that block: an array of IR nodes.
 */
final class Block
{
    /** @var string */
    public string $id;

    /** @var string */
    public string $type;

    /** @var string */
    public string $title;

    /** @var int */
    public int $order;

    /** @var array<int, array> IR tree (array of IR node payloads). */
    public array $content = [];

    public function __construct(
        string $id,
        string $type = 'section',
        string $title = '',
        int $order = 0,
        array $content = []
    ) {
        $this->id = $id;
        $this->type = $type;
        $this->title = $title;
        $this->order = $order;
        $this->content = $content;
    }

    /**
     * Serialize the block (without content, which lives in a per-block atom).
     */
    public function toJson(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'order' => $this->order,
        ];
    }

    /**
     * Build a block from JSON.
     */
    public static function fromJson(array $json): self
    {
        return new self(
            $json['id'] ?? 'block-' . bin2hex(random_bytes(8)),
            (string) ($json['type'] ?? 'section'),
            (string) ($json['title'] ?? ''),
            (int) ($json['order'] ?? 0),
            isset($json['content']) && is_array($json['content']) ? $json['content'] : []
        );
    }
}
