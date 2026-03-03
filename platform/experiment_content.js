/******************************************************************************
 * experiment_content.js
 *
 * Defines all experiment stage templates and shared UI components.
 *
 * This file contains:
 *   - Page-level configurations (welcome, consent, instruction, etc.)
 *   - Training and experiment trial templates
 *   - Shared slider definitions (rating questions)
 *   - Shared instruction HTML used inside rating pages
 *
 * No experiment flow logic is implemented here.
 * The timeline is constructed in main.js.
 *
 * Researchers can modify text content, labels, and UI wording here
 * without changing core experiment logic.
 ******************************************************************************/

const experimentContent = {
  /**************************************************************************
   * Basic Pages (static introduction steps)
   **************************************************************************/
  welcome: {
    step: "Welcome",
    type: jsPsychHtmlButtonResponse,
    stimulus: "<h2>Welcome to the Audio-Visual Quality Assessment Study</h2>\
               <p>This experiment is designed by [Institution Name]. Click the button below to continue.</p>",
    choices: ["Start"]
  },

  user_id_input: {
    step: "User ID Input",
    type: jsPsychSurveyHtmlForm,
    preamble: `
      <h2>Enter Your User ID</h2>
      <p>Please enter your User ID below to proceed.<br>
      <em>(This ID will be used to associate your responses)</em></p>
    `,
    html: `
      <label for="user_id_input">User ID: </label>
      <input name="user_id" id="user_id_input" type="text" required style="width:200px;">
    `,
    button_label: "Submit"
  },


  /**************************************************************************
   * Environment Preparation & Check Related Pages
   **************************************************************************/
  environment_advice: {
    step: "Environment Advice",
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <h2>Environment Preparation</h2>
      <ul>
        <li>Ensure a quiet and comfortable environment with normal lighting.</li>
        <li>Use a device with a screen larger than 13.3 inches, no color-shifting modes.</li>
        <li>Adjust screen brightness and contrast appropriately, maintain a 2-feet distance.</li>
        <li>Use the latest versions of browsers - Chrome (recommended), Firefox, Edge, Safari.</li>
        <li>Use headphones at a comfortable volume, disable sound enhancements.</li>
        <li>Ensure consistent network connectivity. (Progress will lose after refreshing!)</li>
      </ul>`,
    choices: ["Ready to proceed", "Not Ready"],
    button_html: (choice, i) => {
      if (i === 0) {
        return `<button class="jspsych-btn" 
                  style="background-color: #4CAF50; color: white; font-weight: bold; 
                         padding: 6px 16px; border-radius: 5px;">
                  ${choice}
                </button>`;
      } else {
        return `<button class="jspsych-btn" 
                  style="background-color: #ccc; color: #333; 
                         padding: 6px 16px; border-radius: 5px;">
                  ${choice}
                </button>`;
      }
    }
  },
  environment_fail: {
    step: "Preparation Incompleted",
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <h2>Preparation Required</h2>
      <p>⚠️ You indicated that your environment is not ready for this task.<br>
      Please make sure the environment meets all the listed requirements before continuing.</p>`,
    choices: "NO_KEYS"
  },

  /**************************************************************************
   * Consent Page (Generic Template)
   *
   * ⚠ Please modify this section to comply with your institutional
   * ethics/IRB requirements before deployment.
   **************************************************************************/
  consent: {
    step: "Consent",
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <h2>Consent Form</h2>

      <p>You are invited to take part in a research study conducted by [Institution Name].</p>
      <p><strong>Please read the following information before deciding to participate.</strong></p>

      <p style="margin: 10px 0; height: 20px;"></p> 

      <h3>Purpose</h3>
      <p>This study investigates how people perceive the audio-visual quality of video content.</p>

      <h3>What You Will Do</h3>
      <ul>
        <li>Watch a group of short video clips. (each ~10 seconds, with audio)</li>
        <li>Rate their quality using sliders.</li>
        <li>The task takes about 15–30 minutes.</li>
      </ul>

      <h3>Important Reminders</h3>
      <ul>
        <li>Some clips may contain flashing lights or loud sounds. If uncomfortable, you may exit and report the unpleasant clip to us.</li>
        <li>Please complete the task carefully and attentively.</li>
        <li>If there are any technical issues, please contact us.</li>
      </ul>

      <h3>Voluntary Participation</h3>
      <p>Participation is completely voluntary. You may exit the study at any time.<br>
      <strong>No data will be recorded unless you complete and submit the entire session.</strong></p>

      <h3>Data Privacy</h3>
      <ul>
        <li>No personally identifiable information will be collected.</li>
        <li>Only anonymous interaction data (e.g., rating results, playback behavior) will be stored.</li>
        <li>Data will be securely stored and used solely for academic research.</li>
      </ul>

      <p><strong>By clicking "I Agree",<br>
         you confirm that you understand the above and voluntarily consent to participate.</strong></p>
      <p>If you do not wish to participate, you may simply close this page.</p>
    `,
    choices: ["I Agree"]
  },

  /**************************************************************************
   * Instruction Pages
   *
   * NOTE: Images are loaded via relative paths for local development.
   *       For large-scale deployment, media assets should be served via CDN.
   **************************************************************************/
  instruction: {
    step: "Instruction",
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <h2>Task Instructions</h2>
      <p>You will watch a series of short videos.<br>
         After each video, you are required to<br>
         <strong>rate and analyse the quality by answering 4 questions.</strong><br>
         Detailed instructions can be found in the experimental page</p>

      <img src="images/open_instruction.gif" 
           alt="Instruction image" 
           style="max-width: 50%; height: auto; margin: 1em 0;">

      <p>All questions should be answered by slider.<br>
         <strong>Drag the slider using the mouse to the option you think best represents your rating.</strong><br>
         For the first 3 questions, there are 5 levels (bad-excellent)<br>
         but you could move the slider to the middle.<br></p>

      <img src="images/drag_slider.gif"
           alt="Slider demo"
           style="display: block; max-width: 50%; height: auto; margin: 1em auto;">

      <p>For the Question No.4, it's a 100% split,<br>
         so you could move the slider from 100%:0% - 0%:100%.<br></p>

      <img src="images/drag_slider2.gif"
           alt="Slider demo"
           style="display: block; max-width: 50%; height: auto; margin: 1em auto;">
    `,
    choices: ["Continue"]
  },

  /**************************************************************************
   * Training Phase Templates
   **************************************************************************/
  training_intro: {
    step: "Training Intro",
    type: jsPsychHtmlButtonResponse,
    stimulus: (count) => `
      <h2>Training Phase</h2>
      <p>You will practice with <strong>${count}</strong> videos to familiarize yourself with the scoring rules.</p>
      <p>The expected range is marked with a green line.</p>
      <p><strong>Incomplete understanding of the rules<br>
         may result in rejection of your submission.</strong></p>
    `,
    choices: ["Start Training", "Skip Training"],
    button_html: (choice, i) => {
      if (i === 0) {
        return `<button class="jspsych-btn" 
                  style="background-color: #4CAF50; color: white; font-weight: bold; 
                         padding: 6px 16px; border-radius: 5px;">
                  ${choice}
                </button>`;
      } else {
        return `<button class="jspsych-btn" 
                  style="background-color: #ccc; color: #333; 
                         padding: 6px 16px; border-radius: 5px;">
                  ${choice}
                </button>`;
      }
    }
  },

  /*
   * Trial Template (Training)
   *
   * Uses jsPsychVideoMultiSliderResponse plugin.
   * Actual stimulus and slider configuration are injected dynamically
   * in main.js for each video.
   */
  training_trial: {
    step: "Training Video",
    type: jsPsychVideoMultiSliderResponse,

    // --- Content injected per trial (see below 'sharedSliders' and 'sharedInstructionHTML') ---
    sliders: null,
    instruction: null,

    // --- Display / UX ---
    fullscreen: true,
    auto_exit_fullscreen: true,
    width: 640,
    button_label: "Submit",
 
    // --- Rating constraints ---
    require_movement: true,
    enforce_expected_range: false,

    // --- Playback control ---
    disable_seek_during_autoplay: true,
    min_watch_ratio: 0.95,

    // --- Freeze detection ---
    freeze_threshold_ms: 800,
    freeze_alert_after: 3,
    freeze_alert: true,
  },

  /**************************************************************************
   * Formal Experiment Phase Templates
   **************************************************************************/
  experiment_intro: {
    step: "Experiment Intro",
    type: jsPsychHtmlButtonResponse,
    stimulus: (count) => `
      <h2>Formal Test Phase</h2>
      <p>You will rate <strong>${count}</strong> videos. Please rate them carefully based on your own perception.</p>
      <p><strong>Please note:</strong><br>
        Your responses will continue to be monitored throughout this phase.<br>
        Submissions that appear inaccurate or careless will lead to disqualification.<br>
        We appreciate your continued effort.<br>
        Please keep rating attentively to help ensure the quality of the study.</p>
    `,
    choices: ["Start Formal Test"]
  },

  /*
   * Trial Template (Formal Experiment)
   *
   * Similar to training_trial but without expected range enforcement.
   * Playback behavior and freeze detection are still recorded.
   */
  experiment_trial: {
    step: "Experiment Video",
    type: jsPsychVideoMultiSliderResponse,

    // --- Content injected per trial (see below 'sharedSliders' and 'sharedInstructionHTML') ---
    sliders: null,
    instruction: null,

    // --- Display / UX ---
    fullscreen: true,
    auto_exit_fullscreen: true,
    width: 640,
    button_label: "Submit",
 
    // --- Rating constraints ---
    require_movement: true,
 
    // --- Playback control ---
    disable_seek_during_autoplay: true,
    min_watch_ratio: 0.95,

    // --- Freeze detection ---
    freeze_threshold_ms: 800,
    freeze_alert_after: 3,
    freeze_alert: true,
  },

  end: {
    step: "End",
    type: jsPsychHtmlButtonResponse,
    stimulus: "<h2>Thank you!</h2><p>Your results have been saved.</p>",
    choices: []
  },

  /**************************************************************************
   * Shared Rating Questions (Core AVQA Task)
   *
   * These slider definitions are reused in both training and formal trials.
   * Researchers may modify scale ranges, labels, or tooltips as needed.
   **************************************************************************/
  sharedSliders: [
    {
      label: "<strong>Rate the overall audio-visual quality.<br>(consider the video and audio together)</strong>",
      tooltip: `Q1 - overall audio-visual quality (1.0 - 5.0)
        Rate the overall audio-visual quality,
        based on your impression of the combined video and audio experience.
        Please focus only on the technical quality of the video and audio
        - such as clarity, distortion (blur, blocking, noise...) and synchronization.
        Please don't consider content-related factors like:
        - The subject of the clip is pretty or boring or annoying.`,
      min: 1, max: 5, step: 0.1, start: 1,
      labels: ["Bad", "Poor", "Fair", "Good", "Excellent"],
      labels_below: ["1.0", "2.0", "3.0", "4.0", "5.0"] 
    },
    {
      label: "<strong>Rate the video quality only.</strong>",
      tooltip: `Q2 - video quality (1.0 - 5.0)
        Rate the video part separately
        even though both video and audio are present.
        You don't have to mute the content.
        Please focus only on the technical quality as Q1.
        You can refer to the following standards:
        - Excellent: No noticeable blurring, distortion, or artifacts. Motion is smooth with no stutter or freezes.
        - Bad: Severely blurry, distorted, unstable. Difficult to watch or focus on the content.`,
      min: 1, max: 5, step: 0.1, start: 1,
      labels: ["Bad", "Poor", "Fair", "Good", "Excellent"],
      labels_below: ["1.0", "2.0", "3.0", "4.0", "5.0"] 
    },
    {
      label: "<strong>Rate the audio quality only.</strong>",
      tooltip: `Q3 - audio quality (1.0 - 5.0)</h3>
        Rate the audio part separately,
        even though both video and audio are present.
        You don't have to blackout the video content.
        (The video content can help you determine whether certain sounds in the audio are appropriate elements or unwanted noise)
        Please focus only on the technical quality as Q1.
        You can refer to the following standards:
        - Excellent: Clear and clean audio with no distortion. The volume is balanced.
        - Bad: Distorted or noisy audio. Hard to concentrate or understand.`,
      min: 1, max: 5, step: 0.1, start: 1,
      labels: ["Bad", "Poor", "Fair", "Good", "Excellent"],
      labels_below: ["1.0", "2.0", "3.0", "4.0", "5.0"] 
    },
    {
      label: "<strong>Which part do you pay more attention to<br> when you evaluate the overall quality? <br> (Give a 100% split, e.g. Audio 50% : 50% Video)</strong>",
      tooltip: `Q4 - audio-video importance in quality assessment (percentage 0%:100% - 100%:0%)
        As you judge the overall quality of this video,
        which modality plays a more important role in your decision? — audio or video?`,
      min: 0, max: 100, step: 1, start: 0,
      is_weight_slider: true,
      labels: ["Audio only", "Equally", "Video only"],
      labels_below: ["|", "|", "|", "|", "|", "|", "|", "|", "|", "|", "|"]
    },
  ],

  /*
   * Shared instruction block displayed within rating trials.
   * Provides detailed explanation of all rating questions.
   */
  sharedInstructionHTML: `
    Please drag the sliders to provide your answers to 4 questions.<br><br>
    You are required to rate the quality.<br>
    <strong>do not consider the content</strong> of the video.<br>

    <h3>Q1 - overall audio-visual quality (1.0 - 5.0)</h3>
    <p>Rate the overall audio-visual quality,<br>
       based on your impression of the <strong>combined video and audio</strong> experience.<br>
       Please focus only on the <strong>technical quality</strong> of the video and audio<br>
       — such as clarity, distortion (blur, blocking, noise...) and synchronization.<br>
       Please don't consider content-related factors like:<br>
       — The subject of the clip is pretty or boring or annoying.</p>

    <h3>Q2 - video quality (1.0 - 5.0)</h3>
    <p>Rate the video part <strong>separately</strong>,<br>
       even though both video and audio are present.<br>
       You don't have to mute the content.<br>
       Please focus only on the <strong>technical quality</strong> as Q1.<br>
       You can refer to the following standards:<br>
       - Excellent: No noticeable blurring, distortion, or artifacts. Motion is smooth with no stutter or freezes.<br>
       - Bad: Severely blurry, distorted, unstable. Difficult to watch or focus on the content.</p>

    <h3>Q3 - audio quality (1.0 - 5.0)</h3>
    <p>Rate the audio part <strong>separately</strong>,<br>
       even though both video and audio are present.<br>
       You don't have to blackout the content.<br>
       (The video content can help you determine whether<br>
        certain sounds in the audio are appropriate elements or unwanted noise)<br>
       Please focus only on the <strong>technical quality</strong> as Q1.<br>
       You can refer to the following standards:<br>
       - Excellent: Clear and clean audio with no distortion. The volume is balanced.<br>
       - Bad: Distorted or noisy audio. Hard to concentrate or understand.</p>

    <p style="margin: 10px 0; height: 20px;"></p> 

    <h3>Q4 - audio-video importance in quality assessment <br>
      (percentage 0%:100% - 100%:0%)</h3>
    <p>As you judge the overall quality of this video,<br>
       which modality plays a more important role in your decision?<br> — audio or video?</p>
  `
};
