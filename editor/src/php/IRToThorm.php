<?php

declare(strict_types=1);

namespace Thorm\Components\Editor;

use function Thorm\{
    a, br, blockquote, code, div, h1, h2, h3, h4, h5, h6, hr, img, li, ol,
    p, pre, script, span, strong, table, td, th, text, tr, ul
};
use Thorm\IR\Node\ElNode;

/**
 * Convert a block's IR subtree (Thorm IR node payloads) to Thorm IR nodes.
 *
 * The stored block content is a *subtree of the Thorm IR* — an array of
 * Thorm IR node payloads in the same representation the page is rendered
 * from (the output of the Thorm node's jsonSerialize()):
 *
 *   [
 *     ['k' => 'el', 'tag' => 'p', 'props' => ['attrs' => [...], 'cls' => ..., 'style' => [...], 'on' => [...]], 'children' => [...]],
 *     ['k' => 'text', 'value' => ['k' => 'val', 'v' => 'Hello']],
 *   ]
 *
 * This function converts that back into an array of Thorm IR node objects
 * (ElNode, TextNode, etc.) so the page can be re-rendered. Because the
 * stored content is the exact same IR the page renders from, saving and
 * restoring the block content round-trips the identical IR — there is no
 * separate "editor IR" representation to keep in sync.
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
            $nodes[] = text(thormValueToScalar($node['value'] ?? ''));
        } elseif ($k === 'el') {
            $tag = $node['tag'] ?? 'div';
            $children = irToThormNodes($node['children'] ?? []);
            $nodes[] = createThormTag($tag, convertThormPropsToHelpers($node['props'] ?? []), $children);
        }
    }
    return $nodes;
}

/**
 * Convert a Thorm IR text value (either a plain scalar or a Thorm expression
 * such as ['k' => 'val', 'v' => '...']) to a plain scalar string.
 */
function thormValueToScalar(mixed $value): string
{
    if (is_array($value) && isset($value['k'])) {
        // A Thorm expression; only 'val' is meaningful for literal content.
        if ($value['k'] === 'val') {
            return (string) ($value['v'] ?? '');
        }
        // Expressions are not expected in a block's stored content subtree.
        return '';
    }
    return (string) $value;
}

/**
 * Convert Thorm IR props (serialized form: {attrs, cls, style, on}) into the
 * helper form that the Thorm tag functions expect:
 *   [['attrs', [...]], ['cls', ...], ['style', [...]], ...]
 */
function convertThormPropsToHelpers(array $props): array
{
    $helpers = [];

    $attrs = $props['attrs'] ?? [];
    if (is_array($attrs) && $attrs !== []) {
        $helpers[] = ['attrs', $attrs];
    }

    if (isset($props['cls']) && $props['cls'] !== null) {
        $helpers[] = ['cls', $props['cls']];
    }

    $style = $props['style'] ?? [];
    if (is_array($style) && $style !== []) {
        $helpers[] = ['style', $style];
    }

    return $helpers;
}

/**
 * Map a tag name to the appropriate Thorm tag function.
 *
 * Uses the Thorm tag functions from vendor/bitforge/thorm/src/php/tags.php.
 * Falls back to div() for unknown tags.
 *
 * @param array $props Thorm tag-function helper form: [['attrs', [...]], ['cls', ...], ['style', [...]], ...]
 */
function createThormTag(string $tag, array $props, array $children): ElNode
{
    $tag = strtolower($tag);

    switch ($tag) {
        case 'a':
            return a($props, $children);
        case 'br':
            return br($props, []);
        case 'blockquote':
            return blockquote($props, $children);
        case 'code':
            return code($props, $children);
        case 'div':
            return div($props, $children);
        case 'h1':
            return h1($props, $children);
        case 'h2':
            return h2($props, $children);
        case 'h3':
            return h3($props, $children);
        case 'h4':
            return h4($props, $children);
        case 'h5':
            return h5($props, $children);
        case 'h6':
            return h6($props, $children);
        case 'hr':
            return hr($props, []);
        case 'img':
            return img($props, []);
        case 'li':
            return li($props, $children);
        case 'ol':
            return ol($props, $children);
        case 'p':
            return p($props, $children);
        case 'pre':
            return pre($props, $children);
        case 'span':
            return span($props, $children);
        case 'strong':
            return strong($props, $children);
        case 'table':
            return table($props, $children);
        case 'td':
            return td($props, $children);
        case 'th':
            return th($props, $children);
        case 'tr':
            return tr($props, $children);
        case 'ul':
            return ul($props, $children);
        default:
            return div($props, $children);
    }
}