// ====== CONFIG ======
// UPDATE THIS with your actual Cloudflare Worker URL after deployment
const WORKER_URL = "https://food-analysis-worker.YOUR-SUBDOMAIN.workers.dev";

// Supabase credentials
const SUPABASE_URL = "https://uuodjmgpyjuqcjnletuc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_VrRJ-xDvsIom6yDpx6gfCg_HtFhYYHq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;

// ====== DOM ELEMENTS ======

// Auth
const authCard = document.getElementById("authCard");
const authTitle = document.getElementById("authTitle");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authToggleText = document.getElementById("authToggleText");
const authStatus = document.getElementById("authStatus");
const logoutBtn = document.getElementById("logoutBtn");

// Main app cards
const addMealCard = document.getElementById("addMealCard");
const cameraCard = document.getElementById("cameraCard");
const totalsCard = document.getElementById("totalsCard");
const mealsCard = document.getElementById("mealsCard");

// Meal elements
const mealInput = document.getElementById("mealInput");
const addMealBtn = document.getElementById("addMealBtn");
const mealList = document.getElementById("mealList");
const totalCaloriesEl = document.getElementById("totalCalories");
const totalProteinEl = document.getElementById("totalProtein");
const totalCarbsEl = document.getElementById("totalCarbs");
const totalFatEl = document.getElementById("totalFat");

// Camera elements
const toggleCameraBtn = document.getElementById("toggleCameraBtn");
const cameraContainer = document.getElementById("cameraContainer");
const cameraPreview = document.getElementById("cameraPreview");
const cameraCanvas = document.getElementById("cameraCanvas");
const captureBtn = document.getElementById("captureBtn");
const retakeBtn = document.getElementById("retakeBtn");
const analyzePhotoBtn = document.getElementById("analyzePhotoBtn");
const cameraStatus = document.getElementById("cameraStatus");

let isLoginMode = true;
let cameraStream = null;
let capturedImageData = null;

// ====== AUTH LOGIC ======
function wireAuthToggleLink() {
  const link = document.getElementById("authToggleLink");
  if (!link) return;
  link.addEventListener("click", () => {
    isLoginMode = !isLoginMode;
    authTitle.textContent = isLoginMode ? "Login" : "Register";
    authSubmitBtn.textContent = isLoginMode ? "Login" : "Create Account";
    authToggleText.innerHTML = isLoginMode
      ? `Don't have an account? <span id="authToggleLink" class="auth-link">Register</span>`
      : `Already have an account? <span id="authToggleLink" class="auth-link">Login</span>`;
    wireAuthToggleLink();
  });
}
wireAuthToggleLink();

authSubmitBtn.addEventListener("click", async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();
  if (!email || !password) return (authStatus.textContent = "Enter email and password.");
  authStatus.textContent = "Processing...";

  try {
    if (isLoginMode) {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } else {
      const { error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      authStatus.textContent = "Check your email to confirm!";
      return;
    }
    authStatus.textContent = "Success!";
    await checkSession();
  } catch (err) {
    authStatus.textContent = err.message || "Authentication error.";
  }
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  currentUser = null;
  showAuthUI();
});

async function checkSession() {
  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session?.user || null;
  if (currentUser) {
    hideAuthUI();
    await loadCloudMeals();
  } else showAuthUI();
}

function hideAuthUI() {
  authCard.classList.add("hidden");
  logoutBtn.classList.remove("hidden");
  addMealCard.classList.remove("hidden");
  cameraCard.classList.remove("hidden");
  totalsCard.classList.remove("hidden");
  mealsCard.classList.remove("hidden");
}

function showAuthUI() {
  authCard.classList.remove("hidden");
  logoutBtn.classList.add("hidden");
  addMealCard.classList.add("hidden");
  cameraCard.classList.add("hidden");
  totalsCard.classList.add("hidden");
  mealsCard.classList.add("hidden");
}

