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
	$password = isset($data['password']) ? $data['password'] : '';

	if (empty($facilityId) || empty($password)) {
		echo json_encode([
			'success' => false,
			'message' => '施設IDとパスワードを入力してください。'
		], JSON_UNESCAPED_UNICODE);
		exit;
	}

	// 施設データの読み込み
	$membersFile = __DIR__ . '/../data/members.json';
	if (!file_exists($membersFile)) {
		throw new Exception('Members data not found');
	}

	$membersJson = file_get_contents($membersFile);
	$membersData = json_decode($membersJson, true);

	if (!$membersData || !isset($membersData['members'])) {
		throw new Exception('Invalid members data');
	}

	// 施設の検索
	$facility = null;
	foreach ($membersData['members'] as $member) {
		if ($member['facility_id'] === $facilityId) {
			$facility = $member;
			break;
		}
	}

	if (!$facility) {
		echo json_encode([
			'success' => false,
			'message' => '施設IDが見つかりません。'
		], JSON_UNESCAPED_UNICODE);
		exit;
	}

	// パスワード確認
	// 本番環境ではpassword_verify()を使用することを推奨
	if ($password !== $facility['password']) {
		echo json_encode([
			'success' => false,
			'message' => 'パスワードが正しくありません。'
		], JSON_UNESCAPED_UNICODE);
		exit;
	}

	// 前回回答データの確認
	$previousFile = __DIR__ . '/../data/previous_answers.json';
	$hasPreviousAnswer = false;

	if (file_exists($previousFile)) {
		$previousJson = file_get_contents($previousFile);
		$previousData = json_decode($previousJson, true);
		$hasPreviousAnswer = isset($previousData[$facilityId]);
	}

	// セッショントークンの生成
	$sessionToken = bin2hex(random_bytes(32));

	// 成功レスポンス
	echo json_encode([
		'success' => true,
		'session_token' => $sessionToken,
		'facility_name' => $facility['facility_name'],
		'has_previous_answer' => $hasPreviousAnswer
	], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
	echo json_encode([
		'success' => false,
		'message' => 'システムエラーが発生しました。'
	], JSON_UNESCAPED_UNICODE);

	error_log('Auth error: ' . $e->getMessage());
}
