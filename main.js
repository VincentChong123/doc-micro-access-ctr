/**
 * DocAccess Co-Pilot Core Application Logic
 */

// --- SAMPLE DATA CONFIGURATION ---
const SAMPLE_MARKDOWN = `# MUFG Digital Strategy Sandbox Spec
<!-- start-readonly -->
### Document Reference: RF-2026-SG
Status: APPROVED (Risk Operations)
Category: Tier-1 Venture Sandbox
<!-- end-readonly -->

This is a draft specification for the transaction banking ledger connection.

<!-- start-hidden -->
CREDENTIALS_VAULT:
  API_PRIVATE_KEY: "mufg-sec-key-88992-abc"
  ENC_SALT: "sha256-salt-99x"
<!-- end-hidden -->

<!-- start-writable -->
### 1. High-Level Target Design
[Reviewers: Please elaborate on the transaction consensus mechanism and throughput target below.]
Throughput: Target 50 TPS.
Consensus: Proof of Authority.
<!-- end-writable -->

<!-- start-readonly -->
### 2. Regulatory Compliance Policy
All operations must comply with MAS technology risk guidelines (TRM v2.0).
Encryption at rest is mandatory using AES-256.
<!-- end-readonly -->

<!-- start-writable -->
### 3. Open Draft Points
- Define API retry schedules.
- Detail ledger rollback limits.
<!-- end-writable -->`;

const MOCK_SHEET_DATA = {
  sheetName: "Digital Budget 2026",
  dimensions: { rows: 6, cols: 4 },
  cells: [
    // Row 1 (Headers) - Readonly
    { row: 1, col: 1, value: "Category", formula: null, access: "readonly", address: "A1" },
    { row: 1, col: 2, value: "Current Budget (USD)", formula: null, access: "readonly", address: "B1" },
    { row: 1, col: 3, value: "LLM Revised Forecast (USD)", formula: null, access: "readonly", address: "C1" },
    { row: 1, col: 4, value: "Audit Notes", formula: null, access: "readonly", address: "D1" },

    // Row 2 - VC Investments (forecast is writable)
    { row: 2, col: 1, value: "Strategic VC Investments", formula: null, access: "readonly", address: "A2" },
    { row: 2, col: 2, value: 5000000, formula: null, access: "readonly", address: "B2" },
    { row: 2, col: 3, value: "", formula: null, access: "writable", address: "C2" },
    { row: 2, col: 4, value: "Evaluate Series B targets", formula: null, access: "readonly", address: "D2" },

    // Row 3 - Fintech Alliances (forecast is writable)
    { row: 3, col: 1, value: "Fintech Innovation Alliances", formula: null, access: "readonly", address: "A3" },
    { row: 3, col: 2, value: 2500000, formula: null, access: "readonly", address: "B3" },
    { row: 3, col: 3, value: "", formula: null, access: "writable", address: "C3" },
    { row: 3, col: 4, value: "Partnerships with local startups", formula: null, access: "readonly", address: "D3" },

    // Row 4 - Regulatory Audit (locked)
    { row: 4, col: 1, value: "Regulatory Audit (MAS Tech)", formula: null, access: "readonly", address: "A4" },
    { row: 4, col: 2, value: 750000, formula: null, access: "readonly", address: "B4" },
    { row: 4, col: 3, value: 750000, formula: null, access: "readonly", address: "C4" },
    { row: 4, col: 4, value: "Fixed MAS statutory assessment fee", formula: null, access: "readonly", address: "D4" },

    // Row 5 - API Vault Secrets (hidden/redacted)
    { row: 5, col: 1, value: "API Vault Secret Key", formula: null, access: "readonly", address: "A5" },
    { row: 5, col: 2, value: "mufg-sec-key-88992-abc", formula: null, access: "hidden", address: "B5" },
    { row: 5, col: 3, value: "[REDACTED - HIDDEN DATA]", formula: null, access: "hidden", address: "C5" },
    { row: 5, col: 4, value: "Credentials for Sandbox API connections", formula: null, access: "readonly", address: "D5" },

    // Row 6 - Total Budget (Formulas, locked)
    { row: 6, col: 1, value: "Total Digital Budget", formula: null, access: "readonly", address: "A6" },
    { row: 6, col: 2, value: 8250000, formula: "=SUM(B2:B4)", access: "readonly", address: "B6" },
    { row: 6, col: 3, value: 750000, formula: "=SUM(C2:C4)", access: "readonly", address: "C6" },
    { row: 6, col: 4, value: "Formula sum automatically calculated", formula: null, access: "readonly", address: "D6" }
  ]
};

// --- APP STATE ---
const state = {
  activeTab: 'markdown', // 'markdown' or 'sheets'
  markdown: {
    rawText: SAMPLE_MARKDOWN,
    segments: [],
    proposedText: '',
    proposedSegments: []
  },
  sheets: {
    apiUrl: '',
    sheetName: 'Not Connected',
    cells: [],
    proposedUpdates: [], // Array of {row, col, value}
    dimensions: { rows: 0, cols: 0 }
  },
  settings: {
    apiKey: '',
    model: 'gemini-2.0-flash',
    forceSimulation: true,
    simulateRogue: false // If true, the simulator will try to breach read-only parts
  }
};

