// 認証処理
(function () {
	const loginForm = document.getElementById('loginForm');
	const errorMessage = document.getElementById('errorMessage');

	loginForm.addEventListener('submit', async (e) => {
		e.preventDefault();

		const facilityId = document.getElementById('facilityId').value.trim();
		const password = document.getElementById('password').value;

		// エラーメッセージをクリア
		errorMessage.style.display = 'none';

		// ボタンを無効化
		const submitBtn = loginForm.querySelector('button[type="submit"]');
		submitBtn.disabled = true;
		submitBtn.textContent = 'ログイン中...';

		try {
			const response = await fetch('php/auth.php', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					facility_id: facilityId,
					password: password
				})
			});

			const result = await response.json();

			if (result.success) {
				// セッション情報をLocalStorageに保存
				localStorage.setItem('session', JSON.stringify({
					facility_id: facilityId,
					facility_name: result.facility_name,
					session_token: result.session_token,
					has_previous_answer: result.has_previous_answer,
					login_time: new Date().toISOString()
				}));

				// 回答画面へ遷移
				window.location.href = 'survey.html';
			} else {
				// エラーメッセージを表示
				errorMessage.textContent = result.message || 'ログインに失敗しました。施設IDとパスワードを確認してください。';
				errorMessage.style.display = 'block';

				// ボタンを再度有効化
				submitBtn.disabled = false;
				submitBtn.textContent = 'ログイン';
			}
		} catch (error) {
			errorMessage.textContent = 'エラーが発生しました。もう一度お試しください。';
			errorMessage.style.display = 'block';

			submitBtn.disabled = false;
			submitBtn.textContent = 'ログイン';

			console.error('Login error:', error);
		}
	});
})();