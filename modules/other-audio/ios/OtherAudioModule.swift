import AVFoundation
import ExpoModulesCore

/// 다른 앱(음악 앱 등)이 소리를 내고 있는지 알려 줍니다.
/// 오디오 세션을 바꾸거나 활성화하지 않으므로 다른 앱의 재생에 영향을 주지 않습니다.
public class OtherAudioModule: Module {
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("OtherAudio")

    Events("onSilenceHintChange")

    /// 배경음을 양보해야 하는지. 음악 앱처럼 다른 앱이 주 오디오를 재생 중이면 true.
    Function("isOtherAudioPlaying") { () -> Bool in
      let session = AVAudioSession.sharedInstance()
      return session.secondaryAudioShouldBeSilencedHint || session.isOtherAudioPlaying
    }

    OnStartObserving {
      self.observer = NotificationCenter.default.addObserver(
        forName: AVAudioSession.silenceSecondaryAudioHintNotification,
        object: AVAudioSession.sharedInstance(),
        queue: .main
      ) { [weak self] note in
        guard
          let raw = note.userInfo?[AVAudioSessionSilenceSecondaryAudioHintTypeKey] as? UInt,
          let type = AVAudioSession.SilenceSecondaryAudioHintType(rawValue: raw)
        else { return }
        self?.sendEvent("onSilenceHintChange", ["otherAudioPlaying": type == .begin])
      }
    }

    OnStopObserving {
      if let observer = self.observer {
        NotificationCenter.default.removeObserver(observer)
      }
      self.observer = nil
    }
  }
}
