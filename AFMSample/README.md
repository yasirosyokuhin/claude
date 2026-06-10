# AFM 3 Core Advanced Sample

macOS 27 beta上でApple Foundation Models (AFM 3 Core Advanced) を動かすサンプルプログラムです。

## 必要環境

- macOS 27 beta以降
- Xcode 17 beta以降
- Swift 6.0以降

## デモ内容

| # | 機能 | 説明 |
|---|------|------|
| 1 | Basic Generation | 通常のテキスト生成 |
| 2 | Streaming | ストリーミングレスポンス |
| 3 | Structured Output | `@Generable` を使った構造化出力 |
| 4 | Multi-turn | 複数ターンの会話セッション |

## 実行方法

```bash
cd AFMSample
swift run
```

またはXcodeで開く場合:

```bash
open Package.swift
```

## 主要API

```swift
import FoundationModels

// モデルの利用可否確認
let model = SystemLanguageModel.default
// model.availability で .available / .unavailable を確認

// セッション作成
let session = LanguageModelSession()

// テキスト生成
let response = try await session.respond(to: "Hello")

// ストリーミング
for try await chunk in session.streamResponse(to: "Hello") { ... }

// 構造化出力 (@Generable プロトコル)
let result = try await session.respond(to: "...", generating: MyStruct.self)
```

## 注意事項

- `FoundationModels` フレームワークはオンデバイスで動作します（通信不要）
- 初回実行時にモデルのダウンロードが発生する場合があります
- `SystemLanguageModel.default.availability` で事前に利用可否を確認してください
