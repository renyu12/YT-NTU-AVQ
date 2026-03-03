# Online Audio-Visual Quality Assessment Platform

This directory contains a lightweight, configurable web-based experimental framework built on top of jsPsych.

It is designed for conducting controlled audio-visual quality assessment (AVQA) experiments, but can be adapted to other behavioral or perception studies.

This is **not** the original version used in the paper *“Scaling Audio-Visual Quality Assessment Dataset via Crowdsourcing.”*  
For open-source release, the framework has been simplified and partially refactored to improve clarity, modularity, and reusability for general subjective experiments.

The goal of this release is to provide a practical reference implementation that reduces the engineering effort required to build custom online experimental platforms.

The current version remains lightweight and may not cover all advanced use cases.  
Contributions and improvements from the research community are welcome.

---

## 📂 Directory Structure
```
platform/
│
├── config/          # Experiment configuration files
│ ├── experiment.json  # High-level experiment flow & settings
│ └── videos.json      # Stimulus list (video metadata & URLs)
│
├── jspsych/                              # jsPsych library and plugins
│ ├── ...                                   # Official jsPsych plugins
│ └── plugin-video-multislider-response.js  # Custom video + multi-slider plugin
│
├── images/  # Static image assets used in pages
│
├── test/                                 # Tools for test
│ └── submission_server_demo.py             # Example remote result receiver (for testing only)
│
├── experiment_content.js  # Text content (instructions, consent, questions, etc.)
├── index.html             # Entry page (loads all scripts)
├── main.js                # Main experiment control logic
├── utils.js               # Shared utility functions
├── favicon.ico            # Browser tab icon
└── README.md              # This file
```

---

## 🚀 Running the Experiment

This platform is a static web application built on top of jsPsych.  
It must be served through an HTTP server.

### Testing

For testing purposes, you may use a simple HTTP server:
```
cd platform
python -m http.server 8001
```
Then open:
```
http://localhost:8001
```
This method is sufficient for development and small-scale testing.

### Production Deployment

For formal deployment, it is recommended to:

- Use a proper web server (e.g., Nginx, Apache, or a cloud hosting service)
- Enable HTTPS for secure data transmission
- Deploy behind a secure backend if remote data submission is required
- Store results in a database instead of local JSON files
- Ensure sufficient server capacity based on expected participant volume
- Consider geographic distribution of participants to minimize network latency. Media assets (e.g., videos) should ideally be delivered via a Content Delivery Network (CDN)

Researchers should follow standard web service deployment and data security practices appropriate to their institutional and regulatory requirements.

### Task Assignment & Submission

Our task-dispatch backend logic has been intentionally simplified. In this open-source version:

- The video list is directly loaded from `config/videos.json`
- Results are saved locally (JSON / CSV)

If remote submission is required, a minimal backend demo is provided in:

`test/submission_server_demo.py`

This demo is intended for testing only. For production use, implement a secure backend service and persistent storage.

---

## ⚙️ Configuration Workflow

To customize an experiment:

1. Modify `config/experiment.json`
   - Enable or disable experiment stages
   - Adjust environment check parameters
   - Configure result saving and remote submission settings

2. Update `config/videos.json`
   - Replace or extend the stimulus list

3. Edit `experiment_content.js`
   - Modify instructions, consent form, or textual content

For typical experiments, no modification of the core logic (`main.js`) is required.

### Result Saving Logic in experiment.json

The framework supports both local saving and remote submission:

- If `save_local_results` is `true`, results will be downloaded locally in the formats specified by `save_format` (e.g., JSON, CSV).
- If `remote_submit_url` is provided, results will be submitted to the specified backend endpoint via HTTP POST.
- If remote submission fails, the framework will fall back to local saving (if enabled).

These options can be used independently or together, depending on deployment requirements.


### videos.json Structure

`config/videos.json` defines the stimulus list for both training and formal experiment phases.

Structure:

- `train_videos`: Used in the training phase.
  - `video_id`: Unique identifier.
  - `video_url`: Path or URL to the video file.
  - `description`: Optional explanation shown in training.
  - `e_all`, `e_v`, `e_a`, `e_av_weight`: Expected rating ranges (used for guidance or validation in training).

- `experiment_videos`: Used in the formal experiment.
  - `video_id`: Unique identifier.
  - `video_url`: Path or URL to the video file.

For large-scale deployment, media files should preferably be hosted on a CDN.

---

### Advanced Customization

If you need to:

- Change the experiment flow logic
- Add new experimental stages
- Implement custom interaction behaviors
- Modify data processing logic

You may edit `main.js` accordingly.

To develop new interaction components, refer to:

- `jspsych/plugin-video-multislider-response.js`

as an example of how to implement a custom jsPsych plugin.

---

## 📌 Notes for Researchers

- Audio device detection may require a secure context (HTTPS or localhost).
- Network testing downloads a small media file to estimate playback stability.
- Custom plugin records playback behavior for quality control.

---

## 📜 License

This directory is covered by the MIT License of the main repository.

You are free to use, modify, and distribute this framework under the terms of the MIT License.

Researchers are responsible for ensuring compliance with their institutional ethics and data protection requirements before deployment.

If you find this framework helpful for your research, we would appreciate a citation of the associated paper.
