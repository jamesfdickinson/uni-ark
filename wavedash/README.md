# Uni-Ark for Wavedash

This folder is a self-contained Wavedash browser build. `index.html` is at the build root, and the game calls `Wavedash.init()` after its runtime is ready. The call is guarded so the same folder still runs in an ordinary local web server.

## Upload

1. Create or open Uni-Ark in the Wavedash Developer Portal.
2. Open **Builds**, choose **Upload new build**, and upload this `wavedash` folder (or a zip whose root contains `index.html`).
3. Import `wavedash-achievements.json` from **Achievements → Add achievement → Import JSON**.
4. Publish the uploaded build and verify it from the public game URL.

The existing local progress system remains available. When the injected SDK is present, unlocked achievements are merged in both directions with the player's Wavedash achievement state. Press `Tab` in-game to open the Wavedash overlay.

Documentation: https://docs.wavedash.com/getting-started/quickstart