// --- DOM ELEMENTS ---
const elements = {
  tabMarkdown: document.getElementById('tabMarkdown'),
  tabSheets: document.getElementById('tabSheets'),
  markdownModeView: document.getElementById('markdownModeView'),
  sheetsModeView: document.getElementById('sheetsModeView'),

  // Settings Modal
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  modelSelect: document.getElementById('modelSelect'),
  simulatorToggle: document.getElementById('simulatorToggle'),
  testConnectionBtn: document.getElementById('testConnectionBtn'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  testResultMsg: document.getElementById('testResultMsg'),
  docStatusBadge: document.getElementById('docStatusBadge'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingMsg: document.getElementById('loadingMsg'),

  // Markdown Panels
  markdownEditor: document.getElementById('markdownEditor'),
  wrapWritableBtn: document.getElementById('wrapWritableBtn'),
  wrapReadonlyBtn: document.getElementById('wrapReadonlyBtn'),
  wrapHiddenBtn: document.getElementById('wrapHiddenBtn'),
  outlineList: document.getElementById('outlineList'),
  blockCount: document.getElementById('blockCount'),
  checkerList: document.getElementById('checkerList'),
  defaultTypeSelect: document.getElementById('defaultTypeSelect'),

  // Markdown LLM Panels
  statWritableCount: document.getElementById('statWritableCount'),
  statReadonlyCount: document.getElementById('statReadonlyCount'),
  statHiddenCount: document.getElementById('statHiddenCount'),
  togglePromptPreview: document.getElementById('togglePromptPreview'),
  promptPreviewContent: document.getElementById('promptPreviewContent'),
  promptPreviewText: document.getElementById('promptPreviewText'),
  makerInstruction: document.getElementById('makerInstruction'),
  apiIndicator: document.getElementById('apiIndicator'),
  apiIndicatorText: document.getElementById('apiIndicatorText'),
  runMakerBtn: document.getElementById('runMakerBtn'),
  diffSection: document.getElementById('diffSection'),
  verificationBadge: document.getElementById('verificationBadge'),
  verificationErrorCard: document.getElementById('verificationErrorCard'),
  verificationErrorMsg: document.getElementById('verificationErrorMsg'),
  diffViewer: document.getElementById('diffViewer'),
  rejectBtn: document.getElementById('rejectBtn'),
  approveBtn: document.getElementById('approveBtn'),
  loadSampleBtn: document.getElementById('loadSampleBtn'),
  clearDocBtn: document.getElementById('clearDocBtn'),

  // Sheets Panels
  sheetsApiUrl: document.getElementById('sheetsApiUrl'),
  fetchSheetBtn: document.getElementById('fetchSheetBtn'),
  loadMockSheetBtn: document.getElementById('loadMockSheetBtn'),
  sheetTitleLabel: document.getElementById('sheetTitleLabel'),
  sheetSubtitleLabel: document.getElementById('sheetSubtitleLabel'),
  sheetsGridContainer: document.getElementById('sheetsGridContainer'),

  sheetWritableCount: document.getElementById('sheetWritableCount'),
  sheetReadonlyCount: document.getElementById('sheetReadonlyCount'),
  sheetHiddenCount: document.getElementById('sheetHiddenCount'),
  toggleSheetPromptPreview: document.getElementById('toggleSheetPromptPreview'),
  sheetPromptPreviewContent: document.getElementById('sheetPromptPreviewContent'),
  sheetPromptPreviewText: document.getElementById('sheetPromptPreviewText'),
  sheetMakerInstruction: document.getElementById('sheetMakerInstruction'),
  runSheetMakerBtn: document.getElementById('runSheetMakerBtn'),

  sheetDiffSection: document.getElementById('sheetDiffSection'),
  sheetVerificationBadge: document.getElementById('sheetVerificationBadge'),
  sheetVerificationErrorCard: document.getElementById('sheetVerificationErrorCard'),
  sheetVerificationErrorMsg: document.getElementById('sheetVerificationErrorMsg'),
  sheetDiffViewer: document.getElementById('sheetDiffViewer'),
  sheetRejectBtn: document.getElementById('sheetRejectBtn'),
  sheetApproveBtn: document.getElementById('sheetApproveBtn')
};

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  initEventHandlers();

  // Set initial markdown content
  elements.markdownEditor.value = state.markdown.rawText;
  processMarkdownUpdates();
});

// --- SETTINGS STORAGE & MODAL ---
function loadSettings() {
  state.settings.apiKey = localStorage.getItem('docaccess_api_key') || '';
  state.settings.model = localStorage.getItem('docaccess_model') || 'gemini-2.0-flash';

  const savedSim = localStorage.getItem('docaccess_force_simulation');
  state.settings.forceSimulation = savedSim !== null ? savedSim === 'true' : true;

  elements.apiKeyInput.value = state.settings.apiKey;
  elements.modelSelect.value = state.settings.model;
  elements.simulatorToggle.checked = state.settings.forceSimulation;

  updateAPIIndicator();
}

function saveSettings() {
  state.settings.apiKey = elements.apiKeyInput.value.trim();
  state.settings.model = elements.modelSelect.value;
  state.settings.forceSimulation = elements.simulatorToggle.checked;

  localStorage.setItem('docaccess_api_key', state.settings.apiKey);
  localStorage.setItem('docaccess_model', state.settings.model);
  localStorage.setItem('docaccess_force_simulation', state.settings.forceSimulation.toString());

  updateAPIIndicator();
  closeModal();
}

function updateAPIIndicator() {
  const hasKey = !!state.settings.apiKey;
  const isSim = state.settings.forceSimulation || !hasKey;

  // Set visual indicators
  if (isSim) {
    elements.apiIndicator.className = 'api-indicator status-simulated';
    elements.apiIndicatorText.innerText = 'Using Local LLM Simulator';
    elements.docStatusBadge.className = 'badge';
    elements.docStatusBadge.innerText = 'Simulator Mode';
  } else {
    elements.apiIndicator.className = 'api-indicator status-live';
    elements.apiIndicatorText.innerText = `Connected to Gemini API (${state.settings.model})`;
    elements.docStatusBadge.className = 'badge badge-success';
    elements.docStatusBadge.innerText = 'Live API Mode';
  }
}

function openModal() {
  elements.settingsModal.classList.remove('hidden');
  elements.testResultMsg.className = 'test-result-msg hidden';
}

function closeModal() {
  elements.settingsModal.classList.add('hidden');
}

