# GTD Task DB 連携（導入前）

このリポジトリは公開です。Notion APIトークン、Cloudflareの保存キー、Accessの秘密情報はGitHubへ入れません。

## 連携対象

- Notionデータベース: `GTD Task DB`
- Database ID: `454df338bb434c6390acba717f615323`
- Data source: `collection://faf488e6-adf6-4b4b-ab4d-b07ca58ae4c8`
- 旧DB・旧ダッシュボードは対象外

タイマーは、Task DBから未完了タスクを読み込み、完了時に対象タスクの「所要時間（分）」へ加算し、「再開メモ」へ作業ログを追記します。「進行状況」は開始・記録時に「進行中」へ更新します。タイマーの「完了」は作業セッションの完了であり、Notionタスク自体を自動で「完了」にはしません。

## Cloudflare Worker

1. CloudflareダッシュボードでWorkerを作成し、`worker.js`をデプロイする。
2. Settings → Variables and Secretsで次を登録する。
   - Secret `NOTION_TOKEN`: 新しいGTD Task DBだけに共有したNotion内部インテグレーショントークン
   - Variable `NOTION_DATABASE_ID`: `454df338bb434c6390acba717f615323`
3. Workerの `/tasks` と `/log` にCloudflare Accessを設定する。Accessの認証が済んだリクエストには `CF-Access-Jwt-Assertion` が付くため、公開HTMLへキーを置かずに済む。
4. Accessを使わない暫定検証時だけ、Worker側にSecret `LOG_WRITE_KEY`を登録するとBearer認証へ切り替わる。ただし公開HTMLへこのキーを埋め込まないこと。
5. 公開タイマーの「Notion連携設定」にWorker URLを入力する。

## 未完了の点

- このWorkerはまだデプロイ・認証設定されていないため、現時点でNotionへの実書き込みは未検証。
- Notion APIの再送時に完全な重複排除を行う識別子フィールドはTask DBにない。通信失敗時はローカル履歴とTask DBの作業時間を照合する。
- Task DBの公開HTML側へのトークン埋め込みは行っていない。

