// ====== SUPABASE INIT ======
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

    if (!email || !password) {
        authStatus.textContent = "Please enter email and password.";
        return;
    }

    authStatus.textContent = "Processing...";

    try {
        if (isLoginMode) {
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.auth.signUp({ email, password });
            if (error) throw error;
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

// ====== SESSION ======

async function checkSession() {
    const { data } = await supabaseClient.auth.getSession();
    currentUser = data.session?.user || null;

    if (currentUser) {
        hideAuthUI();
        await loadCloudMeals();
    } else {
        showAuthUI();
    }
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

// ====== MEALS (CLOUD) ======

addMealBtn.addEventListener("click", async () => {
    const text = mealInput.value.trim();
    if (!text || !currentUser) return;

    const calories = await estimateCaloriesFromText(text);

    await saveMealToCloud({
        text,
        calories,
        time: new Date().toISOString()
    });

    mealInput.value = "";
    await loadCloudMeals();
});

async function estimateCaloriesFromText() {
    return Math.floor(Math.random() * 400) + 100;
}

async function saveMealToCloud(meal) {
    if (!currentUser) return;

    await supabaseClient.from("meals").insert({
        user_id: currentUser.id,
        description: meal.text,
        calories: meal.calories,
        timestamp: meal.time
    });
}

async function loadCloudMeals() {
    if (!currentUser) return;

    const { data } = await supabaseClient
        .from("meals")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("timestamp", { ascending: true });

    mealList.innerHTML = "";
    let total = 0;

    data.forEach(row => {
        total += row.calories;
        addMealToDOM({
            text: row.description,
            calories: row.calories,
            time: new Date(row.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            })
        });
    });

    totalCaloriesEl.textContent = total;
}

function addMealToDOM(meal) {
    const li = document.createElement("li");
    li.className = "meal-item";
    li.innerHTML = `
        <strong>${meal.time}</strong> — ${meal.text}
        <span class="meal-calories">(${meal.calories} cal)</span>
    `;
    mealList.appendChild(li);
}

// ====== CAMERA ======

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
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
        });
        cameraPreview.srcObject = cameraStream;
        cameraStatus.textContent = "Capture your meal.";
    } catch {
        cameraStatus.textContent = "Camera access denied.";
    }
}

function stopCamera() {
    cameraStream?.getTracks().forEach(t => t.stop());
    cameraStream = null;
    capturedImageData = null;
}

// ====== IMAGE CAPTURE ======

captureBtn.addEventListener("click", () => {
    cameraCanvas.width = cameraPreview.videoWidth;
    cameraCanvas.height = cameraPreview.videoHeight;
    cameraCanvas.getContext("2d").drawImage(cameraPreview, 0, 0);

    capturedImageData = cameraCanvas.toDataURL("image/jpeg", 0.9);

    cameraPreview.classList.add("hidden");
    cameraCanvas.classList.remove("hidden");

    captureBtn.classList.add("hidden");
    retakeBtn.classList.remove("hidden");
    analyzePhotoBtn.classList.remove("hidden");
});

retakeBtn.addEventListener("click", () => {
    capturedImageData = null;
    cameraCanvas.classList.add("hidden");
    cameraPreview.classList.remove("hidden");

    captureBtn.classList.remove("hidden");
    retakeBtn.classList.add("hidden");
    analyzePhotoBtn.classList.add("hidden");
});

// ====== AI IMAGE ANALYSIS ======

analyzePhotoBtn.addEventListener("click", async () => {
    if (!capturedImageData || !currentUser) return;

    analyzePhotoBtn.disabled = true;
    cameraStatus.textContent = "Analyzing image...";

    try {
        const analysis = await estimateCaloriesFromImage(capturedImageData);

        if (!analysis.hasFood) {
            cameraStatus.textContent = `No food detected (${Math.round(analysis.confidence * 100)}% confidence)`;
            return;
        }

        await saveMealToCloud({
            text: analysis.description,
            calories: analysis.calories,
            time: new Date().toISOString()
        });

        await loadCloudMeals();
        cameraStatus.textContent = `Saved: ${analysis.calories} calories`;

    } catch {
        cameraStatus.textContent = "AI analysis failed.";
    } finally {
        analyzePhotoBtn.disabled = false;
    }
});

// ====== WORKER CALL ======

async function estimateCaloriesFromImage(base64Image) {
    const base64 = base64Image.split(",")[1];

    const res = await fetch(
        "https://caloriescanner.jtho09200920.workers.dev/api/analyze-food",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64 })
        }
    );

    if (!res.ok) throw new Error("Worker error");

    const data = await res.json();

    if (!data.has_food) {
        return {
            hasFood: false,
            confidence: data.confidence
        };
    }

    return {
        hasFood: true,
        description: data.description,
        calories: data.calories_estimate,
        confidence: data.confidence,
        objects: data.objects
    };
}

// ====== INIT ======
document.addEventListener("DOMContentLoaded", checkSession);
