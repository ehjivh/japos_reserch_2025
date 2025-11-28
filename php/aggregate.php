<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// エラーハンドリング
error_reporting(E_ALL);
ini_set('display_errors', 0);

try {
	// 施設データの読み込み
	$membersFile = __DIR__ . '/../data/members.json';
	if (!file_exists($membersFile)) {
		throw new Exception('Members data not found');
	}

	$membersJson = file_get_contents($membersFile);
	$membersData = json_decode($membersJson, true);
	$totalFacilities = count($membersData['members']);

	// 回答データの集計
	$responseDir = __DIR__ . '/../data/responses';
	$submitted = 0;
	$draft = 0;
	$notStarted = 0;
	$responses = [];

	if (is_dir($responseDir)) {
		foreach ($membersData['members'] as $member) {
			$facilityId = $member['facility_id'];
			$responseFile = $responseDir . '/' . $facilityId . '_response.json';
			$draftFile = $responseDir . '/' . $facilityId . '_draft.json';

			if (file_exists($responseFile)) {
				$submitted++;
				$responseJson = file_get_contents($responseFile);
				$responseData = json_decode($responseJson, true);
				$responses[] = [
					'facility_id' => $facilityId,
					'facility_name' => $member['facility_name'],
					'status' => 'submitted',
					'submit_datetime' => $responseData['submit_datetime']
				];
			} elseif (file_exists($draftFile)) {
				$draft++;
				$draftJson = file_get_contents($draftFile);
				$draftData = json_decode($draftJson, true);
				$responses[] = [
					'facility_id' => $facilityId,
					'facility_name' => $member['facility_name'],
					'status' => 'draft',
					'last_update' => $draftData['last_update']
				];
			} else {
				$notStarted++;
				$responses[] = [
					'facility_id' => $facilityId,
					'facility_name' => $member['facility_name'],
					'status' => 'not_started'
				];
			}
		}
	} else {
		$notStarted = $totalFacilities;
	}

	// 設問別集計（submitted のみ）
	$questionsStats = [];

	if (is_dir($responseDir)) {
		$files = glob($responseDir . '/*_response.json');

		foreach ($files as $file) {
			$json = file_get_contents($file);
			$data = json_decode($json, true);

			if (isset($data['answers'])) {
				foreach ($data['answers'] as $questionId => $answer) {
					if (!isset($questionsStats[$questionId])) {
						$questionsStats[$questionId] = [];
					}

					// 配列の場合（チェックボックス）
					if (is_array($answer)) {
						foreach ($answer as $value) {
							if (!isset($questionsStats[$questionId][$value])) {
								$questionsStats[$questionId][$value] = 0;
							}
							$questionsStats[$questionId][$value]++;
						}
					} else {
						// 文字列の場合
						if (!isset($questionsStats[$questionId][$answer])) {
							$questionsStats[$questionId][$answer] = 0;
						}
						$questionsStats[$questionId][$answer]++;
					}
				}
			}
		}
	}

	// 結果の出力
	echo json_encode([
		'success' => true,
		'data' => [
			'total_facilities' => $totalFacilities,
			'submitted' => $submitted,
			'draft' => $draft,
			'not_started' => $notStarted,
			'responses' => $responses,
			'questions_stats' => $questionsStats
		]
	], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (Exception $e) {
	echo json_encode([
		'success' => false,
		'message' => '集計に失敗しました。'
	], JSON_UNESCAPED_UNICODE);

	error_log('Aggregate error: ' . $e->getMessage());
}
