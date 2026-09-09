import Foundation
import Network

final class POS80CPrintService {
    static let shared = POS80CPrintService()
    private init() {}

    func printText(_ text: String, host: String = "192.168.100.73", port: UInt16 = 9100, cut: Bool = true, completion: @escaping (Result<Void, Error>) -> Void) {
        guard let nwPort = NWEndpoint.Port(rawValue: port) else {
            completion(.failure(NSError(domain: "LabelOnZeWay", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid printer port"])))
            return
        }
        let connection = NWConnection(host: NWEndpoint.Host(host), port: nwPort, using: .tcp)
        connection.stateUpdateHandler = { state in
            switch state {
            case .ready:
                var data = Data([0x1B,0x40]) // ESC @ initialize
                data.append(text.data(using: .utf8) ?? Data())
                data.append(Data([0x0A,0x0A]))
                if cut { data.append(Data([0x1D,0x56,0x00])) } // GS V 0 full cut
                connection.send(content: data, completion: .contentProcessed { error in
                    connection.cancel()
                    if let error = error { completion(.failure(error)) }
                    else { completion(.success(())) }
                })
            case .failed(let error):
                connection.cancel(); completion(.failure(error))
            default: break
            }
        }
        connection.start(queue: DispatchQueue(label: "com.labelonzeway.pos80c"))
    }
}
