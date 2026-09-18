/**
 * Music Auto-Tagger Studio Frontend Application
 * Interacts with REST API for directory scanning, multi-source searching,
 * live audio preview, lyrics inspection/editing, and tag application.
 */

// Default search engine in Quick Mode is Apple Music
const DEFAULT_QUICK_ENGINE = "itunes";

// State Management
const state = {
  currentDir: localStorage.getItem("lastMusicDir") || "~/Music",
  tracks: [],
  filteredTracks: [],
  currentIndex: -1,
  currentTrack: null,
  activeSource: "all",
  candidates: [],
  selectedCandidate: null,
  isSearching: false,
  shazamMode: "normal", // 'normal' | 'deep'
  // Single Inspector View Mode: 'quick' | 'advanced'
  inspectorMode: localStorage.getItem("inspectorMode") || "quick",
  quickEngine: DEFAULT_QUICK_ENGINE,
  quickCandidate: null,
  isQuickSearching: false,
  // Batch processing state
  batch: {
    queue: [],
    results: [], // Array of { track, status: 'pending'|'searching'|'matched'|'failed'|'saved', candidate, error, selected }
    isRunning: false,
    stopRequested: false,
  }
};

// DOM Elements
const elements = {
  dirInput: document.getElementById("dirPathInput"),
  scanBtn: document.getElementById("scanBtn"),
  statText: document.getElementById("statText"),
  filterInput: document.getElementById("filterInput"),
  trackList: document.getElementById("trackList"),
  skipAllBtn: document.getElementById("skipAllBtn"),

  inspectorPlaceholder: document.getElementById("inspectorPlaceholder"),
  inspectorContent: document.getElementById("inspectorContent"),

  currentCoverImg: document.getElementById("currentCoverImg"),
  noArtPlaceholder: document.getElementById("noArtPlaceholder"),
  trackFormatBadge: document.getElementById("trackFormatBadge"),
  trackStatusBadge: document.getElementById("trackStatusBadge"),
  trackSizeBadge: document.getElementById("trackSizeBadge"),
  displayTitle: document.getElementById("displayTitle"),
  displayArtist: document.getElementById("displayArtist"),
  displayFilename: document.getElementById("displayFilename"),
  audioPlayer: document.getElementById("audioPlayer"),

  queryInput: document.getElementById("queryInput"),
  sourceButtons: document.querySelectorAll(".source-btn"),
  searchBtn: document.getElementById("searchBtn"),
  shazamBtn: document.getElementById("shazamBtn"),
  shazamBtnLabel: document.getElementById("shazamBtnLabel"),
  shazamModeBtn: document.getElementById("shazamModeBtn"),
  shazamModeBadge: document.getElementById("shazamModeBadge"),
  shazamModeMenu: document.getElementById("shazamModeMenu"),
  shazamAllBtn: document.getElementById("shazamAllBtn"),

  candidatesGrid: document.getElementById("candidatesGrid"),
  candidatesCount: document.getElementById("candidatesCount"),

  stageTitle: document.getElementById("stageTitle"),
  stageArtist: document.getElementById("stageArtist"),
  stageAlbum: document.getElementById("stageAlbum"),
  stageYear: document.getElementById("stageYear"),
  stageTrack: document.getElementById("stageTrack"),
  stageGenre: document.getElementById("stageGenre"),
  stagedSourceBadge: document.getElementById("stagedSourceBadge"),

  stageCoverImg: document.getElementById("stageCoverImg"),
  noStageArt: document.getElementById("noStageArt"),
  stagedArtBox: document.getElementById("stagedArtBox"),
  stagedArtDim: document.getElementById("stagedArtDim"),
  coverFileInput: document.getElementById("coverFileInput"),
  uploadCoverBtn: document.getElementById("uploadCoverBtn"),
  urlCoverToggleBtn: document.getElementById("urlCoverToggleBtn"),
  useFileCoverBtn: document.getElementById("useFileCoverBtn"),
  clearCoverBtn: document.getElementById("clearCoverBtn"),
  coverUrlDrawer: document.getElementById("coverUrlDrawer"),
  customCoverUrlInput: document.getElementById("customCoverUrlInput"),
  applyCoverUrlBtn: document.getElementById("applyCoverUrlBtn"),
  cancelCoverUrlBtn: document.getElementById("cancelCoverUrlBtn"),
  artUrlText: document.getElementById("artUrlText"),
  embedArtCheck: document.getElementById("embedArtCheck"),
  autoRenameCheck: document.getElementById("autoRenameCheck"),

  lyricsEditor: document.getElementById("lyricsEditor"),
  lyricsSourceBadge: document.getElementById("lyricsSourceBadge"),
  refetchLyricsBtn: document.getElementById("refetchLyricsBtn"),
  lyricsStats: document.getElementById("lyricsStats"),
  embedLyricsCheck: document.getElementById("embedLyricsCheck"),

  prevBtn: document.getElementById("prevBtn"),
  skipBtn: document.getElementById("skipBtn"),
  applyBtn: document.getElementById("applyBtn"),
  toast: document.getElementById("toast"),

  // Mode tabs & containers
  quickModeTabBtn: document.getElementById("quickModeTabBtn"),
  advancedModeTabBtn: document.getElementById("advancedModeTabBtn"),
  quickModeView: document.getElementById("quickModeView"),
  advancedModeView: document.getElementById("advancedModeView"),

  // Quick Mode elements
  quickEngineChips: document.querySelectorAll(".quick-chip"),
  quickStatusBadge: document.getElementById("quickStatusBadge"),
  quickReFetchBtn: document.getElementById("quickReFetchBtn"),
  quickCurArt: document.getElementById("quickCurArt"),
  quickCurArtPlaceholder: document.getElementById("quickCurArtPlaceholder"),
  quickCurTitle: document.getElementById("quickCurTitle"),
  quickCurArtist: document.getElementById("quickCurArtist"),
  quickCurAlbum: document.getElementById("quickCurAlbum"),
  quickCurYear: document.getElementById("quickCurYear"),
  quickCurGenre: document.getElementById("quickCurGenre"),
  quickCurTrack: document.getElementById("quickCurTrack"),
  quickCurFilename: document.getElementById("quickCurFilename"),
  quickCurLyricsBadge: document.getElementById("quickCurLyricsBadge"),
  quickCurLyricsText: document.getElementById("quickCurLyricsText"),

  quickMatchCard: document.getElementById("quickMatchCard"),
  quickMatchBadge: document.getElementById("quickMatchBadge"),
  quickMatchArt: document.getElementById("quickMatchArt"),
  quickMatchArtPlaceholder: document.getElementById("quickMatchArtPlaceholder"),
  quickMatchArtText: document.getElementById("quickMatchArtText"),
  quickMatchTitle: document.getElementById("quickMatchTitle"),
  quickMatchArtist: document.getElementById("quickMatchArtist"),
  quickMatchAlbum: document.getElementById("quickMatchAlbum"),
  quickMatchYear: document.getElementById("quickMatchYear"),
  quickMatchGenre: document.getElementById("quickMatchGenre"),
  quickMatchTrack: document.getElementById("quickMatchTrack"),
  quickMatchSource: document.getElementById("quickMatchSource"),
  quickMatchLyricsBadge: document.getElementById("quickMatchLyricsBadge"),
  quickMatchLyricsText: document.getElementById("quickMatchLyricsText"),

  quickEmbedArtCheck: document.getElementById("quickEmbedArtCheck"),
  quickAutoRenameCheck: document.getElementById("quickAutoRenameCheck"),
  quickPrevBtn: document.getElementById("quickPrevBtn"),
  quickSkipBtn: document.getElementById("quickSkipBtn"),
  quickConfirmBtn: document.getElementById("quickConfirmBtn"),

  // Batch Studio Elements
  openBatchModalBtn: document.getElementById("openBatchModalBtn"),
  closeBatchModalBtn: document.getElementById("closeBatchModalBtn"),
  batchModal: document.getElementById("batchModal"),
  batchMethodSelect: document.getElementById("batchMethodSelect"),
  batchScopeSelect: document.getElementById("batchScopeSelect"),
  batchNInput: document.getElementById("batchNInput"),
  batchConcurrencySelect: document.getElementById("batchConcurrencySelect"),
  presetBtns: document.querySelectorAll(".btn-preset"),
  startBatchNBtn: document.getElementById("startBatchNBtn"),
  startBatchAllBtn: document.getElementById("startBatchAllBtn"),
  stopBatchBtn: document.getElementById("stopBatchBtn"),
  batchProgressWrap: document.getElementById("batchProgressWrap"),
  batchProgressText: document.getElementById("batchProgressText"),
  batchProgressStats: document.getElementById("batchProgressStats"),
  batchProgressBar: document.getElementById("batchProgressBar"),
  batchFoundCount: document.getElementById("batchFoundCount"),
  batchFailedCount: document.getElementById("batchFailedCount"),
  batchTotalCount: document.getElementById("batchTotalCount"),
  selectAllBatchBtn: document.getElementById("selectAllBatchBtn"),
  deselectAllBatchBtn: document.getElementById("deselectAllBatchBtn"),
  batchCardsGrid: document.getElementById("batchCardsGrid"),
  batchEmbedArtCheck: document.getElementById("batchEmbedArtCheck"),
  batchAutoRenameCheck: document.getElementById("batchAutoRenameCheck"),
  batchApplySelectedBtn: document.getElementById("batchApplySelectedBtn"),
  batchApplyAllBtn: document.getElementById("batchApplyAllBtn"),
  batchSelectedCount: document.getElementById("batchSelectedCount"),
};