// --- EVENT HANDLERS ---
function initEventHandlers() {
  // Tab Switching
  elements.tabMarkdown.addEventListener('click', () => switchTab('markdown'));
  elements.tabSheets.addEventListener('click', () => switchTab('sheets'));

  // Settings Buttons
  elements.settingsBtn.addEventListener('click', openModal);
  elements.closeSettingsBtn.addEventListener('click', closeModal);
  elements.saveSettingsBtn.addEventListener('click', saveSettings);
  elements.testConnectionBtn.addEventListener('click', testAPIConnection);

  // Settings input updates "Simulate Rogue" under context menu
  elements.settingsModal.addEventListener('click', (e) => {
    // Hidden back door to toggle rogue simulator for validation testing
    if (e.target === elements.settingsModal) closeModal();
  });

  // Add secret rogue test toggle checkbox dynamically inside settings card
  const checkboxContainer = document.createElement('div');
  checkboxContainer.className = 'form-group';
  checkboxContainer.style.marginTop = '8px';
  checkboxContainer.innerHTML = `
    <label class="form-checkbox-label" style="color: var(--color-locked); font-weight: 500;">
      <input type="checkbox" id="rogueToggle">
      Simulate Rogue Maker (Breach Read-Only Limits)
    </label>
  `;
  elements.saveSettingsBtn.parentElement.before(checkboxContainer);

  const rogueToggle = document.getElementById('rogueToggle');
  rogueToggle.checked = state.settings.simulateRogue;
  rogueToggle.addEventListener('change', (e) => {
    state.settings.simulateRogue = e.target.checked;
  });

  // Markdown Editor Keyups
  elements.markdownEditor.addEventListener('input', () => {
    state.markdown.rawText = elements.markdownEditor.value;
    processMarkdownUpdates();
  });

  // Defaults dropdown
  elements.defaultTypeSelect.addEventListener('change', () => {
    processMarkdownUpdates();
  });

  // Editor Wrap Tool Buttons
  elements.wrapWritableBtn.addEventListener('click', () => wrapSelection('start-writable', 'end-writable'));
  elements.wrapReadonlyBtn.addEventListener('click', () => wrapSelection('start-readonly', 'end-readonly'));
  elements.wrapHiddenBtn.addEventListener('click', () => wrapSelection('start-hidden', 'end-hidden'));

  // Load sample specs / clear
  elements.loadSampleBtn.addEventListener('click', () => {
    elements.markdownEditor.value = SAMPLE_MARKDOWN;
    state.markdown.rawText = SAMPLE_MARKDOWN;
    processMarkdownUpdates();
  });

  elements.clearDocBtn.addEventListener('click', () => {
    if (confirm('Clear editor?')) {
      elements.markdownEditor.value = '';
      state.markdown.rawText = '';
      processMarkdownUpdates();
    }
  });

  // Prompt Accordion toggle
  elements.togglePromptPreview.addEventListener('click', () => {
    elements.togglePromptPreview.classList.toggle('active');
    elements.promptPreviewContent.classList.toggle('show');
  });

  // Run Maker Button
  elements.runMakerBtn.addEventListener('click', runMarkdownMakerLoop);

  // Approve/Reject Buttons
  elements.approveBtn.addEventListener('click', approveMarkdownChanges);
  elements.rejectBtn.addEventListener('click', rejectMarkdownChanges);

  // --- SHEETS TAB CONTROLS ---
  elements.fetchSheetBtn.addEventListener('click', fetchGoogleSheetData);
  elements.loadMockSheetBtn.addEventListener('click', loadMockSheetToGrid);

  elements.toggleSheetPromptPreview.addEventListener('click', () => {
    elements.toggleSheetPromptPreview.classList.toggle('active');
    elements.sheetPromptPreviewContent.classList.toggle('show');
  });

  elements.runSheetMakerBtn.addEventListener('click', runSheetsMakerLoop);
  elements.sheetApproveBtn.addEventListener('click', approveSheetsChanges);
  elements.sheetRejectBtn.addEventListener('click', () => {
    elements.sheetDiffSection.classList.add('hidden');
  });
}

function switchTab(tab) {
  state.activeTab = tab;
  if (tab === 'markdown') {
    elements.tabMarkdown.classList.add('active');
    elements.tabSheets.classList.remove('active');
    elements.markdownModeView.classList.remove('hidden');
    elements.sheetsModeView.classList.add('hidden');
  } else {
    elements.tabMarkdown.classList.remove('active');
    elements.tabSheets.classList.add('active');
    elements.markdownModeView.classList.add('hidden');
    elements.sheetsModeView.classList.remove('hidden');
  }
}

// --- TEXT SELECTION HELPER ---
function wrapSelection(startTag, endTag) {
  const editor = elements.markdownEditor;
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const text = editor.value;

  const selectedText = text.substring(start, end);
  const wrapped = `\n<!-- ${startTag} -->\n${selectedText.trim()}\n<!-- ${endTag} -->\n`;

  editor.value = text.substring(0, start) + wrapped + text.substring(end);
  state.markdown.rawText = editor.value;

  processMarkdownUpdates();

  // Refocus and select
  editor.focus();
  editor.setSelectionRange(start + wrapped.length, start + wrapped.length);
}

// ==========================================
// REGEX SEGMENT PARSER & PRE-FILTER CORE
// ==========================================

function parseMarkdownSegments(text, defaultType = 'readonly') {
  const segments = [];
  const regex = /(<!--\s*(start-readonly|start-writable|start-hidden)\s*-->)([\s\S]*?)(<!--\s*(end-readonly|end-writable|end-hidden)\s*-->)/g;

  let lastIndex = 0;
  let match;
  let counter = 0;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;

    // Add untagged text before the tag
    if (matchIndex > lastIndex) {
      const untaggedContent = text.substring(lastIndex, matchIndex);
      if (untaggedContent.trim() !== '') {
        segments.push({
          id: `block-${counter++}`,
          type: defaultType,
          isTagged: false,
          content: untaggedContent,
          raw: untaggedContent
        });
      } else if (untaggedContent.length > 0) {
        segments.push({
          id: `block-${counter++}`,
          type: 'whitespace',
          isTagged: false,
          content: untaggedContent,
          raw: untaggedContent
        });
      }
    }

    const startTag = match[1];
    const typeLabel = match[2].replace('start-', ''); // readonly, writable, hidden
    const content = match[3];
    const endTag = match[4];

    segments.push({
      id: `block-${counter++}`,
      type: typeLabel,
      isTagged: true,
      startTag: startTag,
      endTag: endTag,
      content: content,
      raw: match[0]
    });

    lastIndex = regex.lastIndex;
  }

  // Add remaining untagged text
  if (lastIndex < text.length) {
    const untaggedContent = text.substring(lastIndex);
    if (untaggedContent.trim() !== '') {
      segments.push({
        id: `block-${counter++}`,
        type: defaultType,
        isTagged: false,
        content: untaggedContent,
        raw: untaggedContent
      });
    } else if (untaggedContent.length > 0) {
      segments.push({
        id: `block-${counter++}`,
        type: 'whitespace',
        isTagged: false,
        content: untaggedContent,
        raw: untaggedContent
      });
    }
  }

  return segments;
}

