import ExpoModulesCore

// FamilyControls / ManagedSettings are weak-linked via the podspec.
// Available on iOS 16+ only. Each call site uses `guard #available`.
#if canImport(FamilyControls)
import FamilyControls
#endif
#if canImport(ManagedSettings)
import ManagedSettings
#endif
#if canImport(DeviceActivity)
import DeviceActivity
#endif

// Named store extension — keeps session shields isolated and cleanup simple.
#if canImport(ManagedSettings)
@available(iOS 16.0, *)
extension ManagedSettingsStore.Name {
  static let niyahSession = Self("niyah.session")
}
#endif

/// Expo module bridging iOS Screen Time API to JavaScript.
///
/// Key learnings applied from working apps (Opal, One Sec, ScreenZen):
///   - Use PropertyListEncoder (NOT JSON) for FamilyActivitySelection persistence.
///     JSON silently corrupts opaque ApplicationToken data.
///   - Keep selection in memory as primary; persist to UserDefaults for extension use.
///   - Use named ManagedSettingsStore for session isolation.
///   - Use clearAllSettings() for deterministic cleanup.
///   - No DeviceActivitySchedule needed for direct blocking.
@preconcurrency
public class NiyahScreenTimeModule: Module {

  // ── App Group constants ────────────────────────────────────────────────────
  private static let appGroupID = "group.com.niyah.app"
  private static let selectionKey = "niyah_app_selection"
  private static let blockingKey = "niyah_is_blocking"

  private var sharedDefaults: UserDefaults {
    UserDefaults(suiteName: Self.appGroupID) ?? .standard
  }

  private var isCurrentlyBlocking: Bool {
    get { sharedDefaults.bool(forKey: Self.blockingKey) }
    set { sharedDefaults.set(newValue, forKey: Self.blockingKey) }
  }

  // ── Violation + surrender polling ──────────────────────────────────────────
  private static let violationsKey  = "niyah_shield_violations"
  private static let surrenderKey   = "niyah_surrender_requested"
  private var violationPollTimer: Timer?
  private var lastViolationCount: Int = 0

  // ── iOS 16+ state ─────────────────────────────────────────────────────────
  // Stored as `Any?` because the types don't exist on iOS <16.
  // The @available computed properties provide typed access.

  /// In-memory selection — this is the PRIMARY source.
  /// UserDefaults is only used for cross-process persistence (extensions).
  private var _inMemorySelection: Any?

  /// Named ManagedSettingsStore for session-scoped shields.
  private var _managedStore: Any?

  @available(iOS 16.0, *)
  private var managedStore: ManagedSettingsStore {
    if let store = _managedStore as? ManagedSettingsStore { return store }
    let store = ManagedSettingsStore(named: .niyahSession)
    _managedStore = store
    return store
  }