// Initialize
window.addEventListener("DOMContentLoaded", () => {
  elements.dirInput.value = state.currentDir;
  setupEventListeners();
  // Ensure correct initial mode tab state
  if (state.inspectorMode === "advanced") {
    elements.advancedModeTabBtn.classList.add("active");
    elements.quickModeTabBtn.classList.remove("active");
    elements.advancedModeView.classList.remove("hidden");
    elements.quickModeView.classList.add("hidden");
  } else {
    elements.quickModeTabBtn.classList.add("active");
    elements.advancedModeTabBtn.classList.remove("active");
    elements.quickModeView.classList.remove("hidden");
    elements.advancedModeView.classList.add("hidden");
  }
  scanDirectory(state.currentDir);
});

function showToast(message, type = "info") {
  elements.toast.textContent = message;
  elements.toast.className = `toast show ${type}`;
  setTimeout(() => {
    elements.toast.className = "toast";
  }, 3500);
}

/**
 * Resolve cover image to base64 Data URL so backend doesn't need to re-fetch from internet
 */
async function resolveArtworkBase64(imgElOrUrl) {
  if (!imgElOrUrl) return "";

  if (typeof imgElOrUrl === "string" && imgElOrUrl.startsWith("data:")) {
    return imgElOrUrl;
  }

  // 1. Try canvas extraction from loaded DOM image
  if (imgElOrUrl instanceof HTMLImageElement && imgElOrUrl.complete && imgElOrUrl.naturalWidth > 0) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = imgElOrUrl.naturalWidth;
      canvas.height = imgElOrUrl.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(imgElOrUrl, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      if (dataUrl && dataUrl.length > 200) {
        return dataUrl;
      }
    } catch (e) {
      // Canvas tainted (CORS), proceed to next fallback
    }
  }

  const url = typeof imgElOrUrl === "string" ? imgElOrUrl : (imgElOrUrl?.src || "");
  if (!url || url.startsWith("data:")) return url;

  // 2. Try client-side fetch (browser might have cached it or proxy works in browser)
  try {
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve("");
        reader.readAsDataURL(blob);
      });
      if (base64 && base64.length > 200) return base64;
    }
  } catch (err) {
    // Fetch failed, return original URL for backend fallback
  }

  return url;
}

/**
 * Set and preview staged cover artwork (Base64 data URL or external URL)
 */
function setStagedArtwork(src, sourceInfo = "Custom Cover") {
  if (!src) {
    clearStagedArtwork();
    return;
  }

  elements.stageCoverImg.onload = () => {
    const w = elements.stageCoverImg.naturalWidth;
    const h = elements.stageCoverImg.naturalHeight;
    if (elements.stagedArtDim && w > 0 && h > 0) {
      elements.stagedArtDim.textContent = `${w}×${h}`;
      elements.stagedArtDim.classList.remove("hidden");
    }
    elements.artUrlText.textContent = `${sourceInfo} • ${w}×${h}px`;
  };

  elements.stageCoverImg.onerror = () => {
    showToast("Failed to load image from URL or file", "error");
    clearStagedArtwork();
  };

  elements.stageCoverImg.src = src;
  elements.stageCoverImg.style.display = "block";
  elements.noStageArt.style.display = "none";
  elements.embedArtCheck.checked = true;
  elements.artUrlText.textContent = `${sourceInfo} • Loading...`;
}

/**
 * Clear staged artwork and reset placeholder
 */
function clearStagedArtwork() {
  elements.stageCoverImg.src = "";
  elements.stageCoverImg.style.display = "none";
  elements.noStageArt.style.display = "flex";
  if (elements.stagedArtDim) {
    elements.stagedArtDim.classList.add("hidden");
  }
  elements.artUrlText.textContent = "No artwork selected";
}

/**
 * Handle user uploaded image file (from input, drag & drop, or clipboard)
 */
function handleCoverFileUpload(file) {
  if (!file) return;
  if (!file.type || !file.type.startsWith("image/")) {
    showToast("Please select a valid image file (JPEG, PNG, WebP, AVIF)", "warning");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    const sizeKb = (file.size / 1024).toFixed(0);
    const fileName = file.name || "Image";
    setStagedArtwork(dataUrl, `Local Upload (${fileName}, ${sizeKb}KB)`);
    showToast("✓ Custom cover uploaded", "success");
  };
  reader.onerror = () => {
    showToast("Failed to read image file", "error");
  };
  reader.readAsDataURL(file);
}

