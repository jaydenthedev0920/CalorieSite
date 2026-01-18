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
            const { error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.auth.signUp({
                email,
                password
            });
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

// Session check
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

// ====== MEAL LOGIC (CLOUD) ======

addMealBtn.addEventListener("click", async () => {
    const text = mealInput.value.trim();
    if (!text || !currentUser) return;

    const calories = await estimateCaloriesFromText(text);

    const meal = {
        text,
        calories,
        time: new Date().toISOString()
    };

    await saveMealToCloud(meal);
    await loadCloudMeals();

    mealInput.value = "";
});

async function estimateCaloriesFromText(mealText) {
    // Placeholder: replace with real text AI later
    return Math.floor(Math.random() * 400) + 100; // 100–500
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

    const { data, error } = await supabaseClient
        .from("meals")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("timestamp", { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    mealList.innerHTML = "";
    let total = 0;

    data.forEach(row => {
        const meal = {
            text: row.description,
            calories: row.calories,
            time: new Date(row.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };
        total += meal.calories;
        addMealToDOM(meal);
    });

    totalCaloriesEl.textContent = total;
}

function addMealToDOM(meal) {
    const li = document.createElement("li");
    li.classList.add("meal-item");

    li.innerHTML = `
        <strong>${meal.time}</strong> — ${meal.text}
        <span class="meal-calories">(${meal.calories} cal)</span>
    `;

    mealList.appendChild(li);
}

// ====== CAMERA + IMAGE AI LOGIC ======

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
        console.error(err);
        cameraStatus.textContent = "Unable to access camera. Check permissions.";
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    cameraPreview.srcObject = null;
    cameraStatus.textContent = "";
    capturedImageData = null;
}

captureBtn.addEventListener("click", () => {
    if (!cameraStream) return;

    const videoWidth = cameraPreview.videoWidth;
    const videoHeight = cameraPreview.videoHeight;

    cameraCanvas.width = videoWidth;
    cameraCanvas.height = videoHeight;

    const ctx = cameraCanvas.getContext("2d");
    ctx.drawImage(cameraPreview, 0, 0, videoWidth, videoHeight);

    cameraPreview.classList.add("hidden");
    cameraCanvas.classList.remove("hidden");

    captureBtn.classList.add("hidden");
    retakeBtn.classList.remove("hidden");
    analyzePhotoBtn.classList.remove("hidden");

    capturedImageData = cameraCanvas.toDataURL("image/jpeg", 0.9);
    cameraStatus.textContent = "Photo captured. Tap Analyze to estimate calories.";
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

analyzePhotoBtn.addEventListener("click", async () => {
    if (!capturedImageData || !currentUser) return;

    cameraStatus.textContent = "Analyzing meal with AI...";
    analyzePhotoBtn.disabled = true;

    try {
        const analysis = await estimateCaloriesFromImage(capturedImageData);

        const mealText = analysis.description || "Scanned meal";
        const calories = analysis.calories || 0;

        const meal = {
            text: mealText,
            calories,
            time: new Date().toISOString()
        };

        await saveMealToCloud(meal);
        await loadCloudMeals();

        cameraStatus.textContent = `Estimated: ${calories} calories — ${mealText}`;
    } catch (err) {
        console.error(err);
        cameraStatus.textContent = "There was an error analyzing the image.";
    } finally {
        analyzePhotoBtn.disabled = false;
    }
});

// Placeholder AI image function
async function estimateCaloriesFromImage(base64Image) {
    const fakeFoods = [
        "Bowl of pasta with sauce",
        "Grilled chicken with vegetables",
        "Burger and fries",
        "Salad with dressing",
        "Breakfast plate (eggs, toast, bacon)"
    ];
    const randomFood = fakeFoods[Math.floor(Math.random() * fakeFoods.length)];
    const randomCalories = Math.floor(Math.random() * 500) + 200; // 200–700

    return {
        description: randomFood,
        calories: randomCalories
    };
}

// ====== INIT ======
document.addEventListener("DOMContentLoaded", () => {
    checkSession();
});
