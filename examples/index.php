<?php
    declare(strict_types=1);
    require __DIR__ . '/../vendor/autoload.php';
    
    use function Thorm\{button, text, concat, fragment, h1, on, read, state, inc, p};
    use Thorm\Render;
    use Thorm\BuildExample;

    function green($s){ return "\033[32m{$s}\033[0m"; }
    function red($s){ return "\033[31m{$s}\033[0m"; }

    $count = state(0);

    $app = fragment([
        h1([], [ text('Hello Thorm') ]),
        p([], [text('Modern UI, backend workflow.')]),
        p([], [text(concat('Count: ', read($count)))]),  
        button([    
            on('click', inc($count, 1)),  ], [text('Increment')]
        ),
    ]);

    $renderer = new Render();
    $res = $renderer->render($app);
    $build = BuildExample::build([
	'name'          => strtolower(pathinfo(__FILE__, PATHINFO_FILENAME)),
	'path'          => __DIR__.'/../public/',
	'renderer'      => $res,
	'template'      => __DIR__.'/assets/index.tpl.html',
	'opts'          => [
	    'title'         => 'Hello Thorm',
	    'containerId'   => 'app',    ],]
    );
    
    if($build !== false ) {
	echo green("File wrote to disk.\n"); 
    } else {
	echo red("Could not write files to disk.\n");}
    echo "\n";