function setupEventListeners() {
  elements.scanBtn.addEventListener("click", () => {
    const dir = elements.dirInput.value.trim() || ".";
    state.currentDir = dir;
    localStorage.setItem("lastMusicDir", dir);
    scanDirectory(dir);
  });

  elements.dirInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      elements.scanBtn.click();
    }
  });

  elements.filterInput.addEventListener("input", (e) => {
    filterTracks(e.target.value);
  });

  // Inspector Mode Tabs (Quick vs Advanced)
  function switchInspectorMode(mode) {
    state.inspectorMode = mode;
    localStorage.setItem("inspectorMode", mode);

    if (mode === "quick") {
      elements.quickModeTabBtn.classList.add("active");
      elements.advancedModeTabBtn.classList.remove("active");
      elements.quickModeView.classList.remove("hidden");
      elements.advancedModeView.classList.add("hidden");
      if (state.currentTrack && !state.quickCandidate && !state.isQuickSearching) {
        runQuickFetch(state.currentTrack);
      }
    } else {
      elements.advancedModeTabBtn.classList.add("active");
      elements.quickModeTabBtn.classList.remove("active");
      elements.advancedModeView.classList.remove("hidden");
      elements.quickModeView.classList.add("hidden");
    }
  }

  elements.quickModeTabBtn.addEventListener("click", () => switchInspectorMode("quick"));
  elements.advancedModeTabBtn.addEventListener("click", () => switchInspectorMode("advanced"));

  // Quick Mode Engine Switcher Helper
  function setQuickEngine(engine, autoFetch = true) {
    state.quickEngine = engine;
    elements.quickEngineChips.forEach((chip) => {
      if (chip.dataset.engine === engine) {
        chip.classList.add("active");
      } else {
        chip.classList.remove("active");
      }
    });
    if (autoFetch && state.currentTrack && state.inspectorMode === "quick") {
      runQuickFetch(state.currentTrack);
    }
  }

  // Quick Mode Engine Chips
  elements.quickEngineChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      setQuickEngine(chip.dataset.engine, true);
    });
  });

  // Ensure initial chip active state
  setQuickEngine(state.quickEngine, false);

  // Quick Action Buttons
  elements.quickReFetchBtn.addEventListener("click", () => {
    if (state.currentTrack) {
      runQuickFetch(state.currentTrack);
    }
  });

  elements.quickPrevBtn.addEventListener("click", () => {
    if (state.currentIndex > 0) selectTrack(state.currentIndex - 1);
  });

  elements.quickSkipBtn.addEventListener("click", () => {
    skipTrack();
  });

  elements.quickConfirmBtn.addEventListener("click", () => {
    applyQuickTrack();
  });

  elements.skipAllBtn.addEventListener("click", () => {
    const nextUntaggedIndex = state.tracks.findIndex((t, idx) => idx > state.currentIndex && !t.isTagged);
    if (nextUntaggedIndex !== -1) {
      selectTrack(nextUntaggedIndex);
    } else {
      const anyUntagged = state.tracks.findIndex(t => !t.isTagged);
      if (anyUntagged !== -1) selectTrack(anyUntagged);
      else showToast("All tracks in this folder are already tagged!", "success");
    }
  });

  // Source selection
  elements.sourceButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      elements.sourceButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeSource = btn.dataset.source;
      if (elements.queryInput.value.trim()) {
        performSearch(elements.queryInput.value.trim(), state.activeSource);
      }
    });
  });

  elements.searchBtn.addEventListener("click", () => {
    const q = elements.queryInput.value.trim();
    if (q) performSearch(q, state.activeSource);
  });

  elements.shazamBtn.addEventListener("click", () => {
    if (state.currentTrack) {
      identifyTrackWithShazam(state.currentTrack, false, state.shazamMode);
    } else {
      showToast("Select a track first", "error");
    }
  });

  if (elements.shazamModeBtn && elements.shazamModeMenu) {
    elements.shazamModeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      elements.shazamModeMenu.classList.toggle("hidden");
    });

    document.addEventListener("click", (e) => {
      if (!elements.shazamModeMenu.contains(e.target) && e.target !== elements.shazamModeBtn) {
        elements.shazamModeMenu.classList.add("hidden");
      }
    });

    elements.shazamModeMenu.querySelectorAll(".mode-item").forEach((item) => {
      item.addEventListener("click", () => {
        const mode = item.dataset.mode || "normal";
        state.shazamMode = mode;
        elements.shazamModeMenu.querySelectorAll(".mode-item").forEach((el) => el.classList.remove("active"));
        item.classList.add("active");
        elements.shazamModeMenu.classList.add("hidden");

        if (mode === "deep") {
          elements.shazamModeBadge.textContent = "Deep";
          elements.shazamModeBadge.style.background = "rgba(147, 51, 234, 0.5)";
          elements.shazamBtnLabel.textContent = "Shazam Deep Scan";
          showToast("Switched to Shazam Deep Scan (multi-segment)", "info");
        } else {
          elements.shazamModeBadge.textContent = "Fast";
          elements.shazamModeBadge.style.background = "rgba(0, 0, 0, 0.25)";
          elements.shazamBtnLabel.textContent = "Identify Audio (Shazam)";
          showToast("Switched to Shazam Fast Scan", "info");
        }
      });
    });
  }

  // Batch Modal Triggers & Controls
  if (elements.openBatchModalBtn) {
    elements.openBatchModalBtn.addEventListener("click", () => {
      openBatchModal();
    });
  }

  if (elements.closeBatchModalBtn) {
    elements.closeBatchModalBtn.addEventListener("click", () => {
      closeBatchModal();
    });
  }

  // Preset N buttons
  elements.presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      elements.presetBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const val = parseInt(btn.dataset.n, 10);
      elements.batchNInput.value = val;
      updateBatchButtonsLabel();
    });
  });

  elements.batchNInput.addEventListener("input", () => {
    updateBatchButtonsLabel();
  });

  elements.startBatchNBtn.addEventListener("click", () => {
    const n = Math.max(1, parseInt(elements.batchNInput.value, 10) || 10);
    startBatchProcessing(n);
  });

  elements.startBatchAllBtn.addEventListener("click", () => {
    startBatchProcessing(Infinity);
  });

  elements.stopBatchBtn.addEventListener("click", () => {
    stopBatchProcessing();
  });

  elements.selectAllBatchBtn.addEventListener("click", () => {
    setAllBatchSelection(true);
  });

  elements.deselectAllBatchBtn.addEventListener("click", () => {
    setAllBatchSelection(false);
  });

  if (elements.masterBatchCheck) {
    elements.masterBatchCheck.addEventListener("change", (e) => {
      setAllBatchSelection(e.target.checked);
    });
  }

  elements.batchApplySelectedBtn.addEventListener("click", () => {
    applyBatchResults(true);
  });

  elements.batchApplyAllBtn.addEventListener("click", () => {
    applyBatchResults(false);
  });

  elements.queryInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") elements.searchBtn.click();
  });

  elements.queryInput.addEventListener("paste", (e) => {
    setTimeout(() => {
      const val = elements.queryInput.value.trim();
      if (val.includes("music.apple.com")) {
        performSearch(val, "itunes");
      }
    }, 50);
  });

  elements.refetchLyricsBtn.addEventListener("click", () => {
    const artist = elements.stageArtist.value.trim() || state.currentTrack?.artist;
    const title = elements.stageTitle.value.trim() || state.currentTrack?.title;
    if (artist && title) {
      fetchLyrics(artist, title);
    } else {
      showToast("Artist and Title required to fetch lyrics", "error");
    }
  });

  elements.lyricsEditor.addEventListener("input", () => {
    updateLyricsStats();
  });

  elements.prevBtn.addEventListener("click", () => {
    if (state.currentIndex > 0) selectTrack(state.currentIndex - 1);
  });

  elements.skipBtn.addEventListener("click", () => {
    skipTrack();
  });

  elements.applyBtn.addEventListener("click", () => {
    applyCurrentTrack();
  });

  // Staged Artwork Controls (Advanced Mode)
  if (elements.stagedArtBox) {
    elements.stagedArtBox.addEventListener("click", () => {
      elements.coverFileInput.click();
    });

    elements.stagedArtBox.addEventListener("dragover", (e) => {
      e.preventDefault();
      elements.stagedArtBox.classList.add("dragover");
    });

    elements.stagedArtBox.addEventListener("dragleave", () => {
      elements.stagedArtBox.classList.remove("dragover");
    });

    elements.stagedArtBox.addEventListener("drop", (e) => {
      e.preventDefault();
      elements.stagedArtBox.classList.remove("dragover");
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleCoverFileUpload(e.dataTransfer.files[0]);
      } else if (e.dataTransfer) {
        const url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
        if (url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:image/"))) {
          setStagedArtwork(url.trim(), "Dropped URL");
          showToast("✓ Cover set from dropped URL", "success");
        }
      }
    });
  }

  if (elements.coverFileInput) {
    elements.coverFileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleCoverFileUpload(e.target.files[0]);
        e.target.value = "";
      }
    });
  }

  if (elements.uploadCoverBtn) {
    elements.uploadCoverBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      elements.coverFileInput.click();
    });
  }

  if (elements.urlCoverToggleBtn) {
    elements.urlCoverToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      elements.coverUrlDrawer.classList.toggle("hidden");
      if (!elements.coverUrlDrawer.classList.contains("hidden")) {
        elements.customCoverUrlInput.focus();
        elements.customCoverUrlInput.select();
      }
    });
  }

  if (elements.applyCoverUrlBtn) {
    elements.applyCoverUrlBtn.addEventListener("click", () => {
      const url = elements.customCoverUrlInput.value.trim();
      if (!url) {
        showToast("Please enter an image URL", "warning");
        return;
      }
      setStagedArtwork(url, "Custom URL");
      elements.coverUrlDrawer.classList.add("hidden");
      showToast("✓ Loading cover from URL...", "info");
    });
  }

  if (elements.customCoverUrlInput) {
    elements.customCoverUrlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        elements.applyCoverUrlBtn.click();
      } else if (e.key === "Escape") {
        elements.coverUrlDrawer.classList.add("hidden");
      }
    });
  }

  if (elements.cancelCoverUrlBtn) {
    elements.cancelCoverUrlBtn.addEventListener("click", () => {
      elements.coverUrlDrawer.classList.add("hidden");
    });
  }

  if (elements.useFileCoverBtn) {
    elements.useFileCoverBtn.addEventListener("click", () => {
      if (state.currentTrack && state.currentTrack.hasCover && state.currentTrack.coverBase64) {
        setStagedArtwork(state.currentTrack.coverBase64, "Current File Cover");
        showToast("✓ Reverted to track's embedded cover", "info");
      } else {
        showToast("This track does not have an embedded cover", "warning");
      }
    });
  }

  if (elements.clearCoverBtn) {
    elements.clearCoverBtn.addEventListener("click", () => {
      clearStagedArtwork();
      elements.embedArtCheck.checked = false;
      showToast("Cover artwork cleared", "info");
    });
  }

  // Global Clipboard Image Paste Handler in Advanced Mode
  document.addEventListener("paste", (e) => {
    if (state.inspectorMode !== "advanced") return;
    if (e.clipboardData && e.clipboardData.items) {
      for (const item of e.clipboardData.items) {
        if (item.type && item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) {
            handleCoverFileUpload(blob);
            e.preventDefault();
            return;
          }
        }
      }
    }
  });

  // Global Keyboard Shortcuts
  window.addEventListener("keydown", (e) => {
    // Skip shortcut handling if typing in an input or textarea
    if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
      return;
    }

    const key = e.key.toLowerCase();

    // Mode toggle shortcut (M)
    if (key === "m") {
      e.preventDefault();
      switchInspectorMode(state.inspectorMode === "quick" ? "advanced" : "quick");
      return;
    }

    // Quick Mode Specific Shortcuts
    if (state.inspectorMode === "quick") {
      // Quick Engine Switcher Shortcuts (A/1: Apple, S/2: Shazam, D/3: Deezer, F/4: MusicBrainz, W/G/5: All)
      if (key === "a" || key === "1") {
        e.preventDefault();
        setQuickEngine("itunes", true);
        showToast("Engine: Apple Music", "info");
        return;
      }
      if (key === "s" || key === "2") {
        e.preventDefault();
        setQuickEngine("shazam", true);
        showToast("Engine: Shazam (Temporary)", "info");
        return;
      }
      if (key === "d" || key === "3") {
        e.preventDefault();
        setQuickEngine("deezer", true);
        showToast("Engine: Deezer (Temporary)", "info");
        return;
      }
      if (key === "f" || key === "4") {
        e.preventDefault();
        setQuickEngine("musicbrainz", true);
        showToast("Engine: MusicBrainz (Temporary)", "info");
        return;
      }
      if (key === "w" || key === "g" || key === "5") {
        e.preventDefault();
        setQuickEngine("all", true);
        showToast("Engine: All Sources (Temporary)", "info");
        return;
      }

      // Quick Actions
      if (key === "r") {
        e.preventDefault();
        if (state.currentTrack) {
          showToast(`Re-searching with ${state.quickEngine.toUpperCase()}...`, "info");
          runQuickFetch(state.currentTrack);
        }
        return;
      }
      if (key === "c") {
        e.preventDefault();
        elements.quickEmbedArtCheck.checked = !elements.quickEmbedArtCheck.checked;
        showToast(elements.quickEmbedArtCheck.checked ? "Embed Cover Art: ON" : "Embed Cover Art: OFF", "info");
        return;
      }
      if (key === "t") {
        e.preventDefault();
        elements.quickAutoRenameCheck.checked = !elements.quickAutoRenameCheck.checked;
        showToast(elements.quickAutoRenameCheck.checked ? "Auto-Rename: ON" : "Auto-Rename: OFF", "info");
        return;
      }
      if (key === "p") {
        e.preventDefault();
        if (state.currentIndex > 0) selectTrack(state.currentIndex - 1);
        return;
      }
      if (key === "n") {
        e.preventDefault();
        skipTrack();
        return;
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (state.inspectorMode === "quick") {
        elements.quickConfirmBtn.click();
      } else {
        elements.applyBtn.click();
      }
    } else if (e.code === "Space") {
      e.preventDefault();
      if (state.inspectorMode === "quick") {
        elements.quickSkipBtn.click();
      } else {
        elements.skipBtn.click();
      }
    } else if (key === "j" || e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      if (state.currentIndex < state.tracks.length - 1) selectTrack(state.currentIndex + 1);
    } else if (key === "k" || e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      if (state.currentIndex > 0) selectTrack(state.currentIndex - 1);
    }
  });
}

