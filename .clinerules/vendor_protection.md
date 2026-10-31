NEVER manually modify files under vendor/.

Composer-generated autoload files, including:
- vendor/composer/autoload_psr4.php
- vendor/composer/autoload_static.php
- vendor/composer/autoload_classmap.php

must only be changed indirectly through composer.json and
`composer dump-autoload`.
