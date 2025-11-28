// 管理画面処理
(function () {
	let aggregateData = null;
	let allResponses = [];
	let statusChart = null;

	// 初期化
	async function init() {
		try {
			const response = await fetch('php/aggregate.php');
			const result = await response.json();

			if (result.success) {
				aggregateData = result.data;
				allResponses = result.data.responses;
				displayStats();
				displayChart();
				displayFacilities();
				displayQuestionsStats();
			}
		} catch (error) {
			console.error('Initialization error:', error);
			alert('データの読み込みに失敗しました。');
		}
	}

	// 統計情報の表示
	function displayStats() {
		document.getElementById('totalFacilities').textContent = aggregateData.total_facilities;
		document.getElementById('submitted').textContent = aggregateData.submitted;
		document.getElementById('draft').textContent = aggregateData.draft;
		document.getElementById('notStarted').textContent = aggregateData.not_started;
	}

	// グラフの表示
	function displayChart() {
		const ctx = document.getElementById('statusChart').getContext('2d');

		if (statusChart) {
			statusChart.destroy();
		}

		statusChart = new Chart(ctx, {
			type: 'pie',
			data: {
				labels: ['送信済み', '一時保存', '未着手'],
				datasets: [{
					data: [
						aggregateData.submitted,
						aggregateData.draft,
						aggregateData.not_started
					],
					backgroundColor: [
						'#2ecc71',
						'#f39c12',
						'#95a5a6'
					]
				}]
			},
			options: {
				responsive: true,
				plugins: {
					legend: {
						position: 'bottom'
					},
					title: {
						display: true,
						text: '回答状況'
					}
				}
			}
		});
	}

	// 施設一覧の表示
	function displayFacilities(filter = 'all') {
		const tbody = document.getElementById('facilitiesTableBody');
		tbody.innerHTML = '';

		const filteredResponses = filter === 'all' ?
			allResponses :
			allResponses.filter(r => r.status === filter);

		if (filteredResponses.length === 0) {
			tbody.innerHTML = '<tr><td colspan="4">該当するデータがありません。</td></tr>';
			return;
		}

		filteredResponses.forEach(response => {
			const tr = document.createElement('tr');

			// 施設ID
			const tdId = document.createElement('td');
			tdId.textContent = response.facility_id;
			tr.appendChild(tdId);

			// 施設名
			const tdName = document.createElement('td');
			tdName.textContent = response.facility_name;
			tr.appendChild(tdName);

			// 状態
			const tdStatus = document.createElement('td');
			let statusText = '';
			let statusColor = '';

			switch (response.status) {
				case 'submitted':
					statusText = '送信済み';
					statusColor = '#2ecc71';
					break;
				case 'draft':
					statusText = '一時保存';
					statusColor = '#f39c12';
					break;
				case 'not_started':
					statusText = '未着手';
					statusColor = '#95a5a6';
					break;
			}

			tdStatus.textContent = statusText;
			tdStatus.style.color = statusColor;
			tdStatus.style.fontWeight = 'bold';
			tr.appendChild(tdStatus);

			// 日時
			const tdDatetime = document.createElement('td');
			if (response.submit_datetime) {
				const date = new Date(response.submit_datetime);
				tdDatetime.textContent = date.toLocaleString('ja-JP');
			} else if (response.last_update) {
				const date = new Date(response.last_update);
				tdDatetime.textContent = date.toLocaleString('ja-JP');
			} else {
				tdDatetime.textContent = '-';
			}
			tr.appendChild(tdDatetime);

			tbody.appendChild(tr);
		});
	}

	// 設問別集計の表示
	function displayQuestionsStats() {
		const container = document.getElementById('questionsStats');
		container.innerHTML = '';

		if (!aggregateData.questions_stats || Object.keys(aggregateData.questions_stats).length === 0) {
			container.innerHTML = '<p>集計データがありません。</p>';
			return;
		}

		// 設問IDでソート
		const sortedQuestions = Object.keys(aggregateData.questions_stats).sort();

		sortedQuestions.forEach(questionId => {
			const stats = aggregateData.questions_stats[questionId];

			const questionDiv = document.createElement('div');
			questionDiv.style.marginBottom = '30px';
			questionDiv.style.padding = '20px';
			questionDiv.style.backgroundColor = '#f8f9fa';
			questionDiv.style.borderRadius = '4px';

			const title = document.createElement('h3');
			title.textContent = questionId;
			title.style.marginBottom = '15px';
			questionDiv.appendChild(title);

			// テキスト回答の場合は上位5件のみ表示
			const entries = Object.entries(stats);
			const isTextQuestion = entries.length > 20;

			if (isTextQuestion) {
				const p = document.createElement('p');
				p.textContent = `回答数: ${entries.length}件（テキスト入力項目）`;
				questionDiv.appendChild(p);
			} else {
				// 選択肢回答の場合はグラフ表示
				const table = document.createElement('table');
				table.style.width = '100%';

				const thead = document.createElement('thead');
				thead.innerHTML = '<tr><th>選択肢</th><th>回答数</th><th>割合</th></tr>';
				table.appendChild(thead);

				const tbody = document.createElement('tbody');

				// 回答数でソート
				const sortedEntries = entries.sort((a, b) => b[1] - a[1]);
				const total = aggregateData.submitted;

				sortedEntries.forEach(([answer, count]) => {
					const tr = document.createElement('tr');

					const tdAnswer = document.createElement('td');
					tdAnswer.textContent = answer;
					tr.appendChild(tdAnswer);

					const tdCount = document.createElement('td');
					tdCount.textContent = count;
					tr.appendChild(tdCount);

					const tdRate = document.createElement('td');
					const rate = ((count / total) * 100).toFixed(1);
					tdRate.textContent = rate + '%';
					tr.appendChild(tdRate);

					tbody.appendChild(tr);
				});

				table.appendChild(tbody);
				questionDiv.appendChild(table);
			}

			container.appendChild(questionDiv);
		});
	}

	// フィルター関数をグローバルに公開
	window.filterStatus = function (status) {
		displayFacilities(status);
	};

	// 初期化実行
	init();
})();