// 1. Scan Directory
async function scanDirectory(path) {
  elements.statText.textContent = "Scanning...";
  try {
    const resp = await fetch(`/api/scan?path=${encodeURIComponent(path)}`);
    const data = await resp.json();
    if (!data.success) {
      showToast(data.error || "Failed to scan folder", "error");
      elements.statText.textContent = "0 tracks";
      return;
    }

    state.tracks = data.tracks || [];
    state.filteredTracks = [...state.tracks];
    renderTrackList();
    elements.statText.textContent = `${state.tracks.length} tracks`;

    if (state.tracks.length > 0) {
      // Find first untagged track or first track
      const firstUntagged = state.tracks.findIndex((t) => !t.isTagged);
      selectTrack(firstUntagged !== -1 ? firstUntagged : 0);
    } else {
      state.currentIndex = -1;
      state.currentTrack = null;
      elements.inspectorPlaceholder.classList.remove("hidden");
      elements.inspectorContent.classList.add("hidden");
    }
  } catch (err) {
    showToast("Network error connecting to Metatune server", "error");
    elements.statText.textContent = "Offline";
  }
}

// 2. Render Track Queue
function renderTrackList() {
  elements.trackList.innerHTML = "";
  if (state.filteredTracks.length === 0) {
    elements.trackList.innerHTML = `
      <div class="empty-state">
        <p>No matching tracks found</p>
      </div>`;
    return;
  }

  state.filteredTracks.forEach((track) => {
    const originalIndex = state.tracks.indexOf(track);
    const item = document.createElement("div");
    item.className = `track-item ${track.isTagged ? "tagged" : ""} ${originalIndex === state.currentIndex ? "active" : ""}`;

    const hasCover = track.hasCover && track.coverBase64;
    const title = track.title || track.filename;
    const artist = track.artist ? `${track.artist} • ` : "";
    const sizeMb = (track.sizeBytes / (1024 * 1024)).toFixed(1);

    const artHtml = hasCover
      ? `<img src="${track.coverBase64}" class="track-item-thumb" alt="Cover" loading="lazy" />`
      : `<span class="track-fallback-icon">${track.isTagged ? "✓" : "🎵"}</span>`;

    const taggedBadge = track.isTagged
      ? `<span class="track-tagged-indicator" title="Tagged">✓</span>`
      : "";

    item.innerHTML = `
      <div class="track-item-art-wrap ${hasCover ? "has-img" : ""}">
        ${artHtml}
        ${taggedBadge}
      </div>
      <div class="track-item-info">
        <div class="track-item-name" title="${track.filename}">${title}</div>
        <div class="track-item-meta">${artist}${track.format} • ${sizeMb}MB</div>
      </div>
    `;

    item.addEventListener("click", () => selectTrack(originalIndex));
    elements.trackList.appendChild(item);
  });
}

function filterTracks(filterText) {
  const q = filterText.toLowerCase().trim();
  if (!q) {
    state.filteredTracks = [...state.tracks];
  } else {
    state.filteredTracks = state.tracks.filter(
      (t) =>
        t.filename.toLowerCase().includes(q) ||
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.artist && t.artist.toLowerCase().includes(q))
    );
  }
  renderTrackList();
}

// 3. Select & Inspect Track
async function selectTrack(index) {
  if (index < 0 || index >= state.tracks.length) return;

  state.currentIndex = index;
  const track = state.tracks[index];
  state.currentTrack = track;

  // Highlight in sidebar
  renderTrackList();

  // Show Inspector
  elements.inspectorPlaceholder.classList.add("hidden");
  elements.inspectorContent.classList.remove("hidden");

  // Populate Hero
  elements.displayFilename.textContent = track.filename;
  elements.displayTitle.textContent = track.title || track.filename;
  elements.displayArtist.textContent = track.artist || "Unknown Artist";
  elements.trackFormatBadge.textContent = track.format;
  elements.trackSizeBadge.textContent = `${(track.sizeBytes / (1024 * 1024)).toFixed(1)} MB`;

  if (track.isTagged) {
    elements.trackStatusBadge.textContent = "Tagged";
    elements.trackStatusBadge.className = "badge badge-success";
  } else {
    elements.trackStatusBadge.textContent = "Untagged";
    elements.trackStatusBadge.className = "badge badge-warning";
  }

  // Cover image in hero
  if (track.hasCover && track.coverBase64) {
    elements.currentCoverImg.src = track.coverBase64;
    elements.currentCoverImg.style.display = "block";
    elements.noArtPlaceholder.style.display = "none";
  } else {
    elements.currentCoverImg.style.display = "none";
    elements.noArtPlaceholder.style.display = "flex";
  }

  // Audio player stream
  elements.audioPlayer.src = `/api/audio?path=${encodeURIComponent(track.fullPath)}`;

  // Default query
  const searchQ = track.suggestedQuery || track.filename.replace(/\.[^/.]+$/, "");
  elements.queryInput.value = searchQ;

  // Populate Staging with existing metadata
  elements.stageTitle.value = track.title || "";
  elements.stageArtist.value = track.artist || "";
  elements.stageAlbum.value = track.album || "";
  elements.stageYear.value = track.year || "";
  elements.stageTrack.value = track.trackNumber || "";
  elements.stageGenre.value = track.genre || "";

  // Staging artwork initialization
  if (track.hasCover && track.coverBase64) {
    setStagedArtwork(track.coverBase64, "Current Track Cover");
  } else {
    clearStagedArtwork();
  }
  if (elements.coverUrlDrawer) {
    elements.coverUrlDrawer.classList.add("hidden");
  }
  elements.stagedSourceBadge.textContent = "Original File Tags";

  // If track already has lyrics, show them
  if (track.lyrics) {
    elements.lyricsEditor.value = track.lyrics;
    elements.lyricsSourceBadge.textContent = "Embedded in File";
    updateLyricsStats();
  } else {
    elements.lyricsEditor.value = "";
    elements.lyricsSourceBadge.textContent = "None";
    updateLyricsStats();
  }

  // Populate Quick Mode Left Card (Current Track)
  populateQuickCurrentCard(track);

  // Reset quick engine to default Apple Music for every new track
  state.quickEngine = DEFAULT_QUICK_ENGINE;
  elements.quickEngineChips.forEach((chip) => {
    if (chip.dataset.engine === DEFAULT_QUICK_ENGINE) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });

  // If currently in Quick Mode, auto-trigger quick search for selected track using Apple Music!
  if (state.inspectorMode === "quick") {
    runQuickFetch(track);
  } else {
    // Reset quick match state
    state.quickCandidate = null;
    resetQuickMatchCard();
  }

  // Do not auto trigger advanced candidates search on track load - manual search only
  state.candidates = [];
  state.selectedCandidate = null;
  elements.candidatesCount.textContent = "0 found";
  elements.candidatesGrid.innerHTML = `
    <div class="empty-state">
      <p>Click "Search" above or press Enter to find metadata online.</p>
    </div>`;
}

