Pod::Spec.new do |s|
  s.name           = 'OtherAudio'
  s.version        = '1.0.0'
  s.summary        = 'Reports whether another app is playing audio'
  s.description    = 'Reads AVAudioSession other-audio state for the Shimpyo app'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift}"
end
