require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "NitroLiveActivityTracking"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "15.1" }
  s.source       = { :git => "https://github.com/OWNER/RNPackage.git", :tag => "#{s.version}" }

  s.source_files = [
    # Implementation (Swift). `ios/Shared` is also added by hand to the Widget Extension target (see README).
    "ios/**/*.{swift}",
    # Autolinking/Registration (Objective-C++)
    "ios/**/*.{m,mm}",
  ]
  # The widget UI is a template for the Widget Extension target: it must NOT be compiled into the app.
  s.exclude_files = ["ios/WidgetTemplate/**/*"]

  s.frameworks = "ActivityKit"
  s.resource_bundles = { "react_native_live_activity_tracking_privacy" => ["ios/PrivacyInfo.xcprivacy"] }

  load 'nitrogen/generated/ios/NitroLiveActivityTracking+autolinking.rb'
  add_nitrogen_files(s)

  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  install_modules_dependencies(s)
end
