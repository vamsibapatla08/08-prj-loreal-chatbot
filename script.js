/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeLabel = document.getElementById("themeLabel");

let messages = [
  { role: "system",
    content: "You are a helpful assistant."
  }
]

const workerUrl = "https://late-leaf-b809.ravibapatla05usa.workers.dev"; // Replace with your Cloudflare Worker URL

/* Theme setup */
const savedTheme = localStorage.getItem("theme");
const systemPrefersDark = window.matchMedia(
  "(prefers-color-scheme: dark)",
).matches;
let currentTheme = savedTheme || (systemPrefersDark ? "dark" : "light");

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const isDark = theme === "dark";

  themeIcon.textContent = isDark ? "light_mode" : "dark_mode";
  themeLabel.textContent = isDark ? "Light mode" : "Dark mode";

  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Switch to light mode" : "Switch to dark mode",
  );
  themeToggle.setAttribute("aria-pressed", String(isDark));
}

applyTheme(currentTheme);

themeToggle.addEventListener("click", () => {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(currentTheme);
  localStorage.setItem("theme", currentTheme);
});

// Set initial message
chatWindow.textContent = "👋 Hello! How can I help you today?";

/* Handle form submit */
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  chatWindow.textContent = "Processing your request...";

  messages.push({ role: "user", content: userInput.value });

  try{
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: messages }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const assistantMessage = result.choices[0].message.content;
    messages.push({ role: "assistant", content: assistantMessage });
    chatWindow.textContent = assistantMessage;
  } catch (error) {
    console.error("Error connecting to the API:", error);
    chatWindow.textContent = "Sorry, there was an error connecting to the API.";
    return;
  }

  userInput.value = "";

  // When using Cloudflare, you'll need to POST a `messages` array in the body,
  // and handle the response using: data.choices[0].message.content

  // Show message
  //chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});
