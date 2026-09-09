console.log("APP.JS IS LOADED");

const AUTH_URL = "https://learn.01founders.co/api/auth/signin";
const GRAPHQL_URL = "https://learn.01founders.co/api/graphql-engine/v1/graphql";

// ============================================================
// DOM ELEMENTS
// ============================================================

const loginPage = document.getElementById("login-page");
const profilePage = document.getElementById("profile-page");
const loginForm = document.getElementById("login-form");
const loginButton = document.getElementById("login-button");
const loginError = document.getElementById("login-error");
const logoutButton = document.getElementById("logout-button");

// Profile
const profileAvatar = document.getElementById("profile-avatar");
const profileLogin = document.getElementById("profile-login");
const profileId = document.getElementById("profile-id");
const profileXP = document.getElementById("profile-xp");
const profileAuditRatio = document.getElementById("profile-audit-ratio");
const profileCampus = document.getElementById("profile-campus");

// Audit
const auditRatioValue = document.getElementById("audit-ratio-value");
const auditsGiven = document.getElementById("audits-given");
const auditsReceived = document.getElementById("audits-received");
const auditCenterValue = document.getElementById("audit-center-value");

// Projects
const projectPassPercentage = document.getElementById(
  "project-pass-percentage",
);
const projectPassCount = document.getElementById("project-pass-count");
const projectFailCount = document.getElementById("project-fail-count");
const projectTotalText = document.getElementById("project-total-text");

// Piscine
const piscineTotal = document.getElementById("piscine-total");
const piscineGraphs = document.getElementById("piscine-graphs");

// ============================================================
// START
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("jwt");

  if (token) {
    showProfile();
    loadProfile();
  } else {
    showLogin();
  }
});

// ============================================================
// LOGIN
// ============================================================

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  loginError.textContent = "";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    loginError.textContent = "Please enter your username/email and password.";
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Logging in...";

  try {
    const token = await authenticate(username, password);

    localStorage.setItem("jwt", token);

    console.log("LOGIN SUCCESS");

    showProfile();
    await loadProfile();
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    localStorage.removeItem("jwt");
    showLogin();

    loginError.textContent = error.message || "Login failed.";
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Login";
  }
});

// ============================================================
// AUTHENTICATE
// ============================================================

async function authenticate(username, password) {
  const credentials = btoa(`${username}:${password}`);

  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  console.log("SIGNIN STATUS:", response.status);

  const responseText = await response.text();

  console.log("SIGNIN RAW RESPONSE:", responseText);

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Invalid username/email or password.");
    }

    throw new Error(`Login failed with status ${response.status}.`);
  }

  let token;

  try {
    token = JSON.parse(responseText);
  } catch {
    token = responseText.trim();
  }

  if (typeof token !== "string" || token.length === 0) {
    throw new Error("The signin endpoint did not return a valid JWT.");
  }

  return token;
}

// ============================================================
// GRAPHQL REQUEST
// ============================================================

async function graphqlRequest(query, variables = {}) {
  const token = localStorage.getItem("jwt");

  if (!token) {
    throw new Error("No JWT was found. Please log in again.");
  }

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const result = await response.json();

  console.log("GRAPHQL RESPONSE:", result);

  if (!response.ok) {
    throw new Error(`GraphQL HTTP error: ${response.status}`);
  }

  if (result.errors) {
    console.error("GRAPHQL ERRORS:", result.errors);

    throw new Error(result.errors.map((error) => error.message).join("\n"));
  }

  return result.data;
}

// ============================================================
// LOAD PROFILE
// ============================================================

async function loadProfile() {
  try {
    const query = `
            query {
                user {
                    id
                    login
                    auditRatio
                    totalUp
                    totalDown
                    campus
                    transactions(
                        where: {
                            type: { _eq: "xp" }
                            path: {
                                _like: "%/div-01/%"
                                _nlike: "%piscine%"
                            }
                        }
                    ) {
                        amount
                    }
                }
            }
        `;

    const data = await graphqlRequest(query);

    console.log("PROFILE DATA:", data);

    if (!data || !data.user) {
      throw new Error("GraphQL returned no user data.");
    }

    const user = Array.isArray(data.user) ? data.user[0] : data.user;

    if (!user) {
      throw new Error("No authenticated user was returned.");
    }

    renderProfile(user);

    // Projects
    const projectData = await loadProjectResults();

    renderProjectPassFailChart(projectData.projectResults);

    // Piscine
    // One PASS/FAIL breakdown per piscine found.
    const piscineGroups = getPiscineStats(projectData.allProgress);

    const piscineOverallTotal = piscineGroups.reduce(
      (sum, group) => sum + group.total,
      0,
    );

    piscineTotal.textContent = formatNumber(piscineOverallTotal);

    drawPiscineCharts(piscineGroups);
  } catch (error) {
    console.error("PROFILE ERROR:", error);

    if (
      error.message.includes("JWT") ||
      error.message.includes("jwt") ||
      error.message.includes("authentication")
    ) {
      localStorage.removeItem("jwt");
      showLogin();
    }
  }
}

