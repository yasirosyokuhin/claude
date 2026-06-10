import Foundation
import FoundationModels

// AFM 3 Core Advanced sample — requires macOS 27+

@main
struct AFMSample {
    static func main() async {
        await runSample()
    }
}

func runSample() async {
    // Check availability of AFM 3 Core Advanced
    let model = SystemLanguageModel.default
    switch model.availability {
    case .available:
        print("✅ AFM 3 Core Advanced is available")
    case .unavailable(let reason):
        print("❌ Model unavailable: \(reason)")
        return
    }

    print("\n=== AFM 3 Core Advanced Sample ===\n")

    // --- 1. Basic text generation ---
    await basicGeneration()

    // --- 2. Streaming response ---
    await streamingGeneration()

    // --- 3. Structured output (Generable) ---
    await structuredOutput()

    // --- 4. Multi-turn conversation ---
    await multiTurnConversation()
}

// MARK: - 1. Basic text generation

func basicGeneration() async {
    print("--- 1. Basic Text Generation ---")
    let session = LanguageModelSession()
    do {
        let response = try await session.respond(to: "日本語で「こんにちは、世界！」と言って、その意味を英語で説明してください。")
        print(response.content)
    } catch {
        print("Error: \(error)")
    }
    print()
}

// MARK: - 2. Streaming response

func streamingGeneration() async {
    print("--- 2. Streaming Generation ---")
    let session = LanguageModelSession()
    do {
        print("Response: ", terminator: "")
        let stream = session.streamResponse(to: "1から10まで数えてください。")
        for try await chunk in stream {
            print(chunk, terminator: "")
            fflush(stdout)
        }
        print("\n")
    } catch {
        print("\nError: \(error)")
    }
}

// MARK: - 3. Structured output

@Generable
struct RecipeIdea {
    @Guide(description: "料理の名前")
    var name: String

    @Guide(description: "主な材料（3〜5つ）")
    var ingredients: [String]

    @Guide(description: "調理時間（分）")
    var cookingTimeMinutes: Int

    @Guide(description: "難易度: easy, medium, hard")
    var difficulty: String
}

func structuredOutput() async {
    print("--- 3. Structured Output (Generable) ---")
    let session = LanguageModelSession()
    do {
        let recipe = try await session.respond(
            to: "簡単な和食レシピのアイデアを一つ提案してください。",
            generating: RecipeIdea.self
        )
        print("料理名: \(recipe.content.name)")
        print("材料: \(recipe.content.ingredients.joined(separator: ", "))")
        print("調理時間: \(recipe.content.cookingTimeMinutes)分")
        print("難易度: \(recipe.content.difficulty)")
    } catch {
        print("Error: \(error)")
    }
    print()
}

// MARK: - 4. Multi-turn conversation

func multiTurnConversation() async {
    print("--- 4. Multi-turn Conversation ---")
    let session = LanguageModelSession()
    let turns: [(String, String)] = [
        ("user", "私の名前はTaroです。覚えておいてください。"),
        ("user", "私の名前を教えてください。"),
        ("user", "Swiftプログラミングの最大の特徴を一文で教えてください。")
    ]

    for (_, message) in turns {
        do {
            print("User: \(message)")
            let response = try await session.respond(to: message)
            print("AFM: \(response.content)\n")
        } catch {
            print("Error: \(error)\n")
        }
    }
}