// 3.5 Quick Mode UI Handlers & Auto-Fetcher
function populateQuickCurrentCard(track) {
  if (!track) return;
  elements.quickCurTitle.textContent = track.title || track.filename;
  elements.quickCurArtist.textContent = track.artist || "Unknown Artist";
  elements.quickCurAlbum.textContent = track.album || "-";
  elements.quickCurYear.textContent = track.year || "-";
  elements.quickCurGenre.textContent = track.genre || "-";
  elements.quickCurTrack.textContent = track.trackNumber || "-";
  elements.quickCurFilename.textContent = track.filename;
  elements.quickCurFilename.title = track.filename;

  if (track.lyrics && track.lyrics.trim().length > 0) {
    elements.quickCurLyricsBadge.textContent = "Embedded";
    elements.quickCurLyricsBadge.className = "lyrics-mini-badge has-lyrics";
    elements.quickCurLyricsText.textContent = track.lyrics.trim();
  } else {
    elements.quickCurLyricsBadge.textContent = "None";
    elements.quickCurLyricsBadge.className = "lyrics-mini-badge";
    elements.quickCurLyricsText.textContent = "No embedded lyrics";
  }

  if (track.hasCover && track.coverBase64) {
    elements.quickCurArt.src = track.coverBase64;
    elements.quickCurArt.style.display = "block";
    elements.quickCurArtPlaceholder.style.display = "none";
  } else {
    elements.quickCurArt.style.display = "none";
    elements.quickCurArtPlaceholder.style.display = "flex";
  }
}

function resetQuickMatchCard(loading = false, loadingText = "Searching...") {
  if (loading) {
    elements.quickMatchCard.classList.add("loading");
    elements.quickStatusBadge.textContent = "Searching...";
    elements.quickStatusBadge.className = "quick-status-badge loading";
    elements.quickMatchArt.style.display = "none";
    elements.quickMatchArtPlaceholder.style.display = "flex";
    elements.quickMatchArtText.textContent = loadingText;
    elements.quickMatchTitle.textContent = "Searching online...";
    elements.quickMatchArtist.textContent = "...";
    elements.quickMatchAlbum.textContent = "...";
    elements.quickMatchYear.textContent = "-";
    elements.quickMatchGenre.textContent = "-";
    elements.quickMatchTrack.textContent = "-";
    elements.quickMatchSource.textContent = state.quickEngine.toUpperCase();
    elements.quickMatchLyricsBadge.textContent = "Checking...";
    elements.quickMatchLyricsBadge.className = "lyrics-mini-badge";
    elements.quickMatchLyricsText.textContent = "...";
  } else {
    elements.quickMatchCard.classList.remove("loading");
    elements.quickStatusBadge.textContent = "Idle";
    elements.quickStatusBadge.className = "quick-status-badge idle";
    elements.quickMatchArt.style.display = "none";
    elements.quickMatchArtPlaceholder.style.display = "flex";
    elements.quickMatchArtText.textContent = "No match found";
    elements.quickMatchTitle.textContent = "-";
    elements.quickMatchArtist.textContent = "-";
    elements.quickMatchAlbum.textContent = "-";
    elements.quickMatchYear.textContent = "-";
    elements.quickMatchGenre.textContent = "-";
    elements.quickMatchTrack.textContent = "-";
    elements.quickMatchSource.textContent = "-";
    elements.quickMatchLyricsBadge.textContent = "None";
    elements.quickMatchLyricsBadge.className = "lyrics-mini-badge";
    elements.quickMatchLyricsText.textContent = "No online lyrics";
  }
}

function populateQuickMatchCard(candidate) {
  state.quickCandidate = candidate;
  elements.quickMatchCard.classList.remove("loading");

  if (!candidate) {
    elements.quickStatusBadge.textContent = "No Match";
    elements.quickStatusBadge.className = "quick-status-badge error";
    elements.quickMatchArt.style.display = "none";
    elements.quickMatchArtPlaceholder.style.display = "flex";
    elements.quickMatchArtText.textContent = "No match found. Try another engine";
    elements.quickMatchTitle.textContent = "No Match";
    elements.quickMatchArtist.textContent = "-";
    elements.quickMatchAlbum.textContent = "-";
    elements.quickMatchYear.textContent = "-";
    elements.quickMatchGenre.textContent = "-";
    elements.quickMatchTrack.textContent = "-";
    elements.quickMatchSource.textContent = "-";
    elements.quickMatchLyricsBadge.textContent = "None";
    elements.quickMatchLyricsBadge.className = "lyrics-mini-badge";
    elements.quickMatchLyricsText.textContent = "No online lyrics found";
    return;
  }

  elements.quickStatusBadge.textContent = `Matched (${candidate.source || "Online"})`;
  elements.quickStatusBadge.className = "quick-status-badge success";

  elements.quickMatchTitle.textContent = candidate.title || "-";
  elements.quickMatchArtist.textContent = candidate.artist || "-";
  elements.quickMatchAlbum.textContent = candidate.album || "-";
  elements.quickMatchYear.textContent = candidate.year || "-";
  elements.quickMatchGenre.textContent = candidate.genre || "-";
  elements.quickMatchTrack.textContent = candidate.trackNumber || "-";
  elements.quickMatchSource.textContent = candidate.source || state.quickEngine.toUpperCase();

  // Lyrics
  if (candidate.lyrics && candidate.lyrics.trim().length > 0) {
    elements.quickMatchLyricsBadge.textContent = candidate.lyricsSource || "Online";
    elements.quickMatchLyricsBadge.className = "lyrics-mini-badge has-lyrics";
    elements.quickMatchLyricsText.textContent = candidate.lyrics.trim();
  } else {
    elements.quickMatchLyricsBadge.textContent = "None";
    elements.quickMatchLyricsBadge.className = "lyrics-mini-badge";
    elements.quickMatchLyricsText.textContent = "No online lyrics found";
  }

  if (candidate.artworkUrl) {
    elements.quickMatchArt.src = candidate.artworkUrl;
    elements.quickMatchArt.style.display = "block";
    elements.quickMatchArtPlaceholder.style.display = "none";
  } else {
    elements.quickMatchArt.style.display = "none";
    elements.quickMatchArtPlaceholder.style.display = "flex";
    elements.quickMatchArtText.textContent = "No online artwork";
  }
}

async function runQuickFetch(track) {
  if (!track || !track.fullPath) return;

  state.isQuickSearching = true;
  const engine = state.quickEngine || "shazam";
  const labelMap = {
    shazam: "Recognizing with Shazam...",
    itunes: "Searching Apple Music...",
    deezer: "Searching Deezer...",
    musicbrainz: "Searching MusicBrainz...",
    all: "Searching all sources...",
  };

  resetQuickMatchCard(true, labelMap[engine] || "Searching...");

  try {
    if (engine === "shazam") {
      const resp = await fetch(`/api/recognize?path=${encodeURIComponent(track.fullPath)}&mode=${encodeURIComponent(state.shazamMode || "normal")}`);
      const data = await resp.json();
      if (data.success && data.results && data.results.length > 0) {
        populateQuickMatchCard(data.results[0]);
      } else {
        // Fallback: try search using cleaned filename if shazam didn't match
        const query = track.suggestedQuery || track.filename.replace(/\.[^/.]+$/, "");
        const fallbackResp = await fetch(`/api/search?q=${encodeURIComponent(query)}&source=all`);
        const fallbackData = await fallbackResp.json();
        if (fallbackData.results && fallbackData.results.length > 0) {
          populateQuickMatchCard(fallbackData.results[0]);
        } else {
          populateQuickMatchCard(null);
        }
      }
    } else {
      // Text engine search (iTunes, Deezer, Musicbrainz, or All)
      const query = track.suggestedQuery || track.filename.replace(/\.[^/.]+$/, "");
      const resp = await fetch(`/api/search?q=${encodeURIComponent(query)}&source=${encodeURIComponent(engine)}`);
      const data = await resp.json();
      if (data.results && data.results.length > 0) {
        populateQuickMatchCard(data.results[0]);
      } else {
        populateQuickMatchCard(null);
      }
    }
  } catch (err) {
    populateQuickMatchCard(null);
    elements.quickStatusBadge.textContent = "Connection Error";
    elements.quickStatusBadge.className = "quick-status-badge error";
  } finally {
    state.isQuickSearching = false;
  }
}

