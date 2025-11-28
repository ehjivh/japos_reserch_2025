# 公開天文台白書2025 回答システム

このディレクトリには、公開天文台白書2025の回答システムが含まれています。

## ディレクトリ構造

```
.
├── index.html              # ログイン画面
├── survey.html             # 回答フォーム画面
├── confirm.html            # 確認画面
├── complete.html           # 完了画面
├── admin.html              # 管理者用集計画面
├── css/
│   └── style.css          # スタイルシート
├── js/
│   ├── auth.js            # 認証処理
│   ├── survey.js          # 回答フォーム制御
│   ├── storage.js         # LocalStorage管理
│   ├── validation.js      # バリデーション
│   └── admin.js           # 集計処理
├── php/
│   ├── auth.php           # 認証API
│   ├── save_draft.php     # 一時保存API
│   ├── submit.php         # 送信API
│   ├── get_data.php       # データ取得API
│   └── aggregate.php      # 集計API
├── data/
│   ├── questions.json     # 設問データ（変換後）
│   ├── members.json       # 施設データ（変換後）
│   ├── previous_answers.json  # 前回回答データ（変換後）
│   └── responses/         # 回答データ保存ディレクトリ
├── scripts/
│   └── csv_to_json.py     # CSV→JSON変換スクリプト
├── question.csv           # 設問データ（元データ）
├── member.csv             # 施設データ（元データ）
└── white_paper_2018.csv   # 前回回答データ（元データ）
```

## セットアップ手順

### 1. 環境準備

- Webサーバー（Apache/Nginx）
- PHP 7.4以上
- Python 3.6以上（データ変換用）

### 2. データ変換

CSVファイルをJSONファイルに変換します。

```bash
cd scripts
python csv_to_json.py
```

これにより、以下のJSONファイルが`data/`ディレクトリに生成されます：
- questions.json
- members.json
- previous_answers.json

### 3. ディレクトリのパーミッション設定

```bash
# Linuxの場合
chmod 755 data
chmod 755 data/responses
chmod 755 data/backups

# Windowsの場合は書き込み権限を付与
```

### 4. .htaccessの設置（オプション）

`data/`ディレクトリへの直接アクセスを制限するために、`.htaccess`を設置します。

```apache
# data/.htaccess
Order Deny,Allow
Deny from all
```

### 5. Webサーバーの設定

ドキュメントルートをこのディレクトリに設定します。

## 使用方法

### 施設担当者の場合

1. `index.html`にアクセス
2. 施設IDとパスワードでログイン
3. 回答フォームに入力
4. 一時保存または送信

### 管理者の場合

1. `admin.html`にアクセス
2. 回答状況を確認
3. 集計データを閲覧

## 注意事項

- パスワードは本番環境では必ずハッシュ化してください
- PHPの`password_hash()`と`password_verify()`の使用を推奨
- データファイルのバックアップを定期的に実施してください
- SSLを導入し、HTTPS通信を使用してください

## トラブルシューティング

### データが保存されない

- `data/responses/`ディレクトリの書き込み権限を確認
- PHPのエラーログを確認

### ログインできない

- `data/members.json`が正しく生成されているか確認
- 施設IDとパスワードが正しいか確認

### 前回データが表示されない

- `data/previous_answers.json`が正しく生成されているか確認
- `scripts/csv_to_json.py`のマッピングを見直す

## 開発情報

- フロントエンド: HTML5 + JavaScript (Vanilla JS)
- バックエンド: PHP
- データ形式: JSON
- グラフ: Chart.js
- スタイル: カスタムCSS

## ライセンス

このシステムは公開天文台白書2025プロジェクトのために開発されました。
