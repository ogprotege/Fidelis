//
//  SaveImagePlugin.swift
//  A minimal in-app Capacitor plugin that writes a PNG — sent from the web layer as
//  a base64 data URL — to the system photo library. It backs the §8.3 share card's
//  "Save image" button on iOS, where the web `<a download>` is a silent no-op inside
//  WKWebView.
//
//  It uses UIImageWriteToSavedPhotosAlbum, which requires only the *add-only*
//  NSPhotoLibraryAddUsageDescription permission: the app can save a card out, but
//  can never read the photo library back — matching the app's "Scripture goes out;
//  nothing comes back" ethos. No third-party dependency.
//
//  Registered automatically by Capacitor's runtime via CAPBridgedPlugin (the same
//  mechanism packaged plugins use); the web side reaches it with
//  registerPlugin("SaveImage") in src/lib/saveImage.ts. Wired into the App target's
//  sources by scripts/configure-ios-app-target.rb.
//

import Foundation
import Capacitor
import UIKit

@objc(SaveImagePlugin)
public class SaveImagePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SaveImagePlugin"
    public let jsName = "SaveImage"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "savePhoto", returnType: CAPPluginReturnPromise)
    ]

    // Held across the async write so the call (and its JS promise) isn't released
    // before the completion selector fires. One save at a time — the UI is modal.
    private var pendingCall: CAPPluginCall?

    @objc func savePhoto(_ call: CAPPluginCall) {
        guard let raw = call.getString("data") else {
            call.reject("No image data provided.")
            return
        }
        // Accept either a bare base64 string or a "data:image/png;base64,…" URL.
        let base64 = raw.components(separatedBy: ",").last ?? raw
        guard let data = Data(base64Encoded: base64), let image = UIImage(data: data) else {
            call.reject("Could not decode the image.")
            return
        }
        pendingCall = call
        DispatchQueue.main.async {
            UIImageWriteToSavedPhotosAlbum(
                image, self, #selector(self.didFinishSaving(_:error:contextInfo:)), nil
            )
        }
    }

    @objc private func didFinishSaving(
        _ image: UIImage, error: Error?, contextInfo: UnsafeMutableRawPointer?
    ) {
        let call = pendingCall
        pendingCall = nil
        if let error = error {
            // Most often: the user denied the add-only photo permission.
            call?.reject(error.localizedDescription)
        } else {
            call?.resolve()
        }
    }
}
