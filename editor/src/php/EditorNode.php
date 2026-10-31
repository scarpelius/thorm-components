<?php

declare(strict_types=1);

namespace Thorm\Components\Editor;

/**
 * A single IR node for the editor document model.
 *
 * Mirrors the Thorm IR node shape (k, tag, props, children, value) but is a
 * standalone model used for per-block content editing.
 */
final class EditorNode
{
    /** @var string */
    public string $id;

    /** @var string Node kind (e.g. 'el', 'text', 'html'). */
    public string $k;

    /** @var string|null Element tag for element nodes. */
    public ?string $tag = null;

    /** @var array<int, EditorNode> */
    public array $children = [];

    /** @var array<string, mixed> Attributes / classes / styles / events. */
    public array $props = [];

    /** @var string|null Text value for text nodes. */
    public ?string $value = null;

    /**
     * Build a node with a generated unique id.
     */
    public function __construct(
        ?string $id = null,
        string $k = 'el',
        ?string $tag = null,
        array $children = [],
        array $props = [],
        ?string $value = null
    ) {
        $this->id = $id ?? 'node-' . bin2hex(random_bytes(8));
        $this->k = $k;
        $this->tag = $tag;
        $this->children = $children;
        $this->props = $props;
        $this->value = $value;
    }

    /**
     * Serialize to a Thorm-compatible IR payload.
     */
    public function toJson(): array
    {
        $out = ['id' => $this->id, 'k' => $this->k];
        if ($this->tag !== null) {
            $out['tag'] = $this->tag;
        }
        if ($this->props !== []) {
            $out['props'] = $this->props;
        }
        if ($this->value !== null) {
            $out['value'] = $this->value;
        }
        if ($this->children !== []) {
            $out['children'] = array_map(fn (EditorNode $c) => $c->toJson(), $this->children);
        }
        return $out;
    }

    /**
     * Build a node from a Thorm-compatible IR payload.
     */
    public static function fromJson(array $json): self
    {
        $id = $json['id'] ?? 'node-' . bin2hex(random_bytes(8));
        $k = $json['k'] ?? 'el';
        $tag = isset($json['tag']) ? (string) $json['tag'] : null;
        $props = isset($json['props']) && is_array($json['props']) ? $json['props'] : [];
        $value = isset($json['value']) ? (string) $json['value'] : null;
        $children = [];
        if (isset($json['children']) && is_array($json['children'])) {
            foreach ($json['children'] as $c) {
                if (is_array($c)) {
                    $children[] = self::fromJson($c);
                }
            }
        }
        return new self($id, $k, $tag, $children, $props, $value);
    }

    /**
     * Deep-clone this node (with new unique ids).
     */
    public function clone(): self
    {
        $children = array_map(fn (EditorNode $c) => $c->clone(), $this->children);
        return new self(
            'node-' . bin2hex(random_bytes(8)),
            $this->k,
            $this->tag,
            $children,
            $this->props,
            $this->value
        );
    }

    /**
     * Deep-clone preserving the node id.
     */
    public function cloneKeepingId(): self
    {
        $children = array_map(fn (EditorNode $c) => $c->cloneKeepingId(), $this->children);
        return new self($this->id, $this->k, $this->tag, $children, $this->props, $this->value);
    }
}
