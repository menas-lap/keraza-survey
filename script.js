// ══════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════
const SCRIPT_URL  = "https://script.google.com/macros/s/AKfycbzio4QM4vOVY_I1Jffu95ZrRFKxJXAxrg2z3Q9BfT8YXz32LfbV10EerChztAYO5DzCfw/exec";
const K_SUBMITTED = "keraza_submitted";
const K_TOKEN     = "keraza_token";

// Required field IDs (must match HTML)
const REQUIRED_FIELDS = [
  "fullName",
  "stage",
  "service",
  "gender",
  "birthDate",
  "parentPhone",
];

// Checkbox group IDs (multi-select)
const REQUIRED_CHECKBOX_GROUPS = ["holy", "sport"];

// Holds compressed base64 images
const images = { photo: null, birth: null };


// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
(function init() {
  // Already submitted → block
  if (localStorage.getItem(K_SUBMITTED)) {
    showScreen("blockedScreen");
    return;
  }

  // Generate token if first visit
  if (!localStorage.getItem(K_TOKEN)) {
    const token = "tk_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    localStorage.setItem(K_TOKEN, token);
  }

  showScreen("formScreen");
})();


// ══════════════════════════════════════════
//  SCREEN MANAGEMENT
// ══════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}


// ══════════════════════════════════════════
//  FILE HANDLING
// ══════════════════════════════════════════
function handleFile(input, type) {
  const file = input.files[0];
  if (!file) return;

  compressImage(file).then(base64 => {
    images[type] = base64;
    document.getElementById("img-"  + type).src = base64;
    document.getElementById("prev-" + type).classList.add("on");
    document.getElementById("zone-" + type).style.display = "none";
    document.getElementById("e-"    + type).classList.remove("on");
  });
}

function replaceImage(type) {
  images[type] = null;
  document.getElementById("img-"  + type).src = "";
  document.getElementById("prev-" + type).classList.remove("on");
  const zone = document.getElementById("zone-" + type);
  zone.style.display = "";
  // Reset the file input so the same file can be re-selected
  zone.querySelector("input[type='file']").value = "";
}

function compressImage(file, maxWidth = 1200, quality = 0.75) {
  return new Promise(resolve => {
    const reader = new FileReader();

    reader.onload = e => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;

        if (w > maxWidth) {
          h = (maxWidth / w) * h;
          w = maxWidth;
        }

        canvas.width  = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}


// ══════════════════════════════════════════
//  VALIDATION
// ══════════════════════════════════════════
function validate() {
  let isValid = true;

  // Text / select fields
  REQUIRED_FIELDS.forEach(id => {
    const el  = document.getElementById(id);
    const err = document.getElementById("e-" + id);
    const empty = !el.value.trim();

    el.classList.toggle("err", empty);
    err.classList.toggle("on",  empty);

    if (empty) isValid = false;
  });

  // Image fields
  ["photo", "birth"].forEach(type => {
    const err = document.getElementById("e-" + type);
    const missing = !images[type];

    err.classList.toggle("on", missing);
    if (missing) isValid = false;
  });

  // Checkbox groups
  REQUIRED_CHECKBOX_GROUPS.forEach(id => {
    const group = document.getElementById(id);
    const err   = document.getElementById("e-" + id);
    const checked = group.querySelectorAll("input[type='checkbox']:checked").length > 0;

    group.classList.toggle("err", !checked);
    err.classList.toggle("on", !checked);

    if (!checked) isValid = false;
  });

  return isValid;
}


// ══════════════════════════════════════════
//  SUBMIT
// ══════════════════════════════════════════
async function submitForm() {
  if (!validate()) {
    // Scroll to first visible error
    const firstError = document.querySelector(".ferr.on");
    if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const btn = document.getElementById("submitBtn");
  btn.textContent = "جاري الإرسال...";
  btn.disabled = true;

  const payload = {
    token:        localStorage.getItem(K_TOKEN),
    fullName:     document.getElementById("fullName").value.trim(),
    stage:        document.getElementById("stage").value,
    service:      document.getElementById("service").value,
    gender:       document.getElementById("gender").value,
    birthDate:    document.getElementById("birthDate").value,
    studentPhone: document.getElementById("studentPhone").value.trim(),
    parentPhone:  document.getElementById("parentPhone").value.trim(),
    family:       document.getElementById("family").value.trim(),
    photo:        images.photo,
    birthCert:    images.birth,
    holy:         getCheckedValues("holy"),
    sport:        getCheckedValues("sport"),
  };

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.success) {
      localStorage.setItem(K_SUBMITTED, "true");
      document.getElementById("srvId").textContent = "رقم تسجيلك: " + result.id;
      showScreen("successScreen");

    } else if (result.reason === "duplicate") {
      alert("رقم تليفون ولي الأمر هذا مسجّل من قبل.\nإذا أخطأت، تواصل مع خادمك المباشر.");
      resetButton(btn);

    } else {
      throw new Error(result.reason);
    }

  } catch (err) {
    alert("حدث خطأ أثناء الإرسال. تأكد من الاتصال بالإنترنت وحاول مرة أخرى.");
    console.error(err);
    resetButton(btn);
  }
}

function resetButton(btn) {
  btn.textContent = "إرسال البيانات ☩";
  btn.disabled = false;
}


// ══════════════════════════════════════════
//  CHECKBOX HELPERS
// ══════════════════════════════════════════
function getCheckedValues(groupId) {
  const checks = document.querySelectorAll(`#${groupId} input[type='checkbox']:checked`);
  return Array.from(checks).map(c => c.value).join("\n");
}


// ══════════════════════════════════════════
//  CONTACT INFO TOGGLE
// ══════════════════════════════════════════
function toggleBox(id) {
  document.getElementById(id).classList.toggle("on");
}
