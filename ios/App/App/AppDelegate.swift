import UIKit
import WebKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Dynamic Type (docs/guides/IOS.md §5): mirror the device's text-size
        // setting into the web layer so the reading size can follow it until the
        // A−/A+ pills override. Re-push whenever the system setting changes.
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(contentSizeCategoryDidChange),
            name: UIContentSizeCategory.didChangeNotification,
            object: nil
        )
        return true
    }

    @objc private func contentSizeCategoryDidChange() {
        pushContentSize(after: 0)
    }

    /// Evaluate the web bridge with the current content-size token, after `delay`.
    private func pushContentSize(after delay: TimeInterval) {
        let token = AppDelegate.token(for: UIApplication.shared.preferredContentSizeCategory)
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            guard let webView = self?.findBridgeWebView() else { return }
            let js = "window.__fidelisSetContentSize && window.__fidelisSetContentSize('\(token)')"
            webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    /// Capacitor's bridge view controller owns the WKWebView; find it wherever it
    /// sits in the hierarchy (root, a child, or presented).
    private func findBridgeWebView() -> WKWebView? {
        func search(_ vc: UIViewController?) -> WKWebView? {
            guard let vc = vc else { return nil }
            if let bridgeVC = vc as? CAPBridgeViewController { return bridgeVC.webView }
            for child in vc.children {
                if let found = search(child) { return found }
            }
            return search(vc.presentedViewController)
        }
        return search(window?.rootViewController)
    }

    /// Map a UIContentSizeCategory to the stable token the web layer maps to a px
    /// preset (src/lib/typography.ts → contentTokenToPx). All accessibility sizes
    /// collapse to the app's largest reading size.
    private static func token(for category: UIContentSizeCategory) -> String {
        switch category {
        case .extraSmall: return "xs"
        case .small: return "s"
        case .medium: return "m"
        case .large: return "l"
        case .extraLarge: return "xl"
        case .extraExtraLarge: return "xxl"
        case .extraExtraExtraLarge: return "xxxl"
        default:
            return category.rawValue.contains("Accessibility") ? "ax" : "l"
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
        // Push the system Dynamic Type size to the web layer. The web view may still
        // be loading on a cold launch, so nudge twice — the web hook ignores a push
        // that arrives before it is installed, and applies the later one. Both are
        // cheap no-ops once the size already matches.
        pushContentSize(after: 0.2)
        pushContentSize(after: 1.0)
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