// ====== MEAL LOGIC ======
addMealBtn.addEventListener("click", async () => {
  const text = mealInput.value.trim();
  if (!text || !currentUser) return;

  const calories = Math.floor(Math.random() * 400) + 100;
  await saveMealToCloud({ 
    text, 
    calories,
    protein: 0,
    carbs: 0,
    fat: 0,
    time: new Date().toISOString() 
  });
  mealInput.value = "";
  await loadCloudMeals();
});

async function saveMealToCloud(meal) {
  if (!currentUser) return;
  
  const { error } = await supabaseClient.from("meals").insert({
    user_id: currentUser.id,
    description: meal.text,
    calories: meal.calories || 0,
    protein: meal.protein || 0,
    carbs: meal.carbs || 0,
    fat: meal.fat || 0,
    timestamp: meal.time,
  });
  
  if (error) {
    console.error("Error saving meal:", error);
    alert("Failed to save meal. Please try again.");
  }
}

async function loadCloudMeals() {
  if (!currentUser) return;
  
  const { data, error } = await supabaseClient
    .from("meals")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("timestamp", { ascending: false });
  
  if (error) {
    console.error("Error loading meals:", error);
    return;
  }

  mealList.innerHTML = "";
  let totalCals = 0;
  let totalProt = 0;
  let totalCarb = 0;
  let totalFt = 0;
  
  data.forEach(row => {
    totalCals += row.calories || 0;
    totalProt += row.protein || 0;
    totalCarb += row.carbs || 0;
    totalFt += row.fat || 0;
    
    addMealToDOM({
      id: row.id,
      text: row.description,
      calories: row.calories || 0,
      protein: row.protein || 0,
      carbs: row.carbs || 0,
      fat: row.fat || 0,
      time: new Date(row.timestamp).toLocaleTimeString([], { 
        hour: "2-digit", 
        minute: "2-digit" 
      }),
    });
  });
  
  totalCaloriesEl.textContent = totalCals;
  if (totalProteinEl) totalProteinEl.textContent = totalProt.toFixed(1);
  if (totalCarbsEl) totalCarbsEl.textContent = totalCarb.toFixed(1);
  if (totalFatEl) totalFatEl.textContent = totalFt.toFixed(1);
}

function addMealToDOM(meal) {
  const li = document.createElement("li");
  li.classList.add("meal-item");
  
  const macros = meal.protein || meal.carbs || meal.fat 
    ? `<br><small>P: ${meal.protein}g | C: ${meal.carbs}g | F: ${meal.fat}g</small>`
    : '';
  
  li.innerHTML = `
    <div>
      <strong>${meal.time}</strong> — ${meal.text} 
      <span class="meal-calories">(${meal.calories} cal)</span>
      ${macros}
    </div>
    <button class="delete-btn" data-id="${meal.id}">🗑️</button>
  `;
  
  // Add delete functionality
  const deleteBtn = li.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', async () => {
    if (confirm('Delete this meal?')) {
      await deleteMeal(meal.id);
    }
  });
  
  mealList.appendChild(li);
}

async function deleteMeal(mealId) {
  const { error } = await supabaseClient
    .from("meals")
    .delete()
    .eq('id', mealId);
  
  if (error) {
    console.error("Error deleting meal:", error);
    alert("Failed to delete meal.");
  } else {
    await loadCloudMeals();
  }
}

// ====== CAMERA LOGIC ======
toggleCameraBtn.addEventListener("click", async () => {
  if (cameraContainer.classList.contains("hidden")) {
    cameraContainer.classList.remove("hidden");
    toggleCameraBtn.textContent = "Close Camera";
    captureBtn.classList.remove("hidden");
    retakeBtn.classList.add("hidden");
    analyzePhotoBtn.classList.add("hidden");
    cameraCanvas.classList.add("hidden");
    cameraPreview.classList.remove("hidden");
    await startCamera();
  } else {
    stopCamera();
    cameraContainer.classList.add("hidden");
    toggleCameraBtn.textContent = "Open Camera";
  }
});

async function startCamera() {
  cameraStatus.textContent = "Starting camera...";
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "environment" }, 
      audio: false 
    });
    cameraPreview.srcObject = cameraStream;
    cameraStatus.textContent = "Point your camera at your meal and tap Capture.";
  } catch (err) {
    console.error("Camera error:", err);
    cameraStatus.textContent = "Camera access denied.";
  }
}

