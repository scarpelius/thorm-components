<?php
declare(strict_types=1);

namespace Thorm\Components\Editor\Examples;

require __DIR__ . '/../../vendor/autoload.php';

use Thorm\Render;
use Thorm\BuildExample;
use Thorm\Components\Editor\Editor;
use function Thorm\{h1, p, text, fragment};
use Thorm\IR\Node\Node;

/**
 * A1 — Visible Host (Inert Editor Area)
 *
 * Renders a recognizable editor host with sample content.
 * The host renders as ordinary HTML and is NOT editable.
 */
function example(): void
{
    $host = Editor::host([
        h1([], [text('Editor Host — Inert Example')]),
        p([], [text('This is an inert editor host. The content is visible but not editable.')]),
        p([], [text('The editor region is marked with the CSS class `thorm-editor-host`.')]),
        Editor::block([
            p([], [text('This block is marked with `thorm-editor-block`.')])
        ])
    ], ['id' => 'editor-host-a1']);

    $renderer = new Render();
    $res = $renderer->render($host);

    $build = BuildExample::build([
        'name'          => 'editor-inert-host',
        'path'          => __DIR__ . '/../../public/',
        'renderer'      => $res,
        'template'      => __DIR__ . '/templates/index.tpl.html',
        'opts'          => [
            'title'         => 'Thorm Editor — A1 Inert Host',
            'containerId'   => 'app',
        ],
    ]);

    if ($build !== false) {
        echo "\033[32mFile wrote to disk.\033[0m\n";
    } else {
        echo "\033[31mCould not write files to disk.\033[0m\n";
    }
}

example();