#### **Test Plan 1: Full Gameplay Loop (Successful Win)**

* **Objective:** To verify that a user can log in, start a game in a standard mode, and win by guessing correctly.  
* **Pre-requisite:** The user is logged out of the application.  
* **Steps:**  
  * User navigates to the application's home URL.  
  * User clicks the "Connect with Spotify" button.  
  * User is redirected to Spotify, enters their credentials, and grants permission.  
  * User is redirected back to the application's "Select a Game Mode" screen.  
  * User clicks the "All Time" button.  
  * The game screen appears with a pixelated image.  
  * User types the correct album name into the answer text box.  
  * User presses Enter or clicks a submit button.  
* **Expected Result:**  
  * A "Correct\!" message appears in green.  
  * The final round score is calculated and displayed, incorporating a time bonus and any win streak bonus.  
  * The user's Total Score and Win Streak are correctly incremented and saved.  
  * The full-resolution album cover is revealed.  
  * The "Continue," "Change Mode," and "Share Result" buttons appear.

---

#### **Test Plan 2: Game Over by Incorrect Guesses**

* **Objective:** To verify the 5-guess life system and the "Game Over" state for a standard game mode.  
* **Pre-requisite:** A standard game (e.g., "6 Months") is in progress with 5 guesses remaining.  
* **Steps:**  
  * User types an incorrect album name and presses Enter.  
  * Repeat Step 1 three more times (for a total of 4 incorrect guesses).  
  * User types a final, 5th incorrect album name and presses Enter.  
* **Expected Result:**  
  * After each of the first 4 incorrect guesses, an "Incorrect" message appears in red, and the "Guesses" counter decreases by one.  
  * The pixelation level of the image decreases slightly after each incorrect guess.  
  * After the 5th incorrect guess, the game ends.  
  * A detailed "Game Over" message appears in red, stating the correct album and artist name, and the user's win streak before it was reset (e.g., "Your win streak was 3.").  
  * The user's Win Streak is reset to 0\. The round score is 0\.  
  * The "Back to Menu" and "Share Result" buttons appear.

---

#### **Test Plan 3: Daily Challenge Hardcore Mode & Lockout**

* **Objective:** To verify the unique rules of the Daily Challenge mode and ensure it locks correctly after completion.  
* **Pre-requisite:** The user is on the "Select a Game Mode" screen, and the Daily Challenge is available.  
* **Steps:**  
  * User clicks the "Daily Challenge" button.  
  * The game screen appears.  
  * User types an incorrect guess and presses Enter.  
* **Expected Result:**  
  * The initial pixelation level is much more aggressive (e.g., level 2 or 3\) than in standard modes.  
  * The "Guesses" counter shows "1".  
  * No initial hints (like release date) are provided.  
  * After the single incorrect guess, the game immediately ends.  
  * A "Game Over" message appears, revealing the answer and the user's prior win streak.  
  * The user is taken to the finished screen with a "Back to Menu" button.  
  * Upon returning to the "Select a Game Mode" screen, the "Daily Challenge" button is disabled (greyed out).  
  * The button's text now displays a countdown timer, such as "Daily Unlocks in 23:59:XX".

---

#### **Test Plan 4: Dynamic Hint System & "Reveal Artist"**

* **Objective:** To verify that the hint system functions correctly, including the special "Reveal Artist" hint and its associated score penalty.  
* **Pre-requisite:** A game is in progress.  
* **Steps:**  
  * User clicks the "Add Hint" button.  
  * User clicks the "Add Hint" button again.  
  * User clicks the "Reveal Artist (Score Cap)" button.  
* **Expected Result:**  
  * After the first click, a random hint (e.g., "A similar artist is...") appears in the hint list.  
  * After the second click, a *different* random hint (e.g., "The artist is from...") appears.  
  * After clicking "Reveal Artist," the artist's name appears as a hint.  
  * A message appears, "Artist revealed\! Your max score for this round is now capped."  
  * The "Reveal Artist" button becomes disabled.

---

#### **Test Plan 5: Share Result Infographic**

* **Objective:** To verify that the "Share Result" feature correctly opens a modal and allows the user to download a summary image.  
* **Pre-requisite:** The user has just finished a game (win or lose).  
* **Steps:**  
  * User is on the "Finished" screen.  
  * User clicks the "Share Result" button.  
  * A modal popup appears, displaying the infographic.  
  * User clicks the "Download Image" button inside the modal.  
* **Expected Result:**  
  * A modal overlay appears, showing a styled infographic containing the Round Score, Total Score, and Longest Win Streak.  
  * Clicking "Download Image" initiates a browser download of a PNG file (e.g., pixel-jumble-stats.png).  
  * The downloaded image is a clear, high-quality capture of the infographic.

