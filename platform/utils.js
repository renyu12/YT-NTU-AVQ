/******************************************************************************
 * utils.js
 *
 * Shared utility functions for the AVQA jsPsych experiment platform.
 *
 * Responsibilities:
 *   - Local result saving (JSON / CSV)
 *   - Video preloading helper
 *   - Environment / hardware checks (screen, network, audio)
 *   - Rendering hardware check reports
 *
 * Note:
 *   These utilities are framework-level helpers and are designed to be
 *   reusable across different experiment configurations.
 ******************************************************************************/

/**
 * Trigger a browser download of CSV content.
 * This uses Blob + object URL (no backend required).
 */
function saveLocalCSV(data, filename = "results.csv") {
  const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Trigger a browser download of JSON content.
 * This uses Blob + object URL (no backend required).
 */
function saveLocalJSON(data, filename = "results.json") {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function preloadVideo(url) {
  if (!url) return;

  const videoEl = document.createElement('video');
  videoEl.src = url;
  videoEl.preload = 'auto';
  videoEl.style.display = 'none';

  document.body.appendChild(videoEl);

  videoEl.addEventListener('canplaythrough', () => {
    document.body.removeChild(videoEl);
    console.log('[Preload] Success:', url);
  });

  videoEl.addEventListener('error', () => {
    document.body.removeChild(videoEl);
    console.warn('[Preload] Failed:', url);
  });
}

/**
 * Hardware / Environment check utilities for jsPsych experiments.
 *
 * Usage (in main.js):
 *   timeline.push(...buildHardwareCheckTimeline({
 *     network_test_url: "assets/test/test.mp4", // optional
 *     network_timeout_ms: 5000,
 *     min_physical_width: 1280,
 *     min_physical_height: 720,
 *     require_network: true,
 *     require_audio_output: false, // recommended default for open-source
 *   }));
 */

/** Abortable fetch + timing (simple connectivity + download-speed-ish check) */
async function detectNetworkConnectivity(url, timeoutLimit = 5000) {
  if (!url) return { success: true, duration: null, skipped: true };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutLimit);

  try {
    const startTime = performance.now();

    // Use GET; browser cache may affect timing (acceptable for a basic check)
    const response = await fetch(url, { method: "GET", signal: controller.signal, cache: "no-store" });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    // Consume body so timing roughly reflects actual transfer completion
    await response.blob();

    const endTime = performance.now();
    clearTimeout(timeoutId);

    const duration = endTime - startTime;
    return { success: duration <= timeoutLimit, duration, skipped: false };
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn("[HardwareCheck] Network fetch error:", error);
    return { success: false, duration: null, skipped: false };
  }
}

/** Detect audio output devices (best-effort; may be unreliable depending on browser) */
async function detectAudioDevice() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return { supported: false, hasAudioOutput: null, reason: "enumerateDevices not supported" };
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasAudioOutput = devices.some(d => d.kind === "audiooutput");
    return { supported: true, hasAudioOutput, reason: null };
  } catch (error) {
    console.warn("[HardwareCheck] Failed to enumerate devices:", error);
    return { supported: false, hasAudioOutput: null, reason: String(error) };
  }
}

/** Compute screen metrics (CSS px & estimated physical px using DPR) */
function getScreenMetrics() {
  const cssWidth = window.screen?.width ?? null;
  const cssHeight = window.screen?.height ?? null;
  const dpr = window.devicePixelRatio || 1;

  const physicalWidth = (cssWidth != null) ? cssWidth * dpr : null;
  const physicalHeight = (cssHeight != null) ? cssHeight * dpr : null;

  return { cssWidth, cssHeight, dpr, physicalWidth, physicalHeight };
}

/** Main check runner */
async function getHardwareCheckResults(options = {}) {
  const {
    min_physical_width = 1280,
    min_physical_height = 720,
    network_test_url = null,
    network_timeout_ms = 5000,
  } = options;

  // Screen check
  const screen = getScreenMetrics();
  const screenPass =
    (screen.physicalWidth != null && screen.physicalHeight != null) &&
    (screen.physicalWidth >= min_physical_width && screen.physicalHeight >= min_physical_height);

  // Network check (optional)
  const networkCheckResult = await detectNetworkConnectivity(network_test_url, network_timeout_ms);
  const networkPass = networkCheckResult.skipped ? true : networkCheckResult.success;

  // Audio output check (best-effort)
  const audioInfo = await detectAudioDevice();
  // If unsupported, treat as "unknown" rather than hard fail
  const audioPass = (audioInfo.supported && audioInfo.hasAudioOutput === true);

  return {
    ts: new Date().toISOString(),
    screen,
    checks: {
      screenPass,
      networkPass,
      audioPass,
      network: networkCheckResult,
      audio: audioInfo,
    },
    thresholds: {
      min_physical_width,
      min_physical_height,
      network_timeout_ms,
    },
  };
}

