// LocalStorage管理
const Storage = {
	// セッション情報の取得
	getSession: function () {
		const session = localStorage.getItem('session');
		return session ? JSON.parse(session) : null;
	},

	// セッション情報のクリア
	clearSession: function () {
		localStorage.removeItem('session');
	},

	// 一時保存データの取得
	getDraft: function (facilityId) {
		const key = `draft_${facilityId}`;
		const draft = localStorage.getItem(key);
		return draft ? JSON.parse(draft) : {};
	},

	// 一時保存データの保存
	saveDraft: function (facilityId, answers) {
		const key = `draft_${facilityId}`;
		const data = {
			answers: answers,
			saved_at: new Date().toISOString()
		};
		localStorage.setItem(key, JSON.stringify(data));
		return data.saved_at;
	},

	// 一時保存データのクリア
	clearDraft: function (facilityId) {
		const key = `draft_${facilityId}`;
		localStorage.removeItem(key);
	},

	// 一時保存データの存在確認
	hasDraft: function (facilityId) {
		const key = `draft_${facilityId}`;
		return localStorage.getItem(key) !== null;
	},

	// 一時保存日時の取得
	getDraftTime: function (facilityId) {
		const key = `draft_${facilityId}`;
		const draft = localStorage.getItem(key);
		if (draft) {
			const data = JSON.parse(draft);
			return data.saved_at;
		}
		return null;
	}
};

// グローバルに公開
window.Storage = Storage;