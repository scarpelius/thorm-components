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
}