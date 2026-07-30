// Keychain storage for the watch bootstrap Bearer credential.

import Foundation
import Security

enum WatchKeychain {
  private static let service = "com.hexastral.yuun.watch"
  private static let account = WatchStoreKeys.credential

  static func saveCredential(_ token: String) {
    guard let data = token.data(using: .utf8) else { return }
    deleteCredential()
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
      kSecValueData as String: data,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
    ]
    let status = SecItemAdd(query as CFDictionary, nil)
    if status != errSecSuccess {
      NSLog("[YuunWatch] Keychain save failed status=\(status)")
    }
  }

  static func loadCredential() -> String? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)
    guard status == errSecSuccess,
          let data = item as? Data,
          let token = String(data: data, encoding: .utf8),
          !token.isEmpty
    else { return nil }
    return token
  }

  static func deleteCredential() {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
    ]
    SecItemDelete(query as CFDictionary)
  }

  static var hasCredential: Bool {
    loadCredential() != nil
  }
}
