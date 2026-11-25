<?php

declare(strict_types=1);

namespace Thorm\Components\Editor;

/**
 * A single user-defined content unit (chapter, section, lesson, ...).
 *
 * Content is the block's Thorm IR subtree: an array of Thorm IR node payloads
 * (the exact same representation the page is rendered from). Storing the
 * subtree — rather than a separate "editor IR" representation — means the
 * editor can save and restore from the identical IR.
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

    /**
     * The block's content: an array of Thorm IR node payloads (the subtree
     * of the page IR that lives inside the block's content <div>).
     *
     * @var array<int, array>
     */
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
