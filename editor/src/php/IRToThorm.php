<?php

declare(strict_types=1);

namespace Thorm\Components\Editor;

use function Thorm\{
    a, br, blockquote, code, div, h1, h2, h3, h4, h5, h6, hr, img, li, ol,
    p, pre, script, span, strong, table, td, th, text, tr, ul
};
use Thorm\IR\Node\ElNode;

/**
 * Convert a block's IR tree (stored array format) to Thorm IR nodes.
 *
 * The stored IR format is:
 * [
 *   ['id' => 'n1', 'k' => 'el', 'tag' => 'p', 'children' => [...], 'props' => [...]],
 *   ['id' => 't1', 'k' => 'text', 'value' => 'Hello'],
 * ]
 *
 * This function converts that to an array of Thorm IR node objects
 * (ElNode, TextNode, etc.) that the Thorm renderer can process.
 */
function irToThormNodes(array $ir): array
{
    $nodes = [];
    foreach ($ir as $node) {
        if (!is_array($node)) {
            continue;
        }
        $k = $node['k'] ?? null;

        if ($k === 'text') {
            $nodes[] = text($node['value'] ?? '');
        } elseif ($k === 'el') {
            $tag = $node['tag'] ?? 'div';
            $children = irToThormNodes($node['children'] ?? []);
            $nodes[] = createThormTag($tag, $node['props'] ?? [], $children);
        }
    }
    return $nodes;
}

/**
 * Map a tag name to the appropriate Thorm tag function.
 *
 * Uses the Thorm tag functions from vendor/bitforge/thorm/src/php/tags.php.
 * Falls back to div() for unknown tags.
 */
function createThormTag(string $tag, array $props, array $children): ElNode
{
    $tag = strtolower($tag);

    // Convert editor IR props to Thorm ElNode props format
    // Editor IR: {'style' => 'color: red', 'class' => 'btn', 'attrs' => [...]}
    // Thorm: [['attrs', [...]], ['cls', 'btn'], ['style', [...]]]
    $thormProps = convertPropsToThorm($props);

    switch ($tag) {
        case 'a':
            return a($thormProps, $children);
        case 'br':
            return br($thormProps, []);
        case 'blockquote':
            return blockquote($thormProps, $children);
        case 'code':
            return code($thormProps, $children);
        case 'div':
            return div($thormProps, $children);
        case 'h1':
            return h1($thormProps, $children);
        case 'h2':
            return h2($thormProps, $children);
        case 'h3':
            return h3($thormProps, $children);
        case 'h4':
            return h4($thormProps, $children);
        case 'h5':
            return h5($thormProps, $children);
        case 'h6':
            return h6($thormProps, $children);
        case 'hr':
            return hr($thormProps, []);
        case 'img':
            return img($thormProps, []);
        case 'li':
            return li($thormProps, $children);
        case 'ol':
            return ol($thormProps, $children);
        case 'p':
            return p($thormProps, $children);
        case 'pre':
            return pre($thormProps, $children);
        case 'span':
            return span($thormProps, $children);
        case 'strong':
            return strong($thormProps, $children);
        case 'table':
            return table($thormProps, $children);
        case 'td':
            return td($thormProps, $children);
        case 'th':
            return th($thormProps, $children);
        case 'tr':
            return tr($thormProps, $children);
        case 'ul':
            return ul($thormProps, $children);
        default:
            return div($thormProps, $children);
    }
}

/**
 * Convert editor IR props to Thorm ElNode props format.
 *
 * Editor IR props: {'style' => 'color: red', 'class' => 'btn', 'attrs' => {'data-id' => '1'}}
 * Thorm props: [['style', ['color' => 'red']], ['cls', 'btn'], ['attrs', ['data-id' => '1']]]
 */
function convertPropsToThorm(array $props): array
{
    $thormProps = [];

    if (isset($props['style']) && is_array($props['style'])) {
        $thormProps[] = ['style', $props['style']];
    } elseif (isset($props['style']) && is_string($props['style'])) {
        // Parse inline style string into key-value pairs
        $style = [];
        foreach (explode(';', $props['style']) as $pair) {
            $pair = trim($pair);
            if ($pair !== '' && str_contains($pair, ':')) {
                [$key, $value] = explode(':', $pair, 2);
                $style[trim($key)] = trim($value);
            }
        }
        if ($style !== []) {
            $thormProps[] = ['style', $style];
        }
    }

    if (isset($props['class']) && $props['class'] !== '') {
        $thormProps[] = ['cls', $props['class']];
    }

    $attrs = [];
    if (isset($props['attrs']) && is_array($props['attrs'])) {
        $attrs = $props['attrs'];
    }
    // Also pick up known attrs from the flat props
    $knownAttrs = ['id', 'href', 'src', 'alt', 'title', 'target', 'rel', 'download'];
    foreach ($knownAttrs as $attr) {
        if (isset($props[$attr]) && $attr !== 'class') {
            $attrs[$attr] = $props[$attr];
        }
    }
    if ($attrs !== []) {
        $thormProps[] = ['attrs', $attrs];
    }

    return $thormProps;
}