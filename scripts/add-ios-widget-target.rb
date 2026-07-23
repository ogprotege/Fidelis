#!/usr/bin/env ruby
# Adds the WidgetKit "FidelisWidgetExtension" app-extension target to the iOS
# Xcode project and embeds it in the App target, so the Verse of the Day, Today
# at Mass, and Quote of the Day home-screen widgets are actually built and
# installed. Idempotent and reconciling: re-running adds any newly committed
# widget sources/resources to an existing target without duplicating phases.
#
# Run from the repo root:  ruby scripts/add-ios-widget-target.rb
#
# The Swift sources, JSON data, and Info.plist live in ios/WidgetExtension/.
# This replaces the previously manual "create a Widget Extension target in
# Xcode" step (docs/guides/IOS.md §5), which is why the widgets never appeared before.

require "xcodeproj"
require "json"

PROJECT_PATH = File.expand_path("../ios/App/App.xcodeproj", __dir__)
TARGET_NAME = "FidelisWidgetExtension"

# The widget's version must track the app's, not a literal frozen in this script.
# MARKETING_VERSION follows package.json (the single release-version source);
# CURRENT_PROJECT_VERSION (the build number) is read off the App target below so
# the widget is always in lockstep with whatever build is being shipped.
PACKAGE_VERSION = JSON.parse(File.read(File.expand_path("../package.json", __dir__)))["version"]
# The extension bundle id must be prefixed by the host app's id.
WIDGET_BUNDLE_ID = "app.fidelis.bible.FidelisWidget"
DEPLOYMENT_TARGET = "17.0" # containerBackground(for: .widget) needs iOS 17+
# Source root is the directory holding the .xcodeproj (ios/App); the widget
# files live one level up in ios/WidgetExtension.
WIDGET_DIR_REL = "../WidgetExtension"
WIDGET_ENTITLEMENTS = "#{WIDGET_DIR_REL}/WidgetExtension.entitlements"
SWIFT_FILES = [
  "FidelisWidget.swift",
  "CalendarWidgets.swift",
  "WidgetContracts.swift",
  "WidgetSharedSettings.swift"
]
RESOURCE_FILES = ["votd.json", "calendar.json"]

project = Xcodeproj::Project.open(PROJECT_PATH)

app_target = project.targets.find { |t| t.name == "App" }
raise "App target not found" unless app_target

existing_widget = project.targets.find { |t| t.name == TARGET_NAME }
if existing_widget
  group = project.main_group.children.find do |child|
    child.is_a?(Xcodeproj::Project::Object::PBXGroup) &&
      (child.name == TARGET_NAME || child.path == WIDGET_DIR_REL)
  end
  raise "#{TARGET_NAME} source group not found" unless group

  changed = []
  SWIFT_FILES.each do |name|
    ref = group.files.find { |file| file.path == name } || group.new_reference(name)
    before = existing_widget.source_build_phase.files.size
    existing_widget.source_build_phase.add_file_reference(ref, true)
    changed << "#{name} → widget sources" if existing_widget.source_build_phase.files.size > before
  end
  RESOURCE_FILES.each do |name|
    ref = group.files.find { |file| file.path == name } || group.new_reference(name)
    before = existing_widget.resources_build_phase.files.size
    existing_widget.resources_build_phase.add_file_reference(ref, true)
    changed << "#{name} → widget resources" if existing_widget.resources_build_phase.files.size > before
  end

  existing_widget.build_configurations.each do |config|
    next if config.build_settings["CODE_SIGN_ENTITLEMENTS"] == WIDGET_ENTITLEMENTS
    config.build_settings["CODE_SIGN_ENTITLEMENTS"] = WIDGET_ENTITLEMENTS
    changed << "#{config.name}: App Group entitlements"
  end

  project.save unless changed.empty?
  if changed.empty?
    puts "[skip] #{TARGET_NAME} already reconciled"
  else
    puts "[ok] reconciled #{TARGET_NAME}:"
    changed.each { |item| puts "       - #{item}" }
  end
  exit 0
end

widget = project.new_target(:app_extension, TARGET_NAME, :ios, DEPLOYMENT_TARGET)

# A group pointing at ios/WidgetExtension so file refs resolve on disk.
group = project.main_group.new_group("FidelisWidgetExtension", WIDGET_DIR_REL)

# Compile the Swift sources.
SWIFT_FILES.each do |name|
  ref = group.new_reference(name)
  widget.source_build_phase.add_file_reference(ref)
end

# Bundle the pre-resolved JSON data the widgets read.
RESOURCE_FILES.each do |name|
  ref = group.new_reference(name)
  widget.resources_build_phase.add_file_reference(ref)
end

# Keep the Info.plist visible in the project navigator (referenced via setting).
group.new_reference("Info.plist")

# The App target's build number (kept in lockstep so the .appex and the host app
# never ship a mismatched CFBundleVersion). Falls back to "1" before any bump.
app_build = app_target.build_configurations
                      .map { |c| c.build_settings["CURRENT_PROJECT_VERSION"] }
                      .compact.first || "1"

widget.build_configurations.each do |config|
  config.build_settings.merge!(
    "PRODUCT_BUNDLE_IDENTIFIER" => WIDGET_BUNDLE_ID,
    "PRODUCT_NAME" => "$(TARGET_NAME)",
    "INFOPLIST_FILE" => "#{WIDGET_DIR_REL}/Info.plist",
    "GENERATE_INFOPLIST_FILE" => "NO",
    "SWIFT_VERSION" => "5.0",
    "IPHONEOS_DEPLOYMENT_TARGET" => DEPLOYMENT_TARGET,
    "TARGETED_DEVICE_FAMILY" => "1,2",
    "MARKETING_VERSION" => PACKAGE_VERSION,
    "CURRENT_PROJECT_VERSION" => app_build,
    "CODE_SIGN_STYLE" => "Automatic",
    "CODE_SIGN_ENTITLEMENTS" => WIDGET_ENTITLEMENTS,
    "SKIP_INSTALL" => "YES",
    "SWIFT_EMIT_LOC_STRINGS" => "YES",
    "LD_RUNPATH_SEARCH_PATHS" => [
      "$(inherited)",
      "@executable_path/Frameworks",
      "@executable_path/../../Frameworks"
    ]
  )
end

# Build the widget before the app, and embed the .appex in the app's PlugIns.
app_target.add_dependency(widget)

embed_phase = app_target.copy_files_build_phases.find { |p| p.name == "Embed Foundation Extensions" }
embed_phase ||= app_target.new_copy_files_build_phase("Embed Foundation Extensions")
embed_phase.symbol_dst_subfolder_spec = :plug_ins
build_file = embed_phase.add_file_reference(widget.product_reference)
build_file.settings = { "ATTRIBUTES" => ["RemoveHeadersOnCopy"] }

project.save
puts "[ok] added #{TARGET_NAME} (#{WIDGET_BUNDLE_ID}) and embedded it in App"
