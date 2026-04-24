# Pixel Jumble 🎮

A personalized "guess the album" music trivia game powered by your Spotify listening history. The app challenges you to identify heavily pixelated album covers from your own top tracks, offering a variety of hints and a persistent scoring system.

**Live Demo:** **[Play Pixel Jumble Here!](https://pixel-jumble.vercel.app)** 
 
<img width="770" height="640" alt="image" src="https://github.com/user-attachments/assets/2cc745d2-a30c-4b32-94c0-f229e76f4b74" />


> **Note on Public Access:** Due to recent changes in Spotify's API policy, this application must remain in "Development Mode." To try the live demo, please email **khantran@outlook.com** to have your Spotify account added to the user list.

---

### Functionality

Pixel Jumble provides a seamless and interactive game loop driven by the user's personal data and designed for high replayability.

-   **Personalized Puzzles:** Generates challenges using the user's own top-played albums from Spotify.
-   **Multiple Game Modes:** Players can choose to generate puzzles based on their music history over **4 Weeks**, **6 Months**, or **All Time**.
-   **Daily Challenge Mode:** A high-stakes "hardcore" mode with extreme pixelation, only one guess, and a 24-hour lockout upon completion.
-   **Interactive Gameplay:** Players have a limited number of guesses and a timer to identify the album. With each incorrect guess in standard modes, the image becomes progressively clearer.
-   **Dynamic Hint System:** A pool of randomized hints is generated for each puzzle, including the album's release date, artist's genre, a similar artist, a song from the album, and more.
-   **Engaging Scoring System:** A persistent scoring system saves the user's **Total Score** and **Longest Win Streak** in their browser. Players are rewarded points based on how quickly they guess correctly, with a bonus multiplier for their current win streak.

---

### Getting Started

To get a local copy up and running, follow these steps.

#### Software to Download (Prerequisites)

-   **Node.js and npm:** This project is built on the Node.js runtime. Download it from [nodejs.org](https://nodejs.org/).
-   **Git:** You will need Git to clone the repository. [Download Git](https://git-scm.com/downloads).
-   **A Code Editor:** Recommend [Visual Studio Code](https://code.visualstudio.com/).
-   **A Spotify Account:** Required for logging in and fetching listening history (Spotify Premium may required).

#### Changes You Need to Make (Configuration)

Before you can run the project, you need to set up your own secret keys and local environment.

1.  **Clone the Repository**
    ```sh
    git clone https://github.com/KaidenTr/pixel-jumble.git
    cd pixel-jumble
    ```

2.  **Set Up Spotify API Keys**
    -   Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create a new application.
    -   Note down your **Client ID** and **Client Secret**.

3.  **Set Up `ngrok` for Local Development**
    -   Spotify's API requires a secure `https` Redirect URI, even for local development. We use `ngrok` to create a secure tunnel to our local server.
    -   [Download and install ngrok](https://ngrok.com/download).
    -   Connect your account by running the authtoken command from your [ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken).

4.  **Create and Configure the `.env` File**
    -   In the `/server` directory, create a file named `.env`.
    -   Copy the contents of `env.example` (if present) or use the template below and fill in your details.
    ```env
    # Spotify Credentials
    CLIENT_ID=YOUR_SPOTIFY_CLIENT_ID
    CLIENT_SECRET=YOUR_SPOTIFY_CLIENT_SECRET

    # URIs for Local Development
    # This MUST be http://localhost:3000
    FRONTEND_URI=http://localhost:3000
    
    # This will be your ngrok URL from the next step
    REDIRECT_URI=
    ```

5.  **Run `ngrok` and Update Settings**
    -   In a separate terminal, start ngrok to expose your backend port (5000):
        ```sh
        ngrok http 5000
        ```
    -   `ngrok` will give you a public `https` Forwarding URL (e.g., `https://random-string.ngrok-free.app`). **Copy this URL.**
    -   **Update Spotify Dashboard:** Go to your Spotify app settings, click "Edit Settings," and add the `ngrok` URL + `/callback` to your Redirect URIs. Example: `https://random-string.ngrok-free.app/callback`.
    -   **Update `.env` file:** Paste the same `ngrok` URL + `/callback` into the `REDIRECT_URI` field in your `.env` file.

---

### How to Run the Code

This project requires two separate processes to be running simultaneously: the backend server and the frontend client.

1.  **Start the Backend Server**
    -   Open a terminal and navigate to the server directory.
    ```sh
    cd server
    npm install
    node index.js
    ```
    -   Your backend will be running at `http://localhost:5000`.

2.  **Start the Frontend Client**
    -   Open a **second, separate terminal** and navigate to the client directory.
    ```sh
    cd client
    npm install
    npm start
    ```
    -   Your React application will open automatically in your browser at `http://localhost:3000`.

3.  **Play the Game!**
    -   You can now use the application in your browser.

> **A Note on `npm audit`:** During `npm install`, you may see warnings about vulnerabilities. For this Create React App project, these are generally in development dependencies and are safe to ignore. **Do not run `npm audit fix --force`**, as it can break the project's dependencies.
