//
//  MainViewController.swift
//  The app's root Capacitor bridge view controller.
//
//  Subclassed for one reason: to register the in-app SaveImagePlugin. Capacitor
//  only auto-registers plugins it finds in capacitor.config.json's packageClassList
//  — the list `cap sync`/`cap copy` derives from the installed npm plugin packages
//  (here: @capacitor/app, @capacitor/status-bar). SaveImagePlugin is a loose class
//  compiled into the App target, NOT an npm package, so the bridge never discovers
//  it on its own (registerPlugins() does no Obj-C runtime scan). Without this hook
//  registerPlugin("SaveImage") on the web side resolves to a no-op, the share card's
//  "Save image" never reaches native code, and iOS never even shows the add-only
//  Photos prompt (Fidelis never appears under Settings → Privacy → Photos).
//
//  registerPluginInstance(_:) in capacitorDidLoad() is Capacitor's supported hook
//  for exactly this — it runs immediately after the bridge is created. Main.storyboard's
//  root view controller is set to this class (customModule "App"); the file is wired
//  into the App target's sources by scripts/configure-ios-app-target.rb.
//

import Capacitor
import UIKit

class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SaveImagePlugin())
    }
}
