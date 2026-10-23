/* global heic2any */

const state = {
  files: [],
  format: 'jpeg',
  quality: 0.92,
  outputDirectory: null,
  converting: false,
};

const elements = {
  dropZone: document.querySelector('#dropZone'),
  fileInput: document.querySelector('#fileInput'),
  queueSection: document.querySelector('#queueSection'),
  fileList: document.querySelector('#fileList'),
  queueSummary: document.querySelector('#queueSummary'),
  statusMessage: document.querySelector('#statusMessage'),
  convertButton: document.querySelector('#convertButton'),
  convertCount: document.querySelector('#convertCount'),
  addButton: document.querySelector('#addButton'),
  clearButton: document.querySelector('#clearButton'),
  outputButton: document.querySelector('#outputButton'),
  outputLabel: document.querySelector('#outputLabel'),
  quality: document.querySelector('#quality'),
  qualityValue: document.querySelector('#qualityValue'),
  openFolderButton: document.querySelector('#openFolderButton'),
  toast: document.querySelector('#toast'),
};

let toastTimer;

function showToast(message, type = '') {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.className = `toast visible ${type}`.trim();
  toastTimer = window.setTimeout(() => {
    elements.toast.className = 'toast';
  }, 3200);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** index);
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function isHeicFile(file) {
  return /\.(heic|heif)$/i.test(file.name) || ['image/heic', 'image/heif'].includes(file.type);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function stateLabel(item) {
  const labels = {
    pending: '待轉換',
    converting: '轉換中…',
    completed: item.outputPaths?.length > 1 ? `完成 ${item.outputPaths.length} 張` : '已完成',
    error: '轉換失敗',
  };
  return labels[item.status] || '待轉換';
}

function render() {
  const pending = state.files.filter((item) => item.status === 'pending' || item.status === 'error').length;
  const completed = state.files.filter((item) => item.status === 'completed').length;
  const failed = state.files.filter((item) => item.status === 'error').length;

  elements.queueSection.hidden = state.files.length === 0;
  elements.queueSummary.textContent = `${state.files.length} 個檔案${completed ? ` · ${completed} 個完成` : ''}${failed ? ` · ${failed} 個失敗` : ''}`;
  elements.convertCount.textContent = String(pending);
  elements.convertButton.disabled = state.converting || pending === 0;
  elements.clearButton.disabled = state.converting;
  elements.addButton.disabled = state.converting;
  elements.outputButton.disabled = state.converting;
  elements.openFolderButton.hidden = !state.outputDirectory || completed === 0;

  const buttonLabel = elements.convertButton.querySelector('.button-label');
  buttonLabel.textContent = state.converting ? '正在轉換' : '開始轉換';
  const existingSpinner = elements.convertButton.querySelector('.spinner');
  if (state.converting && !existingSpinner) {
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    elements.convertButton.prepend(spinner);
  } else if (!state.converting && existingSpinner) {
    existingSpinner.remove();
  }

  elements.fileList.innerHTML = state.files.map((item) => `
    <article class="file-row" data-id="${item.id}" title="${escapeHtml(item.error || item.name)}">
      <div class="thumbnail">
        ${item.previewUrl
          ? `<img src="${item.previewUrl}" alt="" />`
          : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h10l4 4v14H5zM15 3v5h4M8 16l3-4 2 2 2-3 2 5z" /></svg>'}
      </div>
      <div class="file-info">
        <p class="file-name">${escapeHtml(item.name)}</p>
        <p class="file-meta">${formatBytes(item.size)}${item.outputPaths?.[0] ? ` · ${escapeHtml(item.outputPaths[item.outputPaths.length - 1].split(/[\\/]/).pop())}` : ''}</p>
      </div>
      <span class="file-state ${item.status}">${stateLabel(item)}</span>
      <button class="row-button" type="button" data-action="${item.status === 'completed' ? 'show' : 'remove'}" aria-label="${item.status === 'completed' ? '顯示輸出檔案' : '移除此檔案'}">
        ${item.status === 'completed'
          ? '<svg viewBox="0 0 24 24"><path d="M4 5h6l2 2h8v11H4zM9 13h6m0 0-2-2m2 2-2 2" /></svg>'
          : '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>'}
      </button>
    </article>
  `).join('');
}

function addFiles(fileList) {
  if (state.converting) return;
  const incoming = Array.from(fileList);
  const accepted = incoming.filter(isHeicFile);
  const rejectedCount = incoming.length - accepted.length;
  const existingKeys = new Set(state.files.map((item) => item.key));

  for (const file of accepted) {
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    state.files.push({
      id: crypto.randomUUID(),
      key,
      file,
      name: file.name,
      size: file.size,
      status: 'pending',
      previewUrl: null,
      outputPaths: [],
      error: null,
    });
  }

  if (rejectedCount) showToast(`略過 ${rejectedCount} 個非 HEIC / HEIF 檔案。`, 'error');
  if (accepted.length && state.files.length) elements.queueSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  elements.fileInput.value = '';
  render();
}

function removeFile(id) {
  const item = state.files.find((candidate) => candidate.id === id);
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
  state.files = state.files.filter((candidate) => candidate.id !== id);
  render();
}

function clearFiles() {
  if (state.converting) return;
  state.files.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
  state.files = [];
  elements.statusMessage.textContent = '準備好了，選好就可以開始。';
  elements.statusMessage.classList.remove('error');
  render();
}

async function chooseOutputDirectory() {
  const directory = await window.desktop.selectOutputDirectory();
  if (!directory) return null;
  state.outputDirectory = directory;
  elements.outputLabel.textContent = directory;
  elements.outputButton.title = directory;
  render();
  return directory;
}

function outputName(originalName, format, frameIndex, frameCount) {
  const extension = format === 'jpeg' ? 'jpg' : 'png';
  const stem = originalName.replace(/\.(heic|heif)$/i, '');
  const frameSuffix = frameCount > 1 ? `_${String(frameIndex + 1).padStart(2, '0')}` : '';
  return `${stem}${frameSuffix}.${extension}`;
}

function resetFinishedItems() {
  state.files.forEach((item) => {
    if (item.status === 'completed' || item.status === 'error') {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      item.previewUrl = null;
      item.status = 'pending';
      item.outputPaths = [];
      item.error = null;
    }
  });
}

async function convertAll() {
  if (state.converting) return;
  const pending = state.files.filter((item) => item.status === 'pending' || item.status === 'error');
  if (!pending.length) return;

  const directory = state.outputDirectory || await chooseOutputDirectory();
  if (!directory) return;

  state.converting = true;
  elements.statusMessage.classList.remove('error');
  render();

  let successCount = 0;
  let failureCount = 0;

  for (let index = 0; index < pending.length; index += 1) {
    const item = pending[index];
    item.status = 'converting';
    elements.statusMessage.textContent = `正在處理 ${index + 1} / ${pending.length}：${item.name}`;
    render();

    try {
      const result = await heic2any({
        blob: item.file,
        toType: `image/${state.format}`,
        quality: state.format === 'jpeg' ? state.quality : 1,
        multiple: true,
      });
      const blobs = Array.isArray(result) ? result : [result];

      if (!blobs.length) throw new Error('轉換引擎沒有產生圖片。');

      item.outputPaths = [];
      for (let frameIndex = 0; frameIndex < blobs.length; frameIndex += 1) {
        const blob = blobs[frameIndex];
        const arrayBuffer = await blob.arrayBuffer();
        const savedPath = await window.desktop.saveConverted({
          directory,
          fileName: outputName(item.name, state.format, frameIndex, blobs.length),
          bytes: new Uint8Array(arrayBuffer),
        });
        item.outputPaths.push(savedPath);
      }

      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      item.previewUrl = URL.createObjectURL(blobs[0]);
      item.status = 'completed';
      successCount += 1;
    } catch (error) {
      console.error('HEIC conversion failed:', error);
      item.status = 'error';
      item.error = error?.message || '未知錯誤';
      failureCount += 1;
    }

    render();
  }

  state.converting = false;
  elements.statusMessage.textContent = failureCount
    ? `完成 ${successCount} 個，失敗 ${failureCount} 個。把游標停在失敗項目上可查看原因。`
    : `完成！${successCount} 個檔案已存進所選資料夾。`;
  elements.statusMessage.classList.toggle('error', failureCount > 0);
  render();

  showToast(failureCount ? `完成 ${successCount} 個，${failureCount} 個失敗。` : `轉換完成，共 ${successCount} 個檔案。`, failureCount ? 'error' : '');
}

document.querySelectorAll('.format-button').forEach((button) => {
  button.addEventListener('click', () => {
    if (state.converting) return;
    state.format = button.dataset.format;
    document.querySelectorAll('.format-button').forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle('active', active);
      candidate.setAttribute('aria-checked', String(active));
    });
    elements.quality.disabled = state.format !== 'jpeg';

    resetFinishedItems();
    render();
  });
});

