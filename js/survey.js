// 回答フォーム制御
(function () {
	// セッション確認
	const session = Storage.getSession();
	if (!session) {
		window.location.href = 'index.html';
		return;
	}

	// 施設名を表示
	document.getElementById('facilityName').textContent = session.facility_name;

	let questions = [];
	let answers = {};

	// 初期化
	async function init() {
		try {
			// 設問データの取得
			const questionsResponse = await fetch('php/get_data.php?type=questions');
			const questionsData = await questionsResponse.json();

			if (questionsData.success) {
				questions = questionsData.data.questions;

				// 一時保存データがあれば読み込む
				const draftData = Storage.getDraft(session.facility_id);
				if (draftData.answers) {
					answers = draftData.answers;
				} else {
					// 前回回答データの取得
					if (session.has_previous_answer) {
						const previousResponse = await fetch(`php/get_data.php?type=previous&facility_id=${session.facility_id}`);
						const previousData = await previousResponse.json();

						if (previousData.success && previousData.data) {
							answers = previousData.data;
						}
					}
				}

				// フォームを生成
				renderForm();
				updateProgress();
			}
		} catch (error) {
			console.error('Initialization error:', error);
			alert('データの読み込みに失敗しました。');
		}
	}

	// フォームの生成
	function renderForm() {
		const container = document.getElementById('questionsContainer');
		container.innerHTML = '';

		questions.filter(q => q.visible).forEach(question => {
			const questionDiv = document.createElement('div');
			questionDiv.className = 'question-item';
			questionDiv.dataset.questionId = question.id;

			// タイトル
			const title = document.createElement('div');
			title.className = 'question-title' + (question.required ? ' required' : '');
			title.textContent = question.title;
			questionDiv.appendChild(title);

			// 説明文
			if (question.description) {
				const description = document.createElement('div');
				description.className = 'question-description';
				description.textContent = question.description;
				questionDiv.appendChild(description);
			}

			// 入力要素
			const inputDiv = document.createElement('div');
			inputDiv.className = 'question-input';

			switch (question.type) {
				case 'text':
					const input = document.createElement('input');
					input.type = 'text';
					input.id = question.id;
					input.value = answers[question.id] || '';
					input.addEventListener('change', () => handleInputChange(question.id, input.value));
					inputDiv.appendChild(input);
					break;

				case 'radio':
					const radioGroup = document.createElement('div');
					radioGroup.className = 'radio-group';
					question.options.forEach(option => {
						const label = document.createElement('label');
						label.className = 'radio-option';

						const radio = document.createElement('input');
						radio.type = 'radio';
						radio.name = question.id;
						radio.value = option;
						radio.checked = answers[question.id] === option;
						radio.addEventListener('change', () => handleInputChange(question.id, option));

						label.appendChild(radio);
						label.appendChild(document.createTextNode(option));
						radioGroup.appendChild(label);
					});
					inputDiv.appendChild(radioGroup);
					break;

				case 'checkbox':
					const checkboxGroup = document.createElement('div');
					checkboxGroup.className = 'checkbox-group';
					question.options.forEach(option => {
						const label = document.createElement('label');
						label.className = 'checkbox-option';

						const checkbox = document.createElement('input');
						checkbox.type = 'checkbox';
						checkbox.name = question.id;
						checkbox.value = option;
						const currentAnswers = answers[question.id];
						checkbox.checked = Array.isArray(currentAnswers) && currentAnswers.includes(option);
						checkbox.addEventListener('change', () => handleCheckboxChange(question.id));

						label.appendChild(checkbox);
						label.appendChild(document.createTextNode(option));
						checkboxGroup.appendChild(label);
					});
					inputDiv.appendChild(checkboxGroup);
					break;
			}

			questionDiv.appendChild(inputDiv);
			container.appendChild(questionDiv);
		});
	}

	// 入力変更ハンドラ
	function handleInputChange(questionId, value) {
		answers[questionId] = value;
		updateProgress();
	}

	// チェックボックス変更ハンドラ
	function handleCheckboxChange(questionId) {
		const checkboxes = document.querySelectorAll(`input[name="${questionId}"]:checked`);
		const values = Array.from(checkboxes).map(cb => cb.value);
		answers[questionId] = values;
		updateProgress();
	}

	// 進捗状況の更新
	function updateProgress() {
		const totalQuestions = questions.filter(q => q.visible).length;
		const answeredQuestions = Object.keys(answers).filter(key => {
			const value = answers[key];
			return value && (Array.isArray(value) ? value.length > 0 : value.trim() !== '');
		}).length;

		const progress = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

		document.getElementById('progressFill').style.width = progress + '%';
		document.getElementById('progressText').textContent = progress + '%';
	}

	// 一時保存ボタン
	document.getElementById('saveDraftBtn').addEventListener('click', async () => {
		const savedAt = Storage.saveDraft(session.facility_id, answers);

		const saveMessage = document.getElementById('saveMessage');
		const date = new Date(savedAt);
		saveMessage.textContent = `保存しました (${date.toLocaleString('ja-JP')})`;
		saveMessage.style.display = 'block';

		setTimeout(() => {
			saveMessage.style.display = 'none';
		}, 3000);
	});

	// PDF出力ボタン
	document.getElementById('exportPdfBtn').addEventListener('click', () => {
		exportToPDF();
	});

	// PDF出力機能
	function exportToPDF() {
		try {
			const {
				jsPDF
			} = window.jspdf;
			const doc = new jsPDF({
				orientation: 'portrait',
				unit: 'mm',
				format: 'a4'
			});

			// 日本語フォント設定（デフォルトフォントを使用）
			doc.setFont('helvetica');

			let yPos = 20;
			const pageHeight = doc.internal.pageSize.height;
			const margin = 15;
			const lineHeight = 7;

			// タイトル
			doc.setFontSize(16);
			doc.text('公開天文台白書2025 回答内容', margin, yPos);
			yPos += 10;

			// 施設情報
			doc.setFontSize(12);
			doc.text(`施設名: ${session.facility_name}`, margin, yPos);
			yPos += 8;
			doc.text(`施設ID: ${session.facility_id}`, margin, yPos);
			yPos += 8;
			doc.text(`出力日時: ${new Date().toLocaleString('ja-JP')}`, margin, yPos);
			yPos += 12;

			// 回答内容
			doc.setFontSize(10);
			questions.filter(q => q.visible).forEach(question => {
				// 改ページチェック
				if (yPos > pageHeight - 30) {
					doc.addPage();
					yPos = 20;
				}

				// 設問タイトル
				doc.setFont('helvetica', 'bold');
				const titleLines = doc.splitTextToSize(`Q: ${question.title}`, 180);
				titleLines.forEach(line => {
					if (yPos > pageHeight - 20) {
						doc.addPage();
						yPos = 20;
					}
					doc.text(line, margin, yPos);
					yPos += lineHeight;
				});

				// 回答内容
				doc.setFont('helvetica', 'normal');
				const answer = answers[question.id];
				let answerText = '';

				if (answer) {
					if (Array.isArray(answer)) {
						answerText = answer.join(', ');
					} else {
						answerText = String(answer);
					}
				} else {
					answerText = '(未回答)';
				}

				const answerLines = doc.splitTextToSize(`A: ${answerText}`, 180);
				answerLines.forEach(line => {
					if (yPos > pageHeight - 20) {
						doc.addPage();
						yPos = 20;
					}
					doc.text(line, margin, yPos);
					yPos += lineHeight;
				});

				yPos += 5; // 設問間のスペース
			});

			// PDFを保存
			const fileName = `公開天文台白書2025_${session.facility_id}_${new Date().toISOString().split('T')[0]}.pdf`;
			doc.save(fileName);

			const saveMessage = document.getElementById('saveMessage');
			saveMessage.textContent = 'PDFを出力しました';
			saveMessage.style.display = 'block';
			setTimeout(() => {
				saveMessage.style.display = 'none';
			}, 3000);

		} catch (error) {
			console.error('PDF export error:', error);
			alert('PDF出力に失敗しました。');
		}
	}

	// 確認画面へボタン
	document.getElementById('confirmBtn').addEventListener('click', () => {
		// バリデーション
		const validation = Validation.validateAllRequired(answers, questions);

		if (!validation.isValid) {
			const errorMessages = validation.errors.map(e => `・${e.title}`).join('\n');
			alert('以下の必須項目が入力されていません:\n\n' + errorMessages);
			return;
		}

		// 一時保存
		Storage.saveDraft(session.facility_id, answers);

		// 確認画面へ
		window.location.href = 'confirm.html';
	});

	// ログアウトボタン
	document.getElementById('logoutBtn').addEventListener('click', () => {
		if (confirm('ログアウトしますか？入力内容は一時保存されます。')) {
			Storage.saveDraft(session.facility_id, answers);
			Storage.clearSession();
			window.location.href = 'index.html';
		}
	});

	// 初期化実行
	init();
})();