async function applyQuickTrack() {
  if (!state.currentTrack) return;
  const cand = state.quickCandidate;

  if (!cand) {
    showToast("Find an online match first, or use 'Skip' to advance to the next track", "info");
    return;
  }

  const embedArt = elements.quickEmbedArtCheck.checked;
  const autoRename = elements.quickAutoRenameCheck.checked;

  elements.quickConfirmBtn.disabled = true;
  elements.quickConfirmBtn.textContent = "Saving...";

  let artworkData = "";
  if (embedArt && (cand.artworkUrl || elements.quickMatchArt?.src)) {
    artworkData = await resolveArtworkBase64(elements.quickMatchArt || cand.artworkUrl);
  }

  const payload = {
    fullPath: state.currentTrack.fullPath,
    metadata: {
      title: cand.title || state.currentTrack.title || "",
      artist: cand.artist || state.currentTrack.artist || "",
      album: cand.album || state.currentTrack.album || "",
      year: cand.year || state.currentTrack.year || "",
      trackNumber: cand.trackNumber || state.currentTrack.trackNumber || "",
      genre: cand.genre || state.currentTrack.genre || "",
    },
    artworkUrl: artworkData,
    artworkBase64: artworkData.startsWith("data:") ? artworkData : "",
    lyrics: "",
    rename: autoRename,
  };

  try {
    const resp = await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const res = await resp.json();

    if (res.success) {
      state.currentTrack.isTagged = true;
      state.currentTrack.title = cand.title || state.currentTrack.title;
      state.currentTrack.artist = cand.artist || state.currentTrack.artist;
      state.currentTrack.album = cand.album || state.currentTrack.album;
      state.currentTrack.year = cand.year || state.currentTrack.year;
      if (embedArt && (artworkData || cand.artworkUrl)) {
        state.currentTrack.hasCover = true;
        state.currentTrack.coverBase64 = artworkData || cand.artworkUrl;
      }
      if (res.renamed && res.newFilename) {
        state.currentTrack.filename = res.newFilename;
        state.currentTrack.fullPath = res.newPath;
      }
      if (res.warning) {
        showToast(`⚠ ${res.warning}`, "warning");
      } else {
        showToast(`✓ Tags saved: ${state.currentTrack.filename}`, "success");
      }
      skipTrack();
    } else {
      showToast(`Error: ${res.error || "Failed to save tags"}`, "error");
    }
  } catch (err) {
    showToast("Network error while saving tags", "error");
  } finally {
    elements.quickConfirmBtn.disabled = false;
    elements.quickConfirmBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>Confirm & Next (Enter)</span>
    `;
  }
}

// 4. Multi-Source Search
async function performSearch(query, source) {
  state.isSearching = true;
  elements.candidatesCount.textContent = "Searching...";
  elements.candidatesGrid.innerHTML = `<div class="empty-state"><p>Querying online databases...</p></div>`;

  try {
    const resp = await fetch(`/api/search?q=${encodeURIComponent(query)}&source=${encodeURIComponent(source)}`);
    const data = await resp.json();
    state.candidates = data.results || [];
    elements.candidatesCount.textContent = `${state.candidates.length} found`;
    renderCandidates();

    // Auto-select top candidate if available
    if (state.candidates.length > 0) {
      selectCandidate(0);
    }
  } catch (err) {
    elements.candidatesCount.textContent = "Error";
    elements.candidatesGrid.innerHTML = `<div class="empty-state"><p>Search failed</p></div>`;
  } finally {
    state.isSearching = false;
  }
}

// 4.5 Shazam Audio Recognition
async function identifyTrackWithShazam(track, silent = false, mode = "normal") {
  if (!track || !track.fullPath) return false;

  const originalBtnHtml = elements.shazamBtn.innerHTML;
  const isDeep = mode === "deep";

  if (!silent) {
    elements.shazamBtn.disabled = true;
    elements.shazamBtn.innerHTML = `
      <svg class="spinning" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5zm1.07-7.75l-.9.92C12.45 10.42 12 10.9 12 12h-2c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
      </svg>
      <span>${isDeep ? "Deep Scanning Segments..." : "Listening to Audio..."}</span>
    `;
    elements.candidatesCount.textContent = isDeep ? "Analyzing multi-segment acoustic fingerprints..." : "Analyzing acoustic fingerprint...";
    elements.candidatesGrid.innerHTML = `<div class="empty-state"><p>${isDeep ? "Deep scanning across track audio slices..." : "Fingerprinting audio via Shazam..."}</p></div>`;
  }

  try {
    const resp = await fetch(`/api/recognize?path=${encodeURIComponent(track.fullPath)}&mode=${encodeURIComponent(mode)}`);
    const data = await resp.json();

    if (data.success && data.results && data.results.length > 0) {
      state.candidates = data.results;
      const srcLabel = data.results[0].source || (isDeep ? "Shazam Deep" : "Shazam");
      elements.candidatesCount.textContent = `${state.candidates.length} found (${srcLabel})`;
      renderCandidates();
      selectCandidate(0);

      // Also update search input box to match detected track
      const top = data.results[0];
      elements.queryInput.value = `${top.artist} - ${top.title}`;

      if (!silent) {
        showToast(`✓ Identified via ${srcLabel}: ${top.artist} - ${top.title}`, "success");
      }
      return true;
    } else {
      if (!silent) {
        elements.candidatesCount.textContent = `0 found (${isDeep ? "Shazam Deep" : "Shazam"})`;
        elements.candidatesGrid.innerHTML = `
          <div class="empty-state">
            <p>No audio match found in Shazam database for this file${isDeep ? " even after deep scan" : ""}.</p>
            <span>Try manual text search with the query input above</span>
          </div>`;
        showToast(`No match found via Shazam${isDeep ? " (Deep Scan)" : ""}`, "error");
      }
      return false;
    }
  } catch (err) {
    if (!silent) {
      elements.candidatesCount.textContent = "Error";
      elements.candidatesGrid.innerHTML = `<div class="empty-state"><p>Shazam identification failed</p></div>`;
      showToast("Error connecting to Shazam recognition service", "error");
    }
    return false;
  } finally {
    if (!silent) {
      elements.shazamBtn.disabled = false;
      elements.shazamBtn.innerHTML = originalBtnHtml;
    }
  }
}

// ==========================================================================
// Batch Auto-Tagger Studio Engine
// ==========================================================================

function openBatchModal() {
  elements.batchModal.classList.remove("hidden");
  updateBatchButtonsLabel();
  refreshBatchQueueStats();
}

function closeBatchModal() {
  if (state.batch.isRunning) {
    if (!confirm("A batch process is currently running. Do you want to stop and close?")) {
      return;
    }
    stopBatchProcessing();
  }
  elements.batchModal.classList.add("hidden");
}

function updateBatchButtonsLabel() {
  const n = Math.max(1, parseInt(elements.batchNInput.value, 10) || 10);
  elements.startBatchNBtn.innerHTML = `<span>⚡ Process Next <b>${n}</b></span>`;
}

function refreshBatchQueueStats() {
  const scope = elements.batchScopeSelect.value;
  const targetTracks = scope === "untagged"
    ? state.tracks.filter((t) => !t.isTagged)
    : [...state.tracks];

  elements.batchTotalCount.textContent = `${targetTracks.length} in Queue`;
}

function updateBatchCounts() {
  const matched = state.batch.results.filter((r) => r.status === "matched" || r.status === "saved").length;
  const failed = state.batch.results.filter((r) => r.status === "failed").length;
  const selected = state.batch.results.filter((r) => r.selected && (r.status === "matched" || r.status === "saved")).length;

  elements.batchFoundCount.textContent = `${matched} Matched`;
  elements.batchFailedCount.textContent = `${failed} Failed`;
  elements.batchSelectedCount.textContent = selected;

  elements.batchApplySelectedBtn.disabled = selected === 0 || state.batch.isRunning;
  elements.batchApplyAllBtn.disabled = matched === 0 || state.batch.isRunning;
}

function setAllBatchSelection(isSelected) {
  state.batch.results.forEach((item) => {
    if (item.status === "matched" || item.status === "saved") {
      item.selected = isSelected;
    }
  });
  renderBatchTable();
  updateBatchCounts();
}

function renderBatchTable() {
  if (!elements.batchCardsGrid) return;

  if (state.batch.results.length === 0) {
    elements.batchCardsGrid.innerHTML = `
      <div class="empty-batch-state">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 18V5l12-2v13"></path>
          <circle cx="6" cy="18" r="3"></circle>
          <circle cx="18" cy="16" r="3"></circle>
        </svg>
        <p>No tracks processed yet. Click "Process Next N" or "Process All" to start.</p>
        <span>Tracks and their detected metadata will appear here as rich cards.</span>
      </div>`;
    return;
  }

  elements.batchCardsGrid.innerHTML = "";
  state.batch.results.forEach((item, index) => {
    const cand = item.candidate || {};
    const artUrl = cand.artworkUrl || "";
    const canSelect = item.status === "matched" || item.status === "saved";
    const checkDisabled = !canSelect ? "disabled" : "";
    const checkChecked = item.selected && canSelect ? "checked" : "";

    let statusBadge = `<span class="badge badge-dim">Pending</span>`;
    if (item.status === "searching") {
      statusBadge = `<span class="badge badge-accent"><span class="spinning" style="display:inline-block;">⏳</span> Searching</span>`;
    } else if (item.status === "matched") {
      statusBadge = `<span class="badge badge-success">✓ Matched</span>`;
    } else if (item.status === "failed") {
      statusBadge = `<span class="badge badge-warning">✕ Not Found</span>`;
    } else if (item.status === "saved") {
      statusBadge = `<span class="badge badge-success" style="background:#059669;color:#fff;">✓ Saved</span>`;
    }

    const sourceBadge = cand.source ? `<span class="batch-card-source">${cand.source}</span>` : "";

    const card = document.createElement("div");
    card.className = `batch-card status-${item.status} ${item.selected ? "selected" : ""}`;

    const artHtml = artUrl
      ? `<img src="${artUrl}" class="batch-card-art" alt="Cover Art" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
         <div class="batch-card-no-art" style="display:none;">🎵</div>`
      : `<div class="batch-card-no-art">🎵</div>`;

    card.innerHTML = `
      <div class="batch-card-top">
        <label class="batch-card-checkbox" title="Select track for saving">
          <input type="checkbox" class="row-checkbox" data-idx="${index}" ${checkChecked} ${checkDisabled}>
        </label>
        <div class="batch-card-badges">
          ${sourceBadge}
          ${statusBadge}
        </div>
      </div>

      <div class="batch-card-body">
        <div class="batch-card-art-wrap">
          ${artHtml}
        </div>

        <div class="batch-card-info">
          <div class="batch-card-title" title="${cand.title || item.track.filename}">
            ${cand.title || '<span class="text-dim">No title detected</span>'}
          </div>
          <div class="batch-card-artist" title="${cand.artist || ''}">
            ${cand.artist || '<span class="text-dim">Unknown artist</span>'}
          </div>

          <div class="batch-card-details">
            <div class="detail-pill" title="Album: ${cand.album || 'N/A'}">
              <span class="detail-label">Album:</span>
              <span class="detail-val">${cand.album || '-'}</span>
            </div>
            ${cand.year ? `<div class="detail-pill"><span class="detail-label">Year:</span><span class="detail-val">${cand.year}</span></div>` : ''}
            ${cand.genre ? `<div class="detail-pill"><span class="detail-label">Genre:</span><span class="detail-val">${cand.genre}</span></div>` : ''}
            ${cand.trackNumber ? `<div class="detail-pill"><span class="detail-label">Trk:</span><span class="detail-val">#${cand.trackNumber}</span></div>` : ''}
          </div>
        </div>
      </div>

      <div class="batch-card-footer" title="${item.track.filename}">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <span class="batch-card-file">${item.track.filename}</span>
      </div>
    `;

    const chk = card.querySelector(".row-checkbox");
    chk.addEventListener("change", (e) => {
      item.selected = e.target.checked;
      if (item.selected) card.classList.add("selected");
      else card.classList.remove("selected");
      updateBatchCounts();
    });

    // Clicking card toggles checkbox if eligible
    card.addEventListener("click", (e) => {
      if (e.target.closest(".row-checkbox") || e.target.closest("label")) return;
      if (canSelect) {
        item.selected = !item.selected;
        chk.checked = item.selected;
        if (item.selected) card.classList.add("selected");
        else card.classList.remove("selected");
        updateBatchCounts();
      }
    });

    elements.batchCardsGrid.appendChild(card);
  });

  updateBatchCounts();
}

async function startBatchProcessing(maxCount = 10) {
  if (state.batch.isRunning) return;

  const scope = elements.batchScopeSelect.value;
  const method = elements.batchMethodSelect.value;

  // Find candidate tracks
  const availableTracks = scope === "untagged"
    ? state.tracks.filter((t) => !t.isTagged)
    : [...state.tracks];

  if (availableTracks.length === 0) {
    showToast("No tracks match the selected scope", "info");
    return;
  }

  // Filter out tracks that are already successfully matched/saved in the current batch list
  const alreadyProcessedPaths = new Set(
    state.batch.results
      .filter((r) => r.status === "matched" || r.status === "saved")
      .map((r) => r.track.fullPath)
  );

  const pendingTracks = availableTracks.filter((t) => !alreadyProcessedPaths.has(t.fullPath));

  if (pendingTracks.length === 0) {
    showToast("All eligible tracks have already been processed in this batch!", "success");
    return;
  }

  // Take up to maxCount
  const sliceToProcess = pendingTracks.slice(0, maxCount === Infinity ? pendingTracks.length : maxCount);

  state.batch.isRunning = true;
  state.batch.stopRequested = false;

  // Toggle UI state
  elements.startBatchNBtn.classList.add("hidden");
  elements.startBatchAllBtn.classList.add("hidden");
  elements.stopBatchBtn.classList.remove("hidden");
  elements.batchProgressWrap.classList.remove("hidden");
  elements.batchProgressBar.style.width = "0%";

  // Pre-populate results list with these items as 'pending'
  const newItems = sliceToProcess.map((track) => ({
    track,
    status: "pending",
    candidate: null,
    error: null,
    selected: true,
  }));

  state.batch.results.push(...newItems);
  renderBatchTable();

  let matchedCount = 0;
  let processedCount = 0;
  const total = sliceToProcess.length;
  const concurrency = parseInt(elements.batchConcurrencySelect?.value || "3", 10);

  // Helper function to process an individual track
  async function processItem(item) {
    if (state.batch.stopRequested) return;

    item.status = "searching";
    renderBatchTable();

    try {
      let candidate = null;
      if (method === "shazam" || method === "shazam_deep") {
        const shazamMode = method === "shazam_deep" ? "deep" : "normal";
        const resp = await fetch(`/api/recognize?path=${encodeURIComponent(item.track.fullPath)}&mode=${shazamMode}`);
        const data = await resp.json();
        if (data.success && data.results && data.results.length > 0) {
          candidate = data.results[0];
        }
      } else {
        const query = item.track.suggestedQuery || item.track.filename.replace(/\.[^/.]+$/, "");
        const resp = await fetch(`/api/search?q=${encodeURIComponent(query)}&source=${encodeURIComponent(method)}`);
        const data = await resp.json();
        if (data.success && data.results && data.results.length > 0) {
          candidate = data.results[0];
        }
      }

      if (candidate) {
        item.candidate = candidate;
        item.status = "matched";
        item.selected = true;
        matchedCount++;
      } else {
        item.status = "failed";
        item.selected = false;
      }
    } catch (err) {
      item.status = "failed";
      item.error = err.message || "Request failed";
      item.selected = false;
    }

    processedCount++;
    const percent = Math.round((processedCount / total) * 100);
    elements.batchProgressBar.style.width = `${percent}%`;
    elements.batchProgressStats.textContent = `${processedCount} / ${total}`;
    elements.batchProgressText.textContent = `[${processedCount}/${total}] ${item.track.filename}`;

    renderBatchTable();
  }

  // Parallel Worker Pool
  let currentIndex = 0;
  async function worker() {
    while (currentIndex < total && !state.batch.stopRequested) {
      const idx = currentIndex++;
      await processItem(newItems[idx]);
      if (concurrency > 1) {
        // Small interval to keep UI responsive
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }

  // Launch workers
  const workerPromises = [];
  const activeWorkersCount = Math.min(concurrency, total);
  for (let w = 0; w < activeWorkersCount; w++) {
    workerPromises.push(worker());
  }

  await Promise.all(workerPromises);

  // Done or stopped
  state.batch.isRunning = false;
  elements.startBatchNBtn.classList.remove("hidden");
  elements.startBatchAllBtn.classList.remove("hidden");
  elements.stopBatchBtn.classList.add("hidden");

  elements.batchProgressText.textContent = `Batch finished: ${matchedCount} of ${total} matched`;
  showToast(`⚡ Batch completed: ${matchedCount} of ${total} matches found!`, "success");
  updateBatchCounts();
}

function stopBatchProcessing() {
  if (state.batch.isRunning) {
    state.batch.stopRequested = true;
    elements.batchProgressText.textContent = "Stopping batch process...";
  }
}

async function applyBatchResults(onlySelected = true) {
  const itemsToApply = state.batch.results.filter((item) => {
    const isReady = item.status === "matched" && item.candidate;
    return onlySelected ? isReady && item.selected : isReady;
  });

  if (itemsToApply.length === 0) {
    showToast("No matched items selected to apply", "warning");
    return;
  }

  const embedArt = elements.batchEmbedArtCheck.checked;
  const autoRename = elements.batchAutoRenameCheck.checked;

  const confirmMsg = `Apply tags and cover art to ${itemsToApply.length} tracks now?`;
  if (!confirm(confirmMsg)) return;

  state.batch.isRunning = true;
  elements.batchApplySelectedBtn.disabled = true;
  elements.batchApplyAllBtn.disabled = true;
  elements.batchProgressWrap.classList.remove("hidden");

  let savedCount = 0;
  const total = itemsToApply.length;

  for (let i = 0; i < total; i++) {
    const item = itemsToApply[i];
    const track = item.track;
    const cand = item.candidate;

    const percent = Math.round(((i + 1) / total) * 100);
    elements.batchProgressBar.style.width = `${percent}%`;
    elements.batchProgressStats.textContent = `${i + 1} / ${total}`;
    elements.batchProgressText.textContent = `Saving (${i + 1}/${total}): ${track.filename}`;

    let artworkData = "";
    if (embedArt && cand.artworkUrl) {
      artworkData = await resolveArtworkBase64(cand.artworkUrl);
    }

    const payload = {
      fullPath: track.fullPath,
      metadata: {
        title: cand.title || "",
        artist: cand.artist || "",
        album: cand.album || "",
        year: cand.year || "",
        trackNumber: cand.trackNumber || "",
        genre: cand.genre || "",
      },
      artworkUrl: artworkData,
      artworkBase64: artworkData.startsWith("data:") ? artworkData : "",
      lyrics: "", // Keep existing or blank in batch
      rename: autoRename,
    };

    try {
      const resp = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const res = await resp.json();

      if (res.success) {
        item.status = "saved";
        item.selected = false;
        savedCount++;

        // Update main workspace track list in sync!
        track.isTagged = true;
        track.title = cand.title || track.title;
        track.artist = cand.artist || track.artist;
        track.album = cand.album || track.album;
        track.year = cand.year || track.year;
        if (embedArt && (artworkData || cand.artworkUrl)) {
          track.hasCover = true;
          track.coverBase64 = artworkData || cand.artworkUrl;
        }
        if (res.renamed && res.newFilename) {
          track.filename = res.newFilename;
          track.fullPath = res.newPath;
        }
        if (res.warning) {
          item.error = res.warning;
        }
      } else {
        item.error = res.error || "Save error";
      }
    } catch (err) {
      item.error = err.message || "Network error";
    }

    renderBatchTable();
  }

  state.batch.isRunning = false;
  elements.batchProgressText.textContent = `Successfully saved ${savedCount} of ${total} tracks!`;
  showToast(`✓ Batch save complete: ${savedCount} tracks updated!`, "success");

  // Re-render sidebar track list to reflect green checks and artwork immediately
  renderTrackList();
  refreshBatchQueueStats();
  updateBatchCounts();
}


function renderCandidates() {
  elements.candidatesGrid.innerHTML = "";
  if (state.candidates.length === 0) {
    elements.candidatesGrid.innerHTML = `
      <div class="empty-state">
        <p>No match found online for "${elements.queryInput.value}".</p>
        <span>Try adjusting the query or switching sources above</span>
      </div>`;
    return;
  }

  state.candidates.forEach((cand, idx) => {
    const card = document.createElement("div");
    card.className = `candidate-card ${idx === 0 ? "active" : ""}`;

    const artSrc = cand.artworkUrl || "";
    card.innerHTML = `
      <img src="${artSrc || ''}" class="candidate-art" alt="Art" onerror="this.style.opacity=0.3">
      <div class="candidate-info">
        <div class="candidate-source">${cand.source}</div>
        <div class="candidate-title" title="${cand.title}">${cand.title}</div>
        <div class="candidate-artist" title="${cand.artist}">${cand.artist}</div>
        <div class="candidate-album" title="${cand.album}">${cand.album} ${cand.year ? `(${cand.year})` : ""}</div>
      </div>
    `;

    card.addEventListener("click", () => {
      document.querySelectorAll(".candidate-card").forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      selectCandidate(idx);
    });

    elements.candidatesGrid.appendChild(card);
  });
}

// 5. Select Candidate and Stage
function selectCandidate(index) {
  const cand = state.candidates[index];
  if (!cand) return;
  state.selectedCandidate = cand;

  elements.stageTitle.value = cand.title || "";
  elements.stageArtist.value = cand.artist || "";
  elements.stageAlbum.value = cand.album || "";
  elements.stageYear.value = cand.year || "";
  elements.stageTrack.value = cand.trackNumber || "";
  elements.stageGenre.value = cand.genre || "";
  elements.stagedSourceBadge.textContent = `${cand.source} Match`;

  // Artwork staging using setStagedArtwork
  if (cand.artworkUrl) {
    setStagedArtwork(cand.artworkUrl, `Source: ${cand.source}`);
  } else {
    clearStagedArtwork();
  }

  // Automatically fetch lyrics for this candidate
  if (cand.artist && cand.title) {
    fetchLyrics(cand.artist, cand.title);
  }
}

// 6. Fetch Lyrics
async function fetchLyrics(artist, title) {
  elements.lyricsSourceBadge.textContent = "Fetching...";
  try {
    const resp = await fetch(`/api/lyrics?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`);
    const data = await resp.json();
    if (data.lyrics) {
      elements.lyricsEditor.value = data.lyrics;
      elements.lyricsSourceBadge.textContent = data.source || "Found";
      updateLyricsStats();
      showToast("✓ Lyrics fetched successfully", "success");
    } else {
      elements.lyricsSourceBadge.textContent = "Not found";
      updateLyricsStats();
    }
  } catch (err) {
    elements.lyricsSourceBadge.textContent = "Error";
  }
}

function updateLyricsStats() {
  const lines = elements.lyricsEditor.value.trim().split("\n").filter(Boolean).length;
  elements.lyricsStats.textContent = `${lines} lines`;
}

// 7. Skip Track
function skipTrack() {
  if (state.currentIndex < state.tracks.length - 1) {
    selectTrack(state.currentIndex + 1);
  } else {
    showToast("Reached the end of the track list", "info");
  }
}

// 8. Apply Tags & Save
async function applyCurrentTrack() {
  if (!state.currentTrack) return;

  const embedArt = elements.embedArtCheck.checked;
  let artworkData = "";
  const hasStageArt = elements.stageCoverImg?.src && elements.stageCoverImg.style.display !== "none";
  if (embedArt && hasStageArt) {
    artworkData = await resolveArtworkBase64(elements.stageCoverImg);
  }

  const payload = {
    fullPath: state.currentTrack.fullPath,
    metadata: {
      title: elements.stageTitle.value.trim(),
      artist: elements.stageArtist.value.trim(),
      album: elements.stageAlbum.value.trim(),
      year: elements.stageYear.value.trim(),
      trackNumber: elements.stageTrack.value.trim(),
      genre: elements.stageGenre.value.trim(),
    },
    artworkUrl: artworkData,
    artworkBase64: artworkData.startsWith("data:") ? artworkData : "",
    lyrics: elements.embedLyricsCheck.checked ? elements.lyricsEditor.value.trim() : "",
    rename: elements.autoRenameCheck.checked,
  };

  elements.applyBtn.disabled = true;
  elements.applyBtn.textContent = "Saving...";

  try {
    const resp = await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const res = await resp.json();

    if (res.success) {
      state.currentTrack.isTagged = true;
      if (embedArt && artworkData) {
        state.currentTrack.hasCover = true;
        state.currentTrack.coverBase64 = artworkData;
      }
      if (res.renamed && res.newFilename) {
        state.currentTrack.filename = res.newFilename;
        state.currentTrack.fullPath = res.newPath;
      }
      if (res.warning) {
        showToast(`⚠ ${res.warning}`, "warning");
      } else {
        showToast(`✓ Applied tags to: ${state.currentTrack.filename}`, "success");
      }
      
      // Auto move to next track
      skipTrack();
    } else {
      showToast(`Error: ${res.error || "Failed to save tags"}`, "error");
    }
  } catch (err) {
    showToast("Network error while applying tags", "error");
  } finally {
    elements.applyBtn.disabled = false;
    elements.applyBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>Apply Tags & Next (Enter)</span>
    `;
  }
}