/** Decide pass/fail based on chosen requirements */
function hardwareCheckPassed(hw, options = {}) {
  if (!hw || !hw.checks) return false;

  const {
    require_network = true,
    require_audio_output = false,
  } = options;

  const { screenPass, networkPass, audioPass, audio } = hw.checks;

  if (!screenPass) return false;

  if (require_network && !networkPass) return false;

  // Audio output is tricky across browsers; only enforce if explicitly requested
  if (require_audio_output) {
    // If not supported, treat as fail only when enforcement is on
    if (!audio?.supported) return false;
    if (!audioPass) return false;
  }

  return true;
}

/** Render a simple HTML report */
function renderHardwareCheckReport(hw, options = {}) {

  const {
    require_network = true,
    require_audio_output = false,
  } = options;

  if (!hw || !hw.checks) {
    return `
      <h2>Environment Check</h2>
      <p>❌ Unable to perform environment check.</p>
      <p>Please reload and try again.</p>
    `;
  }

  const { screenPass, networkPass, audioPass } = hw.checks;
  const passed = hardwareCheckPassed(hw, options);

  const passBadge = (ok) =>
    `<span style="font-weight:600; color:${ok ? "#1a7f37" : "#d1242f"};">
      ${ok ? "PASS" : "FAIL"}
    </span>`;

  const skipBadge =
    `<span style="font-weight:600; color:#777;">SKIPPED</span>`;

  return `
    <h2>Environment Check</h2>

    <ul style="line-height:1.8; display:inline-block; text-align:left; margin:0 auto;">
      <li>Screen resolution: ${passBadge(screenPass)}</li>
      <li>Network connection: ${require_network ? passBadge(networkPass) : skipBadge}</li>
      <li>Audio output: ${require_audio_output ? passBadge(audioPass) : skipBadge}</li>
    </ul>

    ${
      passed
        ? `<p>✅ All required checks passed. Click Continue to proceed.</p>`
        : `<p style="color:#d1242f;">❌ Some required checks failed. Please adjust your environment and retry.</p>`
    }
  `;
}

/** Minimal HTML escape for embedding JSON */
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Build a minimal hardware check timeline.
 * - Intro "please wait" page (brief)
 * - CallFunction runs async checks and stores result in closure
 * - Report page shows PASS/FAIL and either continues or reloads the page
 */
function buildHardwareCheckTimeline(options = {}) {
  const {
    // thresholds
    min_physical_width = 1280,
    min_physical_height = 720,

    // network
    network_test_url = null,      // e.g., "assets/test/test.mp4"
    network_timeout_ms = 5000,
    require_network = true,

    // audio
    require_audio_output = true,

    // UI timing
    intro_duration_ms = 600,

    // labeling
    step_prefix = "Hardware Check",
  } = options;

  let hw = null;

  const intro = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `<p>Performing environment check, please wait...</p>`,
    choices: "NO_KEYS",
    trial_duration: intro_duration_ms,
    on_finish: function (data) {
      data.step = `${step_prefix} Intro`;
      data.stimulus = null;
      data.rt = intro_duration_ms;
    },
  };

  const runCheck = {
    type: jsPsychCallFunction,
    async: true,
    func: function (done) {
      getHardwareCheckResults({
        min_physical_width,
        min_physical_height,
        network_test_url,
        network_timeout_ms,
      })
        .then((result) => {
          hw = result;
          done();
        })
        .catch((err) => {
          console.warn("[HardwareCheck] getHardwareCheckResults failed:", err);
          hw = null;
          done();
        });
    },
    on_finish: function (data) {
      data.step = `${step_prefix} Start`;
      data.stimulus = null;
    },
  };

  const report = {
    type: jsPsychHtmlButtonResponse,
    stimulus: function () {
      return renderHardwareCheckReport(hw, {
        min_physical_width,
        min_physical_height,
        require_network,
        require_audio_output,
        network_test_url,
      });
    },
    choices: function () {
      const passed = hardwareCheckPassed(hw, { require_network, require_audio_output });
      return passed ? ["Continue"] : ["Reload and retry"];
    },
    on_finish: function (data) {
      data.step = `${step_prefix} Result`;
      data.stimulus = null;

      // Save results into trial data for later analysis
      data.hardware_check = hw;
      data.hardware_check_passed = hardwareCheckPassed(hw, { require_network, require_audio_output });

      // If failed, simplest retry: reload the page
      if (!data.hardware_check_passed) {
        // Small delay so jsPsych can flush data for this step (best-effort)
        setTimeout(() => window.location.reload(), 50);
      }
    },
  };

  return [intro, runCheck, report];
}