function stopCamera() {
  cameraStream?.getTracks().forEach(t => t.stop());
  cameraStream = null;
  cameraPreview.srcObject = null;
  capturedImageData = null;
}

captureBtn.addEventListener("click", () => {
  cameraCanvas.width = cameraPreview.videoWidth;
  cameraCanvas.height = cameraPreview.videoHeight;
  cameraCanvas.getContext("2d").drawImage(cameraPreview, 0, 0);
  capturedImageData = cameraCanvas.toDataURL("image/jpeg", 0.85);
  cameraPreview.classList.add("hidden");
  cameraCanvas.classList.remove("hidden");
  captureBtn.classList.add("hidden");
  retakeBtn.classList.remove("hidden");
  analyzePhotoBtn.classList.remove("hidden");
  cameraStatus.textContent = "Photo captured! Tap 'Analyze Food' to continue.";
});

retakeBtn.addEventListener("click", () => {
  cameraCanvas.classList.add("hidden");
  cameraPreview.classList.remove("hidden");
  captureBtn.classList.remove("hidden");
  retakeBtn.classList.add("hidden");
  analyzePhotoBtn.classList.add("hidden");
  capturedImageData = null;
  cameraStatus.textContent = "Point your camera at your meal and tap Capture.";
});

// ====== AI IMAGE ANALYSIS ======
analyzePhotoBtn.addEventListener("click", async () => {
  if (!capturedImageData || !currentUser) return;
  
  analyzePhotoBtn.disabled = true;
  cameraStatus.textContent = "🔍 Analyzing food with AI...";

  try {
    const res = await fetch("https://caloriescanner.jtho09200920.workers.dev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: capturedImageData })
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    
    // Debug logging
    console.log("API Response:", data);
    
    if (data.error) {
      cameraStatus.textContent = `Error: ${data.error}`;
      return;
    }

    if (!data.has_food) {
      cameraStatus.innerHTML = `❌ No food detected (${Math.round((data.confidence || 0)*100)}% confidence)<br><small>Debug: ${JSON.stringify(data).substring(0, 200)}</small>`;
      return;
    }

    // Save meal with full nutrition data
    await saveMealToCloud({
      text: data.description || "Food detected",
      calories: data.calories_estimate || 0,
      protein: data.protein || 0,
      carbs: data.carbs || 0,
      fat: data.fat || 0,
      time: new Date().toISOString()
    });

    await loadCloudMeals();

    // Display detailed breakdown
    const objectsHtml = data.objects
      .map(obj => `
        <li style="margin: 8px 0; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 4px;">
          <strong>${obj.name}</strong> (${obj.portion})<br>
          <small>
            ${obj.calories} cal | 
            P: ${obj.protein}g | 
            C: ${obj.carbs}g | 
            F: ${obj.fat}g<br>
            Confidence: ${Math.round(obj.confidence * 100)}%
          </small>
        </li>
      `)
      .join("");

    cameraStatus.innerHTML = `
      ✅ <strong>Analysis Complete!</strong><br>
      <strong>Total: ${data.calories_estimate} calories</strong><br>
      <small>Protein: ${data.protein}g | Carbs: ${data.carbs}g | Fat: ${data.fat}g</small>
      <ul style="list-style: none; padding: 0; margin: 10px 0;">${objectsHtml}</ul>
      <small style="opacity: 0.7;">Meal saved to your log!</small>
    `;

    // Auto-close camera after 5 seconds
    setTimeout(() => {
      stopCamera();
      cameraContainer.classList.add("hidden");
      toggleCameraBtn.textContent = "Open Camera";
    }, 5000);

  } catch (err) {
    console.error("Analysis error:", err);
    cameraStatus.textContent = `❌ Analysis failed: ${err.message}. Please try again.`;
  } finally {
    analyzePhotoBtn.disabled = false;
  }
});

// ====== INIT ======
document.addEventListener("DOMContentLoaded", checkSession);
