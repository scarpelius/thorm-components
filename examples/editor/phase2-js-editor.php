<?php
declare(strict_types=1);
require __DIR__ . '/../../vendor/autoload.php';

use function Thorm\{fragment, h1, h2, p, div, text, script, html};
use Thorm\Render;
use Thorm\BuildExample;
use Thorm\Components\Editor\{Block, DocumentStructure, EditorNode, EditorToolbar, EditorWidget};
use Thorm\Components\Editor\Widgets\{BlockHeaderWidget, DragHandleWidget};

// Load the sample document (a Thorm IR document). The block content is stored
// as a subtree of the Thorm IR — the same representation the page renders from.
$samplePath = __DIR__ . '/sample.json';
$sample = json_decode(file_get_contents($samplePath), true);
$document = DocumentStructure::fromThormIR($sample);

// Build the page IR tree and collect the editor state (per-block Thorm IR
// subtrees) for the JS editor.
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
    // The editor state holds each block's content as its Thorm IR subtree, so
    // the editor saves and restores from the identical IR.
    $blockStates[$block->id] = $block->content;
}

$publicDir = realpath(__DIR__ . '/../../public/') . '/';

$renderer = new Render();

// Build the page IR tree (no embedded script needed; the editor state is
// written to a separate JSON file that the JS editor fetches).
$app = fragment([
    h1([], [text('Editable Document (Phase 2 JS Editor)')]),
    p([], [text('Click on a block to edit it. Changes are saved every 60 seconds.')]),
    ...$blocks,
]);

$res = $renderer->render($app);

// Write the editor state (per-block Thorm IR subtrees) to disk. The JS editor
// fetches this file and uses it as the in-memory IR for each block.
$statePath = $publicDir . 'phase2-js-editor/editor-state.json';
file_put_contents(
    $statePath,
    json_encode(['blocks' => $blockStates], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
);

$build = BuildExample::build([
    'name'       => 'phase2-js-editor',
    'path'       => $publicDir,
    'renderer'   => $res,
    'template'   => __DIR__ . '/templates/phase2.tpl.html',
    'opts'       => [
        'title'       => 'Phase 2 JS Editor',
        'containerId' => 'app',
    ],
]);

if ($build !== false) {
    echo "File wrote to disk.\n";
} else {
    echo "Could not write files to disk.\n";
}
echo "\n";