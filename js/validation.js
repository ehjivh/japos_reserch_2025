// バリデーション処理
const Validation = {
	// 必須チェック
	validateRequired: function (value) {
		if (Array.isArray(value)) {
			return value.length > 0;
		}
		return value !== null && value !== undefined && value.trim() !== '';
	},

	// メールアドレスチェック
	validateEmail: function (email) {
		const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return pattern.test(email);
	},

	// 電話番号チェック（ハイフンなし半角数字）
	validatePhone: function (phone) {
		const pattern = /^[0-9]+$/;
		return pattern.test(phone);
	},

	// 数値チェック
	validateNumber: function (value) {
		return !isNaN(value) && value.trim() !== '';
	},

	// 全ての必須項目がチェックされているか確認
	validateAllRequired: function (answers, questions) {
		const requiredQuestions = questions.filter(q => q.required && q.visible);
		const errors = [];

		requiredQuestions.forEach(question => {
			const answer = answers[question.id];
			if (!this.validateRequired(answer)) {
				errors.push({
					id: question.id,
					title: question.title,
					message: 'この項目は必須です'
				});
			}
		});

		return {
			isValid: errors.length === 0,
			errors: errors
		};
	},

	// 特定の設問のバリデーション
	validateQuestion: function (question, value) {
		// 必須チェック
		if (question.required && !this.validateRequired(value)) {
			return {
				isValid: false,
				message: 'この項目は必須です'
			};
		}

		// 値が空の場合は他のチェックをスキップ
		if (!this.validateRequired(value)) {
			return {
				isValid: true
			};
		}

		// メールアドレスチェック（設問IDがQ002の場合）
		if (question.id === 'Q002' && !this.validateEmail(value)) {
			return {
				isValid: false,
				message: '正しいメールアドレスを入力してください'
			};
		}

		// 電話番号チェック（設問IDがQ004の場合）
		if (question.id === 'Q004' && !this.validatePhone(value)) {
			return {
				isValid: false,
				message: 'ハイフンなしの半角数字で入力してください'
			};
		}

		return {
			isValid: true
		};
	}
};

// グローバルに公開
window.Validation = Validation;