# GTD Work Log 自動保存API（導入前）

このリポジトリは公開です。**Notion APIキーと保存用認証キーは絶対にコミットしないでください。**

## 1. Cloudflare Workersを作成
Cloudflareダッシュボード → Workers & Pages → Create → Worker。新しいWorkerを作り、`worker.js` のコードを貼り付けてデプロイ。

## 2. Workerの設定
Settings → Variables and Secretsで以下を登録。
- Secret `NOTION_TOKEN`: Notionの内部インテグレーショントークン。GitHubには書かない。
- Secret `LOG_WRITE_KEY`: 32文字以上のランダムな長いキー。Notionのトークンとは別にする。
- Variable `NOTION_DATABASE_ID`: 新規GTD Work Log DBのID `fb53b02872004237ae3abe95a849750c`。

Notionの接続設定で、この新規DBだけをインテグレーションに共有すること。旧DBは共有しない。

## 3. API
`POST https://<your-worker>.workers.dev/log`
Headers: `Origin: https://owlleather1-tech.github.io`（ブラウザが送信）、`Authorization: Bearer <LOG_WRITE_KEY>`、`Content-Type: application/json`
Body:
```json
{"task":"レンズ磨き","start":"2026-10-13T01:00:00.000Z","end":"2026-10-13T01:05:00.000Z","minutes":5,"note":"前玉確認","taskUrl":""}
```
201で成功、401で認証失敗、502でNotion書込失敗。

## 注意
- このAPIはまだデプロイしていません。現行タイマーはブラウザ内履歴とCSV保存のままです。
- この設計は個人用の簡易認証です。保存キーをブラウザに入れる運用は漏えいリスクがあり、共有端末には不向きです。将来はCloudflare Access等のユーザー認証に切り替えてください。
- CORSのOrigin検査だけでは認証にはなりません。Bearerキーも必要です。
- Notion APIは一時的に失敗する場合があるため、成功応答までローカル履歴を消さないこと。重複登録防止は今後の課題です。
