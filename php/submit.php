<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// エラーハンドリング
error_reporting(E_ALL);
ini_set('display_errors', 0);

try {
	// POSTデータの取得
	$json = file_get_contents('php://input');
	$data = json_decode($json, true);

	if (!$data) {
		throw new Exception('Invalid JSON data');
	}

	$facilityId = isset($data['facility_id']) ? trim($data['facility_id']) : '';
	$answers = isset($data['answers']) ? $data['answers'] : [];

	if (empty($facilityId)) {
		throw new Exception('Facility ID is required');
	}

	// 現在日時
	$submitDatetime = date('Y-m-d\TH:i:sP');

	// 保存データの作成
	$saveData = [
		'facility_id' => $facilityId,
		'submit_datetime' => $submitDatetime,
		'last_update' => $submitDatetime,
		'status' => 'submitted',
		'answers' => $answers
	];

	// 保存ディレクトリの確認
	$responseDir = __DIR__ . '/../data/responses';
	if (!is_dir($responseDir)) {
		mkdir($responseDir, 0755, true);
	}

	// ファイル名の生成
	$filename = $responseDir . '/' . $facilityId . '_response.json';

	// バックアップの作成（既存ファイルがある場合）
	if (file_exists($filename)) {
		$backupDir = __DIR__ . '/../data/backups/' . date('Ymd');
		if (!is_dir($backupDir)) {
			mkdir($backupDir, 0755, true);
		}

		$backupFilename = $backupDir . '/' . $facilityId . '_response_' . date('His') . '.json';
		copy($filename, $backupFilename);
	}

	// ファイルへの保存
	$result = file_put_contents($filename, json_encode($saveData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

	if ($result === false) {
		throw new Exception('Failed to save response');
	}

	// 一時保存ファイルの削除
	$draftFilename = $responseDir . '/' . $facilityId . '_draft.json';
	if (file_exists($draftFilename)) {
		unlink($draftFilename);
	}

	// members.jsonの最終送信日時を更新
	$membersFile = __DIR__ . '/../data/members.json';
	if (file_exists($membersFile)) {
		$membersJson = file_get_contents($membersFile);
		$membersData = json_decode($membersJson, true);

		if ($membersData && isset($membersData['members'])) {
			foreach ($membersData['members'] as &$member) {
				if ($member['facility_id'] === $facilityId) {
					$member['last_submit'] = date('Y/m/d H:i:s');
					break;
				}
			}

			file_put_contents($membersFile, json_encode($membersData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
		}
	}

	echo json_encode([
		'success' => true,
		'message' => '送信が完了しました',
		'submit_datetime' => $submitDatetime
	], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
	echo json_encode([
		'success' => false,
		'message' => '送信に失敗しました。'
	], JSON_UNESCAPED_UNICODE);

	error_log('Submit error: ' . $e->getMessage());
}
