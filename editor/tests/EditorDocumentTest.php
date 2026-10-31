<?php

declare(strict_types=1);

namespace Thorm\Components\Editor;

use PHPUnit\Framework\TestCase;
use Thorm\Components\Editor\EditorNode;
use Thorm\Components\Editor\BlockContent;
use Thorm\Components\Editor\DocumentStructure;
use Thorm\Components\Editor\Block;
use Thorm\Components\Editor\CommandStack;
use Thorm\Components\Editor\Commands\SetTextCommand;
use Thorm\Components\Editor\Commands\AddBlockCommand;
use Thorm\Components\Editor\Commands\RemoveBlockCommand;
use Thorm\Components\Editor\Commands\MoveBlockCommand;

final class EditorDocumentTest extends TestCase
{
    public function testFromIRToIRRoundTrip(): void
    {
        $ir = [
            [
                'id' => 'n1',
                'k' => 'el',
                'tag' => 'p',
                'children' => [
                    ['id' => 't1', 'k' => 'text', 'value' => 'Hello'],
                ],
            ],
        ];
        $bc = BlockContent::fromIR('b1', $ir);
        $round = $bc->toIR();
        $this->assertSame($ir, $round);
    }

    public function testSetText(): void
    {
        $ir = [
            ['id' => 'n1', 'k' => 'el', 'tag' => 'p', 'children' => [
                ['id' => 't1', 'k' => 'text', 'value' => 'Hello'],
            ]],
        ];
        $bc = BlockContent::fromIR('b1', $ir);
        $new = $bc->setText('t1', 'World');
        $this->assertNotSame($bc, $new);
        $this->assertSame('World', $new->toIR()[0]['children'][0]['value']);
    }

    public function testUpdateStyle(): void
    {
        $ir = [
            ['id' => 'n1', 'k' => 'el', 'tag' => 'p', 'props' => []],
        ];
        $bc = BlockContent::fromIR('b1', $ir);
        $new = $bc->updateStyle('n1', ['color' => 'red']);
        $this->assertSame(['color' => 'red'], $new->toIR()[0]['props']['style']);
    }

    public function testUpdateAttrs(): void
    {
        $ir = [
            ['id' => 'n1', 'k' => 'el', 'tag' => 'a', 'props' => ['attrs' => ['href' => '#']]],
        ];
        $bc = BlockContent::fromIR('b1', $ir);
        $new = $bc->updateAttrs('n1', ['target' => '_blank']);
        $this->assertArrayHasKey('target', $new->toIR()[0]['props']['attrs']);
    }

    public function testInsertNode(): void
    {
        $ir = [
            ['id' => 'p1', 'k' => 'el', 'tag' => 'div', 'children' => []],
        ];
        $bc = BlockContent::fromIR('b1', $ir);
        $child = new EditorNode('c1', 'el', 'span', [], [], 'New');
        $new = $bc->insertNode('p1', $child, 0);
        $this->assertCount(1, $new->toIR()[0]['children']);
    }

    public function testRemoveNode(): void
    {
        $ir = [
            ['id' => 'p1', 'k' => 'el', 'tag' => 'div', 'children' => [
                ['id' => 'c1', 'k' => 'el', 'tag' => 'span', 'children' => []],
            ]],
        ];
        $bc = BlockContent::fromIR('b1', $ir);
        $new = $bc->removeNode('c1');
        $this->assertCount(0, $new->toIR()[0]['children']);
    }

    public function testMoveNode(): void
    {
        $ir = [
            ['id' => 'p1', 'k' => 'el', 'tag' => 'div', 'children' => [
                ['id' => 'c1', 'k' => 'el', 'tag' => 'span', 'children' => []],
                ['id' => 'c2', 'k' => 'el', 'tag' => 'span', 'children' => []],
            ]],
        ];
        $bc = BlockContent::fromIR('b1', $ir);
        $new = $bc->moveNode('c1', 'p1', 1);
        $this->assertSame('c2', $new->toIR()[0]['children'][0]['id']);
        $this->assertSame('c1', $new->toIR()[0]['children'][1]['id']);
    }

    public function testFindNode(): void
    {
        $ir = [
            ['id' => 'p1', 'k' => 'el', 'tag' => 'div', 'children' => [
                ['id' => 'c1', 'k' => 'el', 'tag' => 'span', 'children' => []],
            ]],
        ];
        $bc = BlockContent::fromIR('b1', $ir);
        $node = $bc->findNode('c1');
        $this->assertInstanceOf(EditorNode::class, $node);
        $this->assertSame('c1', $node->id);
    }

    public function testCloneNode(): void
    {
        $n = new EditorNode('n1', 'el', 'p', [], [], 'Hi');
        $clone = $n->clone();
        $this->assertNotSame($n, $clone);
        $this->assertSame('Hi', $clone->value);
        $this->assertStringStartsWith('node-', $clone->id);
    }

    public function testCloneTree(): void
    {
        $n = new EditorNode('n1', 'el', 'p', [], [], 'Hi');
        $clone = $n->cloneKeepingId();
        $this->assertSame('n1', $clone->id);
        $this->assertSame('Hi', $clone->value);
    }

