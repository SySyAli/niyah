import ExpoModulesCore
import FirebaseCore
import FirebaseFirestore

/// Expo module bridging Firestore to JavaScript.
/// Provides getDoc, setDoc, updateDoc, and deleteDoc operations.
public class NiyahFirestoreModule: Module {

  public func definition() -> ModuleDefinition {
    Name("NiyahFirestore")

    // Ensure Firebase is configured before any Firestore call.
    // The auth module also calls this, but module init order is not guaranteed.
    OnCreate {
      if FirebaseApp.app() == nil {
        FirebaseApp.configure()
      }
    }

    // ------------------------------------------------------------------
    // Get a document
    // ------------------------------------------------------------------
    AsyncFunction("getDoc") {
      (collectionPath: String, documentId: String) -> [String: Any]? in

      let snapshot = try await Firestore.firestore()
        .collection(collectionPath)
        .document(documentId)
        .getDocument()

      guard snapshot.exists, let data = snapshot.data() else {
        return nil
      }

      return self.serializeFirestoreData(data, id: snapshot.documentID)
    }

    // ------------------------------------------------------------------
    // Set a document (merge by default)
    // ------------------------------------------------------------------
    AsyncFunction("setDoc") {
      (collectionPath: String, documentId: String, data: [String: Any], merge: Bool) in

      // Convert any special sentinel values
      let processedData = self.processWriteData(data)

      try await Firestore.firestore()
        .collection(collectionPath)
        .document(documentId)
        .setData(processedData, merge: merge)
    }

    // ------------------------------------------------------------------
    // Update a document (fails if doc doesn't exist)
    // ------------------------------------------------------------------
    AsyncFunction("updateDoc") {
      (collectionPath: String, documentId: String, data: [String: Any]) in

      let processedData = self.processWriteData(data)

      try await Firestore.firestore()
        .collection(collectionPath)
        .document(documentId)
        .updateData(processedData)
    }

    // ------------------------------------------------------------------
    // Delete a document
    // ------------------------------------------------------------------
    AsyncFunction("deleteDoc") {
      (collectionPath: String, documentId: String) in

      try await Firestore.firestore()
        .collection(collectionPath)
        .document(documentId)
        .delete()
    }

    // ------------------------------------------------------------------
    // Server timestamp helper — returns a sentinel marker
    // that processWriteData converts to FieldValue.serverTimestamp()
    // ------------------------------------------------------------------
    Function("serverTimestamp") { () -> [String: String] in
      return ["__type": "serverTimestamp"]
    }
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  /// Convert Firestore data to JSON-safe types.
  private func serializeFirestoreData(_ data: [String: Any], id: String) -> [String: Any] {
    var result: [String: Any] = ["__id": id]
    for (key, value) in data {
      result[key] = serializeValue(value)
    }
    return result
  }

  private func serializeValue(_ value: Any) -> Any {
    switch value {
    case let timestamp as Timestamp:
      return timestamp.dateValue().timeIntervalSince1970 * 1000 // JS Date expects millis
    case let dict as [String: Any]:
      var result: [String: Any] = [:]
      for (k, v) in dict {
        result[k] = serializeValue(v)
      }
      return result
    case let arr as [Any]:
      return arr.map { serializeValue($0) }
    case let ref as DocumentReference:
      return ref.path
    default:
      return value
    }
  }

  /// Convert sentinel markers (e.g. serverTimestamp) in write data to Firestore FieldValues.
  private func processWriteData(_ data: [String: Any]) -> [String: Any] {
    var result: [String: Any] = [:]
    for (key, value) in data {
      if let dict = value as? [String: Any] {
        if dict["__type"] as? String == "serverTimestamp" {
          result[key] = FieldValue.serverTimestamp()
        } else {
          result[key] = processWriteData(dict)
        }
      } else {
        result[key] = value
      }
    }
    return result
  }
}
