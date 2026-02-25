import ExpoModulesCore

// FamilyControls / ManagedSettings are weak-linked via the podspec.
// Available on iOS 16+ only. Each call site uses `guard #available`.
#if canImport(FamilyControls)
import FamilyControls
#endif
#if canImport(ManagedSettings)
import ManagedSettings
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

    Events("onShieldViolation", "onAuthorizationChange")

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
          let pickerVC = AppPickerHostingController { selection in
            // Save in memory AND persist
            self.savedSelection = selection

            let appCount = selection.applicationTokens.count
            let catCount = selection.categoryTokens.count
            NSLog("[NiyahScreenTime] App picker done: \(appCount) apps, \(catCount) categories")

            let summary = self.serializeSelection(selection)
            continuation.resume(returning: summary)
          }
          pickerVC.modalPresentationStyle = .pageSheet

          guard let rootVC = self.findRootViewController() else {
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
      NSLog("[NiyahScreenTime] stopBlocking: all settings cleared")
    }

    Function("isBlocking") { [weak self] () -> Bool in
      return self?.isCurrentlyBlocking ?? false
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
}
