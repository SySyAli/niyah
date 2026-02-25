Pod::Spec.new do |s|
  s.name           = 'NiyahScreenTime'
  s.version        = '1.0.0'
  s.summary        = 'Screen Time API bridge for NIYAH'
  s.description    = 'Custom Expo module bridging iOS FamilyControls, ManagedSettings, and DeviceActivity to JavaScript for app blocking during focus sessions.'
  s.homepage       = 'https://github.com/niyah'
  s.license        = 'MIT'
  s.author         = 'NIYAH'
  s.platforms      = { :ios => '16.0' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'

  s.source_files   = 'ios/**/*.swift'

  # Screen Time frameworks are system frameworks -- no CocoaPods deps needed.
  # They are linked via weak_framework so the app still launches on iOS < 16
  # (with feature-gated unavailability).
  s.weak_frameworks = 'FamilyControls', 'ManagedSettings', 'DeviceActivity'
end
