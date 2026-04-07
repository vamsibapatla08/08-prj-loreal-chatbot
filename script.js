/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeLabel = document.getElementById("themeLabel");
const CONTEXT_STORAGE_KEY = "lorealChatContext";
const HISTORY_STORAGE_KEY = "lorealChatHistory";
const MAX_CONTEXT_QUESTIONS = 8;
const MAX_HISTORY_TURNS = 12;

let messages = [
  {
    role: "system",
    content:
      "You are a Loreal assistant. You answer questions about Loreal products, routines, recommendations, provide skincare advice, and related topics on Loreal. If a user's query is not related to Loreal, respond by stating that you don't know about it.",
  },
];

const workerUrl = "https://late-leaf-b809.ravibapatla05usa.workers.dev"; // Replace with your Cloudflare Worker URL

// We store lightweight context so multi-turn chats feel natural.
let chatContext = {
  userName: "",
  pastQuestions: [],
};

// We keep recent chat turns so the assistant remembers ongoing conversation details.
let conversationHistory = [];

function loadChatContext() {
  const saved = localStorage.getItem(CONTEXT_STORAGE_KEY);

  if (!saved) {
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    chatContext.userName = parsed.userName || "";
    chatContext.pastQuestions = Array.isArray(parsed.pastQuestions)
      ? parsed.pastQuestions
      : [];
  } catch (error) {
    console.warn("Could not load saved chat context.", error);
  }
}

function saveChatContext() {
  localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(chatContext));
}

function loadConversationHistory() {
  const saved = localStorage.getItem(HISTORY_STORAGE_KEY);

  if (!saved) {
    return;
  }

  try {
    const parsed = JSON.parse(saved);

    if (Array.isArray(parsed)) {
      conversationHistory = parsed.filter(
        (item) =>
          item &&
          (item.role === "user" || item.role === "assistant") &&
          typeof item.content === "string" &&
          item.content.trim().length > 0,
      );
    }
  } catch (error) {
    console.warn("Could not load saved conversation history.", error);
  }
}

function saveConversationHistory() {
  localStorage.setItem(
    HISTORY_STORAGE_KEY,
    JSON.stringify(conversationHistory),
  );
}

function extractUserName(text) {
  // Simple beginner-friendly patterns to catch common name introductions.
  const patterns = [
    /my name is\s+([a-z][a-z'\-\s]{0,30})/i,
    /i am\s+([a-z][a-z'\-\s]{0,30})/i,
    /i'm\s+([a-z][a-z'\-\s]{0,30})/i,
    /call me\s+([a-z][a-z'\-\s]{0,30})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/\s+/g, " ");
    }
  }

  return "";
}

function updateChatContext(userText) {
  const foundName = extractUserName(userText);

  if (foundName) {
    chatContext.userName = foundName;
  }

  chatContext.pastQuestions.push(userText);

  // Keep only the latest 8 user prompts to avoid oversized payloads.
  if (chatContext.pastQuestions.length > MAX_CONTEXT_QUESTIONS) {
    chatContext.pastQuestions = chatContext.pastQuestions.slice(
      -MAX_CONTEXT_QUESTIONS,
    );
  }

  saveChatContext();
}

function addTurnToHistory(role, content) {
  conversationHistory.push({ role, content });

  // Keep the latest turns only so we do not grow forever in localStorage.
  if (conversationHistory.length > MAX_HISTORY_TURNS) {
    conversationHistory = conversationHistory.slice(-MAX_HISTORY_TURNS);
  }

  saveConversationHistory();
}

function buildContextMessage() {
  const contextLines = [];

  if (chatContext.userName) {
    contextLines.push(`User name: ${chatContext.userName}`);
  }

  if (chatContext.pastQuestions.length > 0) {
    contextLines.push(
      `Recent user questions: ${chatContext.pastQuestions.join(" | ")}`,
    );
  }

  const recentTurns = conversationHistory.slice(-6);

  if (recentTurns.length > 0) {
    const conversationSummary = recentTurns
      .map((turn) => {
        const label = turn.role === "user" ? "User" : "Assistant";
        return `${label}: ${turn.content}`;
      })
      .join(" | ");

    contextLines.push(`Recent conversation turns: ${conversationSummary}`);
  }

  if (contextLines.length === 0) {
    return {
      role: "system",
      content: "No extra conversation context is available.",
    };
  }

  return {
    role: "system",
    content: `Use this conversation context when helpful for a natural multi-turn reply. ${contextLines.join(". ")}.`,
  };
}

loadChatContext();
loadConversationHistory();

// Rebuild the API message history with system prompt + restored turns.
messages = [messages[0], ...conversationHistory];

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

function showLatestQuestion(text) {
  const previousLatestQuestion = chatWindow.querySelector(".latest-question");

  if (previousLatestQuestion) {
    previousLatestQuestion.remove();
  }

  const latestQuestion = document.createElement("div");
  latestQuestion.classList.add("latest-question");
  latestQuestion.textContent = `Latest question: ${text}`;
  chatWindow.appendChild(latestQuestion);
  chatWindow.scrollTop = chatWindow.scrollHeight;
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

// Show previous chat turns if they exist, otherwise show a greeting.
if (conversationHistory.length > 0) {
  conversationHistory.forEach((turn) => {
    addMessage(turn.role, turn.content);
  });
} else if (chatContext.userName) {
  addMessage(
    "assistant",
    `👋 Hello ${chatContext.userName}! How can I help you today?`,
  );
} else {
  addMessage("assistant", "👋 Hello! How can I help you today?");
}

/* Handle form submit */
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = userInput.value.trim();
  if (!text) {
    return;
  }

  updateChatContext(text);
  addMessage("user", text);
  messages.push({ role: "user", content: text });
  addTurnToHistory("user", text);

  userInput.value = "";
  userInput.focus();
  sendBtn.disabled = true;

  showLatestQuestion(text);
  const loadingMessage = addMessage("assistant", "Processing your request...");

  try {
    const payloadMessages = [
      messages[0],
      buildContextMessage(),
      ...messages.slice(1),
    ];

    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // Cloudflare Worker expects the chat history in a `messages` array.
      body: JSON.stringify({ messages: payloadMessages }),
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
    addTurnToHistory("assistant", assistantMessage);
    loadingMessage.textContent = assistantMessage;
  } catch (error) {
    console.error("Error connecting to the API:", error);
    loadingMessage.textContent =
      "Sorry, there was an error connecting to the API.";
  } finally {
    sendBtn.disabled = false;
  }
});
