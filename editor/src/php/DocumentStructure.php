<?php

declare(strict_types=1);

namespace Thorm\Components\Editor;

final class DocumentStructure
{
    /** @var array<int, Block> */
    public array $blocks = [];

    public function __construct(array $blocks = [])
    {
        $this->blocks = $blocks;
    }

    public function addBlock(Block $block): DocumentStructure
    {
        $new = new self();
        $new->blocks = $this->blocks;
        $new->blocks[] = $block;
        return $new;
    }

    public function removeBlock(string $blockId): DocumentStructure
    {
        $new = new self();
        $new->blocks = array_values(array_filter(
            $this->blocks,
            fn (Block $b) => $b->id !== $blockId
        ));
        return $new;
    }

    public function moveBlock(string $blockId, int $index): DocumentStructure
    {
        $blocks = $this->blocks;
        $target = null;
        foreach ($blocks as $b) {
            if ($b->id === $blockId) {
                $target = $b;
                break;
            }
        }
        if ($target === null) {
            return $this;
        }
        $blocks = array_values(array_filter(
            $blocks,
            fn (Block $b) => $b->id !== $blockId
        ));
        $index = max(0, min($index, count($blocks)));
        array_splice($blocks, $index, 0, [$target]);
        return new self($blocks);
    }

    public function splitBlock(string $blockId, int $index): DocumentStructure
    {
        $blocks = $this->blocks;
        $target = null;
        $pos = -1;
        foreach ($blocks as $i => $b) {
            if ($b->id === $blockId) {
                $target = $b;
                $pos = $i;
                break;
            }
        }
        if ($target === null) {
            return $this;
        }
        $content = $target->content;
        $index = max(0, min($index, count($content)));
        $first = array_slice($content, 0, $index);
        $second = array_slice($content, $index);

        $newFirst = new Block(
            $target->id,
            $target->type,
            $target->title,
            $target->order,
            $first
        );

        $newSecond = new Block(
            'block-' . bin2hex(random_bytes(8)),
            $target->type,
            $target->title,
            $target->order + 1,
            $second
        );

        $blocks[$pos] = $newFirst;
        array_splice($blocks, $pos + 1, 0, [$newSecond]);
        return new self($blocks);
    }

    public function mergeBlocks(array $blockIds): DocumentStructure
    {
        if (count($blockIds) < 2) {
            return $this;
        }
        $blocks = $this->blocks;
        $ids = array_map(fn (Block $b) => $b->id, $blocks);
        $positions = [];
        foreach ($blockIds as $bid) {
            $pos = array_search($bid, $ids, true);
            if ($pos === false) {
                return $this;
            }
            $positions[] = $pos;
        }
        sort($positions);
        $first = $blocks[$positions[0]];
        $mergedContent = $first->content;
        foreach (array_slice($blockIds, 1) as $bid) {
            $idx = array_search($bid, $ids, true);
            if ($idx !== false) {
                $mergedContent = array_merge($mergedContent, $blocks[$idx]->content);
            }
        }
        $merged = new Block(
            $first->id,
            $first->type,
            $first->title,
            $first->order,
            $mergedContent
        );
        $result = array_values(array_filter(
            $blocks,
            fn (Block $b) => !in_array($b->id, $blockIds, true)
        ));
        array_splice($result, $positions[0], 0, [$merged]);
        return new self($result);
    }

    public function toJson(): array
    {
        return [
            'blocks' => array_map(fn (Block $b) => $b->toJson(), $this->blocks),
        ];
    }

    public static function fromJson(array $json): self
    {
        $blocks = [];
        if (isset($json['blocks']) && is_array($json['blocks'])) {
            foreach ($json['blocks'] as $b) {
                if (is_array($b)) {
                    $blocks[] = Block::fromJson($b);
                }
            }
        }
        return new self($blocks);
    }

    /**
     * Build a document structure from a Thorm IR document.
     *
     * A Thorm IR document has the shape produced by {@see Render::toIR()}:
     *
     *   [
     *     'atoms' => [...],
     *     'root' => [
     *       'k' => 'fragment',
     *       'children' => [
     *         [
     *           'k' => 'fragment',
     *           'children' => [
     *             [
     *               'k' => 'el',
     *               'tag' => 'div',
     *               'props' => ['attrs' => ['data-block-id' => ..., 'data-title' => ...], ...],
     *               'children' => [ ... the block's Thorm IR subtree ... ],
     *             ],
     *           ],
     *         ],
     *       ],
     *     ],
     *   ]
     *
     * Each block's content is stored as the Thorm IR subtree — the children of
     * the block's content <div> — which is the exact same representation the
     * page is rendered from. This lets the editor save and restore from the
     * same IR (no separate "editor IR" representation).
     *
     * @param array $json A Thorm IR document (the output of Render::toIR()).
     */
    public static function fromThormIR(array $json): self
    {
        $blocks = [];
        $root = $json['root'] ?? null;
        if (!is_array($root)) {
            return new self();
        }
        // The root is a fragment whose children are per-block fragments.
        foreach (($root['children'] ?? []) as $child) {
            if (!is_array($child)) {
                continue;
            }
            foreach (($child['children'] ?? []) as $el) {
                $blocks[] = self::blockFromThormNode($el);
            }
        }
        return new self($blocks);
    }

    /**
     * Build a Block from a single Thorm IR element node (a block's content div).
     *
     * The block's content is set to the element's children (its Thorm IR
     * subtree), so the stored content is a subtree of the page IR.
     *
     * @param array $node A Thorm IR el node (the block's content div).
     */
    private static function blockFromThormNode(array $node): Block
    {
        $attrs = $node['props']['attrs'] ?? [];
        $id = self::attrValue($attrs, 'data-block-id');
        $title = self::attrValue($attrs, 'data-title');
        $order = self::orderFromNode($node);
        $content = is_array($node['children'] ?? null) ? $node['children'] : [];
        return new Block(
            $id,
            'section',
            $title,
            $order,
            $content
        );
    }

    /**
     * Extract a string value from a Thorm IR attr. An attr value is either a
     * plain scalar or a Thorm expression (e.g. ['k' => 'val', 'v' => '...']).
     *
     * @param array $attrs
     */
    private static function attrValue(array $attrs, string $name): string
    {
        if (!isset($attrs[$name])) {
            return '';
        }
        $v = $attrs[$name];
        if (is_array($v)) {
            return (string) ($v['v'] ?? '');
        }
        return (string) $v;
    }

    /**
     * Derive a block's order from its position in the document. Thorm IR nodes
     * carry no explicit order, so we fall back to the index within the block
     * list (the block's position in the page).
     */
    private static function orderFromNode(array $node): int
    {
        // No explicit order attribute in the Thorm IR subtree; the caller is
        // responsible for re-ordering. Here we just return 0; the document
        // order (position in the array) is what matters for rendering.
        return 0;
    }
}