import Foundation
import UIKit

final class URLPrintHandler {
    static let shared = URLPrintHandler()
    private init() {}

    func handle(_ url: URL) -> Bool {
        guard url.scheme == "labelonzewayprint", url.host == "print" else { return false }
        let c = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let q = Dictionary(uniqueKeysWithValues: (c?.queryItems ?? []).map { ($0.name, $0.value ?? "") })
        let host = q["host"].flatMap { $0.isEmpty ? nil : $0 } ?? "192.168.100.73"
        let port = UInt16(q["port"] ?? "9100") ?? 9100
        let text = q["text"] ?? ""
        let cut = (q["cut"] ?? "1") != "0"
        guard !text.isEmpty else { return false }
        POS80CPrintService.shared.printText(text, host: host, port: port, cut: cut) { result in
            DispatchQueue.main.async {
                let message: String
                switch result {
                case .success: message = "Printed to POS80C"
                case .failure(let error): message = "Print failed: \(error.localizedDescription)"
                }
                NotificationCenter.default.post(name: Notification.Name("LabelOnZeWayPrintResult"), object: message)
            }
        }
        return true
    }
}

// AppDelegate/SceneDelegate integration:
// func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
//     URLPrintHandler.shared.handle(url)
// }
