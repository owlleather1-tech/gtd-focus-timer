# GTD Task DB 連携

このリポジトリは公開です。Notion APIトークンと接続キーはGitHubへ入れません。

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
   - Secret `LOG_WRITE_KEY`: 十分に長いランダムな接続キー
3. Notion埋め込みではCloudflare Accessの認証Cookieが第三者Cookieとして遮断される場合があるため、WorkerへのAccess保護は解除し、Worker自身のBearer認証を使う。
4. 公開タイマーの「Notion連携設定」にWorker URLと接続キーを入力する。接続キーは公開HTMLへ埋め込まず、利用者がブラウザへ入力する。
5. 共用端末では「この端末に接続キーを保存する」をオンにしない。オフの場合はタブを閉じるまでの保存になる。

## 未完了の点

- Task DBの読み込みは、Workerのデプロイ・接続キー設定後に実画面で確認する。
- Notionへの実書き込みはTask DBの値を変更するため、読み込み確認とは分けて明示的にテストする。
- Notion APIの再送時に完全な重複排除を行う識別子フィールドはTask DBにない。通信失敗時はローカル履歴とTask DBの作業時間を照合する。
- Task DBの公開HTML側へのトークン埋め込みは行っていない。

