#!/usr/bin/env ruby
# Adds the WidgetKit "FidelisWidgetExtension" app-extension target to the iOS
# Xcode project and embeds it in the App target, so the Verse of the Day, Today
# at Mass, and Quote of the Day home-screen widgets are actually built and
# installed. Idempotent: re-running is a no-op once the target exists.
#
# Run from the repo root:  ruby scripts/add-ios-widget-target.rb
#
# The Swift sources, JSON data, and Info.plist live in ios/WidgetExtension/.
# This replaces the previously manual "create a Widget Extension target in
# Xcode" step (docs/guides/IOS.md §5), which is why the widgets never appeared before.

require "xcodeproj"

PROJECT_PATH = File.expand_path("../ios/App/App.xcodeproj", __dir__)
TARGET_NAME = "FidelisWidgetExtension"
# The extension bundle id must be prefixed by the host app's id.
WIDGET_BUNDLE_ID = "app.fidelis.bible.FidelisWidget"
DEPLOYMENT_TARGET = "17.0" # containerBackground(for: .widget) needs iOS 17+
# Source root is the directory holding the .xcodeproj (ios/App); the widget
# files live one level up in ios/WidgetExtension.
WIDGET_DIR_REL = "../WidgetExtension"
SWIFT_FILES = ["FidelisWidget.swift", "CalendarWidgets.swift"]
RESOURCE_FILES = ["votd.json", "calendar.json"]

project = Xcodeproj::Project.open(PROJECT_PATH)

app_target = project.targets.find { |t| t.name == "App" }
raise "App target not found" unless app_target

if project.targets.any? { |t| t.name == TARGET_NAME }
  puts "[skip] #{TARGET_NAME} already exists"
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

widget.build_configurations.each do |config|
  config.build_settings.merge!(
    "PRODUCT_BUNDLE_IDENTIFIER" => WIDGET_BUNDLE_ID,
    "PRODUCT_NAME" => "$(TARGET_NAME)",
    "INFOPLIST_FILE" => "#{WIDGET_DIR_REL}/Info.plist",
    "GENERATE_INFOPLIST_FILE" => "NO",
    "SWIFT_VERSION" => "5.0",
    "IPHONEOS_DEPLOYMENT_TARGET" => DEPLOYMENT_TARGET,
    "TARGETED_DEVICE_FAMILY" => "1,2",
    "MARKETING_VERSION" => "1.13.2",
    "CURRENT_PROJECT_VERSION" => "1",
    "CODE_SIGN_STYLE" => "Automatic",
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