elements.quality.addEventListener('input', () => {
  state.quality = Number(elements.quality.value) / 100;
  elements.qualityValue.textContent = `${elements.quality.value}%`;
  resetFinishedItems();
  render();
});

elements.dropZone.addEventListener('click', () => elements.fileInput.click());
elements.dropZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    elements.fileInput.click();
  }
});
elements.fileInput.addEventListener('change', () => addFiles(elements.fileInput.files));
elements.addButton.addEventListener('click', () => elements.fileInput.click());
elements.clearButton.addEventListener('click', clearFiles);
elements.outputButton.addEventListener('click', chooseOutputDirectory);
elements.convertButton.addEventListener('click', convertAll);
elements.openFolderButton.addEventListener('click', () => {
  if (state.outputDirectory) window.desktop.openDirectory(state.outputDirectory);
});

['dragenter', 'dragover'].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add('dragging');
  });
});
['dragleave', 'drop'].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove('dragging');
  });
});
elements.dropZone.addEventListener('drop', (event) => addFiles(event.dataTransfer.files));

elements.fileList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  const row = event.target.closest('[data-id]');
  if (!button || !row || state.converting) return;
  const item = state.files.find((candidate) => candidate.id === row.dataset.id);
  if (!item) return;

  if (button.dataset.action === 'show' && item.outputPaths?.[0]) {
    window.desktop.showItem(item.outputPaths[0]);
  } else {
    removeFile(item.id);
  }
});

window.addEventListener('beforeunload', () => {
  state.files.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
});

render();
