<?php

namespace Thorm\Components\Editor;

final class BlockContent
{
    public string $blockId;
    public array $tree = [];

    public function __construct(string $blockId, array $tree = [])
    {
        $this->blockId = $blockId;
        $this->tree = $tree;
    }

    public static function fromIR(string $blockId, array $ir): self
    {
        return new self($blockId, $ir);
    }

    public function toIR(): array
    {
        return $this->tree;
    }

    public function findNode(string $id): ?EditorNode
    {
        $raw = $this->findNodeRaw($this->tree, $id);
        return $raw !== null ? EditorNode::fromJson($raw) : null;
    }

    public function cloneNode(EditorNode $node): EditorNode
    {
        return $node->clone();
    }

    public function cloneTree(EditorNode $node): EditorNode
    {
        return $node->cloneKeepingId();
    }

    public function setText(string $nodeId, string $text): BlockContent
    {
        $newTree = $this->applyToNode($this->tree, $nodeId, fn (array $n) => array_merge($n, ['value' => $text]));
        return new self($this->blockId, $newTree);
    }

    public function updateStyle(string $nodeId, array $style): BlockContent
    {
        $newTree = $this->applyToNode($this->tree, $nodeId, fn (array $n) => array_merge($n, ['props' => array_merge($n['props'] ?? [], ['style' => $style])]));
        return new self($this->blockId, $newTree);
    }

    public function updateAttrs(string $nodeId, array $attrs): BlockContent
    {
        $newTree = $this->applyToNode($this->tree, $nodeId, fn (array $n) => array_merge($n, ['props' => array_merge($n['props'] ?? [], ['attrs' => array_merge($n['props']['attrs'] ?? [], $attrs)])]));
        return new self($this->blockId, $newTree);
    }

    public function insertNode(string $parentId, EditorNode $node, int $index): BlockContent
    {
        $newTree = $this->spliceIntoChildren($this->tree, $parentId, $index, [$node->toJson()]);
        return new self($this->blockId, $newTree);
    }

    public function removeNode(string $nodeId): BlockContent
    {
        $newTree = $this->removeFromChildren($this->tree, $nodeId);
        return new self($this->blockId, $newTree);
    }

    public function moveNode(string $nodeId, string $parentId, int $index): BlockContent
    {
        $nodePayload = $this->findNodeRaw($this->tree, $nodeId);
        if ($nodePayload === null) {
            return $this;
        }
        $afterRemove = $this->removeFromChildren($this->tree, $nodeId);
        $newTree = $this->spliceIntoChildren($afterRemove, $parentId, $index, [$nodePayload]);
        return new self($this->blockId, $newTree);
    }

    private function findNodeRaw(array $nodes, string $id): ?array
    {
        foreach ($nodes as $n) {
            if (!is_array($n)) {
                continue;
            }
            if (($n['id'] ?? null) === $id) {
                return $n;
            }
            if (isset($n['children']) && is_array($n['children'])) {
                $found = $this->findNodeRaw($n['children'], $id);
                if ($found !== null) {
                    return $found;
                }
            }
        }
        return null;
    }

    private function applyToNode(array $nodes, string $nodeId, callable $fn): array
    {
        $result = [];
        foreach ($nodes as $n) {
            if (!is_array($n)) {
                $result[] = $n;
                continue;
            }
            if (($n['id'] ?? null) === $nodeId) {
                $result[] = $fn($n);
            } else {
                if (isset($n['children']) && is_array($n['children'])) {
                    $n['children'] = $this->applyToNode($n['children'], $nodeId, $fn);
                }
                $result[] = $n;
            }
        }
        return $result;
    }

    private function spliceIntoChildren(array $nodes, string $parentId, int $index, array $items): array
    {
        $result = [];
        foreach ($nodes as $n) {
            if (!is_array($n)) {
                $result[] = $n;
                continue;
            }
            if (($n['id'] ?? null) === $parentId) {
                $children = $n['children'] ?? [];
                array_splice($children, $index, 0, $items);
                $n['children'] = array_values($children);
                $result[] = $n;
                continue;
            }
            if (isset($n['children']) && is_array($n['children'])) {
                $n['children'] = $this->spliceIntoChildren($n['children'], $parentId, $index, $items);
            }
            $result[] = $n;
        }
        return $result;
    }

    private function removeFromChildren(array $nodes, string $nodeId): array
    {
        $result = [];
        foreach ($nodes as $n) {
            if (!is_array($n)) {
                $result[] = $n;
                continue;
            }
            if (isset($n['children']) && is_array($n['children'])) {
                $filtered = array_values(array_filter(
                    $n['children'],
                    fn ($c) => !is_array($c) || ($c['id'] ?? null) !== $nodeId
                ));
                if (count($filtered) !== count($n['children'])) {
                    $n['children'] = $filtered;
                }
            }
            $result[] = $n;
        }
        return $result;
    }
}