  /// Get/set the current app selection, with in-memory primary + UserDefaults backup.
  @available(iOS 16.0, *)
  private var savedSelection: FamilyActivitySelection? {
    get {
      // Prefer in-memory (avoids encode/decode issues)
      if let memSelection = _inMemorySelection as? FamilyActivitySelection {
        return memSelection
      }
      // Fall back to persisted (e.g. after app restart)
      guard let data = sharedDefaults.data(forKey: Self.selectionKey) else { return nil }
      let selection = try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: data)
      // Cache in memory for subsequent reads
      if let selection = selection {
        _inMemorySelection = selection
      }
      return selection
    }
    set {
      _inMemorySelection = newValue
      // Also persist to shared UserDefaults for the extension
      if let value = newValue,
         let data = try? PropertyListEncoder().encode(value) {
        sharedDefaults.set(data, forKey: Self.selectionKey)
      } else {
        sharedDefaults.removeObject(forKey: Self.selectionKey)
      }
    }
  }

  // ── Module Definition ──────────────────────────────────────────────────────

  public func definition() -> ModuleDefinition {
    Name("NiyahScreenTime")

    Events("onShieldViolation", "onAuthorizationChange", "onSurrenderRequested")

    // ================================================================
    // MARK: - Authorization
    // ================================================================

    AsyncFunction("requestAuthorization") { () -> String in
      guard #available(iOS 16.0, *) else { return "denied" }
      do {
        try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
        NSLog("[NiyahScreenTime] Authorization approved")
        return "approved"
      } catch {
        let status = AuthorizationCenter.shared.authorizationStatus
        NSLog("[NiyahScreenTime] Authorization result: \(self.serializeAuthStatus(status)), error: \(error)")
        return self.serializeAuthStatus(status)
      }
    }

    Function("getAuthorizationStatus") { () -> String in
      guard #available(iOS 16.0, *) else { return "denied" }
      let status = AuthorizationCenter.shared.authorizationStatus
      return self.serializeAuthStatus(status)
    }

    // ================================================================
    // MARK: - App Selection
    // ================================================================

    AsyncFunction("presentAppPicker") { [weak self] () -> [String: Any] in
      guard #available(iOS 16.0, *) else {
        throw NSError(
          domain: "NiyahScreenTime", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "Screen Time requires iOS 16+"]
        )
      }
      guard let self = self else {
        throw NSError(
          domain: "NiyahScreenTime", code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Module deallocated"]
        )
      }

      return try await withCheckedThrowingContinuation { continuation in
        DispatchQueue.main.async {
          // Track whether the continuation has already been resumed.
          // Both onSelection and onCancel dismiss the modal — only the first
          // one to fire should resume the continuation.
          var resumed = false

          let pickerVC = AppPickerHostingController(
            onSelection: { selection in
              guard !resumed else { return }
              resumed = true

              // Save in memory AND persist
              self.savedSelection = selection

              let appCount = selection.applicationTokens.count
              let catCount = selection.categoryTokens.count
              NSLog("[NiyahScreenTime] App picker done: \(appCount) apps, \(catCount) categories")

              let summary = self.serializeSelection(selection)
              continuation.resume(returning: summary)
            },
            onCancel: {
              guard !resumed else { return }
              resumed = true

              NSLog("[NiyahScreenTime] App picker cancelled")
              continuation.resume(throwing: NSError(
                domain: "NiyahScreenTime", code: 4,
                userInfo: [NSLocalizedDescriptionKey: "App picker was cancelled"]
              ))
            }
          )
          pickerVC.modalPresentationStyle = .pageSheet

          guard let rootVC = self.findRootViewController() else {
            guard !resumed else { return }
            resumed = true
            continuation.resume(throwing: NSError(
              domain: "NiyahScreenTime", code: 2,
              userInfo: [NSLocalizedDescriptionKey: "Could not find root view controller"]
            ))
            return
          }

          rootVC.present(pickerVC, animated: true)
        }
      }
    }

    Function("getSavedSelection") { [weak self] () -> [String: Any]? in
      guard #available(iOS 16.0, *) else { return nil }
      guard let selection = self?.savedSelection else { return nil }
      return self?.serializeSelection(selection)
    }

    AsyncFunction("clearSelection") { [weak self] () in
      guard #available(iOS 16.0, *) else { return }
      self?.savedSelection = nil
    }

    // ================================================================
    // MARK: - Blocking (Session Lifecycle)
    // ================================================================

    AsyncFunction("startBlocking") { [weak self] () in
      guard #available(iOS 16.0, *) else { return }
      guard let self = self else { return }
      guard let selection = self.savedSelection else {
        NSLog("[NiyahScreenTime] startBlocking FAILED: no saved selection")
        throw NSError(
          domain: "NiyahScreenTime", code: 3,
          userInfo: [NSLocalizedDescriptionKey: "No apps selected. Present the app picker first."]
        )
      }

      let appCount = selection.applicationTokens.count
      let catCount = selection.categoryTokens.count
      let webCount = selection.webDomainTokens.count
      NSLog("[NiyahScreenTime] startBlocking: \(appCount) apps, \(catCount) categories, \(webCount) web domains")

      // Apply shield to selected apps and categories
      // Always assign the full token sets — empty set = "shield nothing"
      self.managedStore.shield.applications = selection.applicationTokens.isEmpty
        ? nil : selection.applicationTokens
      self.managedStore.shield.applicationCategories = selection.categoryTokens.isEmpty
        ? nil : ShieldSettings.ActivityCategoryPolicy<Application>.specific(selection.categoryTokens)
      self.managedStore.shield.webDomains = selection.webDomainTokens.isEmpty
        ? nil : selection.webDomainTokens

      self.isCurrentlyBlocking = true

      // Clear any stale violations from previous sessions and start polling
      self.sharedDefaults.removeObject(forKey: Self.violationsKey)
      self.lastViolationCount = 0
      self.startViolationPolling()

      NSLog("[NiyahScreenTime] startBlocking: shields applied successfully")
    }

    AsyncFunction("stopBlocking") { [weak self] () in
      guard #available(iOS 16.0, *) else { return }
      guard let self = self else { return }
      // clearAllSettings is the nuclear option — removes all shield/application
      // settings from this named store in one call. More reliable than nil-ing
      // individual properties.
      self.managedStore.clearAllSettings()
      self.isCurrentlyBlocking = false
      self.stopViolationPolling()
      NSLog("[NiyahScreenTime] stopBlocking: all settings cleared")
    }

    Function("isBlocking") { [weak self] () -> Bool in
      return self?.isCurrentlyBlocking ?? false
    }

    // ================================================================
    // MARK: - Scheduled Blocking (DeviceActivitySchedule)
    // ================================================================

    AsyncFunction("startScheduledBlocking") { (startHour: Int, startMinute: Int, endHour: Int, endMinute: Int, activityName: String) in
      guard #available(iOS 16.0, *) else { return }
      let center = DeviceActivityCenter()
      let schedule = DeviceActivitySchedule(
        intervalStart: DateComponents(hour: startHour, minute: startMinute),
        intervalEnd: DateComponents(hour: endHour, minute: endMinute),
        repeats: true
      )
      try center.startMonitoring(
        DeviceActivityName(rawValue: activityName),
        during: schedule
      )
      NSLog("[NiyahScreenTime] startScheduledBlocking: monitoring \(activityName) from \(startHour):\(startMinute) to \(endHour):\(endMinute)")
    }

    AsyncFunction("stopScheduledBlocking") { (activityName: String) in
      guard #available(iOS 16.0, *) else { return }
      DeviceActivityCenter().stopMonitoring([DeviceActivityName(rawValue: activityName)])
      NSLog("[NiyahScreenTime] stopScheduledBlocking: stopped \(activityName)")
    }

    AsyncFunction("stopAllScheduledBlocking") { () in
      guard #available(iOS 16.0, *) else { return }
      DeviceActivityCenter().stopMonitoring()
      NSLog("[NiyahScreenTime] stopAllScheduledBlocking: all monitoring stopped")
    }
  }

  // ================================================================
  // MARK: - Helpers
  // ================================================================

  @available(iOS 16.0, *)
  private func serializeAuthStatus(_ status: AuthorizationStatus) -> String {
    switch status {
    case .notDetermined: return "notDetermined"
    case .approved: return "approved"
    case .denied: return "denied"
    @unknown default: return "notDetermined"
    }
  }

  @available(iOS 16.0, *)
  private func serializeSelection(_ selection: FamilyActivitySelection) -> [String: Any] {
    let appCount = selection.applicationTokens.count
    let categoryCount = selection.categoryTokens.count
    let webDomainCount = selection.webDomainTokens.count

    var parts: [String] = []
    if appCount > 0 { parts.append("\(appCount) app\(appCount == 1 ? "" : "s")") }
    if categoryCount > 0 { parts.append("\(categoryCount) categor\(categoryCount == 1 ? "y" : "ies")") }
    if webDomainCount > 0 { parts.append("\(webDomainCount) website\(webDomainCount == 1 ? "" : "s")") }

    return [
      "id": "current",
      "appCount": appCount,
      "categoryCount": categoryCount,
      "label": parts.isEmpty ? "No selection" : parts.joined(separator: ", "),
    ]
  }

  private func findRootViewController() -> UIViewController? {
    guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
          let window = scene.windows.first(where: { $0.isKeyWindow }),
          var topVC = window.rootViewController else {
      return nil
    }
    while let presented = topVC.presentedViewController {
      topVC = presented
    }
    return topVC
  }

  // ================================================================
  // MARK: - Violation polling & event emission
  // ================================================================
  //
  // The DeviceActivityMonitor extension runs in a separate process and
  // writes violation timestamps to shared UserDefaults. The main app
  // polls for new entries and emits "onShieldViolation" events to JS.

  private func startViolationPolling() {
    stopViolationPolling() // Ensure no duplicate timers
    violationPollTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
      self?.checkForNewViolations()
    }
  }

  private func stopViolationPolling() {
    violationPollTimer?.invalidate()
    violationPollTimer = nil
  }

  private func checkForNewViolations() {
    // ── Violation events ────────────────────────────────────────────────────
    let violations = sharedDefaults.array(forKey: Self.violationsKey) as? [Double] ?? []
    if violations.count > lastViolationCount {
      for i in lastViolationCount..<violations.count {
        let timestamp = violations[i]
        NSLog("[NiyahScreenTime] Shield violation detected at \(timestamp)")
        sendEvent("onShieldViolation", ["timestamp": timestamp])
      }
      lastViolationCount = violations.count
    }

    // ── Surrender request from NiyahShieldAction extension ─────────────────
    // The ShieldActionExtension writes this flag when the user taps
    // "Surrender Session" on the custom shield screen.
    if sharedDefaults.bool(forKey: Self.surrenderKey) {
      NSLog("[NiyahScreenTime] Surrender requested via shield action")
      sharedDefaults.removeObject(forKey: Self.surrenderKey)
      sharedDefaults.synchronize()
      sendEvent("onSurrenderRequested", [:])
    }
  }
}