// ============================================================
// RENDER PROFILE
// ============================================================

function renderProfile(user) {
  console.log("RENDERING USER:", user);

  profileLogin.textContent = user.login || "-";

  profileId.textContent = `ID: ${user.id || "-"}`;

  profileAvatar.textContent = (user.login || "?").charAt(0).toUpperCase();

  // XP calculation
  let xp = 0;

  if (user.transactions && Array.isArray(user.transactions)) {
    xp = user.transactions.reduce((total, transaction) => {
      const amount = Number(transaction.amount);

      return !Number.isNaN(amount) ? total + amount : total;
    }, 0);
  }

  profileXP.textContent = formatXP(xp);

  // Audit Ratio
  const ratio = Number(user.auditRatio) || 0;

  profileAuditRatio.textContent = ratio.toFixed(1);
  auditRatioValue.textContent = ratio.toFixed(1);
  auditCenterValue.textContent = ratio.toFixed(1);

  // Audits
  const given = Number(user.totalUp) || 0;
  const received = Number(user.totalDown) || 0;

  auditsGiven.textContent = formatBytes(given);
  auditsReceived.textContent = formatBytes(received);

  // Campus
  let campus = "-";

  if (Array.isArray(user.campus)) {
    if (user.campus.length > 0) {
      campus = user.campus[0];
    }
  } else if (user.campus) {
    campus = user.campus;
  }

  profileCampus.textContent = campus;

  renderAuditChart(user);
}

// ============================================================
// FORMATTERS
// ============================================================

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return value;
  }

  return number.toLocaleString("en-GB", {
    maximumFractionDigits: 2,
  });
}

function formatXP(amount) {
  if (amount === null || amount === undefined || amount === "") {
    return "-";
  }

  const value = Number(amount);

  if (Number.isNaN(value)) {
    return "-";
  }

  const MB = 1000 * 1000;
  const KB = 1000;

  if (value >= MB) {
    return `${(value / MB).toFixed(2)} MB`;
  }

  if (value >= KB) {
    return `${Math.round(value / KB)} kB`;
  }

  return `${value} B`;
}

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || bytes === "") {
    return "-";
  }

  const value = Number(bytes);

  if (Number.isNaN(value)) {
    return "-";
  }

  const MB = 1024 * 1024;
  const KB = 1024;

  if (value >= MB) {
    return `${(value / MB).toFixed(2)} MB`;
  }

  if (value >= KB) {
    return `${(value / KB).toFixed(2)} KB`;
  }

  return `${value} B`;
}

// ============================================================
// PAGE SWITCHING & LOGOUT
// ============================================================

function showLogin() {
  loginPage.classList.remove("hidden");
  profilePage.classList.add("hidden");
}

function showProfile() {
  loginPage.classList.add("hidden");
  profilePage.classList.remove("hidden");
}

logoutButton.addEventListener("click", function () {
  localStorage.removeItem("jwt");

  loginForm.reset();

  profileLogin.textContent = "-";
  profileId.textContent = "ID: -";
  profileAvatar.textContent = "?";
  profileXP.textContent = "-";
  profileAuditRatio.textContent = "-";
  profileCampus.textContent = "-";

  auditRatioValue.textContent = "-";
  auditCenterValue.textContent = "-";

  auditsGiven.textContent = "-";
  auditsReceived.textContent = "-";

  projectPassPercentage.textContent = "-";
  projectPassCount.textContent = "0";
  projectFailCount.textContent = "0";
  projectTotalText.textContent = "0";

  piscineTotal.textContent = "0";
  piscineGraphs.innerHTML = "";

  loginError.textContent = "";

  showLogin();
});

// ============================================================
// GRAPH 1 — AUDIT RATIO
// ============================================================

