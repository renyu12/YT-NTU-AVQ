/******************************************************************************
 * main.js
 *
 * Entry point and experiment flow controller.
 *
 * Responsibilities:
 *   - Load configuration files (experiment.json, videos.json)
 *   - Initialize jsPsych
 *   - Dynamically build the experiment timeline
 *   - Inject training and experiment trials
 *   - Handle result saving (local / remote)
 *
 * This file contains experiment logic but no UI definitions.
 * Page templates are defined in experiment_content.js.
 * Utility functions are defined in utils.js.
 ******************************************************************************/

/******************************************************************************
 * Configuration Loading
 ******************************************************************************/
async function loadConfigs() {
  const [expRes, vidRes] = await Promise.all([
    fetch("config/experiment.json"),
    fetch("config/videos.json")
  ]);
  if (!expRes.ok) throw new Error("Failed to load experiment.json");
  if (!vidRes.ok) throw new Error("Failed to load videos.json");
  return { experiment: await expRes.json(), videos: await vidRes.json() };
}

/******************************************************************************
 * Timeline Helper
 *
 * Wraps a page configuration and ensures:
 *   - step metadata is recorded
 *   - optional extra on_finish logic is preserved
 ******************************************************************************/
function makeStep(config, extra = {}) {
  return {
    ...config,
    ...extra,
    on_finish: function(data) {
      data.step = config.step;   // Read step name from experiment content config
      data.stimulus = null;
      if (extra.on_finish) extra.on_finish(data); // Keep extra processing
    }
  };
}

/******************************************************************************
 * Result Processing & Saving
 *
 * Handles:
 *   - Metadata packaging
 *   - Remote submission (if configured)
 *   - Local saving fallback
 *   - Completion code display
 ******************************************************************************/
async function handleExperimentFinish(jsPsych, experiment, user_id) {
  const trialData = jsPsych.data.get().filterCustom(trial => !trial.skip);

  const uaStr = navigator.userAgent;
  const uaMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(uaStr);
  const user_agent = {
    user_agent_str: uaStr,
    user_agent_mobile: uaMobile
  };

  const resultData = {
    experiment_name: experiment.experiment_name,
    task_id: experiment.task_id,
    user_id: user_id,
    timestamp: new Date().toISOString(),
    user_agent: user_agent,
    trial_data: JSON.parse(trialData.json())
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = `${experiment.experiment_name}_${experiment.task_id}_${timestamp}`;

  // Attempt remote submission first (if configured).
  // If submission fails, fall back to local saving (if enabled).
  if (experiment.remote_submit_url) {
    try {
      const resp = await fetch(experiment.remote_submit_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultData)
      });
      if (!resp.ok) throw new Error("Server error " + resp.status);

      const data = await resp.json();
      const code = data.completion_code || "UNKNOWN";
      showEndPage(code);
      return;
    } catch (err) {
      console.warn("Remote submit failed, fallback to local:", err);
    }
  }

  // Local save
  if (experiment.save_local_results) {
    const formats = experiment.save_formats || ["json"]; // default save JSON
    if (formats.includes("csv")) {
      saveLocalCSV(trialData.csv(), baseName + ".csv");
    }
    if (formats.includes("json")) {
      saveLocalJSON(resultData, baseName + ".json");
    }

    const localCode = "LOCAL-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    showEndPage(localCode);
  }
}

/******************************************************************************
 * End Page Renderer
 *
 * Displays completion code after submission or local save.
 ******************************************************************************/
function showEndPage(code) {
  document.body.innerHTML = `
    <div style="text-align:center; margin-top: 20vh; font-family: sans-serif;">
      <h2>Thank you for participating!</h2>
      <p>Your submission was successful.</p>
      <p><strong>Completion Code:</strong></p>
      <div style="font-size: 1.5em; font-weight: bold; color: green;">${code}</div>
      <p>Please copy and paste this code for recording.</p>
    </div>
  `;
  alert("Thank you! Your completion code is: " + code);
}

/******************************************************************************
 * Experiment Initialization & Timeline Construction
 ******************************************************************************/
