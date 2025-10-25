# FocusFence

A personal focus dashboard for students to block out distractions, track study sessions, and boost productivity. This application is a lightweight, static web app that runs entirely in the browser with no build step required.

## Features

- **Focus Sessions:** Start a timer to focus on your work. A virtual tree grows as you maintain focus.
- **Distraction Blocking:** The app enters fullscreen and provides a visual "shake" alert if you navigate away or exit fullscreen, helping you stay on task.
- **Manual & Scheduled Modes:** Set up a one-time focus session or create a recurring weekly schedule.
- **Progress Tracking:** "Plant" a tree for each completed session and track your progress towards milestones.
- **Daily Rewards:** Complete at least one session a day to earn a daily reward.
- **Personalization:**
    - Light and Dark modes.
    - Personalized greetings.
- **Ambiance:** An integrated music player provides calming lofi music for your study sessions.
- **Offline First:** All your data, including your profile and progress, is stored locally in your browser's LocalStorage.

## How to Run Locally

1.  Clone this repository or download the files.
2.  Open the `index.html` file in any modern web browser.

That's it! There's no need for a build process or a local server.

## Deployment

This project is perfectly suited for easy deployment to any static hosting service.

### GitHub Pages

1.  **Repository Setup:** Make sure your `index.html` file is in the root directory of your repository.
2.  **Push to GitHub:** Push all the project files (`index.html`, `index.js`, `index.css`) to your GitHub repository.
3.  **Enable GitHub Pages:**
    *   In your repository on GitHub, go to the **Settings** tab.
    *   In the left sidebar, click on **Pages**.
    *   Under "Build and deployment", for the "Source", select **Deploy from a branch**.
    *   Select the branch you want to deploy from (usually `main` or `master`) and keep the folder as `/ (root)`.
    *   Click **Save**.
4.  **Access Your Site:** GitHub will provide you with a URL (e.g., `https://<your-username>.github.io/<repository-name>/`). It might take a few minutes for the site to become live.
