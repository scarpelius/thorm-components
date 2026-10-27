<?php
declare(strict_types=1);

namespace Thorm\Components\Editor;

use Thorm\IR\Node\Node;
use Thorm\IR\Node\ElNode;
use Thorm\IR\Node\FragmentNode;
use Thorm\IR\Node\TextNode;
use function Thorm\el;
use function Thorm\fragment;
use function Thorm\text;

final class Editor
{
    /**
     * Build an editor host container.
     *
     * The editor host renders as ordinary HTML with a distinctive CSS class
     * that identifies it as an editor region. When inactive, it looks like
     * normal content. JS enrichment adds editing behavior when activated.
     *
     * @param array<Node> $children Content inside the editor host
     * @param array{class?:string,id?:string} $opts Optional configuration
     */
    public static function host(array $children, array $opts = []): Node
    {
        $classNames = 'thorm-editor-host';
        if (!empty($opts['class'])) {
            $classNames .= ' ' . $opts['class'];
        }

        return el('div', [
            ['attrs', [
                'class' => $classNames,
                'data-editor' => 'host',
                ...((isset($opts['id']) && $opts['id']) ? ['id' => $opts['id']] : [])
            ]]
        ], $children);
    }

    /**
     * Build a simple editor block (e.g., for paragraphs).
     *
     * @param array<Node> $children
     * @param array{class?:string,id?:string} $opts
     */
    public static function block(array $children, array $opts = []): Node
    {
        $classNames = 'thorm-editor-block';
        if (!empty($opts['class'])) {
            $classNames .= ' ' . $opts['class'];
        }

        return el('div', [
            ['attrs', [
                'class' => $classNames,
                'data-editor' => 'block',
                ...((isset($opts['id']) && $opts['id']) ? ['id' => $opts['id']] : [])
            ]]
        ], $children);
    }
}