async function startExperiment() {
  try {
    const { experiment, videos } = await loadConfigs();

    let user_id = null;

    const jsPsych = initJsPsych({
      show_progress_bar: experiment.show_progress_bar,
      auto_update_progress_bar: experiment.auto_update_progress_bar,
      on_finish: () => handleExperimentFinish(jsPsych, experiment, user_id)
    });

    /******************************************************************************
     * Timeline Construction
     *
     * Timeline is built dynamically based on:
     *   - experiment.timeline flags
     *   - available training and experiment videos
     ******************************************************************************/
    const timeline = [];

    // Welcome page
    if (experiment.timeline.welcome) {
      timeline.push(makeStep(experimentContent.welcome));
    }

    // User ID input page
    if (experiment.timeline.user_id_input) {
      timeline.push(makeStep(experimentContent.user_id_input, {
        on_finish: d => {
          user_id = d.response?.user_id?.trim() || null;
        }
      }));
    }

    // Environment advice page
    let environmentPrepared = false;

    if (experiment.timeline.environment_advice) {
      timeline.push(makeStep(experimentContent.environment_advice, {
        on_finish: d => {
          environmentPrepared = (d.response === 0);  // 0 = Ready
        }
      }));

      timeline.push({
        timeline: [experimentContent.environment_fail],
        conditional_function: () => !environmentPrepared
      });
    }

    // Environment check page
    if (experiment.timeline.environment_check) {
      timeline.push(
        ...buildHardwareCheckTimeline(
          experiment.environment_check_config || {}
        )
      );
    }

    // Consent page
    if (experiment.timeline.consent) {
      timeline.push(makeStep(experimentContent.consent));
    }

    // Instruction page
    if (experiment.timeline.instruction) {
      timeline.push(makeStep(experimentContent.instruction));
    }

    /******************************************************************************
     * Training Phase
     *
     * Dynamically injects training trials based on videos.train_videos.
     * Each trial records quality scores and video metadata.
     ******************************************************************************/
    let skip_training = false;

    if (experiment.timeline.training && videos.train_videos?.length > 0) {

      let trainingConfig = { ...experimentContent.training_intro };

      if (typeof trainingConfig.stimulus === "function") {
        trainingConfig.stimulus = trainingConfig.stimulus(videos.train_videos.length);
      }

      if (!experiment.allow_skip_training) {
        trainingConfig.choices = ["Start Training"];
      }

      // Training intro
      timeline.push(makeStep(trainingConfig, {
        on_finish: d => {
          window.skip_training = (experiment.allow_skip_training && d.response === 1);
        },
        on_start: () => {
          // preload first video
          preloadVideo(videos.train_videos[0].video_url);
        }
      }));

      // Training videos
      timeline.push({
        timeline: videos.train_videos.map((video, idx) => ({
          ...experimentContent.training_trial,
          stimulus: {
            video_url: [video.video_url],
            expected_ranges: [video.e_all, video.e_v, video.e_a, video.e_av_weight],
            description: video.description
          },
          sliders: experimentContent.sharedSliders,
          instruction: experimentContent.sharedInstructionHTML,

          on_start: () => {
            // preload next video
            if (idx + 1 < videos.train_videos.length) {
              preloadVideo(videos.train_videos[idx + 1].video_url);
            }
          },

          on_finish: d => {
            d.phase = "Training";
            d.step = 'Training Video';
            d.stimulus = video.video_id;
            d.video_id = video.video_id;
            d.video_index = idx;

            const res = d.response;
            d.score_all = res.slider_0;
            d.score_v = res.slider_1;
            d.score_a = res.slider_2;
            d.av_weight = res.slider_3;

            delete d.response;
          }
        })),
        conditional_function: () => !window.skip_training
      });
    }

    /******************************************************************************
     * Formal Experiment Phase
     *
     * Injects rating trials for experiment_videos.
     * Scores are extracted and flattened for easier analysis.
     ******************************************************************************/
    if (experiment.timeline.experiment && videos.experiment_videos?.length > 0) {
      // Intro
      let introCfg = { ...experimentContent.experiment_intro };
      if (typeof introCfg.stimulus === "function") {
        introCfg.stimulus = introCfg.stimulus(videos.experiment_videos.length);
      }

      timeline.push(makeStep(introCfg, {
        on_start: () => {
          // preload first video
          preloadVideo(videos.experiment_videos[0].video_url);
        }
      }));

      // Trials
      videos.experiment_videos.forEach((video, idx) => {
        timeline.push({
          ...experimentContent.experiment_trial,
          stimulus: { video_url: [video.video_url] },
          sliders: experimentContent.sharedSliders,
          instruction: experimentContent.sharedInstructionHTML,

          on_start: () => {
            // preload next video
            if (idx + 1 < videos.experiment_videos.length) {
              preloadVideo(videos.experiment_videos[idx + 1].video_url);
            }
          },

          on_finish: (data) => {
            data.stimulus = video.video_id;
            data.video_id = video.video_id;
            data.video_index = idx;
            data.phase = "Experiment";
            data.step = 'Experiment Video';

            const res = data.response;
            data.score_all = res.slider_0;
            data.score_v = res.slider_1;
            data.score_a = res.slider_2;
            data.av_weight = res.slider_3;

            delete data.response;
          }
        });
      });
    }

    jsPsych.run(timeline);

  } catch (err) {
    console.error("Experiment init failed:", err);
    document.body.innerHTML = "<h2>Error loading experiment.</h2>";
  }
}

startExperiment();