/**
 * Redacts any 'hidden' segments using regex pre-filtering
 */
function compileLLMInput(segments) {
  return segments.map(seg => {
    if (seg.type === 'hidden') {
      // Redact the content inside the tags
      return `${seg.startTag}\n[REDACTED - HIDDEN SECTION]\n${seg.endTag}`;
    }
    return seg.raw;
  }).join('');
}

// ==========================================
// REGEX OUTPUT VERIFICATION
// ==========================================

function verifyLLMOutput(originalText, llmOutputText, defaultType = 'readonly') {
  const origSegs = parseMarkdownSegments(originalText, defaultType);
  const outSegs = parseMarkdownSegments(llmOutputText, defaultType);

  // Filter out the writable zones for comparison of protected boundaries
  const origProtected = origSegs.filter(s => s.type !== 'writable' && s.type !== 'whitespace');
  const outProtected = outSegs.filter(s => s.type !== 'writable' && s.type !== 'whitespace');

  if (origProtected.length !== outProtected.length) {
    return {
      success: false,
      error: `Structural Boundary Violation!\nExpected exactly ${origProtected.length} protected (Read-Only/Hidden) segments, but the AI response contained ${outProtected.length} segments. The AI must not add or remove boundary tags.`
    };
  }

  for (let i = 0; i < origProtected.length; i++) {
    const orig = origProtected[i];
    const out = outProtected[i];

    if (orig.type !== out.type) {
      return {
        success: false,
        error: `Structure Type Violation at protected block ${i + 1}!\nExpected type '${orig.type}' but found type '${out.type}'.`
      };
    }

    if (orig.type === 'hidden') {
      const cleanOutContent = out.content.replace(/\s+/g, '').trim();
      const expectedRedacted = '[REDACTED-HIDDENSECTION]';
      if (cleanOutContent !== expectedRedacted) {
        return {
          success: false,
          error: `Security Breach Alert!\nThe AI modified the contents of the Hidden (Redacted) block at position ${i + 1}.\nFound: "${out.content.trim()}"\nExpected: "[REDACTED - HIDDEN SECTION]"`
        };
      }
    } else {
      // Read-only block content equality check
      if (orig.content.trim() !== out.content.trim()) {
        return {
          success: false,
          error: `Read-Only Integrity Violation at block ${i + 1}!\nProtected content was modified.\n\nOriginal Text:\n"${orig.content.trim()}"\n\nProposed Alteration:\n"${out.content.trim()}"`
        };
      }
    }
  }

  return {
    success: true,
    origSegs: origSegs,
    outSegs: outSegs
  };
}

/**
 * Replaces redacted content placeholders with original secret data
 */
function mergeLLMOutput(origSegments, outSegments) {
  let origProtIndex = 0;
  const origProtected = origSegments.filter(s => s.type !== 'writable' && s.type !== 'whitespace');

  return outSegments.map(seg => {
    if (seg.type === 'writable') {
      // Writable block edits are accepted from AI
      return seg.raw;
    } else if (seg.type === 'whitespace') {
      return seg.raw;
    } else {
      // Restore the original raw segment (including hidden values)
      const orig = origProtected[origProtIndex++];
      return orig.raw;
    }
  }).join('');
}

// ==========================================
// RENDERING & MARKDOWN UPDATE PIPELINE
// ==========================================

function processMarkdownUpdates() {
  const defaultType = elements.defaultTypeSelect.value;
  state.markdown.segments = parseMarkdownSegments(state.markdown.rawText, defaultType);

  updateMarkdownStats();
  renderOutline();
  renderCheckerBlocks();
  updatePromptPreview();
}

function updateMarkdownStats() {
  let writable = 0;
  let readonly = 0;
  let hidden = 0;

  state.markdown.segments.forEach(seg => {
    if (seg.type === 'writable') writable++;
    else if (seg.type === 'readonly') readonly++;
    else if (seg.type === 'hidden') hidden++;
  });

  elements.statWritableCount.innerText = writable;
  elements.statReadonlyCount.innerText = readonly;
  elements.statHiddenCount.innerText = hidden;
}

function renderOutline() {
  elements.outlineList.innerHTML = '';
  const filtered = state.markdown.segments.filter(s => s.type !== 'whitespace');

  elements.blockCount.innerText = `${filtered.length} Blocks`;

  if (filtered.length === 0) {
    elements.outlineList.innerHTML = `<div class="outline-empty">No structure parsed yet. Type in the editor above.</div>`;
    return;
  }

  filtered.forEach((seg, index) => {
    const item = document.createElement('div');
    item.className = 'outline-item';

    let label = seg.content.trim().split('\n')[0] || '(Empty Block)';
    if (label.length > 35) label = label.substring(0, 35) + '...';

    // Status color bullet
    let badgeClass = 'tag-readonly';
    if (seg.type === 'writable') badgeClass = 'tag-writable';
    else if (seg.type === 'hidden') badgeClass = 'tag-hidden';

    item.innerHTML = `
      <span class="outline-item-title">${index + 1}. ${escapeHtml(label)}</span>
      <span class="badge ${badgeClass}">${seg.type}</span>
    `;

    item.addEventListener('click', () => {
      // Find the block text inside editor and scroll to it
      const editor = elements.markdownEditor;
      const indexInRaw = state.markdown.rawText.indexOf(seg.raw);
      if (indexInRaw !== -1) {
        editor.focus();
        editor.setSelectionRange(indexInRaw, indexInRaw + seg.raw.length);
      }
    });

    elements.outlineList.appendChild(item);
  });
}

