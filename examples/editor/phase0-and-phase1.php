<?php
declare(strict_types=1);
require __DIR__ . '/../../vendor/autoload.php';

use function Thorm\{fragment, h1, h2, p, div, text, script};
use Thorm\Render;
use Thorm\BuildExample;
use Thorm\Components\Editor\{Block, DocumentStructure};
use function Thorm\Components\Editor\irToThormNodes;

// Load sample document
$samplePath = __DIR__ . '/sample.json';
$sample = json_decode(file_get_contents($samplePath), true);
$document = DocumentStructure::fromJson($sample);

// Build the page IR tree and collect block states for the JS editor
$blocks = [];
$blockStates = [];

foreach ($document->blocks as $block) {
    $thormNodes = irToThormNodes($block->content);
    $blocks[] = fragment([
        h2([], [text($block->title)]),
        div(
            [['attrs', ['contenteditable' => 'true', 'data-block-id' => $block->id]]],
            $thormNodes
        ),
    ]);
    $blockStates[$block->id] = $block->content;
}

// Embed editor state as a script tag in the IR
$editorScript = script([], [
    text('window.editorState = ' . json_encode($blockStates, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . ';'),
]);

$app = fragment([
    h1([], [text('Editable Document')]),
    p([], [text('Click on a block to edit it. Changes are saved every 60 seconds.')]),
    ...$blocks,
    $editorScript,
]);

$renderer = new Render();
$res = $renderer->render($app);

$build = BuildExample::build([
    'name'       => 'phase0-and-phase1',
    'path'       => realpath(__DIR__ . '/../../public/') . '/',
    'renderer'   => $res,
    'template'   => __DIR__ . '/templates/phase0-and-phase1.tpl.html',
    'opts'       => [
        'title'       => 'Editable Document',
        'containerId' => 'app',
    ],
]);

if ($build !== false) {
    echo "File wrote to disk.\n";
} else {
    echo "Could not write files to disk.\n";
}
echo "\n";