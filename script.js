/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeLabel = document.getElementById("themeLabel");

let messages = [{ role: "system", content: "You are a Loreal assistant. You answer questions about Loreal products, routines, recommendations, provide skincare advice, and related topicson Loreal. If a user's query is not related to Loreal, respond by stating that you don't know about it." }];

const workerUrl = "https://late-leaf-b809.ravibapatla05usa.workers.dev"; // Replace with your Cloudflare Worker URL

/* Theme setup */
const savedTheme = localStorage.getItem("theme");
const systemPrefersDark = window.matchMedia(
  "(prefers-color-scheme: dark)",
).matches;
let currentTheme = savedTheme || (systemPrefersDark ? "dark" : "light");

function addMessage(role, content) {
  const message = document.createElement("div");
  message.classList.add("msg");
  message.classList.add(role === "user" ? "user" : "ai");
  message.textContent = content;
  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return message;
}

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
addMessage("assistant", "👋 Hello! How can I help you today?");

/* Handle form submit */
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = userInput.value.trim();
  if (!text) {
    return;
  }

  addMessage("user", text);
  messages.push({ role: "user", content: text });

  userInput.value = "";
  userInput.focus();
  sendBtn.disabled = true;

  const loadingMessage = addMessage("assistant", "Processing your request...");

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // Cloudflare Worker expects the chat history in a `messages` array.
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content?.trim();

    if (!assistantMessage) {
      throw new Error("No assistant message returned by API.");
    }

    messages.push({ role: "assistant", content: assistantMessage });
    loadingMessage.textContent = assistantMessage;
  } catch (error) {
    console.error("Error connecting to the API:", error);
    loadingMessage.textContent =
      "Sorry, there was an error connecting to the API.";
  } finally {
    sendBtn.disabled = false;
  }
});