function renderAuditChart(user) {
  const given = Number(user.totalUp) || 0;
  const received = Number(user.totalDown) || 0;
  const ratio = Number(user.auditRatio) || 0;

  const givenCircle = document.getElementById("audit-given-circle");

  const receivedCircle = document.getElementById("audit-received-circle");

  if (!givenCircle || !receivedCircle) {
    return;
  }

  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const total = given + received;

  givenCircle.style.strokeDasharray = "0 1000";
  receivedCircle.style.strokeDasharray = "0 1000";

  if (total <= 0) {
    return;
  }

  const givenLength = circumference * (given / total);

  const receivedLength = circumference * (received / total);

  givenCircle.style.strokeDasharray = `${givenLength} ${circumference}`;

  receivedCircle.style.strokeDasharray = `${receivedLength} ${circumference}`;

  receivedCircle.style.strokeDashoffset = -givenLength;

  auditCenterValue.textContent = ratio.toFixed(1);
  auditRatioValue.textContent = ratio.toFixed(1);

  auditsGiven.textContent = formatBytes(given);
  auditsReceived.textContent = formatBytes(received);
}

// ============================================================
// LOAD PROJECT RESULTS
// ============================================================

async function loadProjectResults() {
  const query = `
        query {
            progress {
                id
                objectId
                grade
                createdAt
                path
                object {
                    id
                    name
                    type
                }
            }

            result {
                id
                objectId
                userId
                grade
                type
                createdAt
                updatedAt
                path
                object {
                    id
                    name
                    type
                }
            }
        }
    `;

  const data = await graphqlRequest(query);

  const allProgress = data.progress || [];

  const projects = allProgress.filter(
    (item) => item.object && item.object.type === "project",
  );

  const projectResults = (data.result || []).filter(
    (item) => item.object && item.object.type === "project",
  );

  console.log("TOTAL PROGRESS:", allProgress.length);

  console.log("PROJECT PROGRESS:", projects.length);

  console.log("PROJECT RESULTS:", projectResults.length);

  return {
    allProgress,
    projects,
    projectResults,
  };
}

// ============================================================
// GRAPH 2 — PROJECT PASS / FAIL
// ============================================================

function renderProjectPassFailChart(projectResults) {
  let passed = 0;
  let failed = 0;

  const uniqueProjects = new Set();

  projectResults.forEach((result) => {
    const grade = Number(result.grade);

    if (Number.isNaN(grade)) {
      return;
    }

    if (grade >= 1) {
      passed++;
    } else {
      failed++;
    }

    uniqueProjects.add(
      result.objectId || (result.object && result.object.name),
    );
  });

  // The pass/fail tally counts every attempt.
  // A retry that failed then passed shows up as one of each.
  // The "PROJECTS" total is the number of distinct projects
  // attempted, not the number of attempts.

  const total = passed + failed;
  const uniqueTotal = uniqueProjects.size;

  console.log("PROJECT PASS:", passed);
  console.log("PROJECT FAIL:", failed);
  console.log("PROJECT ATTEMPTS TOTAL:", total);
  console.log("PROJECT UNIQUE TOTAL:", uniqueTotal);

  projectPassCount.textContent = formatNumber(passed);
  projectFailCount.textContent = formatNumber(failed);
  projectTotalText.textContent = formatNumber(uniqueTotal);

  if (total > 0) {
    projectPassPercentage.textContent = `${Math.round((passed / total) * 100)}%`;
  } else {
    projectPassPercentage.textContent = "0%";
  }

  const svg = document.getElementById("project-pass-fail-chart");

  if (!svg) {
    console.error("project-pass-fail-chart not found");
    return;
  }

  const background = document.getElementById("project-chart-background");

  const passCircle = document.getElementById("project-pass-circle");

  const failCircle = document.getElementById("project-fail-circle");

  if (!background || !passCircle || !failCircle) {
    return;
  }

  const radius = 100;
  const circumference = 2 * Math.PI * radius;

  background.setAttribute("fill", "none");
  background.setAttribute("stroke", "#e5e7eb");
  background.setAttribute("stroke-width", "30");

  if (total === 0) {
    passCircle.style.strokeDasharray = `0 ${circumference}`;

    failCircle.style.strokeDasharray = `0 ${circumference}`;

    return;
  }

  const passLength = circumference * (passed / total);

  passCircle.setAttribute("fill", "none");
  passCircle.setAttribute("stroke", "#22c55e");
  passCircle.setAttribute("stroke-width", "30");
  passCircle.setAttribute("stroke-linecap", "round");

  passCircle.style.strokeDasharray = `${passLength} ${circumference}`;

  passCircle.style.strokeDashoffset = "0";

  passCircle.setAttribute("transform", "rotate(-90 150 150)");

  const failLength = circumference * (failed / total);

  failCircle.setAttribute("fill", "none");
  failCircle.setAttribute("stroke", "#ef4444");
  failCircle.setAttribute("stroke-width", "30");
  failCircle.setAttribute("stroke-linecap", "round");

  failCircle.style.strokeDasharray = `${failLength} ${circumference}`;

  failCircle.style.strokeDashoffset = `${-passLength}`;

  failCircle.setAttribute("transform", "rotate(-90 150 150)");
}

