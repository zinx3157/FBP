import SwiftUI
import Network

@main
struct LabelOnZeWayPrintHelperApp: App {
    @State private var lastStatus = "Ready"

    var body: some Scene {
        WindowGroup {
            VStack(spacing: 16) {
                Text("LabelOnZeWay Print Helper").font(.title2).bold()
                Text(lastStatus).font(.footnote).multilineTextAlignment(.center)
                Text("Direct ESC/POS over Wi‑Fi to 192.168.100.73:9100").font(.caption).foregroundStyle(.secondary)
            }
            .padding()
            .onOpenURL { url in
                handle(url)
            }
        }
    }

    private func handle(_ url: URL) {
        guard url.scheme == "labelonzewayprint" else { return }
        let comps = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let q = Dictionary(uniqueKeysWithValues: (comps?.queryItems ?? []).map { ($0.name, $0.value ?? "") })
        let host = q["host"] ?? "192.168.100.73"
        let port = UInt16(q["port"] ?? "9100") ?? 9100
        let callback = q["callback"].flatMap(URL.init(string:))

        if url.host == "probe" {
            lastStatus = "Testing \(host):\(port)…"
            POS80CNetwork.probe(host: host, port: port) { ok, detail in
                DispatchQueue.main.async {
                    lastStatus = ok ? "Printer reachable" : "Printer unreachable"
                    openCallback(callback, ok: ok, detail: detail)
                }
            }
            return
        }

        if url.host == "print" {
            let text = q["text"] ?? ""
            lastStatus = "Printing…"
            POS80CNetwork.printText(text, host: host, port: port) { ok, detail in
                DispatchQueue.main.async {
                    lastStatus = ok ? "Printed successfully" : "Print failed"
                    openCallback(callback, ok: ok, detail: detail)
                }
            }
        }
    }

    private func openCallback(_ callback: URL?, ok: Bool, detail: String) {
        guard let callback else { return }
        var c = URLComponents(url: callback, resolvingAgainstBaseURL: false)
        var items = c?.queryItems ?? []
        items.append(URLQueryItem(name: "posprobe", value: ok ? "ok" : "fail"))
        items.append(URLQueryItem(name: "posdetail", value: detail))
        c?.queryItems = items
        if let u = c?.url { UIApplication.shared.open(u) }
    }
}

enum POS80CNetwork {
    static func probe(host: String, port: UInt16, completion: @escaping (Bool, String) -> Void) {
        guard let nwPort = NWEndpoint.Port(rawValue: port) else {
            completion(false, "Invalid port")
            return
        }
        let connection = NWConnection(host: NWEndpoint.Host(host), port: nwPort, using: .tcp)
        let queue = DispatchQueue(label: "lz.pos80c.probe")
        var finished = false
        func finish(_ ok: Bool, _ detail: String) {
            guard !finished else { return }
            finished = true
            connection.cancel()
            completion(ok, detail)
        }
        connection.stateUpdateHandler = { state in
            switch state {
            case .ready: finish(true, "\(host):\(port)")
            case .failed(let error): finish(false, error.localizedDescription)
            case .cancelled: if !finished { finish(false, "Cancelled") }
            default: break
            }
        }
        connection.start(queue: queue)
        queue.asyncAfter(deadline: .now() + 3.0) { finish(false, "Connection timeout") }
    }

    static func printText(_ text: String, host: String, port: UInt16, completion: @escaping (Bool, String) -> Void) {
        guard !text.isEmpty, let nwPort = NWEndpoint.Port(rawValue: port) else {
            completion(false, "No label data")
            return
        }
        let connection = NWConnection(host: NWEndpoint.Host(host), port: nwPort, using: .tcp)
        let queue = DispatchQueue(label: "lz.pos80c.print")
        connection.stateUpdateHandler = { state in
            switch state {
            case .ready:
                var data = Data([0x1B,0x40]) // ESC @ initialize
                data.append(text.data(using: .utf8) ?? Data())
                data.append(Data([0x0A,0x0A,0x1D,0x56,0x00])) // feed + full cut
                connection.send(content: data, completion: .contentProcessed { error in
                    connection.cancel()
                    completion(error == nil, error?.localizedDescription ?? "\(host):\(port)")
                })
            case .failed(let error):
                connection.cancel()
                completion(false, error.localizedDescription)
            default: break
            }
        }
        connection.start(queue: queue)
    }
}
