<?php

declare(strict_types=1);

namespace Thorm\Components\Editor\Tests;

use PHPUnit\Framework\TestCase;
use Thorm\IR\Node\ElNode;
use Thorm\IR\Node\FragmentNode;
use Thorm\IR\Node\TextNode;
use Thorm\Components\Editor\{Block, EditorNode, EditorToolbar, EditorWidget};
use Thorm\Components\Editor\Widgets\{BlockHeaderWidget, DragHandleWidget};

final class EditorNodeTest extends TestCase
{
    private function makeBlock(string $id = 'block-1', array $content = []): Block
    {
        return new Block($id, 'section', 'My Title', 0, $content);
    }

    /**
     * render() must produce the same IR shape as the pre-refactor inline code
     * in examples/editor/phase0-and-phase1.php:
     *   fragment([
     *       h2([], [text(title)]),
     *       div([['attrs', ['contenteditable' => 'true', 'data-block-id' => $id]]], $thormNodes),
     *   ])
     */
    public function testRenderProducesTitleHeadingAndContenteditableWrapper(): void
    {
        $node = new EditorNode($this->makeBlock('block-1', []));
        $ir = $node->render();

        $this->assertInstanceOf(FragmentNode::class, $ir);
        $this->assertCount(2, $ir->children);
        $this->assertInstanceOf(ElNode::class, $ir->children[0]);
        $this->assertInstanceOf(ElNode::class, $ir->children[1]);

        // h2 with text child
        $this->assertSame('h2', $ir->children[0]->tag);
        $this->assertCount(1, $ir->children[0]->children);
        $this->assertInstanceOf(TextNode::class, $ir->children[0]->children[0]);
        $this->assertSame('My Title', (string) $ir->children[0]->children[0]->value);

        // div with contenteditable + data-block-id attrs
        $this->assertSame('div', $ir->children[1]->tag);
        $this->assertSame([
            ['attrs', ['contenteditable' => 'true', 'data-block-id' => 'block-1']],
        ], $ir->children[1]->props);
        $this->assertCount(0, $ir->children[1]->children);
    }

    public function testRenderWithContent(): void
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
        $node = new EditorNode($this->makeBlock('block-2', $ir));
        $rendered = $node->render();

        $this->assertInstanceOf(FragmentNode::class, $rendered);
        $this->assertCount(2, $rendered->children);
        // The wrapper div should contain the converted p element
        $this->assertInstanceOf(ElNode::class, $rendered->children[1]);
        $this->assertSame('div', $rendered->children[1]->tag);
        $this->assertCount(1, $rendered->children[1]->children);
        $this->assertInstanceOf(ElNode::class, $rendered->children[1]->children[0]);
        $this->assertSame('p', $rendered->children[1]->children[0]->tag);
    }

    public function testGetStateReturnsIdMappedToContent(): void
    {
        $node = new EditorNode($this->makeBlock('block-3', [
            ['id' => 'n1', 'k' => 'el', 'tag' => 'p', 'props' => [], 'children' => []],
        ]));
        $state = $node->getState();

        $this->assertSame(['block-3' => [
            ['id' => 'n1', 'k' => 'el', 'tag' => 'p', 'props' => [], 'children' => []],
        ]], $state);
    }

    public function testToolbarAttachment(): void
    {
        $node = new EditorNode($this->makeBlock('block-4'));
        $toolbar = new EditorToolbar();
        $toolbar->addCommand('bold', 'Bold', 'icon-bold', fn (array $ctx) => 'bold-executed');

        $node->setToolbar($toolbar);

        $this->assertInstanceOf(EditorToolbar::class, $node->getToolbar());
        $this->assertSame('bold-executed', $node->getToolbar()->execute('bold'));
    }

    public function testToolbarCommandListOmitsHandlers(): void
    {
        $toolbar = new EditorToolbar();
        $toolbar->addCommand('italic', 'Italic', 'icon-italic', fn () => null);

        $list = $toolbar->getCommandList();
        $this->assertSame([
            'italic' => [
                'name' => 'italic',
                'label' => 'Italic',
                'icon' => 'icon-italic',
            ],
        ], $list);
        $this->assertArrayNotHasKey('handler', $list['italic']);
    }

    public function testWidgetAttachmentAndRendering(): void
    {
        $node = new EditorNode($this->makeBlock('block-5', []));
        $node->addWidget(new BlockHeaderWidget());
        $node->addWidget(new DragHandleWidget());

        $widgets = $node->getWidgets();
        $this->assertCount(2, $widgets);
        $this->assertInstanceOf(BlockHeaderWidget::class, $widgets[0]);
        $this->assertInstanceOf(DragHandleWidget::class, $widgets[1]);

        // Mount and render each widget
        foreach ($widgets as $widget) {
            $widget->mount($node);
            $ir = $widget->render();
            $this->assertIsArray($ir);
            $this->assertNotEmpty($ir);
        }
    }

    public function testWidgetRenderWithoutMountReturnsEmpty(): void
    {
        $widget = new BlockHeaderWidget();
        $this->assertSame([], $widget->render());
    }

    public function testWidgetDestroyReleasesNode(): void
    {
        $node = new EditorNode($this->makeBlock('block-6'));
        $widget = new BlockHeaderWidget();
        $widget->mount($node);
        $widget->destroy();

        // After destroy, node is null (internal state)
        $this->assertSame([], $widget->render());
    }
}