    public function testCommandStackPushPop(): void
    {
        $stack = new CommandStack();
        $cmd = new SetTextCommand('b1', 't1', 'old', 'new');
        $stack->push($cmd);
        $this->assertNotNull($stack->peek());
        $popped = $stack->pop();
        $this->assertSame($cmd, $popped);
        $this->assertNull($stack->peek());
    }

    public function testCommandStackUndoRedo(): void
    {
        $stack = new CommandStack();
        $state = ['b1' => [
            ['id' => 'n1', 'k' => 'el', 'tag' => 'p', 'children' => [
                ['id' => 't1', 'k' => 'text', 'value' => 'old'],
            ]],
        ]];
        $cmd = new SetTextCommand('b1', 't1', 'old', 'new');
        $stack->push($cmd);
        $after = $stack->undo($state);
        $this->assertSame('old', $after['b1'][0]['children'][0]['value']);
        $back = $stack->redo($after);
        $this->assertSame('new', $back['b1'][0]['children'][0]['value']);
    }

    public function testCommandStackClear(): void
    {
        $stack = new CommandStack();
        $cmd = new SetTextCommand('b1', 't1', 'old', 'new');
        $stack->push($cmd);
        $stack->clear();
        $this->assertFalse($stack->canUndo());
        $this->assertFalse($stack->canRedo());
        $this->assertNull($stack->peek());
    }

    public function testAddBlock(): void
    {
        $structure = new DocumentStructure();
        $block = new Block('b1', 'section', 'Intro', 0);
        $new = $structure->addBlock($block);
        $this->assertCount(1, $new->blocks);
        $this->assertSame('b1', $new->blocks[0]->id);
    }

    public function testRemoveBlock(): void
    {
        $block = new Block('b1', 'section', 'Intro', 0);
        $structure = new DocumentStructure([$block]);
        $new = $structure->removeBlock('b1');
        $this->assertCount(0, $new->blocks);
    }

    public function testMoveBlock(): void
    {
        $b1 = new Block('b1', 'section', 'A', 0);
        $b2 = new Block('b2', 'section', 'B', 1);
        $structure = new DocumentStructure([$b1, $b2]);
        $new = $structure->moveBlock('b1', 1);
        $this->assertSame('b2', $new->blocks[0]->id);
        $this->assertSame('b1', $new->blocks[1]->id);
    }

    public function testSplitBlock(): void
    {
        $content = [
            ['id' => 'n1', 'k' => 'el', 'tag' => 'p', 'children' => []],
            ['id' => 'n2', 'k' => 'el', 'tag' => 'p', 'children' => []],
        ];
        $block = new Block('b1', 'section', 'Intro', 0, $content);
        $structure = new DocumentStructure([$block]);
        $new = $structure->splitBlock('b1', 1);
        $this->assertCount(2, $new->blocks);
        $this->assertSame(1, count($new->blocks[0]->content));
        $this->assertSame(1, count($new->blocks[1]->content));
    }

    public function testMergeBlocks(): void
    {
        $b1 = new Block('b1', 'section', 'A', 0, [['id' => 'n1', 'k' => 'el', 'tag' => 'p', 'children' => []]]);
        $b2 = new Block('b2', 'section', 'B', 1, [['id' => 'n2', 'k' => 'el', 'tag' => 'p', 'children' => []]]);
        $structure = new DocumentStructure([$b1, $b2]);
        $new = $structure->mergeBlocks(['b1', 'b2']);
        $this->assertCount(1, $new->blocks);
        $this->assertSame(2, count($new->blocks[0]->content));
    }

    public function testStructuralCommandAddBlock(): void
    {
        $block = new Block('b1', 'section', 'Intro', 0);
        $cmd = new AddBlockCommand($block);
        $structure = new DocumentStructure();
        $new = $cmd->execute($structure);
        $this->assertCount(1, $new->blocks);
        $back = $cmd->undo($new);
        $this->assertCount(0, $back->blocks);
    }

    public function testStructuralCommandRemoveBlock(): void
    {
        $block = new Block('b1', 'section', 'Intro', 0);
        $structure = new DocumentStructure([$block]);
        $cmd = new RemoveBlockCommand('b1', $block);
        $new = $cmd->execute($structure);
        $this->assertCount(0, $new->blocks);
        $back = $cmd->undo($new);
        $this->assertCount(1, $back->blocks);
    }

    public function testStructuralCommandMoveBlock(): void
    {
        $b1 = new Block('b1', 'section', 'A', 0);
        $b2 = new Block('b2', 'section', 'B', 1);
        $structure = new DocumentStructure([$b1, $b2]);
        $cmd = new MoveBlockCommand('b1', 1, 0);
        $new = $cmd->execute($structure);
        $this->assertSame('b2', $new->blocks[0]->id);
        $back = $cmd->undo($new);
        $this->assertSame('b1', $back->blocks[0]->id);
    }
}