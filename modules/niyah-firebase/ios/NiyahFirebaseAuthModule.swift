import ExpoModulesCore
import FirebaseCore
import FirebaseAuth

/// Expo module bridging Firebase Auth to JavaScript.
/// Handles sign-in (Google credential, Apple credential, email link),
/// sign-out, and auth state change events.
public class NiyahFirebaseAuthModule: Module {
  private var authStateHandle: AuthStateDidChangeListenerHandle?

  public func definition() -> ModuleDefinition {
    Name("NiyahFirebaseAuth")

    Events("onAuthStateChanged")

    // ------------------------------------------------------------------
    // Sign in with a credential (Google or Apple)
    // provider: "google" | "apple"
    // idToken: the identity/id token from the provider
    // rawNonce: (Apple only) the raw nonce used during Apple sign-in
    // ------------------------------------------------------------------
    AsyncFunction("signInWithCredential") {
      (provider: String, idToken: String, rawNonce: String?) -> [String: Any?] in

      let credential: AuthCredential
      switch provider {
      case "google":
        credential = GoogleAuthProvider.credential(withIDToken: idToken, accessToken: "")
      case "apple":
        guard let nonce = rawNonce else {
          throw NSError(
            domain: "NiyahFirebaseAuth",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: "rawNonce is required for Apple sign-in"]
          )
        }
        credential = OAuthProvider.appleCredential(
          withIDToken: idToken,
          rawNonce: nonce,
          fullName: nil
        )
      default:
        throw NSError(
          domain: "NiyahFirebaseAuth",
          code: 2,
          userInfo: [NSLocalizedDescriptionKey: "Unknown provider: \(provider)"]
        )
      }

      let result = try await Auth.auth().signIn(with: credential)
      let isNew = result.additionalUserInfo?.isNewUser ?? false
      return self.serializeUser(result.user, isNewUser: isNew)
    }

    // ------------------------------------------------------------------
    // Send email sign-in link (passwordless / magic link)
    // ------------------------------------------------------------------
    AsyncFunction("sendSignInLinkToEmail") {
      (email: String, actionCodeURL: String, bundleId: String) in

      let settings = ActionCodeSettings()
      settings.url = URL(string: actionCodeURL)
      settings.handleCodeInApp = true
      settings.setIOSBundleID(bundleId)

      try await Auth.auth().sendSignInLink(toEmail: email, actionCodeSettings: settings)
    }

    // ------------------------------------------------------------------
    // Check if a URL is a sign-in email link
    // ------------------------------------------------------------------
    Function("isSignInWithEmailLink") { (link: String) -> Bool in
      return Auth.auth().isSignIn(withEmailLink: link)
    }

    // ------------------------------------------------------------------
    // Complete sign-in with email link
    // ------------------------------------------------------------------
    AsyncFunction("signInWithEmailLink") {
      (email: String, link: String) -> [String: Any?] in

      let result = try await Auth.auth().signIn(withEmail: email, link: link)
      let isNew = result.additionalUserInfo?.isNewUser ?? false
      return self.serializeUser(result.user, isNewUser: isNew)
    }

    // ------------------------------------------------------------------
    // Sign out
    // ------------------------------------------------------------------
    AsyncFunction("signOut") {
      try Auth.auth().signOut()
    }

    // ------------------------------------------------------------------
    // Get current user (synchronous)
    // ------------------------------------------------------------------
    Function("getCurrentUser") { () -> [String: Any?]? in
      guard let user = Auth.auth().currentUser else { return nil }
      return self.serializeUser(user, isNewUser: false)
    }

    // ------------------------------------------------------------------
    // Module lifecycle
    // ------------------------------------------------------------------
    OnCreate {
      // Ensure Firebase is configured on module init
      if FirebaseApp.app() == nil {
        FirebaseApp.configure()
      }
    }

    // ------------------------------------------------------------------
    // Auth state listener lifecycle
    // ------------------------------------------------------------------
    OnStartObserving {
      self.authStateHandle = Auth.auth().addStateDidChangeListener { [weak self] _, user in
        guard let self = self else { return }
        if let user = user {
          let data = self.serializeUser(user, isNewUser: false)
          self.sendEvent("onAuthStateChanged", ["user": data])
        } else {
          self.sendEvent("onAuthStateChanged", ["user": nil])
        }
      }
    }

    OnStopObserving {
      if let handle = self.authStateHandle {
        Auth.auth().removeStateDidChangeListener(handle)
        self.authStateHandle = nil
      }
    }
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  private func serializeUser(_ user: FirebaseAuth.User, isNewUser: Bool) -> [String: Any?] {
    let providerId = user.providerData.first?.providerID
    return [
      "uid": user.uid,
      "email": user.email,
      "displayName": user.displayName,
      "photoURL": user.photoURL?.absoluteString,
      "phoneNumber": user.phoneNumber,
      "providerId": providerId,
      "isNewUser": isNewUser,
    ]
  }
}
