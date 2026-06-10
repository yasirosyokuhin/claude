// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "AFMSample",
    platforms: [
        .macOS(.v27)
    ],
    targets: [
        .executableTarget(
            name: "AFMSample",
            path: "Sources/AFMSample"
        )
    ]
)
