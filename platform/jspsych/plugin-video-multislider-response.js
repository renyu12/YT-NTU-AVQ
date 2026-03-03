/******************************************************************************
 * jspsych-video-multi-slider-response.js
 *
 * Custom jsPsych plugin for video-based multi-dimensional quality rating.
 *
 * Features:
 *   - Video playback with optional fullscreen control
 *   - Multiple sliders with label alignment and tooltips
 *   - Optional expected-range visualization (training mode)
 *   - Playback behavior logging (play, pause, watch time)
 *   - Freeze detection (lag monitoring)
 *   - Slider interaction tracking (drag count & duration)
 *   - Page visibility monitoring (tab switch detection)
 *
 * Designed for audio-visual quality assessment (AVQA) experiments,
 * but can be adapted to other perceptual studies involving video stimuli.
 *
 * Note:
 *   This plugin extends jsPsych architecture.
 *   It is intentionally self-contained and does not depend on main.js logic.
 ******************************************************************************/

const jsPsychVideoMultiSliderResponse = (function(jspsych) {
  'use strict';

  const info = {
    name: 'video-multi-slider-response',
    version: '1.0.0',
    parameters: {
      fullscreen: {
        type: jspsych.ParameterType.BOOL,
        default: false
      },
      auto_exit_fullscreen: {
        type: jspsych.ParameterType.BOOL,
        default: false
      },
      autoplay: {
        type: jspsych.ParameterType.BOOL,
        default: true
      },
      stimulus: {
        type: jspsych.ParameterType.COMPLEX,
        default: undefined // object: { video_url: string[], expected_ranges: [[min, max], ...] }
      },
      width: {
        type: jspsych.ParameterType.INT,
        default: ''
      },
      height: {
        type: jspsych.ParameterType.INT,
        default: ''
      },
      controls: {
        type: jspsych.ParameterType.BOOL,
        default: true
      },
      sliders: {
        type: jspsych.ParameterType.COMPLEX,
        default: [],
        array: true
      },
      slider_width: {
        type: jspsych.ParameterType.INT,
        default: null
      },
      prompt: {
        type: jspsych.ParameterType.HTML_STRING,
        default: null
      },
      button_label: {
        type: jspsych.ParameterType.STRING,
        default: 'Continue'
      },
      require_movement: {
        type: jspsych.ParameterType.BOOL,
        default: false
      },
      disable_seek_during_autoplay: {
        type: jspsych.ParameterType.BOOL,
        default: false
      },
      min_watch_ratio: {
        type: jspsych.ParameterType.FLOAT,
        default: 0.95 // default min watch ratio is 95%
      },
      freeze_threshold_ms: {
        type: jspsych.ParameterType.INT,
        default: 800
      },
      freeze_alert_after: {
        type: jspsych.ParameterType.INT,
        default: 3
      },
      freeze_alert: {
        type: jspsych.ParameterType.BOOL,
        default: true
      },
      instruction: {
        type: jspsych.ParameterType.HTML_STRING,
        default: null
      },
      enforce_expected_range: {
        type: jspsych.ParameterType.BOOL,
        default: false // defalut no alert for out expected range
      },
      progress: {
        type: jspsych.ParameterType.ARRAY,
        default: null
      },
    },
    data: {
      stimulus: {
        type: jspsych.ParameterType.OBJECT
      },
      response: {
        type: jspsych.ParameterType.OBJECT
      },
      /** The response time in milliseconds for the participant to make a response. The time is measured from when the stimulus first appears on the screen until the participant's response. */
      rt: {
        type: jspsych.ParameterType.INT
      },
      video_behavior: {
        type: jspsych.ParameterType.OBJECT
      },
    }
  };

  class Plugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }
    static info = info;

    trial(display_element, trial) {
      const playbackData = {
        playCount: 0,
        pauseCount: 0,
        totalPlayTime: 0,
        duration: 0
      };

      const pageBehaviorData = {
        blurCount: 0,
      };

      const sliderBehaviorData = Array(trial.sliders.length).fill(0).map(() => ({
        dragCount: 0,
        dragTime: 0,
        dragStart: null
      }));


      let playStartTime = null;
      const start_time = performance.now(); // start time of the page

      const video_html = `
        <video id="jspsych-video" ${trial.width ? `width='${trial.width}'` : ''} ${trial.height ? `height='${trial.height}'` : ''} ${trial.autoplay ? 'autoplay' : ''} ${trial.controls ? 'controls' : ''}>
          ${trial.stimulus.video_url.map(src => `<source src='${src}' type='video/${src.split('.').pop()}'>`).join('')}
        </video>
      `;

      let html = `<div id="jspsych-video-multi-slider-container">${video_html}</div>`;

      // Insert the page number (if any)
      if (trial.progress && trial.progress.length === 2) {
        const [current, total] = trial.progress;
        html += `
          <div id="video-progress" style="
            position: absolute;
            top: 40px;
            right: 20px;
            background-color: rgba(0, 0, 0, 0.6);
            color: white;
            padding: 6px 12px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            z-index: 9999;
          ">
            Video ${current} of ${total}
          </div>
        `;
      }

      if (trial.fullscreen) {
        const fullscreen_tip = document.createElement('p');
        fullscreen_tip.innerHTML = '<em>Tip: This video will enter fullscreen when played for better visibility.</em>';
        setTimeout(() => {
          const container = document.getElementById('jspsych-video-multi-slider-container');
          if (container) container.prepend(fullscreen_tip);
        }, 0);
      }

      // If instruction，insert the toggle reminder
      if (trial.instruction) {
        const instructionBlock = `
          <div id="instruction-wrapper" style="display: block; width: 640px; margin: 1em 0; font-size: 16px;">
            <div id="instruction-toggle" style="cursor: pointer; background-color: #e0f0ff; padding: 10px; border-left: 4px solid #007ACC;">
              🔽 <strong>Reminder: Click to view instructions</strong>
            </div>
            <div id="instruction-content" style="display: none; padding: 10px; background-color: #f0f8ff; border-left: 4px solid #007ACC; line-height: 1.6;">
              ${trial.instruction}
            </div>
          </div>
        `;
        html += instructionBlock;
      }

      trial.sliders.forEach((s, i) => {
        const totalSteps = Math.floor((s.max - s.min) / s.step);
        const labelCount = s.labels.length;

        const labelPositions = s.labels.map((label, idx) => {
          const stepIndex = Math.round((idx / (labelCount - 1)) * totalSteps);
          const value = s.min + stepIndex * s.step;
          // NOTE:
          // The 0.96 shrink factor below is an empirical adjustment to better align
          // slider labels with the actual visual track rendering across browsers.
          // Native <input type="range"> elements do not expose precise track geometry,
          // and browser-specific thumb/track padding can cause slight misalignment.
          // This small scaling factor compensates for that offset.
          //
          // If you need pixel-perfect alignment, consider replacing this with
          // a custom slider implementation or computing positions dynamically.
          //const percent = ((value - s.min) / (s.max - s.min)) * 100;
          const percent = ((((value - s.min) / (s.max - s.min)) - 0.5)*0.96 + 0.5) * 100;
          return { label, percent };
        });

        const needsExtraSpace = s.labels.some(l => l.includes('<br>'));
        const labelHeightStyle = needsExtraSpace ? 'min-height: 2.5em;' : 'height: 1.2em;';

        let labelBelowHTML = '';
        if (Array.isArray(s.labels_below) && s.labels_below.length > 0) {
          const labelBelowPositions = s.labels_below.map((label, idx) => {
            const stepIndex = Math.round((idx / (s.labels_below.length - 1)) * totalSteps);
            const value = s.min + stepIndex * s.step;
            // same empirical adjustment
            //const percent = ((value - s.min) / (s.max - s.min)) * 100;
            const percent = ((((value - s.min) / (s.max - s.min)) - 0.5)*0.96 + 0.5) * 100;
            return { label, percent };
          });

          labelBelowHTML = `
            <div class='jspsych-slider-labels' style='position: relative; ${labelHeightStyle} margin-bottom: 0.5em;'>
              ${labelBelowPositions.map(pos => {
                return `<span style='position:absolute; left:${pos.percent}%; transform:translateX(-50%); white-space: nowrap;'>${pos.label}</span>`;
              }).join('')}
            </div>
          `;
        }

        const expectedBarHTML = (() => {
          const range = trial.stimulus.expected_ranges?.[i];
          if (!Array.isArray(range) || range.length !== 2) return '';
          const [expMin, expMax] = range;
          const left = ((expMin - s.min) / (s.max - s.min)) * 100;
          const width = ((expMax - expMin) / (s.max - s.min)) * 100;
          return `<div style='margin-bottom: 4px; position: relative; height: 6px;'>
                    <div style='position:absolute; left:${left}%; width:${width}%; height:6px; background:rgba(100,200,100,0.3); border-radius:3px;'></div>
                  </div>`;
        })();

        // Generate the initial "Current Value" display below each slider.
        // For weight sliders (audio vs. video importance split), display a formatted percentage split (Audio X% : Y% Video).
        const currentValueHTML = (() => {
          if (s.is_weight_slider === true) {
            const videoWeight = s.start;
            const audioWeight = 100 - videoWeight;
            return `<div id='slider-value-${i}' style='margin-top: 0.3em; font-size: 0.9em; color: green;'>Current Value: Audio ${audioWeight}% : ${videoWeight}% Video</div>`;
          }
          else {
            return `<div id='slider-value-${i}' style='margin-top: 0.3em; font-size: 0.9em; color: green;'>Current Value:${s.start}</div>`;
          }
        })();

        // Add tooltip into label
        let labelWithTooltip = s.label;
        if (s.tooltip) {
          labelWithTooltip = `
            <span style="display: inline-flex; align-items: center;">
              ${s.label}
              <span style="
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 16px;
                height: 16px;
                margin-left: 6px;
                margin-bottom: 1px;
                border-radius: 50%;
                background-color: #ccc;
                color: white;
                font-size: 12px;
                font-weight: bold;
                cursor: help;
                position: relative;
              " title="${s.tooltip}">i</span>
            </span>
          `;
        }

        // Add boundary
        if (i > 0) {
          html += `<hr style="border: none; border-top: 1px solid #ccc; margin-top: 1em; margin-bottom: 0.5em; width: 100%;">`;
        }

        html += `
          <div class='jspsych-slider-group' style='margin-top: 1em;'>
            <label style="display: inline-block; margin-bottom: 0.4em;">${i + 1}. ${labelWithTooltip}</label><br>
            <div class='jspsych-slider-labels' style='position: relative; ${labelHeightStyle} margin-bottom: 0.5em;'>
              ${labelPositions.map(pos => {
                return `<span style='position:absolute; left:${pos.percent}%; transform:translateX(-50%); white-space: nowrap;'>${pos.label}</span>`;
              }).join('')}
            </div>
            <div style='position: relative;'>
              ${expectedBarHTML}
              <input type='range' min='${s.min}' max='${s.max}' step='${s.step}' value='${s.start}' 
                     id='slider-${i}' class='jspsych-slider' style='width: ${trial.slider_width || 600}px;'>
            </div>
            ${labelBelowHTML}
            ${currentValueHTML}
          </div>
        `;
      });

      if (trial.stimulus.description) {
        html += `
          <div id="description-wrapper" style="margin: 2em 0; font-size: 14px;">
            <div id="description-toggle" style="cursor: pointer; background-color: #e8f0ff; padding: 10px; border-left: 4px solid #888;">
              🔽 <strong>Click to view explanation</strong>
            </div>
            <div id="description-content" style="display: none; padding: 10px; background-color: #f9f9f9; border-left: 4px solid #bbb; line-height: 1.6;">
              ${trial.stimulus.description}
            </div>
          </div>
        `;
      }

      if (trial.prompt) html += `<div class='jspsych-prompt'>${trial.prompt}</div>`;
      html += `<button id='jspsych-next-btn' class='jspsych-btn' ${trial.require_movement ? 'disabled' : ''}>${trial.button_label}</button>`;

      display_element.innerHTML = html;

      // Inject CSS to slightly increase slider track height
      if (!document.getElementById('jspsych-video-multi-slider-style')) {
        const style = document.createElement('style');
        style.id = 'jspsych-video-multi-slider-style';
        style.textContent = `
          input[type="range"].jspsych-slider::-webkit-slider-runnable-track {
            height: 16px;
            cursor: pointer;
          }
          input[type="range"].jspsych-slider::-moz-range-track {
            height: 16px;
            cursor: pointer;
          }
          input[type="range"].jspsych-slider::-ms-track {
            height: 16px;
            cursor: pointer;
          }
        `;
        document.head.appendChild(style);
      }

      // Toggle instruction panel (collapsible reminder section)
      if (trial.instruction) {
        const toggleEl = display_element.querySelector('#instruction-toggle');
        const contentEl = display_element.querySelector('#instruction-content');
        toggleEl.addEventListener('click', () => {
          const visible = contentEl.style.display === 'block';
          contentEl.style.display = visible ? 'none' : 'block';
          toggleEl.innerHTML = visible
            ? '🔽 <strong>Reminder: Click to view instructions</strong>'
            : '🔼 <strong>Reminder: Click to hide instructions</strong>';
        });
      }

      // Toggle stimulus description panel (collapsible explanation block)
      if (trial.stimulus.description) {
        const toggle = display_element.querySelector('#description-toggle');
        const content = display_element.querySelector('#description-content');

        toggle.addEventListener('click', () => {
          const expanded = content.style.display === 'block';
          content.style.display = expanded ? 'none' : 'block';
          toggle.innerHTML = expanded
            ? '🔽 <strong>Click to view explanation</strong>'
            : '🔼 <strong>Click to hide explanation</strong>';
        });
      }

      // Auto fullscreen playback
      const videoEl = display_element.querySelector('#jspsych-video');
      if (trial.fullscreen) {
        videoEl.addEventListener('play', () => {
          if (videoEl.requestFullscreen) {
            videoEl.requestFullscreen().catch(() => {});
          } else if (videoEl.webkitRequestFullscreen) {
            videoEl.webkitRequestFullscreen();
          } else if (videoEl.mozRequestFullScreen) {
            videoEl.mozRequestFullScreen();
          } else if (videoEl.msRequestFullscreen) {
            videoEl.msRequestFullscreen();
          }
        });

        if (trial.auto_exit_fullscreen) {
          videoEl.addEventListener('ended', () => {
            if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
              if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
              } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
              } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
              } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
              }
            }
          });
        }
      }

      // Seek restriction during autoplay (optional)
      //
      // When `disable_seek_during_autoplay` is enabled, participants are not allowed
      // to jump ahead in the video before watching it sequentially.
      // 
      // Mechanism:
      //   - `maxAllowedTime` tracks the furthest playback time reached naturally.
      //   - If the user attempts to seek beyond this point, the video is forced back.
      //   - `isForcingSeek` prevents recursive seeking loops when resetting time.
      //   - Seeking becomes allowed once the video has fully ended.
      //
      // This helps ensure sufficient exposure to the stimulus and prevents
      // skipping behavior in quality assessment tasks.
      videoEl.addEventListener('loadedmetadata', () => {
        playbackData.duration = videoEl.duration;
      });

      let allowSeek = true;
      let maxAllowedTime = 0;
      let isForcingSeek = false;

      if (trial.disable_seek_during_autoplay) {
        allowSeek = false;

        videoEl.addEventListener('seeking', () => {
          if (isForcingSeek) return;

          if (!allowSeek && videoEl.currentTime > maxAllowedTime) {
            isForcingSeek = true;
            videoEl.currentTime = maxAllowedTime;
            setTimeout(() => {
              isForcingSeek = false;
            }, 0);
            alert("Seeking is not recommended before finishing the full video.");
          }
        });

        videoEl.addEventListener('ended', () => {
          allowSeek = true;
        });
      }

      videoEl.addEventListener('play', () => {
        playbackData.playCount += 1;
        playStartTime = performance.now();
      });

      videoEl.addEventListener('pause', () => {
        playbackData.pauseCount += 1;
        if (playStartTime !== null) {
          const now = performance.now();
          playbackData.totalPlayTime += (now - playStartTime) / 1000.0;
          playStartTime = null;
        }
      });

      videoEl.addEventListener('ended', () => {
        if (playStartTime !== null) {
          playbackData.totalPlayTime += (performance.now() - playStartTime) / 1000.0;
          playStartTime = null;
        }
      });

      // Monitor page visibility changes (e.g., tab switch, window minimization).
      // Each time the document becomes hidden, increment a blur counter.
      // Named handler is used so it can be properly removed at trial end.
      const visibilityChangeHandler = () => {
        if (document.visibilityState === 'hidden') {
          pageBehaviorData.blurCount += 1;
        }
      };

      document.addEventListener('visibilitychange', visibilityChangeHandler);

      // Freeze detection by timeupdate event
      let lastTimeUpdate = null;
      let freezeEvents = [];
      let freezeCount = 0;
      let freezeAlertActive = true;  // avoid repeat alert

      videoEl.addEventListener('timeupdate', () => {
        const now = performance.now();

        // Update maxAllowedTime only during normal playback
        if (!videoEl.seeking && !videoEl.paused) {
          // optionally add a tiny epsilon to avoid floating jitter
          maxAllowedTime = Math.max(maxAllowedTime, videoEl.currentTime);
        }

        if (lastTimeUpdate !== null) {
          const delta = now - lastTimeUpdate;
          if (delta > trial.freeze_threshold_ms && !videoEl.paused && !videoEl.seeking) {
            freezeCount++;
            freezeEvents.push({ currentTime: videoEl.currentTime, delay: delta });

            // Totally 3 freeze -> alert
            if (trial.freeze_alert && freezeCount === trial.freeze_alert_after && freezeAlertActive) {
              alert('⚠️ We detected repeated video playback lag. Please ensure smooth playback.');
              freezeAlertActive = false;
            }
          }
        }

        lastTimeUpdate = now;
      });

      // For non-freeze event, lasttime should be reset to avoid false alert
      ['pause', 'ended', 'seeking'].forEach(evt => {
        videoEl.addEventListener(evt, () => {
          lastTimeUpdate = null;
        });
      });

      // Playback error detection
      videoEl.addEventListener('error', (e) => {
        alert('❌ Video playback error occurred. This session may be invalid.');
      });

      trial.sliders.forEach((s, i) => {
        const sliderEl = display_element.querySelector(`#slider-${i}`);
        const valueEl = display_element.querySelector(`#slider-value-${i}`);

        // Customized processing for weight question 'Curren Value' display
        if (sliderEl && valueEl && s.is_weight_slider === true) {
          sliderEl.addEventListener('input', () => {
            const videoWeight = parseInt(sliderEl.value);
            const audioWeight = 100 - videoWeight;
            const range = trial.stimulus.expected_ranges?.[i];
            const valid = !range || (videoWeight >= range[0] && videoWeight <= range[1]);
            valueEl.textContent = `Current Value: Audio ${audioWeight}% : ${videoWeight}% Video`;
            valueEl.style.color = valid ? 'green' : 'red';
          });
        }
        // Normal question just show the value
        else{
          sliderEl.addEventListener('input', () => {
            const val = parseFloat(sliderEl.value);
            const range = trial.stimulus.expected_ranges?.[i];
            const valid = !range || (val >= range[0] && val <= range[1]);
            valueEl.textContent = `Current Value:${val}`;
            valueEl.style.color = valid ? 'green' : 'red';
          });
        }     

        sliderEl.addEventListener('mousedown', () => {
          sliderBehaviorData[i].dragStart = performance.now();
        });
      });

      // Listen for mouseup events globally.
      // This ensures drag interactions are properly finalized even if
      // the mouse is released outside the slider element.
      const globalMouseUpHandler = () => {
        sliderBehaviorData.forEach((b) => {
          if (b.dragStart !== null) {
            b.dragTime += performance.now() - b.dragStart;
            b.dragStart = null;
            b.dragCount += 1; // Drag count is incremented once per completed drag (on release).
          }
        });
      };

      document.addEventListener('mouseup', globalMouseUpHandler);

      if (trial.require_movement) {
        const enable_button = () => {
          display_element.querySelector('#jspsych-next-btn').disabled = false;
        };
        trial.sliders.forEach((_, i) => {
          const el = display_element.querySelector(`#slider-${i}`);
          el.addEventListener('input', enable_button);
        });
      }

      display_element.querySelector('#jspsych-next-btn').addEventListener('click', () => {
        const response = {};
        let all_valid = true;

        trial.sliders.forEach((_, i) => {
          const val = parseFloat(display_element.querySelector(`#slider-${i}`).value);
          response[`slider_${i}`] = val;

          const range = trial.stimulus.expected_ranges?.[i];
          if (range && (val < range[0] || val > range[1])) {
            all_valid = false;
            const valueEl = display_element.querySelector(`#slider-value-${i}`);
            valueEl.style.color = 'red';
          }
        });

        if (trial.disable_seek_during_autoplay) {
          const videoDuration = playbackData.duration || 0;
          if (videoDuration > 0 && playbackData.totalPlayTime < trial.min_watch_ratio * videoDuration) {
            alert(`Please watch at least ${Math.round(trial.min_watch_ratio * 100)}% of the video before rating.`);
            return;
          }
        }

        if (!all_valid && trial.enforce_expected_range) {
          alert('Please ensure all ratings fall within the expected range.');
          return;
        }

        // Remove global mouseup listener to prevent carry-over into the next trial
        document.removeEventListener('mouseup', globalMouseUpHandler);
        // Remove visibility listener to avoid accumulating attention events across trials
        document.removeEventListener('visibilitychange', visibilityChangeHandler);

        // Finalize trial and submit structured response data.
        // In addition to rating values, we record detailed behavioral metrics
        // (video playback, freeze events, attention shifts, slider interactions)
        // to support quality control and post-hoc behavioral analysis.
        this.jsPsych.finishTrial({
          stimulus: trial.stimulus,
          response,
          rt: Math.round(performance.now() - start_time),
          video_behavior: {
            ...playbackData,
            freeze_events: freezeEvents,
            freeze_count: freezeEvents.length
          },
          page_behavior: pageBehaviorData,
          slider_behavior: sliderBehaviorData,
        });
      });
    }
  }

  return Plugin;
})(jsPsychModule);
