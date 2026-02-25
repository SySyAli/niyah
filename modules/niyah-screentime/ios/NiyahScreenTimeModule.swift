import ExpoModulesCore
import FamilyControls
import ManagedSettings

/// Expo module bridging iOS Screen Time API to JavaScript.
///
/// Provides:
///   - FamilyControls authorization (request Screen Time access)
///   - App selection persistence (save/load user's chosen apps to block)
///   - ManagedSettings shield (block selected apps during a NIYAH session)
///
/// Requires:
///   - iOS 16.0+
///   - com.apple.developer.family-controls entitlement
///   - Physical device (Screen Time API does not work in Simulator)
@available(iOS 16.0, *)
public class NiyahScreenTimeModule: Module {

  /// The managed settings store that applies/removes app shields.
  /// Using `.default` store -- this is the standard approach for self-use apps.
  private let store = ManagedSettingsStore()

  /// Shared UserDefaults suite for App Group.
  /// Both the main app and the DeviceActivityMonitor extension read/write here.
  private static let appGroupID = "group.com.niyah.app"
  private static let selectionKey = "niyah_app_selection"
  private static let blockingKey = "niyah_is_blocking"

  private var sharedDefaults: UserDefaults {
    UserDefaults(suiteName: Self.appGroupID) ?? .standard
  }

  /// Persisted app selection from FamilyActivityPicker.
  /// Saved to the App Group shared UserDefaults so the DeviceActivityMonitor
  /// extension can also access it.
  private var savedSelection: FamilyActivitySelection? {
    get {
      guard let data = sharedDefaults.data(forKey: Self.selectionKey) else {
        return nil
      }
      return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    }
    set {
      if let newValue = newValue,
         let data = try? JSONEncoder().encode(newValue) {
        sharedDefaults.set(data, forKey: Self.selectionKey)
      } else {
        sharedDefaults.removeObject(forKey: Self.selectionKey)
      }
    }
  }

  /// Track whether we are currently blocking.
  /// Persisted to shared defaults so the extension can check blocking state.
  private var isCurrentlyBlocking: Bool {
    get { sharedDefaults.bool(forKey: Self.blockingKey) }
    set { sharedDefaults.set(newValue, forKey: Self.blockingKey) }
  }

  public func definition() -> ModuleDefinition {
    Name("NiyahScreenTime")

    Events("onShieldViolation", "onAuthorizationChange")

    // ================================================================
    // MARK: - Authorization
    // ================================================================

    /// Request FamilyControls authorization.
    /// Shows the native iOS dialog asking the user to approve Screen Time access.
    /// Returns: "approved", "denied", or "notDetermined"
    AsyncFunction("requestAuthorization") { () -> String in
      do {
        try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
        return "approved"
      } catch {
        // AuthorizationCenter throws if the user denies or if the entitlement
        // is missing. Map to a status string rather than throwing to JS.
        let status = AuthorizationCenter.shared.authorizationStatus
        return self.serializeAuthStatus(status)
      }
    }

    /// Get current authorization status without prompting.
    Function("getAuthorizationStatus") { () -> String in
      let status = AuthorizationCenter.shared.authorizationStatus
      return self.serializeAuthStatus(status)
    }

    // ================================================================
    // MARK: - App Selection
    // ================================================================

    /// Present the native FamilyActivityPicker.
    ///
    /// NOTE: FamilyActivityPicker is a SwiftUI view. Presenting it from
    /// an Expo module requires wrapping it in a UIHostingController.
    /// This function presents it modally over the current view controller.
    ///
    /// Returns a summary of the selection (app count, category count).
    AsyncFunction("presentAppPicker") { [weak self] () -> [String: Any] in
      guard let self = self else {
        throw NSError(
          domain: "NiyahScreenTime",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Module deallocated"]
        )
      }

      return try await withCheckedThrowingContinuation { continuation in
        DispatchQueue.main.async {
          let pickerVC = AppPickerHostingController { selection in
            self.savedSelection = selection

            let summary = self.serializeSelection(selection)
            continuation.resume(returning: summary)
          }
          pickerVC.modalPresentationStyle = .pageSheet

          guard let rootVC = self.findRootViewController() else {
            continuation.resume(throwing: NSError(
              domain: "NiyahScreenTime",
              code: 2,
              userInfo: [NSLocalizedDescriptionKey: "Could not find root view controller"]
            ))
            return
          }

          rootVC.present(pickerVC, animated: true)
        }
      }
    }

    /// Get the currently saved app selection (returns null if none).
    Function("getSavedSelection") { [weak self] () -> [String: Any]? in
      guard let selection = self?.savedSelection else { return nil }
      return self?.serializeSelection(selection)
    }

    /// Clear the saved app selection.
    AsyncFunction("clearSelection") { [weak self] () in
      self?.savedSelection = nil
    }

    // ================================================================
    // MARK: - Blocking (Session Lifecycle)
    // ================================================================

    /// Start blocking the selected apps by applying a ManagedSettings shield.
    /// Call this when a NIYAH session begins.
    AsyncFunction("startBlocking") { [weak self] () in
      guard let self = self else { return }
      guard let selection = self.savedSelection else {
        throw NSError(
          domain: "NiyahScreenTime",
          code: 3,
          userInfo: [NSLocalizedDescriptionKey: "No apps selected. Present the app picker first."]
        )
      }

      // Apply shield to selected apps and categories
      self.store.shield.applications = selection.applicationTokens.isEmpty
        ? nil
        : selection.applicationTokens
      self.store.shield.applicationCategories = selection.categoryTokens.isEmpty
        ? nil
        : ShieldSettings.ActivityCategoryPolicy<Application>.specific(selection.categoryTokens)
      self.store.shield.webDomains = selection.webDomainTokens.isEmpty
        ? nil
        : selection.webDomainTokens

      self.isCurrentlyBlocking = true
    }

    /// Stop blocking. Removes the ManagedSettings shield.
    /// Call when a session ends (completed or surrendered).
    AsyncFunction("stopBlocking") { [weak self] () in
      guard let self = self else { return }
      self.store.shield.applications = nil
      self.store.shield.applicationCategories = nil
      self.store.shield.webDomains = nil
      self.isCurrentlyBlocking = false
    }

    /// Check if apps are currently being blocked.
    Function("isBlocking") { [weak self] () -> Bool in
      return self?.isCurrentlyBlocking ?? false
    }
  }

  // ================================================================
  // MARK: - Helpers
  // ================================================================

  private func serializeAuthStatus(_ status: AuthorizationStatus) -> String {
    switch status {
    case .notDetermined: return "notDetermined"
    case .approved: return "approved"
    case .denied: return "denied"
    @unknown default: return "notDetermined"
    }
  }

  private func serializeSelection(_ selection: FamilyActivitySelection) -> [String: Any] {
    let appCount = selection.applicationTokens.count
    let categoryCount = selection.categoryTokens.count
    let webDomainCount = selection.webDomainTokens.count
    let total = appCount + categoryCount

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

  /// Walk the UIWindow hierarchy to find a presentable view controller.
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
