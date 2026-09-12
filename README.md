# Chrome AudioContext suspend/resume repro

Two source files reproduce persistent AudioWorklet distortion after an
`AudioContext.suspend()` / `resume()` cycle.

Run the reproduction directly in Chrome:
<https://pioug.github.io/chromium-audiocontext/>

```sh
python3 -m http.server 9010
```

Open <http://localhost:9010> in Chrome, then:

1. Click **Play** once and confirm the tone sounds clean.
2. While it keeps playing, click **Suspend / resume** until the tone becomes
   distorted.

See [BUG_REPORT.md](BUG_REPORT.md) for the trace evidence and reduced
preconditions.
