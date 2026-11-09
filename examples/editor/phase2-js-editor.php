<?php
declare(strict_types=1);
require __DIR__ . '/../../vendor/autoload.php';

use function Thorm\{fragment, h1, h2, p, div, text, script, html};
use Thorm\Render;
use Thorm\BuildExample;
use Thorm\Components\Editor\{Block, DocumentStructure, EditorNode, EditorToolbar, EditorWidget};
use Thorm\Components\Editor\Widgets\{BlockHeaderWidget, DragHandleWidget};

// Load sample document
$samplePath = __DIR__ . '/sample.json';
$sample = json_decode(file_get_contents($samplePath), true);
$document = DocumentStructure::fromJson($sample);

// Build the page IR tree and collect block states for the JS editor
$blocks = [];
$blockStates = [];

foreach ($document->blocks as $block) {
    $node = new EditorNode($block);

    // Attach the default toolbar (command registry, serialized to the browser in Phase 2)
    $toolbar = new EditorToolbar();
    $toolbar->addCommand('bold', 'Bold', 'icon-bold', fn (array $context) => ['action' => 'bold', 'blockId' => $context['blockId'] ?? null]);
    $toolbar->addCommand('italic', 'Italic', 'icon-italic', fn (array $context) => ['action' => 'italic', 'blockId' => $context['blockId'] ?? null]);
    $node->setToolbar($toolbar);

    // Attach display widgets
    $node->addWidget(new BlockHeaderWidget());
    $node->addWidget(new DragHandleWidget());

    $blocks[] = $node->render();
    $blockStates = array_merge($blockStates, $node->getState());
}

// Write editor state to a JSON file for the client to fetch.
// The ThormJS runtime does not have a "script" primitive, so embedding
// a <script> tag in the IR via html() does not execute it. Instead we
// write a static JSON file that the template's module script fetches
// and assigns to window.editorState before mounting the editor.
$publicDir = realpath(__DIR__ . '/../../public/') . '/';
$statePath = $publicDir . 'phase2-js-editor/editor-state.json';
file_put_contents($statePath, json_encode(['blocks' => $blockStates], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

// Build the page IR tree (no embedded script needed)
$app = fragment([
    h1([], [text('Editable Document (Phase 2 JS Editor)')]),
    p([], [text('Click on a block to edit it. Changes are saved every 60 seconds.')]),
    ...$blocks,
]);

$renderer = new Render();
$res = $renderer->render($app);

$build = BuildExample::build([
    'name'       => 'phase2-js-editor',
    'path'       => $publicDir,
    'renderer'   => $res,
    'template'   => __DIR__ . '/templates/phase2.tpl.html',
    'opts'       => [
        'title'       => 'Phase 2 JS Editor',
        'containerId' => 'app',
        'statePath'   => 'editor-state.json',
    ],
]);

if ($build !== false) {
    echo "File wrote to disk.\n";
} else {
    echo "Could not write files to disk.\n";
}
echo "\n";