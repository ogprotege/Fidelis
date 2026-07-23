#!/usr/bin/env ruby
# Adds the hosted FidelisNativeTests XCTest target and wires it into the shared
# App scheme. Idempotent and reconciling, like the two production-target scripts.

require "xcodeproj"

PROJECT_PATH = File.expand_path("../ios/App/App.xcodeproj", __dir__)
SCHEME_PATH = File.join(PROJECT_PATH, "xcshareddata/xcschemes/App.xcscheme")
TARGET_NAME = "FidelisNativeTests"
TEST_DIR_REL = "AppTests"
TEST_FILES = ["WidgetContractsTests.swift"]
DEPLOYMENT_TARGET = "17.0"

project = Xcodeproj::Project.open(PROJECT_PATH)
app_target = project.targets.find { |target| target.name == "App" }
raise "App target not found" unless app_target

test_target = project.targets.find { |target| target.name == TARGET_NAME }
changed = []

unless test_target
  test_target = project.new_target(:unit_test_bundle, TARGET_NAME, :ios, DEPLOYMENT_TARGET)
  changed << "created #{TARGET_NAME}"
end

test_group = project.main_group.children.find do |child|
  child.is_a?(Xcodeproj::Project::Object::PBXGroup) &&
    (child.name == TARGET_NAME || child.path == TEST_DIR_REL)
end
unless test_group
  test_group = project.main_group.new_group(TARGET_NAME, TEST_DIR_REL)
  changed << "created #{TARGET_NAME} source group"
end

TEST_FILES.each do |name|
  reference = test_group.files.find { |file| file.path == name } || test_group.new_reference(name)
  before = test_target.source_build_phase.files.size
  test_target.source_build_phase.add_file_reference(reference, true)
  changed << "#{name} → native test sources" if test_target.source_build_phase.files.size > before
end

unless test_target.dependencies.any? { |dependency| dependency.target == app_target }
  test_target.add_dependency(app_target)
  changed << "#{TARGET_NAME} → App dependency"
end

test_target.build_configurations.each do |configuration|
  desired = {
    "BUNDLE_LOADER" => "$(TEST_HOST)",
    "CODE_SIGN_STYLE" => "Automatic",
    "GENERATE_INFOPLIST_FILE" => "YES",
    "IPHONEOS_DEPLOYMENT_TARGET" => DEPLOYMENT_TARGET,
    "LD_RUNPATH_SEARCH_PATHS" => [
      "$(inherited)",
      "@executable_path/Frameworks",
      "@loader_path/Frameworks"
    ],
    "PRODUCT_BUNDLE_IDENTIFIER" => "app.fidelis.bible.native-tests",
    "PRODUCT_NAME" => "$(TARGET_NAME)",
    "SWIFT_VERSION" => "5.0",
    "TARGETED_DEVICE_FAMILY" => "1,2",
    "TEST_HOST" => "$(BUILT_PRODUCTS_DIR)/App.app/$(BUNDLE_EXECUTABLE_FOLDER_PATH)/App"
  }
  desired.each do |key, value|
    next if configuration.build_settings[key] == value
    configuration.build_settings[key] = value
    changed << "#{configuration.name}: #{key}"
  end
end

project.save unless changed.empty?

scheme = Xcodeproj::XCScheme.new(SCHEME_PATH)
unless scheme.to_s.include?(test_target.uuid)
  scheme.add_build_target(test_target, false)
  scheme.add_test_target(test_target)
  scheme.save!
  changed << "#{TARGET_NAME} → shared App scheme"
end

if changed.empty?
  puts "[skip] #{TARGET_NAME} already reconciled"
else
  puts "[ok] reconciled #{TARGET_NAME}:"
  changed.uniq.each { |item| puts "       - #{item}" }
end