function renderCheckerBlocks() {
  elements.checkerList.innerHTML = '';
  const filtered = state.markdown.segments.filter(s => s.type !== 'whitespace');

  if (filtered.length === 0) {
    elements.checkerList.innerHTML = `<div class="checker-empty">Please enter some markdown in the Raw Editor.</div>`;
    return;
  }

  filtered.forEach((seg) => {
    const card = document.createElement('div');
    card.className = `block-card ${seg.type}-block`;

    // Header block status options
    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `
      <div class="card-meta">
        <span class="block-type-badge">${seg.isTagged ? 'Tagged Block' : 'Untagged Block'}</span>
      </div>
      <div class="card-actions">
        <button class="badge-toggle toggle-readonly ${seg.type === 'readonly' ? 'active' : ''}" data-id="${seg.id}" data-set="readonly">🔒 Locked</button>
        <button class="badge-toggle toggle-writable ${seg.type === 'writable' ? 'active' : ''}" data-id="${seg.id}" data-set="writable">✏️ Writable</button>
        <button class="badge-toggle toggle-hidden ${seg.type === 'hidden' ? 'active' : ''}" data-id="${seg.id}" data-set="hidden">👁️ Hidden</button>
      </div>
    `;

    // Bind click handlers to block card badge triggers to rewrite raw code comments automatically
    header.querySelectorAll('.badge-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const blockId = e.target.getAttribute('data-id');
        const newType = e.target.getAttribute('data-set');
        toggleBlockAccess(blockId, newType);
      });
    });

    // Card content body using Marked.js
    const body = document.createElement('div');
    body.className = 'card-body';

    if (seg.type === 'hidden') {
      body.className = 'card-body redacted-body';
      body.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-md">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span>Content redacted locally. Secrets remain hidden.</span>
      `;
    } else {
      // Use Marked parser to render beautiful visual Markdown
      body.innerHTML = marked.parse(seg.content || '*Empty*');
    }

    card.appendChild(header);
    card.appendChild(body);
    elements.checkerList.appendChild(card);
  });
}

function toggleBlockAccess(blockId, newType) {
  const targetSeg = state.markdown.segments.find(s => s.id === blockId);
  if (!targetSeg) return;

  // Set new segment type
  targetSeg.type = newType;

  // Rewrite rawText by mapping segments list back to text, wrap them in tags
  const updatedText = state.markdown.segments.map(seg => {
    if (seg.id === blockId) {
      const cleanContent = seg.content.trim();
      if (newType === 'readonly') {
        return `\n<!-- start-readonly -->\n${cleanContent}\n<!-- end-readonly -->\n`;
      } else if (newType === 'writable') {
        return `\n<!-- start-writable -->\n${cleanContent}\n<!-- end-writable -->\n`;
      } else if (newType === 'hidden') {
        return `\n<!-- start-hidden -->\n${cleanContent}\n<!-- end-hidden -->\n`;
      }
    }
    return seg.raw;
  }).join('');

  elements.markdownEditor.value = updatedText;
  state.markdown.rawText = updatedText;
  processMarkdownUpdates();
}

function updatePromptPreview() {
  const redactedText = compileLLMInput(state.markdown.segments);
  elements.promptPreviewText.innerText = `[SYSTEM INST]: You are an assistant modifying a spec. Do not edit sections in locked or hidden comment blocks. Modify only Writable sections.

[USER INST]: ${elements.makerInstruction.value || '(No instruction provided)'}

[DOCUMENT CONTENT]:
${redactedText}`;
}

// Trigger prompt compiled live as instructions change
elements.makerInstruction.addEventListener('input', updatePromptPreview);

// ==========================================
// RUN MARKDOWN MAKER LOOP
// ==========================================

async function runMarkdownMakerLoop() {
  const instruction = elements.makerInstruction.value.trim();
  if (!instruction) {
    alert('Please enter instructions for the LLM.');
    return;
  }

  showLoading('Running Maker LLM loop...');
  elements.diffSection.classList.add('hidden');

  const defaultType = elements.defaultTypeSelect.value;
  const compiledInputText = compileLLMInput(state.markdown.segments);

  const systemInstruction = `You are a document editing engine.
Your task is to edit the provided Markdown document based on the user's instructions.
You must respect the following access controls:
- Content between "<!-- start-readonly -->" and "<!-- end-readonly -->" is LOCKED. Do not modify it. Output it exactly as is.
- Content between "<!-- start-hidden -->" and "<!-- end-hidden -->" is SENSITIVE and redacted. You will see "[REDACTED - HIDDEN SECTION]". Do not change this text or replace it. Leave it exactly as "[REDACTED - HIDDEN SECTION]".
- Content between "<!-- start-writable -->" and "<!-- end-writable -->" is WRITABLE. You are authorized to rewrite, edit, add to, or modify the contents inside these blocks according to the user instructions.
- Any other text outside comments is read-only.

Your output must be the FULL document with all tags preserved, and all read-only/hidden blocks exactly unchanged. Do not wrap output in extra markdown boxes besides the document itself.`;

  const prompt = `User request: ${instruction}

Here is the document to edit:
${compiledInputText}`;

  try {
    let aiResponseText = '';

    const isSimulated = state.settings.forceSimulation || !state.settings.apiKey;

    if (isSimulated) {
      // Simulate locally
      await delay(1200);
      aiResponseText = simulateLLMEditing(compiledInputText, instruction);
    } else {
      // Live API Call
      aiResponseText = await callGeminiAPI(systemInstruction, prompt);
    }

    state.markdown.proposedText = aiResponseText;

    // Execute Verification via regex
    const verification = verifyLLMOutput(state.markdown.rawText, state.markdown.proposedText, defaultType);

    elements.diffSection.classList.remove('hidden');

    if (!verification.success) {
      // Verification Failed
      elements.verificationBadge.className = 'badge badge-danger';
      elements.verificationBadge.innerText = 'Verification FAILED';
      elements.verificationErrorCard.classList.remove('hidden');
      elements.verificationErrorMsg.innerText = verification.error;
      elements.approveBtn.disabled = true;
      elements.approveBtn.style.opacity = '0.5';

      // Render simple text preview of rogue response
      elements.diffViewer.innerHTML = `
        <div class="diff-item">
          <div class="diff-item-header" style="color:var(--color-locked);">Rejected Rogue AI Output</div>
          <div class="diff-item-body" style="white-space: pre-wrap; font-size:0.7rem; color:var(--text-secondary); max-height: 200px; overflow-y:auto;">${escapeHtml(aiResponseText)}</div>
        </div>
      `;
    } else {
      // Verification Passed
      elements.verificationBadge.className = 'badge badge-success';
      elements.verificationBadge.innerText = 'Regex Verified';
      elements.verificationErrorCard.classList.add('hidden');
      elements.approveBtn.disabled = false;
      elements.approveBtn.style.opacity = '1';

      state.markdown.proposedSegments = verification.outSegs;

      // Visual Diff
      renderMarkdownDiffs(state.markdown.segments, state.markdown.proposedSegments);
    }

  } catch (error) {
    alert(`Error: ${error.message}`);
  } finally {
    hideLoading();
  }
}

function simulateLLMEditing(inputText, instruction) {
  const segments = parseMarkdownSegments(inputText, elements.defaultTypeSelect.value);

  // If user toggled rogue breaches
  if (state.settings.simulateRogue) {
    // Breaches locked block
    return inputText.replace(/<!-- start-readonly -->([\s\S]*?)<!-- end-readonly -->/,
      "<!-- start-readonly -->\n[BREACHED!] Legal disclaimer deleted by Rogue LLM.\n<!-- end-readonly -->");
  }

  // Normal valid simulation
  const edited = segments.map(seg => {
    if (seg.type === 'writable') {
      const originalContent = seg.content.trim();
      return `${seg.startTag}
${originalContent}

### [LLM Co-Pilot Revision]
- Updated based on instruction: "${instruction}"
- Added consensus specs details: 10,000 transactions validated.
- Added API retry parameters: backoff multiplier 1.5, max retry 5.
${seg.endTag}`;
    }
    return seg.raw;
  }).join('');

  return edited;
}

function renderMarkdownDiffs(origSegs, propSegs) {
  elements.diffViewer.innerHTML = '';

  const origWritables = origSegs.filter(s => s.type === 'writable');
  const propWritables = propSegs.filter(s => s.type === 'writable');

  if (origWritables.length === 0) {
    elements.diffViewer.innerHTML = '<div class="outline-empty">No writable segments were edited.</div>';
    return;
  }

  origWritables.forEach((orig, index) => {
    const prop = propWritables[index] || { content: '' };

    if (orig.content.trim() === prop.content.trim()) return;

    const diffItem = document.createElement('div');
    diffItem.className = 'diff-item';
    diffItem.innerHTML = `
      <div class="diff-item-header">Writable Block ${index + 1} Alterations</div>
      <div class="diff-item-body">
        <span class="diff-del">${escapeHtml(orig.content.trim())}</span>
        <span class="diff-ins">${escapeHtml(prop.content.trim())}</span>
      </div>
    `;
    elements.diffViewer.appendChild(diffItem);
  });
}

function approveMarkdownChanges() {
  // Merge and restore original hidden blocks
  const mergedText = mergeLLMOutput(state.markdown.segments, state.markdown.proposedSegments);

  elements.markdownEditor.value = mergedText;
  state.markdown.rawText = mergedText;
  processMarkdownUpdates();

  elements.diffSection.classList.add('hidden');
  alert('Changes programmatically verified, merged, and updated successfully!');
}

function rejectMarkdownChanges() {
  elements.diffSection.classList.add('hidden');
}

// ==========================================
// GOOGLE SHEETS PIPELINE
// ==========================================

function loadMockSheetToGrid() {
  state.sheets.sheetName = MOCK_SHEET_DATA.sheetName;
  state.sheets.dimensions = MOCK_SHEET_DATA.dimensions;
  state.sheets.cells = JSON.parse(JSON.stringify(MOCK_SHEET_DATA.cells)); // deep copy

  renderSheetsGrid();
  updateSheetStats();
  updateSheetPromptPreview();
}

function renderSheetsGrid() {
  const container = elements.sheetsGridContainer;
  container.innerHTML = '';

  const rows = state.sheets.dimensions.rows;
  const cols = state.sheets.dimensions.cols;

  if (rows === 0) {
    container.innerHTML = `
      <div class="sheets-empty">
        <p>No grid data populated.</p>
      </div>
    `;
    return;
  }

  elements.sheetTitleLabel.innerText = state.sheets.sheetName;
  elements.sheetSubtitleLabel.innerText = `${rows} Rows x ${cols} Columns`;

  const table = document.createElement('table');
  table.className = 'sheets-grid';

  // Create Column Headers Row (A, B, C...)
  const headerRow = document.createElement('tr');
  // Top left corner cell
  const cornerHeader = document.createElement('th');
  cornerHeader.className = 'row-header';
  cornerHeader.innerText = '';
  headerRow.appendChild(cornerHeader);

  for (let c = 1; c <= cols; c++) {
    const th = document.createElement('th');
    th.innerText = getColLetter(c);
    headerRow.appendChild(th);
  }
  table.appendChild(headerRow);

  // Render cell rows
  for (let r = 1; r <= rows; r++) {
    const tr = document.createElement('tr');

    // Row numeric label
    const rowLabel = document.createElement('td');
    rowLabel.className = 'row-header';
    rowLabel.innerText = r.toString();
    tr.appendChild(rowLabel);

    for (let c = 1; c <= cols; c++) {
      const cell = state.sheets.cells.find(cellObj => cellObj.row === r && cellObj.col === c);
      const td = document.createElement('td');

      if (cell) {
        td.innerText = cell.value;
        td.className = `cell-${cell.access}`;

        if (cell.formula) {
          td.classList.add('cell-formula');
          td.title = `Formula: ${cell.formula}\nValue: ${cell.value}`;
        }
      } else {
        td.innerText = '';
        td.className = 'cell-readonly';
      }
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }

  container.appendChild(table);
}

function updateSheetStats() {
  let writable = 0;
  let readonly = 0;
  let hidden = 0;

  state.sheets.cells.forEach(cell => {
    if (cell.access === 'writable') writable++;
    else if (cell.access === 'readonly') readonly++;
    else if (cell.access === 'hidden') hidden++;
  });

  elements.sheetWritableCount.innerText = writable;
  elements.sheetReadonlyCount.innerText = readonly;
  elements.sheetHiddenCount.innerText = hidden;
}

function updateSheetPromptPreview() {
  const cellsRepresentation = state.sheets.cells.map(c => {
    let displayVal = c.value;
    if (c.access === 'hidden') displayVal = '[REDACTED]';
    return `Cell ${c.address} (${c.access}${c.formula ? ' [Formula: ' + c.formula + ']' : ''}): "${displayVal}"`;
  }).join('\n');

  elements.sheetPromptPreviewText.innerText = `[SYSTEM INST]: You are a spreadsheet helper. You can write only to green cells marked 'writable'. Do not overwrite formulas. Return a JSON structure.

[USER INST]: ${elements.sheetMakerInstruction.value || '(No instruction)'}

[SPREADSHEET CONTEXT]:
${cellsRepresentation}`;
}

elements.sheetMakerInstruction.addEventListener('input', updateSheetPromptPreview);

// ==========================================
// CONNECT REAL GOOGLE SHEET
// ==========================================

async function fetchGoogleSheetData() {
  const url = elements.sheetsApiUrl.value.trim();
  if (!url) {
    alert('Please enter a Google Apps Script Web App URL.');
    return;
  }

  showLoading('Fetching spreadsheet content...');
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network error. Verify API CORS settings.');

    const result = await response.json();
    if (result.status === 'error') throw new Error(result.message);

    state.sheets.apiUrl = url;
    state.sheets.sheetName = result.sheetName;
    state.sheets.dimensions = result.dimensions;
    state.sheets.cells = result.cells;

    renderSheetsGrid();
    updateSheetStats();
    updateSheetPromptPreview();

    alert('Connected and loaded Google Sheet successfully!');
  } catch (error) {
    alert(`API Connection Failed: ${error.message}`);
  } finally {
    hideLoading();
  }
}

// ==========================================
// RUN GOOGLE SHEETS MAKER LOOP
// ==========================================

async function runSheetsMakerLoop() {
  const instruction = elements.sheetMakerInstruction.value.trim();
  if (!instruction) {
    alert('Please enter instructions for the spreadsheet.');
    return;
  }

  if (state.sheets.cells.length === 0) {
    alert('Please connect or load sheet data first.');
    return;
  }

  showLoading('Running Spreadsheet Maker loop...');
  elements.sheetDiffSection.classList.add('hidden');

  const cellsRepresentation = state.sheets.cells.map(c => {
    let displayVal = c.value;
    if (c.access === 'hidden') displayVal = '[REDACTED]';
    return {
      address: c.address,
      row: c.row,
      col: c.col,
      access: c.access,
      value: displayVal,
      hasFormula: !!c.formula
    };
  });

  const systemInstruction = `You are a financial model co-pilot.
Your job is to update values in a spreadsheet according to the user instructions.
You can ONLY modify values for cells marked as "access": "writable".
You MUST NOT change cell values that are "readonly" or "hidden".
You MUST NOT overwrite formulas.
Format your return response as a JSON array of updates:
{
  "updates": [
    {"row": 2, "col": 3, "value": 5500000}
  ]
}`;

  const prompt = `User instruction: ${instruction}

Spreadsheet Cells data JSON:
${JSON.stringify(cellsRepresentation, null, 2)}`;

  try {
    let updates = [];
    const isSimulated = state.settings.forceSimulation || !state.settings.apiKey;

    if (isSimulated) {
      await delay(1200);
      updates = simulateSheetsLLM(instruction);
    } else {
      const responseText = await callGeminiAPI(systemInstruction, prompt);
      const parsed = JSON.parse(responseText);
      updates = parsed.updates || [];
    }

    state.sheets.proposedUpdates = updates;

    // Execute Local Clientside Checks
    const checkResult = verifyProposedSheetsUpdates(updates);

    elements.sheetDiffSection.classList.remove('hidden');

    if (!checkResult.success) {
      // Security Validation FAILED
      elements.sheetVerificationBadge.className = 'badge badge-danger';
      elements.sheetVerificationBadge.innerText = 'Security Failed';
      elements.sheetVerificationErrorCard.classList.remove('hidden');
      elements.sheetVerificationErrorMsg.innerText = checkResult.error;
      elements.sheetApproveBtn.disabled = true;
      elements.sheetApproveBtn.style.opacity = '0.5';

      elements.sheetDiffViewer.innerHTML = `
        <div class="diff-item">
          <div class="diff-item-header" style="color:var(--color-locked);">Blocked Updates Details</div>
          <div class="diff-item-body" style="color:var(--text-secondary);">${escapeHtml(checkResult.error)}</div>
        </div>
      `;
    } else {
      // Security Validation PASSED
      elements.sheetVerificationBadge.className = 'badge badge-success';
      elements.sheetVerificationBadge.innerText = 'Verified';
      elements.sheetVerificationErrorCard.classList.add('hidden');
      elements.sheetApproveBtn.disabled = false;
      elements.sheetApproveBtn.style.opacity = '1';

      renderSheetsDiffs(updates);
    }

  } catch (error) {
    alert(`Error: ${error.message}`);
  } finally {
    hideLoading();
  }
}

function simulateSheetsLLM(instruction) {
  // If simulate rogue breaches is checked
  if (state.settings.simulateRogue) {
    return [
      { row: 2, col: 3, value: 5500000 }, // Writable (valid)
      { row: 4, col: 3, value: 900000 },  // Read-only (violation)
      { row: 6, col: 3, value: 120000 }   // Formula cell (violation)
    ];
  }

  // Normal valid forecasts
  const updates = [];
  const cellC2 = state.sheets.cells.find(c => c.row === 2 && c.col === 3);
  const cellC3 = state.sheets.cells.find(c => c.row === 3 && c.col === 3);

  if (cellC2 && cellC2.access === 'writable') {
    updates.push({ row: 2, col: 3, value: 5600000 });
  }
  if (cellC3 && cellC3.access === 'writable') {
    updates.push({ row: 3, col: 3, value: 2800000 });
  }

  return updates;
}

function verifyProposedSheetsUpdates(updates) {
  for (let update of updates) {
    const cell = state.sheets.cells.find(c => c.row === update.row && c.col === update.col);

    if (!cell) {
      return { success: false, error: `Bound Error: Cell address at row ${update.row}, col ${update.col} does not exist.` };
    }

    // 1. Permission guard
    if (cell.access !== 'writable') {
      return {
        success: false,
        error: `Security Violation!\nAI attempted to modify cell ${cell.address} which is marked as ${cell.access.toUpperCase()} (Read-only / Hidden).`
      };
    }

    // 2. Formula guard
    if (cell.formula) {
      return {
        success: false,
        error: `Formula Override Violation!\nAI attempted to write value "${update.value}" directly over formula "${cell.formula}" at cell ${cell.address}.`
      };
    }
  }

  return { success: true };
}

function renderSheetsDiffs(updates) {
  elements.sheetDiffViewer.innerHTML = '';

  if (updates.length === 0) {
    elements.sheetDiffViewer.innerHTML = '<div class="outline-empty">No updates proposed by AI.</div>';
    return;
  }

  updates.forEach(update => {
    const cell = state.sheets.cells.find(c => c.row === update.row && c.col === update.col);
    const diffItem = document.createElement('div');
    diffItem.className = 'diff-item';
    diffItem.innerHTML = `
      <div class="diff-item-header">Cell ${cell.address} Update</div>
      <div class="diff-item-body">
        <span class="diff-del">Old Value: "${cell.value || '(empty)'}"</span>
        <span class="diff-ins">New Value: "${update.value}"</span>
      </div>
    `;
    elements.sheetDiffViewer.appendChild(diffItem);
  });
}

async function approveSheetsChanges() {
  const updates = state.sheets.proposedUpdates;
  const isSimulated = !state.sheets.apiUrl;

  if (isSimulated) {
    // Offline simulation update
    showLoading('Updating local offline grid...');
    await delay(600);

    updates.forEach(update => {
      const cell = state.sheets.cells.find(c => c.row === update.row && c.col === update.col);
      if (cell) {
        cell.value = update.value;
      }
    });

    // Auto-update sum formulas locally for visuals
    const forecastSum = state.sheets.cells
      .filter(c => (c.row === 2 || c.row === 3 || c.row === 4) && c.col === 3)
      .reduce((sum, c) => sum + (parseFloat(c.value) || 0), 0);

    const totalCell = state.sheets.cells.find(c => c.row === 6 && c.col === 3);
    if (totalCell) totalCell.value = forecastSum;

    renderSheetsGrid();
    elements.sheetDiffSection.classList.add('hidden');
    hideLoading();
    alert('Local sheet updated and formulas recalculated successfully!');
  } else {
    // Live update via API Post
    showLoading('Pushing changes to Google Sheets Gateway...');
    try {
      const response = await fetch(state.sheets.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/plain-text' // Apps Script handles text blocks cleaner
        },
        body: JSON.stringify({ updates: updates })
      });

      const result = await response.json();
      if (result.status === 'error') {
        throw new Error(result.message);
      }

      // Reload sheet values after successful push
      await fetchGoogleSheetData();
      elements.sheetDiffSection.classList.add('hidden');
      alert(`Success: ${result.message}`);
    } catch (error) {
      alert(`Push Failed: ${error.message}`);
    } finally {
      hideLoading();
    }
  }
}

// ==========================================
// GEMINI API UTILITIES
// ==========================================

async function callGeminiAPI(systemInstruction, prompt) {
  const apiKey = state.settings.apiKey;
  const model = state.settings.model;

  if (!apiKey) {
    throw new Error('No API Key configured. Go to settings cogs to enter key.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] }
    })
  });

  if (!response.ok) {
    const errorJson = await response.json();
    throw new Error(errorJson.error?.message || 'API request failed');
  }

  const result = await response.json();
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textResponse) {
    throw new Error('Empty response returned from model.');
  }

  // Strip code fences if returned by LLM
  return cleanJsonResponse(textResponse);
}

function cleanJsonResponse(text) {
  // If response contains ```json or ```, strip it
  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```[a-zA-Z]*/, '').replace(/```$/, '').trim();
  }
  return clean;
}

async function testAPIConnection() {
  const key = elements.apiKeyInput.value.trim();
  const model = elements.modelSelect.value;
  const resultDiv = elements.testResultMsg;

  if (!key) {
    resultDiv.className = 'test-result-msg test-result-error';
    resultDiv.innerText = 'Please enter an API key first.';
    resultDiv.classList.remove('hidden');
    return;
  }

  resultDiv.className = 'test-result-msg';
  resultDiv.innerText = 'Connecting...';
  resultDiv.classList.remove('hidden');

  const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  try {
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hello, respond with word OK.' }] }]
      })
    });

    if (response.ok) {
      resultDiv.className = 'test-result-msg test-result-success';
      resultDiv.innerText = 'Connection Succeeded! API key is valid.';
    } else {
      const err = await response.json();
      throw new Error(err.error?.message || 'Unauthorized');
    }
  } catch (error) {
    resultDiv.className = 'test-result-msg test-result-error';
    resultDiv.innerText = `Connection Failed: ${error.message}`;
  }
}

// ==========================================
// CORE HELPERS
// ==========================================

function showLoading(msg) {
  elements.loadingMsg.innerText = msg;
  elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  elements.loadingOverlay.classList.add('hidden');
}

function getColLetter(colNum) {
  let temp = colNum;
  let letter = "";
  while (temp > 0) {
    let modulo = (temp - 1) % 26;
    letter = String.fromCharCode(65 + modulo) + letter;
    temp = Math.floor((temp - modulo) / 26);
  }
  return letter;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