// ============================================================
// GRAPH 3 — PISCINE STATS
// ============================================================

function classifyPiscinePath(path) {
  if (!path) {
    return null;
  }

  const parts = path.split("/").filter(Boolean);

  // Some piscines live directly under the campus:
  // "/london/piscine-go-s2wft/..."

  // Others are nested inside the main cursus:
  // "/london/div-01/piscine-js-up/..."

  // Both layouts need to be recognised.

  let slugIndex = -1;

  if (
    parts[0] === "london" &&
    parts[1] === "div-01" &&
    /^piscine/.test(parts[2] || "")
  ) {
    slugIndex = 2;
  } else if (
    parts[0] === "london" &&
    /^(piscine|discovery-piscine)/.test(parts[1] || "")
  ) {
    slugIndex = 1;
  }

  if (slugIndex === -1) {
    return null;
  }

  const slug = parts[slugIndex];

  const exerciseParts = parts.slice(slugIndex + 1);

  // The piscine's own root record is not an exercise.
  if (exerciseParts.length === 0) {
    return null;
  }

  return {
    slug,
    root: parts.slice(0, slugIndex + 1).join("/"),
    exerciseKey: exerciseParts.join("/"),
  };
}

function piscineDisplayName(slug) {
  if (slug.startsWith("piscine-go")) {
    return "Go Piscine";
  }

  if (slug.startsWith("discovery-piscine")) {
    return "Discovery Piscine";
  }

  if (slug.startsWith("piscine-js")) {
    return "JS Piscine";
  }

  // Fallback:
  // Turn "some-slug-name" into "Some Slug Name".

  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getPiscineStats(progressData) {
  // Only actual exercises.
  // Exams, raids, and a piscine's own overall
  // completion record are not exercises.

  const piscineResults = progressData.filter(
    (item) =>
      item.object &&
      item.object.type === "exercise" &&
      classifyPiscinePath(item.path),
  );

  console.log("PISCINE RESULTS:", piscineResults.length);

  const exercisesByRoot = {};

  piscineResults.forEach((item) => {
    const classification = classifyPiscinePath(item.path);

    if (!exercisesByRoot[classification.root]) {
      exercisesByRoot[classification.root] = {
        slug: classification.slug,
        root: classification.root,
        exercises: {},
      };
    }

    const bucket = exercisesByRoot[classification.root].exercises;

    if (!bucket[classification.exerciseKey]) {
      bucket[classification.exerciseKey] = {
        attempts: 0,
        passed: false,
        latestDate: null,
      };
    }

    bucket[classification.exerciseKey].attempts++;

    const currentDate = new Date(item.createdAt);

    if (
      !bucket[classification.exerciseKey].latestDate ||
      currentDate > bucket[classification.exerciseKey].latestDate
    ) {
      bucket[classification.exerciseKey].latestDate = currentDate;

      bucket[classification.exerciseKey].passed =
        item.grade !== null && Number(item.grade) >= 1;
    }
  });

  return Object.values(exercisesByRoot)
    .map((group) => {
      const exerciseList = Object.values(group.exercises);

      const passed = exerciseList.filter((exercise) => exercise.passed).length;

      const failed = exerciseList.length - passed;

      return {
        slug: group.slug,
        name: piscineDisplayName(group.slug),
        exercises: exerciseList,
        passed,
        failed,
        total: exerciseList.length,
      };
    })
    .sort((a, b) => b.total - a.total);
}

// ============================================================
// PISCINE CHARTS
// One PASS/FAIL bar chart per piscine found.
// ============================================================

function drawPiscineCharts(piscineGroups) {
  if (!piscineGraphs) {
    return;
  }

  piscineGraphs.innerHTML = "";

  if (!piscineGroups || piscineGroups.length === 0) {
    piscineGraphs.innerHTML = `<p class="piscine-empty">No Piscine data available</p>`;

    return;
  }

  piscineGroups.forEach((stats) => {
    const card = document.createElement("div");

    card.className = "piscine-graph-card";

    card.innerHTML = `
            <div class="piscine-chart-container">
                <svg
                    class="piscine-chart"
                    viewBox="0 0 600 300"
                    role="img"
                    aria-label="${escapeHTML(stats.name)} pass fail chart"
                ></svg>
            </div>

            <p class="piscine-graph-name">
                ${escapeHTML(stats.name)}
            </p>

            <div class="audit-legend">
                <div class="legend-item">
                    <span class="legend-dot project-pass"></span>

                    <div>
                        <strong>Passed</strong>
                        <span>
                            ${formatNumber(stats.passed)}
                        </span>
                    </div>
                </div>

                <div class="legend-item">
                    <span class="legend-dot project-fail"></span>

                    <div>
                        <strong>Failed</strong>
                        <span>
                            ${formatNumber(stats.failed)}
                        </span>
                    </div>
                </div>
            </div>
        `;

    piscineGraphs.appendChild(card);

    drawPiscineChart(card.querySelector(".piscine-chart"), stats);
  });
}

// ============================================================
// DRAW PISCINE CHART
// ============================================================

function drawPiscineChart(svg, stats) {
  if (!svg) {
    return;
  }

  const width = 600;
  const height = 300;
  const bottom = 250;
  const top = 40;
  const chartHeight = bottom - top;
  const barWidth = 90;

  if (!stats || stats.total === 0) {
    svg.innerHTML = `
            <text
                x="${width / 2}"
                y="${height / 2}"
                text-anchor="middle"
                font-size="18"
                fill="#666666"
            >
                No Piscine data available
            </text>
        `;

    return;
  }

  const maxValue = Math.max(stats.passed, stats.failed, 1);

  const passedHeight = (stats.passed / maxValue) * chartHeight;

  const failedHeight = (stats.failed / maxValue) * chartHeight;

  const passedX = 170;
  const failedX = 340;

  const passedY = bottom - passedHeight;

  const failedY = bottom - failedHeight;

  const passedCenterX = passedX + barWidth / 2;

  const failedCenterX = failedX + barWidth / 2;

  const glowFilter = "drop-shadow(0 0 8px rgba(57, 255, 20, 0.45))";

  svg.innerHTML = `
        <!-- Axes -->
        <line
            x1="60"
            y1="${bottom}"
            x2="${width - 40}"
            y2="${bottom}"
            stroke="#39ff14"
            stroke-width="2"
        />

        <line
            x1="60"
            y1="${top}"
            x2="60"
            y2="${bottom}"
            stroke="#39ff14"
            stroke-width="2"
        />

        <!-- Pass & Fail Bars -->
        <rect
            x="${passedX}"
            y="${passedY}"
            width="${barWidth}"
            height="${passedHeight}"
            rx="8"
            fill="#39ff14"
            filter="${glowFilter}"
        />

        <rect
            x="${failedX}"
            y="${failedY}"
            width="${barWidth}"
            height="${failedHeight}"
            rx="8"
            fill="#39ff14"
            filter="${glowFilter}"
        />

        <!-- Values -->
        <text
            x="${passedCenterX}"
            y="${passedY - 12}"
            text-anchor="middle"
            class="chart-number"
            fill="#39ff14"
            font-weight="800"
        >
            ${stats.passed}
        </text>

        <text
            x="${failedCenterX}"
            y="${failedY - 12}"
            text-anchor="middle"
            class="chart-number"
            fill="#39ff14"
            font-weight="800"
        >
            ${stats.failed}
        </text>

        <!-- Labels -->
        <text
            x="${passedCenterX}"
            y="280"
            text-anchor="middle"
            class="chart-label"
            fill="#39ff14"
            font-weight="800"
        >
            PASS
        </text>

        <text
            x="${failedCenterX}"
            y="280"
            text-anchor="middle"
            class="chart-label"
            fill="#39ff14"
            font-weight="800"
        >
            FAIL
        </text>
    `;
}

// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
