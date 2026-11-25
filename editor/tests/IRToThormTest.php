<?php

declare(strict_types=1);

namespace Thorm\Components\Editor\Tests;

use PHPUnit\Framework\TestCase;
use Thorm\IR\Node\ElNode;
use Thorm\IR\Node\TextNode;

final class IRToThormTest extends TestCase
{
    private function irToThormNodes(array $ir): array
    {
        return \Thorm\Components\Editor\irToThormNodes($ir);
    }

    private function createThormTag(string $tag, array $props, array $children): ElNode
    {
        return \Thorm\Components\Editor\createThormTag($tag, $props, $children);
    }

    private function convertThormPropsToHelpers(array $props): array
    {
        return \Thorm\Components\Editor\convertThormPropsToHelpers($props);
    }

    public function testEmptyIRReturnsEmptyArray(): void
    {
        $this->assertSame([], $this->irToThormNodes([]));
    }

    public function testTextIR(): void
    {
        $ir = [
            ['id' => 't1', 'k' => 'text', 'value' => ['k' => 'val', 'v' => 'Hello']],
        ];
        $nodes = $this->irToThormNodes($ir);
        $this->assertCount(1, $nodes);
        $this->assertInstanceOf(TextNode::class, $nodes[0]);
    }

    public function testParagraphIR(): void
    {
        $ir = [
            [
                'id' => 'n1',
                'k' => 'el',
                'tag' => 'p',
                'props' => ['attrs' => [], 'cls' => null, 'style' => [], 'on' => []],
                'children' => [
                    ['id' => 't1', 'k' => 'text', 'value' => ['k' => 'val', 'v' => 'Hello']],
                ],
            ],
        ];
        $nodes = $this->irToThormNodes($ir);
        $this->assertCount(1, $nodes);
        $this->assertInstanceOf(ElNode::class, $nodes[0]);
    }

    public function testHeadingIR(): void
    {
        $ir = [
            [
                'id' => 'n1',
                'k' => 'el',
                'tag' => 'h2',
                'props' => ['attrs' => [], 'cls' => null, 'style' => [], 'on' => []],
                'children' => [
                    ['id' => 't1', 'k' => 'text', 'value' => ['k' => 'val', 'v' => 'Title']],
                ],
            ],
        ];
        $nodes = $this->irToThormNodes($ir);
        $this->assertCount(1, $nodes);
        $this->assertInstanceOf(ElNode::class, $nodes[0]);
    }

    public function testNestedIR(): void
    {
        $ir = [
            [
                'id' => 'n1',
                'k' => 'el',
                'tag' => 'div',
                'props' => ['attrs' => [], 'cls' => null, 'style' => [], 'on' => []],
                'children' => [
                    [
                        'id' => 'n2',
                        'k' => 'el',
                        'tag' => 'p',
                        'props' => ['attrs' => [], 'cls' => null, 'style' => [], 'on' => []],
                        'children' => [
                            ['id' => 't1', 'k' => 'text', 'value' => ['k' => 'val', 'v' => 'Inner']],
                        ],
                    ],
                ],
            ],
        ];
        $nodes = $this->irToThormNodes($ir);
        $this->assertCount(1, $nodes);
        $this->assertInstanceOf(ElNode::class, $nodes[0]);
    }

    public function testMultipleNodes(): void
    {
        $ir = [
            ['id' => 'n1', 'k' => 'el', 'tag' => 'p', 'props' => ['attrs' => [], 'cls' => null, 'style' => [], 'on' => []], 'children' => []],
            ['id' => 'n2', 'k' => 'el', 'tag' => 'p', 'props' => ['attrs' => [], 'cls' => null, 'style' => [], 'on' => []], 'children' => []],
            ['id' => 't1', 'k' => 'text', 'value' => ['k' => 'val', 'v' => 'Text']],
        ];
        $nodes = $this->irToThormNodes($ir);
        $this->assertCount(3, $nodes);
    }

    public function testUnknownTagFallsBackToDiv(): void
    {
        $ir = [
            [
                'id' => 'n1',
                'k' => 'el',
                'tag' => 'unknown',
                'props' => ['attrs' => [], 'cls' => null, 'style' => [], 'on' => []],
                'children' => [],
            ],
        ];
        $nodes = $this->irToThormNodes($ir);
        $this->assertCount(1, $nodes);
        $this->assertInstanceOf(ElNode::class, $nodes[0]);
    }

    public function testPropsConversion(): void
    {
        $props = $this->convertThormPropsToHelpers([
            'attrs' => ['id' => ['k' => 'val', 'v' => 'my-id']],
            'cls' => 'btn',
            'style' => ['color' => 'red'],
        ]);
        $this->assertContains(['cls', 'btn'], $props);
        $this->assertContains(['style', ['color' => 'red']], $props);
        $this->assertContains(['attrs', ['id' => ['k' => 'val', 'v' => 'my-id']]], $props);
    }

    public function testPropsConversionEmpty(): void
    {
        $props = $this->convertThormPropsToHelpers(['attrs' => [], 'cls' => null, 'style' => [], 'on' => []]);
        $this->assertSame([], $props);
    }

    public function testCreateThormTagWithProps(): void
    {
        $node = $this->createThormTag('p', [['cls', 'highlight']], []);
        $this->assertInstanceOf(ElNode::class, $node);
    }

    public function testIrToThormWithAttributes(): void
    {
        $ir = [
            [
                'id' => 'n1',
                'k' => 'el',
                'tag' => 'a',
                'props' => ['attrs' => ['href' => ['k' => 'val', 'v' => 'https://example.com']], 'cls' => null, 'style' => [], 'on' => []],
                'children' => [
                    ['id' => 't1', 'k' => 'text', 'value' => ['k' => 'val', 'v' => 'Link']],
                ],
            ],
        ];
        $nodes = $this->irToThormNodes($ir);
        $this->assertCount(1, $nodes);
        $this->assertInstanceOf(ElNode::class, $nodes[0]);
    }
}