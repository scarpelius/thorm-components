<?php

declare(strict_types=1);

namespace Thorm\Components\Editor;

/**
 * Minimal save endpoint handler for Phase 2.
 *
 * POST /api/editor/{docId}
 * Body: { "changes": [ { "blockId": "block-1", "ir": [...], "type": "text-edit" }, ... ] }
 *
 * Writes each block's IR to editor/storage/documents/{docId}/blocks/{blockId}.json.
 * No validation, no sanitization, no rate limiting (Phase 3).
 */
final class SaveHandler
{
    /**
     * @param string $docId
     * @param array $body
     * @return array
     */
    public function handle(string $docId, array $body): array
    {
        $changes = $body['changes'] ?? [];
        if (!is_array($changes)) {
            return ['ok' => false, 'error' => 'invalid body'];
        }

        $saved = 0;
        foreach ($changes as $change) {
            $blockId = $change['blockId'] ?? null;
            $ir = $change['ir'] ?? null;
            if ($blockId === null || !is_array($ir)) {
                continue;
            }

            $dir = __DIR__ . '/../../storage/documents/' . $docId . '/blocks';
            $file = $dir . '/' . $blockId . '.json';

            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            file_put_contents(
                $file,
                json_encode($ir, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
            );
            $saved++;
        }

        return ['ok' => true, 'saved' => $saved];
    }
}
