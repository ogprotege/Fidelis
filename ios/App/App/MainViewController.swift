//
//  MainViewController.swift
//  The app's root Capacitor bridge view controller.
//
//  Subclassed to register Fidelis's in-app Capacitor plugins. Capacitor only
//  auto-registers plugins it finds in capacitor.config.json's packageClassList —
//  the list `cap sync`/`cap copy` derives from installed npm plugin packages
//  (here: @capacitor/app and @capacitor/status-bar). SaveImagePlugin and
//  WidgetStatusPlugin are loose classes compiled into the App target, not npm
//  packages, so the bridge never discovers them on its own.
//
//  registerPluginInstance(_:) in capacitorDidLoad() is Capacitor's supported hook
//  for exactly this — it runs immediately after the bridge is created. Main.storyboard's
//  root view controller is set to this class (customModule "App"); the file is wired
//  into the App target's sources by scripts/configure-ios-app-target.rb.
//

import Capacitor
import UIKit
import WebKit

class MainViewController: CAPBridgeViewController, UIGestureRecognizerDelegate {
    static let edgeBackEventName = "fidelis-native-edge-back"

    private var edgeBackGesture: UIScreenEdgePanGestureRecognizer?

    static func makeFidelisPlugins() -> [CAPPlugin] {
        [SaveImagePlugin(), WidgetStatusPlugin()]
    }

    static func makeEdgeBackGesture(
        target: Any?,
        action: Selector?,
        delegate: UIGestureRecognizerDelegate? = nil
    ) -> UIScreenEdgePanGestureRecognizer {
        let gesture = UIScreenEdgePanGestureRecognizer(target: target, action: action)
        gesture.edges = .left
        gesture.delegate = delegate
        // The recognizer observes the shell edge without stealing touches from
        // WebKit controls when the movement does not become a Back gesture.
        gesture.cancelsTouchesInView = false
        return gesture
    }

    static func shouldBeginEdgeBack(
        translationX: CGFloat,
        translationY: CGFloat,
        velocityX: CGFloat,
        velocityY: CGFloat
    ) -> Bool {
        // UIKit normally supplies velocity by the time it asks the delegate.
        // Retain a translation fallback for the beginning of unusually slow
        // drags, then accept only a dominant rightward horizontal movement.
        let hasVelocity = velocityX != 0 || velocityY != 0
        let horizontal = hasVelocity ? velocityX : translationX
        let vertical = hasVelocity ? velocityY : translationY
        return horizontal > 0 && abs(horizontal) > abs(vertical)
    }

    static func shouldCommitEdgeBack(translationX: CGFloat, velocityX: CGFloat) -> Bool {
        translationX >= 72 || velocityX >= 500
    }

    private func installEdgeBackGesture() {
        guard edgeBackGesture == nil, let webView else { return }

        // WKWebView's built-in navigation gesture follows WKBackForwardList.
        // React Router's HashRouter uses same-document History API entries, so
        // that gesture can animate yet leave the route unchanged. Fidelis owns
        // the edge recognizer and asks the web layer to consume its app history.
        webView.allowsBackForwardNavigationGestures = false
        let gesture = Self.makeEdgeBackGesture(
            target: self,
            action: #selector(handleEdgeBack(_:)),
            delegate: self
        )
        webView.addGestureRecognizer(gesture)
        edgeBackGesture = gesture
    }

    func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
        guard let edgeGesture = gestureRecognizer as? UIScreenEdgePanGestureRecognizer else {
            return true
        }

        let translation = edgeGesture.translation(in: edgeGesture.view)
        let velocity = edgeGesture.velocity(in: edgeGesture.view)
        return Self.shouldBeginEdgeBack(
            translationX: translation.x,
            translationY: translation.y,
            velocityX: velocity.x,
            velocityY: velocity.y
        )
    }

    func gestureRecognizer(
        _ gestureRecognizer: UIGestureRecognizer,
        shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
    ) -> Bool {
        // The accepted edge gesture may run beside WKWebView's pan recognizer.
        // The begin gate above keeps vertical and diagonal scrolling out of it.
        gestureRecognizer is UIScreenEdgePanGestureRecognizer
            || otherGestureRecognizer is UIScreenEdgePanGestureRecognizer
    }

    @objc private func handleEdgeBack(_ gesture: UIScreenEdgePanGestureRecognizer) {
        guard gesture.state == .ended, let webView else { return }
        let translationX = gesture.translation(in: webView).x
        let velocityX = gesture.velocity(in: webView).x
        guard Self.shouldCommitEdgeBack(translationX: translationX, velocityX: velocityX) else {
            return
        }

        let script = "window.dispatchEvent(new Event('\(Self.edgeBackEventName)'));"
        webView.evaluateJavaScript(script)
    }

    override func capacitorDidLoad() {
        installEdgeBackGesture()
        Self.makeFidelisPlugins().forEach { plugin in
            bridge?.registerPluginInstance(plugin)
        }
    }
}
