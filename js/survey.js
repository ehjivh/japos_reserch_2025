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
			// 回答済み状態のチェック
			const submissionStatusResponse = await fetch(`php/get_data.php?type=submission_status&facility_id=${session.facility_id}`);
			const submissionStatusData = await submissionStatusResponse.json();

			if (submissionStatusData.success && submissionStatusData.data.is_submitted) {
				// 回答済みバナーを表示
				document.getElementById('submittedBanner').style.display = 'block';
			}

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

					const hasOtherOption = question.options.some(opt => opt === 'その他');

					question.options.forEach(option => {
						const label = document.createElement('label');
						label.className = 'radio-option';

						const radio = document.createElement('input');
						radio.type = 'radio';
						radio.name = question.id;
						radio.value = option;
						radio.checked = answers[question.id] === option ||
							(option === 'その他' && answers[question.id] && !question.options.includes(answers[question.id]));

						if (option === 'その他' && hasOtherOption) {
							radio.addEventListener('change', () => {
								handleRadioWithOtherChange(question.id, option, radioGroup);
							});
						} else {
							radio.addEventListener('change', () => {
								handleInputChange(question.id, option);
								// 「その他」以外を選択したら、その他の入力欄を削除
								const otherInput = radioGroup.querySelector('.other-input');
								if (otherInput) {
									otherInput.remove();
								}
							});
						}

						label.appendChild(radio);
						label.appendChild(document.createTextNode(option));
						radioGroup.appendChild(label);
					});

					// 既存の「その他」の回答があれば表示
					if (hasOtherOption && answers[question.id] && !question.options.includes(answers[question.id])) {
						createOtherInput(radioGroup, question.id, answers[question.id]);
					}

					inputDiv.appendChild(radioGroup);
					break;

				case 'checkbox':
					const checkboxGroup = document.createElement('div');
					checkboxGroup.className = 'checkbox-group';

					const hasCheckboxOther = question.options.some(opt => opt === 'その他');

					question.options.forEach(option => {
						const label = document.createElement('label');
						label.className = 'checkbox-option';

						const checkbox = document.createElement('input');
						checkbox.type = 'checkbox';
						checkbox.name = question.id;
						checkbox.value = option;
						const currentAnswers = answers[question.id];
						checkbox.checked = Array.isArray(currentAnswers) &&
							(currentAnswers.includes(option) ||
								(option === 'その他' && currentAnswers.some(ans => !question.options.includes(ans))));

						if (option === 'その他' && hasCheckboxOther) {
							checkbox.addEventListener('change', () => {
								handleCheckboxWithOtherChange(question.id, checkboxGroup);
							});
						} else {
							checkbox.addEventListener('change', () => handleCheckboxChange(question.id));
						}

						label.appendChild(checkbox);
						label.appendChild(document.createTextNode(option));
						checkboxGroup.appendChild(label);
					});

					// 既存の「その他」の回答があれば表示
					if (hasCheckboxOther && Array.isArray(answers[question.id])) {
						const otherAnswers = answers[question.id].filter(ans => !question.options.includes(ans));
						if (otherAnswers.length > 0) {
							createOtherInput(checkboxGroup, question.id, otherAnswers.join(', '), true);
						}
					}

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

	// 「その他」の入力フィールドを作成
	function createOtherInput(container, questionId, value = '', isCheckbox = false) {
		// 既存の入力欄があれば削除
		const existingInput = container.querySelector('.other-input');
		if (existingInput) {
			existingInput.remove();
		}

		const otherInputDiv = document.createElement('div');
		otherInputDiv.className = 'other-input';
		otherInputDiv.style.marginLeft = '30px';
		otherInputDiv.style.marginTop = '10px';

		const otherInput = document.createElement('input');
		otherInput.type = 'text';
		otherInput.placeholder = '具体的な内容を入力してください';
		otherInput.value = value;
		otherInput.style.width = '100%';
		otherInput.style.padding = '8px';
		otherInput.style.border = '1px solid #ccc';
		otherInput.style.borderRadius = '4px';

		otherInput.addEventListener('input', () => {
			if (isCheckbox) {
				handleCheckboxWithOtherSave(questionId, container, otherInput.value);
			} else {
				handleInputChange(questionId, otherInput.value);
			}
		});

		otherInputDiv.appendChild(otherInput);
		container.appendChild(otherInputDiv);

		// フォーカスを当てる
		setTimeout(() => otherInput.focus(), 100);
	}

	// ラジオボタンの「その他」変更ハンドラ
	function handleRadioWithOtherChange(questionId, option, radioGroup) {
		createOtherInput(radioGroup, questionId, '', false);
	}

	// チェックボックスの「その他」変更ハンドラ
	function handleCheckboxWithOtherChange(questionId, checkboxGroup) {
		const otherCheckbox = checkboxGroup.querySelector('input[value="その他"]');

		if (otherCheckbox.checked) {
			// 「その他」がチェックされた場合、入力欄を表示
			const existingInput = checkboxGroup.querySelector('.other-input input');
			const currentValue = existingInput ? existingInput.value : '';
			createOtherInput(checkboxGroup, questionId, currentValue, true);
		} else {
			// 「その他」のチェックが外れた場合、入力欄を削除
			const otherInput = checkboxGroup.querySelector('.other-input');
			if (otherInput) {
				otherInput.remove();
			}
		}

		// チェックボックスの値を保存
		handleCheckboxWithOtherSave(questionId, checkboxGroup, '');
	}

	// チェックボックスの「その他」を含む値を保存
	function handleCheckboxWithOtherSave(questionId, checkboxGroup, otherText) {
		const checkboxes = checkboxGroup.querySelectorAll('input[type="checkbox"]:checked');
		const values = [];

		checkboxes.forEach(cb => {
			if (cb.value === 'その他') {
				// 「その他」の場合は入力されたテキストを保存
				if (otherText && otherText.trim() !== '') {
					values.push(otherText.trim());
				} else {
					// 入力欄から直接取得
					const otherInput = checkboxGroup.querySelector('.other-input input');
					if (otherInput && otherInput.value.trim() !== '') {
						values.push(otherInput.value.trim());
					}
				}
			} else {
				values.push(cb.value);
			}
		});

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
		saveMessage.textContent = `一時保存が完了しました。 (${date.toLocaleString('ja-JP')})`;
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
	async function exportToPDF() {
		try {
			const saveMessage = document.getElementById('saveMessage');
			saveMessage.textContent = 'PDF出力中...';
			saveMessage.style.display = 'block';

			// PDFに含めるコンテンツを作成
			const printContainer = document.createElement('div');
			printContainer.style.cssText = `
				position: absolute;
				left: -9999px;
				top: 0;
				width: 210mm;
				background: white;
				padding: 20px;
				font-family: 'MS Gothic', 'Yu Gothic', sans-serif;
			`;

			// ヘッダー情報
			const header = document.createElement('div');
			header.innerHTML = `
				<h1 style="font-size: 20px; margin-bottom: 20px;">公開天文台白書2025 回答内容</h1>
				<div style="margin-bottom: 10px;"><strong>施設名:</strong> ${session.facility_name}</div>
				<div style="margin-bottom: 10px;"><strong>施設ID:</strong> ${session.facility_id}</div>
				<div style="margin-bottom: 20px;"><strong>出力日時:</strong> ${new Date().toLocaleString('ja-JP')}</div>
				<hr style="margin-bottom: 20px;">
			`;
			printContainer.appendChild(header);

			// 回答内容
			const questionsContent = document.createElement('div');
			questions.filter(q => q.visible).forEach((question, index) => {
				const questionDiv = document.createElement('div');
				questionDiv.style.cssText = 'margin-bottom: 20px; page-break-inside: avoid;';

				const questionTitle = document.createElement('div');
				questionTitle.style.cssText = 'font-weight: bold; margin-bottom: 5px; color: #333;';
				questionTitle.textContent = `Q${index + 1}: ${question.title}`;
				questionDiv.appendChild(questionTitle);

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

				const answerDiv = document.createElement('div');
				answerDiv.style.cssText = 'margin-left: 20px; color: #555; white-space: pre-wrap;';
				answerDiv.textContent = `A: ${answerText}`;
				questionDiv.appendChild(answerDiv);

				questionsContent.appendChild(questionDiv);
			});
			printContainer.appendChild(questionsContent);

			document.body.appendChild(printContainer);

			// html2canvasでHTMLを画像に変換
			const canvas = await html2canvas(printContainer, {
				scale: 2,
				useCORS: true,
				logging: false,
				backgroundColor: '#ffffff'
			});

			document.body.removeChild(printContainer);

			// jsPDFでPDFを作成
			const {
				jsPDF
			} = window.jspdf;
			const imgWidth = 210; // A4幅（mm）
			const pageHeight = 297; // A4高さ（mm）
			const imgHeight = (canvas.height * imgWidth) / canvas.width;
			let heightLeft = imgHeight;

			const doc = new jsPDF('p', 'mm', 'a4');
			let position = 0;

			const imgData = canvas.toDataURL('image/png');
			doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
			heightLeft -= pageHeight;

			// 複数ページが必要な場合
			while (heightLeft > 0) {
				position = heightLeft - imgHeight;
				doc.addPage();
				doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
				heightLeft -= pageHeight;
			}

			// PDFを保存
			const fileName = `公開天文台白書2025_${session.facility_id}_${new Date().toISOString().split('T')[0]}.pdf`;
			doc.save(fileName);

			saveMessage.textContent = 'PDFを出力しました';
			setTimeout(() => {
				saveMessage.style.display = 'none';
			}, 3000);

		} catch (error) {
			console.error('PDF export error:', error);
			const saveMessage = document.getElementById('saveMessage');
			saveMessage.textContent = 'PDF出力に失敗しました';
			saveMessage.style.display = 'block';
			setTimeout(() => {
				saveMessage.style.display = 'none';
			}, 3000);
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