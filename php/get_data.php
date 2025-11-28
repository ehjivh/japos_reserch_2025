<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// エラーハンドリング
error_reporting(E_ALL);
ini_set('display_errors', 0);

try {
	$type = isset($_GET['type']) ? $_GET['type'] : '';

	if (empty($type)) {
		throw new Exception('Type parameter is required');
	}

	switch ($type) {
		case 'questions':
			// 設問データの取得
			$questionsFile = __DIR__ . '/../data/questions.json';
			if (!file_exists($questionsFile)) {
				throw new Exception('Questions data not found');
			}

			$questionsJson = file_get_contents($questionsFile);
			$questionsData = json_decode($questionsJson, true);

			echo json_encode([
				'success' => true,
				'data' => $questionsData
			], JSON_UNESCAPED_UNICODE);
			break;

		case 'previous':
			// 前回回答データの取得
			$facilityId = isset($_GET['facility_id']) ? $_GET['facility_id'] : '';

			if (empty($facilityId)) {
				throw new Exception('Facility ID is required');
			}

			$previousFile = __DIR__ . '/../data/previous_answers.json';
			if (!file_exists($previousFile)) {
				echo json_encode([
					'success' => true,
					'data' => null
				], JSON_UNESCAPED_UNICODE);
				break;
			}

			$previousJson = file_get_contents($previousFile);
			$previousData = json_decode($previousJson, true);

			$facilityData = isset($previousData[$facilityId]) ? $previousData[$facilityId] : null;

			echo json_encode([
				'success' => true,
				'data' => $facilityData
			], JSON_UNESCAPED_UNICODE);
			break;

		case 'members':
			// 施設データの取得（管理者用）
			$membersFile = __DIR__ . '/../data/members.json';
			if (!file_exists($membersFile)) {
				throw new Exception('Members data not found');
			}

			$membersJson = file_get_contents($membersFile);
			$membersData = json_decode($membersJson, true);

			echo json_encode([
				'success' => true,
				'data' => $membersData
			], JSON_UNESCAPED_UNICODE);
			break;

		default:
			throw new Exception('Invalid type parameter');
	}
} catch (Exception $e) {
	echo json_encode([
		'success' => false,
		'message' => 'データの取得に失敗しました。'
	], JSON_UNESCAPED_UNICODE);

	error_log('Get data error: ' . $e->getMessage());
}
