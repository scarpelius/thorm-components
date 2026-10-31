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

    private function convertPropsToThorm(array $props): array
    {
        return \Thorm\Components\Editor\convertPropsToThorm($props);
    }

    public function testEmptyIRReturnsEmptyArray(): void
    {
        $this->assertSame([], $this->irToThormNodes([]));
    }

    public function testTextIR(): void
    {
        $ir = [
            ['id' => 't1', 'k' => 'text', 'value' => 'Hello'],
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
                'props' => [],
                'children' => [
                    ['id' => 't1', 'k' => 'text', 'value' => 'Hello'],
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
                'props' => [],
                'children' => [
                    ['id' => 't1', 'k' => 'text', 'value' => 'Title'],
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
                'props' => [],
                'children' => [
                    [
                        'id' => 'n2',
                        'k' => 'el',
                        'tag' => 'p',
                        'props' => [],
                        'children' => [
                            ['id' => 't1', 'k' => 'text', 'value' => 'Inner'],
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
            ['id' => 'n1', 'k' => 'el', 'tag' => 'p', 'props' => [], 'children' => []],
            ['id' => 'n2', 'k' => 'el', 'tag' => 'p', 'props' => [], 'children' => []],
            ['id' => 't1', 'k' => 'text', 'value' => 'Text'],
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
                'props' => [],
                'children' => [],
            ],
        ];
        $nodes = $this->irToThormNodes($ir);
        $this->assertCount(1, $nodes);
        $this->assertInstanceOf(ElNode::class, $nodes[0]);
    }

    public function testPropsConversion(): void
    {
        $props = $this->convertPropsToThorm([
            'class' => 'btn',
            'id' => 'my-id',
            'style' => ['color' => 'red'],
        ]);
        $this->assertContains(['cls', 'btn'], $props);
        $this->assertContains(['attrs', ['id' => 'my-id']], $props);
        $this->assertContains(['style', ['color' => 'red']], $props);
    }

    public function testPropsConversionWithStyleString(): void
    {
        $props = $this->convertPropsToThorm([
            'style' => 'color: red; font-size: 16px;',
        ]);
        $this->assertCount(1, $props);
        $this->assertSame(['style', ['color' => 'red', 'font-size' => '16px']], $props[0]);
    }

    public function testPropsConversionEmpty(): void
    {
        $props = $this->convertPropsToThorm([]);
        $this->assertSame([], $props);
    }

    public function testCreateThormTagWithProps(): void
    {
        $node = $this->createThormTag('p', ['class' => 'highlight'], []);
        $this->assertInstanceOf(ElNode::class, $node);
    }

    public function testIrToThormWithAttributes(): void
    {
        $ir = [
            [
                'id' => 'n1',
                'k' => 'el',
                'tag' => 'a',
                'props' => ['href' => 'https://example.com'],
                'children' => [
                    ['id' => 't1', 'k' => 'text', 'value' => 'Link'],
                ],
            ],
        ];
        $nodes = $this->irToThormNodes($ir);
        $this->assertCount(1, $nodes);
        $this->assertInstanceOf(ElNode::class, $nodes[0]);
    }
}