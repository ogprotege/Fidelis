#!/usr/bin/env ruby
# Finishes the iOS *App* target's project wiring — the counterpart to
# add-ios-widget-target.rb (which wires the widget extension). Idempotent:
# re-running is a no-op once everything is in place.
#
#   ruby scripts/configure-ios-app-target.rb
#
# It does five things, all of which a hand-edit of project.pbxproj would do but
# fragilely:
#   1. Bundles PrivacyInfo.xcprivacy (the app's first-party privacy manifest) into
#      the App target's resources.
#   2. Compiles TodaysGospelIntent.swift (the Siri / Shortcuts App Intent) into the
#      App target.
#   2b. Compiles SaveImagePlugin.swift (the in-app Capacitor plugin that saves the
#      share card to Photos) into the App target.
#   3. Bundles calendar.json (the pre-resolved widget data) into the App target too,
#      so the App Intent can read today's Gospel without porting the engine. Reuses
#      the existing file reference the widget target already owns.
#   4. Replaces the deprecated "iPhone Developer" CODE_SIGN_IDENTITY with the modern
#      "Apple Development", so automatic signing picks the distribution identity at
#      archive time without ambiguity.
#
# Run add-ios-widget-target.rb first (it owns the calendar.json reference this
# reuses); both are already reflected in the committed project, so in a fresh
# checkout this script simply confirms the state.

require "xcodeproj"

PROJECT_PATH = File.expand_path("../ios/App/App.xcodeproj", __dir__)

project = Xcodeproj::Project.open(PROJECT_PATH)
app_target = project.targets.find { |t| t.name == "App" }
raise "App target not found" unless app_target

# The group that holds AppDelegate.swift — i.e. ios/App/App — so new file
# references resolve on disk next to it.
def find_group(group)
  return group if group.children.any? { |c| c.respond_to?(:path) && c.path == "AppDelegate.swift" }
  group.children.each do |c|
    next unless c.is_a?(Xcodeproj::Project::Object::PBXGroup)
    found = find_group(c)
    return found if found
  end
  nil
end

app_group = find_group(project.main_group)
raise "App source group (containing AppDelegate.swift) not found" unless app_group

# A file reference for `name` in `group`, created once.
def ensure_ref(group, name)
  group.files.find { |f| f.path == name } || group.new_reference(name)
end

changed = []

# 1. Privacy manifest → App resources.
priv_ref = ensure_ref(app_group, "PrivacyInfo.xcprivacy")
before = app_target.resources_build_phase.files.size
app_target.resources_build_phase.add_file_reference(priv_ref, true)
changed << "PrivacyInfo.xcprivacy → resources" if app_target.resources_build_phase.files.size > before

# 2. App Intent source → App sources.
intent_ref = ensure_ref(app_group, "TodaysGospelIntent.swift")
before = app_target.source_build_phase.files.size
app_target.source_build_phase.add_file_reference(intent_ref, true)
changed << "TodaysGospelIntent.swift → sources" if app_target.source_build_phase.files.size > before

# 2b. The in-app SaveImage Capacitor plugin (share card → Photos) → App sources.
save_ref = ensure_ref(app_group, "SaveImagePlugin.swift")
before = app_target.source_build_phase.files.size
app_target.source_build_phase.add_file_reference(save_ref, true)
changed << "SaveImagePlugin.swift → sources" if app_target.source_build_phase.files.size > before

# 2c. MainViewController.swift (the CAPBridgeViewController subclass that REGISTERS
#     SaveImagePlugin in capacitorDidLoad) → App sources. Capacitor only auto-registers
#     npm-package plugins via capacitor.config.json's packageClassList, so a loose
#     app-target plugin like SaveImagePlugin must be registered here or it never loads
#     (Main.storyboard's root VC points at this class).
mvc_ref = ensure_ref(app_group, "MainViewController.swift")
before = app_target.source_build_phase.files.size
app_target.source_build_phase.add_file_reference(mvc_ref, true)
changed << "MainViewController.swift → sources" if app_target.source_build_phase.files.size > before

# 3. calendar.json (the widget's pre-resolved data) → App resources, so the Intent
#    can read today's Gospel. Reuse the reference the widget target already owns.
cal_ref = project.files.find { |f| f.path == "calendar.json" }
if cal_ref
  before = app_target.resources_build_phase.files.size
  app_target.resources_build_phase.add_file_reference(cal_ref, true)
  changed << "calendar.json → App resources" if app_target.resources_build_phase.files.size > before
else
  warn "[warn] calendar.json reference not found — run add-ios-widget-target.rb first; the App Intent has no data to read."
end

# 4. Modernize the signing identity wherever the deprecated name appears (project +
#    App target build configs, including any SDK-scoped CODE_SIGN_IDENTITY[...] key).
(project.build_configurations + app_target.build_configurations).each do |config|
  config.build_settings.keys.grep(/\ACODE_SIGN_IDENTITY/).each do |key|
    if config.build_settings[key] == "iPhone Developer"
      config.build_settings[key] = "Apple Development"
      changed << "#{config.name}: #{key} → Apple Development"
    end
  end
end

project.save

if changed.empty?
  puts "[skip] App target already configured"
else
  puts "[ok] configured App target:"
  changed.uniq.each { |c| puts "       - #{c}" }
end
