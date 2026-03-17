import SwiftUI
import FamilyControls

/// A UIHostingController that wraps Apple's FamilyActivityPicker in SwiftUI
/// so it can be presented modally from the Expo native module.
///
/// FamilyActivityPicker is the system-provided UI for choosing which apps,
/// categories, and web domains to shield/block. It uses opaque tokens --
/// the app never sees actual bundle IDs or app names (Apple's privacy design).
@available(iOS 16.0, *)
class AppPickerHostingController: UIHostingController<AppPickerView> {

  init(
    onSelection: @escaping (FamilyActivitySelection) -> Void,
    onCancel: @escaping () -> Void
  ) {
    let view = AppPickerView(onSelection: onSelection, onCancel: onCancel)
    super.init(rootView: view)
  }

  @MainActor required dynamic init?(coder aDecoder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }
}

/// SwiftUI view that wraps FamilyActivityPicker with a navigation bar
/// and "Done" / "Cancel" buttons.
@available(iOS 16.0, *)
struct AppPickerView: View {
  @State private var selection = FamilyActivitySelection()
  let onSelection: (FamilyActivitySelection) -> Void
  let onCancel: () -> Void

  var body: some View {
    NavigationView {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle("Select Apps to Block")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .confirmationAction) {
            Button("Done") {
              onSelection(selection)
              dismiss()
            }
          }
          ToolbarItem(placement: .cancellationAction) {
            Button("Cancel") {
              onCancel()
              dismiss()
            }
          }
        }
    }
  }

  private func dismiss() {
    if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
       let window = windowScene.windows.first(where: { $0.isKeyWindow }),
       let rootVC = window.rootViewController {
      rootVC.dismiss(animated: true)
    }
  }
}
