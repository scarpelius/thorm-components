<?php
declare(strict_types=1);
require __DIR__ . '/../../vendor/autoload.php';

use function Thorm\{fragment, h1, h2, p, div, text, script};
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

// Embed editor state as a script tag in the IR
$editorScript = script([], [
    text('window.editorState = ' . json_encode($blockStates, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . ';'),
]);

$app = fragment([
    h1([], [text('Editable Document (Phase 1.1)')]),
    p([], [text('Click on a block to edit it. Changes are saved every 60 seconds.')]),
    ...$blocks,
    $editorScript,
]);

$renderer = new Render();
$res = $renderer->render($app);

$build = BuildExample::build([
    'name'       => 'phase1.1-editor-node-helper',
    'path'       => realpath(__DIR__ . '/../../public/') . '/',
    'renderer'   => $res,
    'template'   => __DIR__ . '/templates/phase0-and-phase1.tpl.html',
    'opts'       => [
        'title'       => 'EditorNode Helper (Phase 1.1)',
        'containerId' => 'app',
    ],
]);

if ($build !== false) {
    echo "File wrote to disk.\n";
} else {
    echo "Could not write files to disk.\n";
}
echo "\n";