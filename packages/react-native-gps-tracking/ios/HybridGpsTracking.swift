import Foundation
import NitroModules

/// React Native entry point (a Nitro HybridObject). Thin on purpose: it forwards to the process-wide
/// `TrackingEngine` (owned by `GpsTrackingRuntime`), which delivers every result on the main thread and turns
/// every failure into a `TrackingError` (code, message, details). Each completion becomes a promise.
///
/// The recording outlives this object: a JS reload only replaces the listeners.
final class HybridGpsTracking: HybridGpsTrackingSpec {
    private var engine: TrackingEngine { GpsTrackingRuntime.engine }

    // MARK: - Permission

    func permissionStatus() throws -> NitroPermission {
        engine.permissionStatus().toNitro()
    }

    func stepsPermissionStatus() throws -> NitroPermission {
        engine.stepsPermissionStatus().toNitro()
    }

    func requestPermission() throws -> Promise<NitroPermission> {
        promise { done in
            self.engine.requestPermission { done(.success($0.toNitro())) }
        }
    }

    func requestStepsPermission() throws -> Promise<NitroPermission> {
        promise { done in
            self.engine.requestStepsPermission { done(.success($0.toNitro())) }
        }
    }

    // MARK: - Session commands

    func start(config: NitroStartConfig) throws -> Promise<NitroSnapshot> {
        let native = config.toNative()
        return promise { done in
            self.engine.start(config: native) { done($0.map { $0.toNitro() }) }
        }
    }

    func pause(sessionId: String) throws -> Promise<NitroSnapshot> {
        promise { done in
            self.engine.pause(sessionId: sessionId) { done($0.map { $0.toNitro() }) }
        }
    }

    func resume(sessionId: String) throws -> Promise<NitroSnapshot> {
        promise { done in
            self.engine.resume(sessionId: sessionId) { done($0.map { $0.toNitro() }) }
        }
    }

    func stop(sessionId: String) throws -> Promise<NitroSnapshot> {
        promise { done in
            self.engine.stop(sessionId: sessionId) { done($0.map { $0.toNitro() }) }
        }
    }

    func getSnapshot() throws -> NitroSnapshot {
        engine.snapshot().toNitro()
    }

    func submitPdr(sessionId: String, segmentId: Double, meters: Double) throws {
        engine.submitPdr(sessionId: sessionId, segmentId: Int64(segmentId), meters: meters)
    }

    func restoreSession(config: NitroStartConfig) throws -> Promise<NitroSnapshot> {
        let native = config.toNative()
        return promise { done in
            self.engine.restore(config: native) { done($0.map { $0.toNitro() }) }
        }
    }

    func activeSessionId() throws -> Promise<String?> {
        promise { done in
            self.engine.activeSessionId(completion: done)
        }
    }

    // MARK: - External cadence (fed by the host app)

    func pushCscMeasurement(sessionId: String, sourceId: String, connectionId: Double, data: ArrayBuffer) throws {
        engine.pushCsc(
            sessionId: sessionId, sourceId: sourceId, connectionId: Int64(connectionId),
            data: data.toData(copyIfNeeded: true))
    }

    func pushExternalCadence(sessionId: String, sourceId: String, connectionId: Double, rpm: Double) throws {
        engine.pushExternalRpm(sessionId: sessionId, sourceId: sourceId, connectionId: Int64(connectionId), rpm: rpm)
    }

    func setExternalCadenceConnected(sessionId: String, sourceId: String, connectionId: Double, connected: Bool) throws {
        engine.setExternalConnected(
            sessionId: sessionId, sourceId: sourceId, connectionId: Int64(connectionId), connected: connected)
    }

    // MARK: - Journal

    func getReport() throws -> String {
        engine.report()
    }

    func readPersistedFixes(sessionId: String, afterSeq: Double) throws -> Promise<[NitroFix]> {
        promise { done in
            self.engine.readPersisted(sessionId: sessionId, afterSeq: Int64(afterSeq)) {
                done($0.map { $0.map { $0.toNitro() } })
            }
        }
    }

    func clearSession(sessionId: String) throws -> Promise<Void> {
        promise { done in
            self.engine.clearSession(sessionId, completion: done)
        }
    }

    func updateNotification(title: String, text: String) throws {
        // Android only: iOS has no foreground notification to update.
    }

    func listSessions() throws -> Promise<[String]> {
        promise { done in
            self.engine.listSessions(completion: done)
        }
    }

    // MARK: - Listeners

    func setFixListener(listener: ((_ fix: NitroFix) -> Void)?) throws {
        guard let listener = listener else {
            engine.fixObserver = nil
            return
        }
        engine.fixObserver = { fix in listener(fix.toNitro()) }
    }

    func setSnapshotListener(listener: ((_ snapshot: NitroSnapshot) -> Void)?) throws {
        guard let listener = listener else {
            engine.snapshotObserver = nil
            return
        }
        engine.snapshotObserver = { snapshot in listener(snapshot.toNitro()) }
    }

    // MARK: - Internals

    /// Turns an engine completion into a promise.
    private func promise<T>(_ run: (@escaping (Result<T, Error>) -> Void) -> Void) -> Promise<T> {
        let promise = Promise<T>()
        run { result in
            switch result {
            case .success(let value): promise.resolve(withResult: value)
            case .failure(let error): promise.reject(withError: error)
            }
        }
        return promise
    }
}
