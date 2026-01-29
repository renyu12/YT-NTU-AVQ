# 🌐 YT-NTU-AVQ: AVQA Dataset & Experimental Platform

This repository provides:

1. **An online crowdsourcing platform** (based on [jsPsych](https://www.jspsych.org/)) for running subjective experiments with audio-visual stimuli.  
2. **The YT-NTU-AVQ dataset**, the first crowdsourced Audio-Visual Quality Assessment (AVQA) dataset, built using this platform.  

The full dataset (~9GB) is released on Hugging Face:  
👉 https://huggingface.co/datasets/ntu-avqa/YT-NTU-AVQ  
This repository hosts the experimental platform and small demo samples for illustration.  
The experimental platform will be released **coming soon**.

---

## 📂 Repository Structure

- `platform/` – The jsPsych-based experimental platform (**coming soon**).  
- `dataset/` – Dataset label file and A/V Sequence examples.  
- `assets/` – Figures and visual materials (for documentation or illustration).  
- `README.md` – Project description and usage guide.  

---

## 🎬 Dataset

**YT-NTU-AVQ** is a crowdsourced dataset for Audio-Visual Quality Assessment (AVQA).  
It contains user-generated A/V sequence with subjective ratings along multiple dimensions:

with the following format:

| Field | Description |
|-------|-------------|
| `seq_name` | file name |
| `score_all` | Overall audiovisual quality score (MOS) |
| `score_v` | Video-only quality score |
| `score_a` | Audio-only quality score |
| `av_weight` | Relative perceptual weight between audio and video |
| `std_all` | Standard deviation of overall scores |
| `std_v` | Standard deviation of video scores |
| `std_a` | Standard deviation of audio scores |
| `std_av_weight` | Standard deviation of AV weight |
| `pretest` | Whether the sample is used in pre-test |
| `manual_selected` | Whether the sample is manually selected |
| `audio_category_id` | Audio semantic category ID(s) |
| `video_summary` | Textual summary of the video content |
| `video_category_id` | Video semantic category ID |
| `video_class` | Video semantic category name |
| `audio_class` | Audio semantic category name(s) |

#### Example:

```csv
seq_name,score_all,score_v,score_a,av_weight,std_all,std_v,std_a,std_av_weight,pretest,manual_selected,audio_category_id,video_summary,video_category_id,video_class,audio_class
Animation_1.mp4,1.7539,1.5746,1.9286,47.08,0.7352,0.6463,0.8661,15.6847,0,0,0|1,"A character flips and jumps on the page.",9,Animation and gaming,Speech|Music
Dynamic_100.mp4,3.361643835616438,3.146575342465753,3.375342465753425,48.17808219178082,0.8025359349839978,0.8470671939404975,0.8707884074404783,12.965062524759706,0,0,1,"Outside, in a belframe-like place, several bells were swinging up and down at the same time, and the bells rang up and down.",1,Dynamic object,Music
```

⚠️ Only a small demo is provided here. The full dataset is available on Hugging Face.  

---

## 🧪 Experimental Platform

The **platform/** folder contains a template for running online subjective experiments with jsPsych.

### ✨ Features
- Modular experiment design (pre-test, qualification test, formal test, post-survey).  
- Multi-video input with subjective scoring (e.g., sliders, buttons).  
- Flexible video/audio quality assessment tasks.  
- Automatic logging of behavioral data (play/pause counts, total viewing time, etc.).  

### 🚀 How to Use
1. Place experimental materials (e.g., videos) in `platform/static/videos/`.  
2. Configure the experiment flow in `platform/config/`.  
3. Open `index.html` in a browser to run the experiment.  
4. Results will be saved as `.csv` or `.json` files for later analysis.  

This platform can serve as a **template** for building your own online subjective experiments.

---

## 📜 License

- **Code**: Released under the [MIT License](LICENSE).  
- **Dataset**: Released under the **CC BY 3.0** license on Hugging Face.  
- **Annotations and metadata**: Released under the **CC BY 4.0** license.

---

## 📖 Citation

ICASSP 2026 paper:  
**Scaling Audio-Visual Quality Assessment Dataset via Crowdsourcing**  

Citation details will be added after the paper publication.  

---

## 📬 Contact

Maintained by the NTU AVQA team.  
For questions and feedback, please open a [GitHub Issue](../../issues).  
