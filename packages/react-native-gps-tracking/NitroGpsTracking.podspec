require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "NitroGpsTracking"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/OWNER/RNPackage.git", :tag => "#{s.version}" }

  s.source_files = [
    # Implementation (Swift)
    "ios/**/*.{swift}",
    # Autolinking/Registration (Objective-C++)
    "ios/**/*.{m,mm}",
  ]

  s.frameworks = "CoreLocation", "CoreMotion"
  # Shared Kotlin core, built by tool/build_core.sh (not committed).
  s.vendored_frameworks = "ios/Frameworks/TrackingCore.xcframework"
  s.resource_bundles = { "react_native_gps_tracking_privacy" => ["ios/PrivacyInfo.xcprivacy"] }

  load 'nitrogen/generated/ios/NitroGpsTracking+autolinking.rb'
  add_nitrogen_files(s)

  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  install_modules_dependencies(s)
end
