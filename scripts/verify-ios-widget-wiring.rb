#!/usr/bin/env ruby
# No-write structural guard for native widget, bridge, App Group, and XCTest
# wiring. Runtime behavior lives in WidgetContractsTests.swift; this catches the
# project-file and entitlement drift that a Swift test bundle cannot observe.

require "xcodeproj"

ROOT = File.expand_path("..", __dir__)
PROJECT_PATH = File.join(ROOT, "ios/App/App.xcodeproj")
SCHEME_PATH = File.join(PROJECT_PATH, "xcshareddata/xcschemes/App.xcscheme")
APP_GROUP = "group.app.fidelis.bible"

def assert(condition, message)
  raise "[FAIL] #{message}" unless condition
  puts "[ok] #{message}"
end

def source_names(target)
  target.source_build_phase.files_references.map(&:path).compact
end

def entitlement_groups(path)
  plist = Xcodeproj::Plist.read_from_path(path)
  plist.fetch("com.apple.security.application-groups", [])
end

project = Xcodeproj::Project.open(PROJECT_PATH)
app = project.targets.find { |target| target.name == "App" }
widget = project.targets.find { |target| target.name == "FidelisWidgetExtension" }
tests = project.targets.find { |target| target.name == "FidelisNativeTests" }

assert(!app.nil?, "App target exists")
assert(!widget.nil?, "FidelisWidgetExtension target exists")
assert(!tests.nil?, "FidelisNativeTests target exists")

expected_app_sources = %w[
  MainViewController.swift
  WidgetContracts.swift
  WidgetSharedSettings.swift
  WidgetStatusPlugin.swift
]
expected_widget_sources = %w[
  CalendarWidgets.swift
  FidelisWidget.swift
  WidgetContracts.swift
  WidgetSharedSettings.swift
]
expected_test_sources = %w[WidgetContractsTests.swift]

assert((expected_app_sources - source_names(app)).empty?, "App compiles the widget bridge contracts")
assert((expected_widget_sources - source_names(widget)).empty?, "Widget Extension compiles the shared contracts")
assert((expected_test_sources - source_names(tests)).empty?, "native XCTest source is compiled")

assert(
  app.build_configurations.all? { |configuration| configuration.build_settings["CODE_SIGN_ENTITLEMENTS"] == "App/App.entitlements" },
  "every App configuration uses App/App.entitlements"
)
assert(
  widget.build_configurations.all? do |configuration|
    configuration.build_settings["CODE_SIGN_ENTITLEMENTS"] == "../WidgetExtension/WidgetExtension.entitlements"
  end,
  "every Widget Extension configuration uses WidgetExtension.entitlements"
)
assert(
  entitlement_groups(File.join(ROOT, "ios/App/App/App.entitlements")) == [APP_GROUP],
  "App entitlement requests only the Fidelis App Group"
)
assert(
  entitlement_groups(File.join(ROOT, "ios/WidgetExtension/WidgetExtension.entitlements")) == [APP_GROUP],
  "Widget Extension entitlement requests the same App Group"
)

assert(app.dependencies.any? { |dependency| dependency.target == widget }, "App depends on the Widget Extension")
assert(tests.dependencies.any? { |dependency| dependency.target == app }, "native tests are hosted by App")

embedded_products = app.copy_files_build_phases.flat_map(&:files_references).compact.map(&:path)
assert(embedded_products.include?("FidelisWidgetExtension.appex"), "App embeds FidelisWidgetExtension.appex")

scheme = Xcodeproj::XCScheme.new(SCHEME_PATH)
assert(scheme.to_s.include?(tests.uuid), "shared App scheme executes FidelisNativeTests")

main_view_controller = File.read(File.join(ROOT, "ios/App/App/MainViewController.swift"))
assert(main_view_controller.include?("Self.makeFidelisPlugins()"), "Capacitor load hook uses the tested plugin factory")

calendar_widgets = File.read(File.join(ROOT, "ios/WidgetExtension/CalendarWidgets.swift"))
verse_widget = File.read(File.join(ROOT, "ios/WidgetExtension/FidelisWidget.swift"))
assert(
  calendar_widgets.include?("FidelisWidgetDescriptor.mass.destinationURL") &&
    calendar_widgets.include?("FidelisWidgetDescriptor.quote.destinationURL") &&
    verse_widget.include?("FidelisWidgetDescriptor.verse.destinationURL"),
  "all widget taps use the tested deep-link descriptors"
)

puts "iOS widget wiring verification passed."
