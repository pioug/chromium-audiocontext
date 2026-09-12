# Persistent AudioWorklet distortion after AudioContext suspend/resume

## Title

AudioContext suspend/resume can permanently halve the AudioWorklet render rate
after a long worklet task

## Environment

- Google Chrome 153.0.8010.37 (arm64)
- macOS 26.6.2 (25G83)
- Output callback buffer: 256 frames
- AudioContext sample rate: 44.1 kHz

## Reproduction

Serve the two source files over HTTP, for example:

```sh
python3 -m http.server 9010
```

Then open `http://localhost:9010` in Chrome and:

1. Click **Play** once and confirm the 440 Hz tone sounds clean.
2. While it keeps playing, click **Suspend / resume** until the tone becomes
   distorted. Each click performs one suspend/resume cycle.

## Expected

The tone remains clean after every suspend/resume cycle.

## Actual

Eventually, a suspend/resume cycle leaves playback persistently distorted.
Stopping and starting playback does not recover it. Reloading the page or
replacing the `AudioContext` does.

The generated signal peaks well below full scale, so this is not clipping.

## Trace evidence

With the `audio`, `webaudio`, `disabled-by-default-audio`, and
`disabled-by-default-audio-worklet` trace categories enabled:

- Before the explicit suspend/resume: 347
  `AudioOutputDevice::FireRenderCallback` calls produce 694
  `RealtimeAudioDestinationHandler::Render` calls and 694
  `AudioWorkletProcessor::Process` calls—about two render quanta per callback.
- After the failure: 519 output callbacks produce only 519 graph renders and
  519 worklet process calls—exactly one quantum per callback. This was measured
  for three seconds without another button press.
- The hardware callback requests 256 frames, but `frames_to_render` remains 128
  after the failure. The FIFO remains one 128-frame render quantum out of phase.

The failure persists without further long tasks or reported glitches.

## Reduced preconditions

The repro contains one `AudioWorkletNode` and no third-party code. These details
are necessary in the reduced case:

- The `AudioContext` explicitly requests 44.1 kHz. Using the device-default
  sample rate did not reproduce the failure in this reduction.
- The first Play action performs one initial context restart. This mirrors a
  common first-user-gesture latency workaround.
- The worklet is loaded from an external module. Loading the same source from a
  Blob URL did not reproduce the failure.
- The processor continuously outputs one 440 Hz sine wave; it has no idle state
  or synthetic per-render workload.
- Immediately before each explicit context suspend/resume, a synchronous
  worklet message task runs for 80 ms. This widens the production race enough
  to reproduce reliably on the environment above.

Each **Suspend / resume** click calls `AudioContext.suspend()` and
`AudioContext.resume()` exactly once each.

## Suspected area

The trace points to the dual-thread `AudioDestination` / `PushPullFIFO` path.
After the destination restarts, the FIFO retains a 128-frame phase offset even
though the platform callback size is 256 frames. Subsequent callbacks render
only one 128-frame quantum instead of two.

## Related reports

- [Issue 442866743](https://issues.chromium.org/issues/442866743) reports a
  transient duplicate `currentTime`/`currentFrame` quantum after resume. This
  case is different: the 128-frame phase offset and audible corruption persist
  indefinitely after a single explicit suspend/resume.
- [Issue 364501613](https://issues.chromium.org/issues/364501613) reported
  AudioWorklet crackling in a microphone forwarding graph, without this
  suspend/resume sequence or FIFO cadence evidence. It was closed as not
  reproducible.
