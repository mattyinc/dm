const startCstDate = "2026-06-01";
const daysToShow = 5;

const taskGroups = [
  {
    cstTime: "21:00",
    cstDayOffset: 0,
    tasks: [
      "Check with Jorge for the completion of COB",
      "Check if the file AS66.BATCH02PT2.PT.{fileNo}.txt is available",
      "Create the DSC for APC.R23.FTNOS and verify the output",
      "Monitor the service for a few minutes to see that it is stable"
    ]
  },
  {
    cstTime: "09:00",
    cstDayOffset: 1,
    tasks: [
      "Check the progress",
      "If the file has finished correctly get the error file",
      "If not please follow the special instruction"
    ]
  }
];

const formatters = {
  istDate: new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata"
  }),
  istTime: new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata"
  }),
  cstDate: new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Etc/GMT+6"
  }),
  cstTime: new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Etc/GMT+6"
  })
};

const scheduleEl = document.querySelector("#schedule");
const dayTemplate = document.querySelector("#dayTemplate");
const slotTemplate = document.querySelector("#slotTemplate");
const taskTemplate = document.querySelector("#taskTemplate");
const dayTabs = document.querySelector("#dayTabs");
const prevDay = document.querySelector("#prevDay");
const nextDay = document.querySelector("#nextDay");
const resetProgress = document.querySelector("#resetProgress");
const themeToggle = document.querySelector("#themeToggle");
const progressLabel = document.querySelector("#progressLabel");
const progressCount = document.querySelector("#progressCount");
const progressFill = document.querySelector("#progressFill");
let selectedDayIndex = Number(localStorage.getItem("kt-selected-day") || 0);

function parseCstDateTime(dateString, timeString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hour, minute] = timeString.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour + 6, minute));
}

