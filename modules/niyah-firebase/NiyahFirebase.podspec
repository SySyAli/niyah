require 'json'

Pod::Spec.new do |s|
  s.name           = 'NiyahFirebase'
  s.version        = '1.0.0'
  s.summary        = 'Swift Firebase bridge for NIYAH'
  s.description    = 'Custom Expo module providing Firebase Auth and Firestore via Swift — bypasses @react-native-firebase Obj-C bridge for clean static library builds.'
  s.homepage       = 'https://github.com/niyah'
  s.license        = 'MIT'
  s.author         = 'NIYAH'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_versions = ['5.9', '6.0']

  s.dependency 'ExpoModulesCore'
  s.dependency 'FirebaseCore', '~> 12.0'
  s.dependency 'FirebaseAuth', '~> 12.0'
  s.dependency 'FirebaseFirestore', '~> 12.0'

  s.source_files   = 'ios/**/*.swift'
end