function addDays(dateString, days) {
  const date = parseCstDateTime(dateString, "00:00");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function fileNumber(index) {
  return String(index + 1).padStart(2, "0");
}

function getTaskKey(dayIndex, slotIndex, taskIndex) {
  return `kt-task-${dayIndex}-${slotIndex}-${taskIndex}`;
}

function getSchedule() {
  return Array.from({ length: daysToShow }, (_, dayIndex) => {
    const cstDate = addDays(startCstDate, dayIndex);
    const firstSlot = taskGroups[0];
    const firstSlotDate = parseCstDateTime(addDays(cstDate, firstSlot.cstDayOffset), firstSlot.cstTime);
    return {
      dayIndex,
      fileNo: fileNumber(dayIndex),
      cstDate,
      label: formatters.cstDate.format(firstSlotDate),
      istLabel: formatters.istDate.format(firstSlotDate),
      slots: taskGroups.map((group, slotIndex) => {
        const slotDate = parseCstDateTime(addDays(cstDate, group.cstDayOffset), group.cstTime);
        return {
          slotIndex,
          cstDate: formatters.cstDate.format(slotDate),
          cstTime: formatters.cstTime.format(slotDate),
          istDate: formatters.istDate.format(slotDate),
          istTime: formatters.istTime.format(slotDate),
          tasks: group.tasks.map((task) => task.replace("{fileNo}", fileNumber(dayIndex)))
        };
      })
    };
  });
}

function updateProgress(card) {
  const stats = getDayProgress(Number(card.dataset.day));
  card.querySelector(".progress-pill").textContent = `${stats.done}/${stats.total} done`;
  updateTabProgress();
}

function render() {
  scheduleEl.textContent = "";
  getSchedule()
    .filter((day) => day.dayIndex === selectedDayIndex)
    .forEach((day) => {
      const dayNode = dayTemplate.content.firstElementChild.cloneNode(true);
      dayNode.dataset.day = day.dayIndex;
      dayNode.querySelector(".day-name").textContent = day.label;
      dayNode.querySelector(".date-line").textContent = `IST reference: ${day.istLabel}`;
      dayNode.querySelector(".file-chip").textContent = `File ${day.fileNo}`;

      day.slots.forEach((slot) => {
        const slotNode = slotTemplate.content.firstElementChild.cloneNode(true);
        slotNode.querySelector(".primary-time").textContent = `${slot.cstTime} CST`;
        slotNode.querySelector(".secondary-time").textContent = `${slot.cstDate} / ${slot.istDate}, ${slot.istTime} IST`;

        slot.tasks.forEach((task, taskIndex) => {
          const taskNode = taskTemplate.content.firstElementChild.cloneNode(true);
          const checkbox = taskNode.querySelector("input");
          const text = taskNode.querySelector("span");
          const key = getTaskKey(day.dayIndex, slot.slotIndex, taskIndex);

          checkbox.checked = localStorage.getItem(key) === "true";
          checkbox.addEventListener("change", () => {
            if (checkbox.checked && isConditionalTask(slot.slotIndex, taskIndex)) {
              getConditionalTaskIndexes(slot.slotIndex)
                .filter((conditionalTaskIndex) => conditionalTaskIndex !== taskIndex)
                .forEach((conditionalTaskIndex) => {
                  const otherKey = getTaskKey(day.dayIndex, slot.slotIndex, conditionalTaskIndex);
                  localStorage.removeItem(otherKey);
                  const otherCheck = dayNode.querySelector(`[data-task-key="${otherKey}"]`);
                  if (otherCheck) {
                    otherCheck.checked = false;
                  }
                });
            }
            localStorage.setItem(key, checkbox.checked);
            updateProgress(dayNode);
          });
          checkbox.dataset.taskKey = key;

          const savedText = localStorage.getItem(`${key}-text`) || task;
          if (savedText.toLowerCase().includes("special instruction")) {
            text.append("If not please follow the ");
            const link = document.createElement("a");
            link.className = "inline-link";
            link.href = "#special-instructions";
            link.textContent = "special instruction";
            text.append(link);
          } else {
            text.contentEditable = "true";
            text.textContent = savedText;
            text.addEventListener("blur", () => {
              localStorage.setItem(`${key}-text`, text.textContent.trim() || task);
            });
          }

          slotNode.querySelector(".task-list").append(taskNode);
        });

        dayNode.querySelector(".day-content").append(slotNode);
      });

      dayNode.querySelector(".day-summary").addEventListener("click", () => {
        dayNode.classList.toggle("collapsed");
      });

      updateProgress(dayNode);
      scheduleEl.append(dayNode);
    });
  updateDayControls();
  updateTabProgress();
}

function renderDayTabs() {
  dayTabs.textContent = "";
  getSchedule().forEach((day) => {
    const tab = document.createElement("button");
    tab.className = "day-tab";
    tab.type = "button";
    tab.setAttribute("role", "tab");
    tab.dataset.day = day.dayIndex;
    tab.innerHTML = `
      <span>${day.label.split(",")[0]}</span>
      <strong>${day.label.replace(`${day.label.split(",")[0]}, `, "")}</strong>
      <em>File ${day.fileNo}</em>
    `;
    tab.addEventListener("click", () => selectDay(day.dayIndex));
    dayTabs.append(tab);
  });
  updateDayControls();
}

function selectDay(dayIndex) {
  selectedDayIndex = Math.max(0, Math.min(daysToShow - 1, dayIndex));
  localStorage.setItem("kt-selected-day", selectedDayIndex);
  render();
}

function updateDayControls() {
  prevDay.disabled = selectedDayIndex === 0;
  nextDay.disabled = selectedDayIndex === daysToShow - 1;
  document.querySelectorAll(".day-tab").forEach((tab) => {
    const isActive = Number(tab.dataset.day) === selectedDayIndex;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
}

function updateTabProgress() {
  const selectedStats = getDayProgress(selectedDayIndex);
  progressLabel.textContent = `File ${fileNumber(selectedDayIndex)} progress`;
  progressCount.textContent = `${selectedStats.done}/${selectedStats.total} complete`;
  progressFill.style.width = `${selectedStats.total ? (selectedStats.done / selectedStats.total) * 100 : 0}%`;

  document.querySelectorAll(".day-tab").forEach((tab) => {
    const dayIndex = Number(tab.dataset.day);
    const { done, total } = getDayProgress(dayIndex);
    tab.querySelector("em").textContent = `File ${fileNumber(dayIndex)} - ${done}/${total}`;
  });
}

function getDayProgress(dayIndex) {
  const total = taskGroups.reduce((sum, group, slotIndex) => {
    return sum + group.tasks.length - getConditionalAdjustment(slotIndex);
  }, 0);
  const done = taskGroups.reduce((sum, group, slotIndex) => {
    if (getConditionalTaskIndexes(slotIndex).length) {
      const requiredTasks = group.tasks.length - getConditionalTaskIndexes(slotIndex).length;
      const requiredDone = group.tasks
        .slice(0, requiredTasks)
        .filter((_, taskIndex) => localStorage.getItem(getTaskKey(dayIndex, slotIndex, taskIndex)) === "true").length;
      const conditionalDone = getConditionalTaskIndexes(slotIndex).some((taskIndex) => {
        return localStorage.getItem(getTaskKey(dayIndex, slotIndex, taskIndex)) === "true";
      }) ? 1 : 0;
      return sum + requiredDone + conditionalDone;
    }

    return sum + group.tasks.filter((_, taskIndex) => {
      return localStorage.getItem(getTaskKey(dayIndex, slotIndex, taskIndex)) === "true";
    }).length;
  }, 0);
  return { done, total };
}

function getConditionalTaskIndexes(slotIndex) {
  return slotIndex === 1 ? [1, 2] : [];
}

function getConditionalAdjustment(slotIndex) {
  const conditionalTasks = getConditionalTaskIndexes(slotIndex);
  return conditionalTasks.length ? conditionalTasks.length - 1 : 0;
}

function isConditionalTask(slotIndex, taskIndex) {
  return getConditionalTaskIndexes(slotIndex).includes(taskIndex);
}

resetProgress.addEventListener("click", () => {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(`kt-task-${selectedDayIndex}-`) && !key.endsWith("-text"))
    .forEach((key) => localStorage.removeItem(key));
  render();
});

prevDay.addEventListener("click", () => selectDay(selectedDayIndex - 1));

nextDay.addEventListener("click", () => selectDay(selectedDayIndex + 1));

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  setTheme(nextTheme);
});

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("kt-theme", theme);
  const isDark = theme === "dark";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
}

function setInitialTheme() {
  const savedTheme = localStorage.getItem("kt-theme");
  setTheme(savedTheme || "light");
}

setInitialTheme();
renderDayTabs();
render();
