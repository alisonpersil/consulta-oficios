/**
 * Sistema de Consulta de Ofícios - Frontend Logic
 * Estilo ChatGPT / OpenAI Interface
 */

// Application State
const state = {
    allDocuments: [],
    filteredDocuments: [],
    searchTerm: '',
    activeFilterChip: 'all',
    currentSort: 'mtime_desc',
    currentView: 'cards', // 'cards' | 'table'
    activeModalDoc: null
};

// DOM Elements
const searchInput = document.getElementById('searchInput');
const btnClearSearch = document.getElementById('btnClearSearch');
const btnSearchSubmit = document.getElementById('btnSearchSubmit');
const filterChips = document.querySelectorAll('.chip');
const sortSelect = document.getElementById('sortSelect');
const btnViewCards = document.getElementById('btnViewCards');
const btnViewList = document.getElementById('btnViewList');
const resultsCounter = document.getElementById('resultsCounter');
const activeFilterTag = document.getElementById('activeFilterTag');
const activeFilterText = document.getElementById('activeFilterText');
const btnRemoveFilter = document.getElementById('btnRemoveFilter');

const documentsCardsContainer = document.getElementById('documentsCardsContainer');
const documentsTableContainer = document.getElementById('documentsTableContainer');
const documentsTableBody = document.getElementById('documentsTableBody');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const btnClearSearchEmpty = document.getElementById('btnClearSearchEmpty');

const btnRefresh = document.getElementById('btnRefresh');
const btnThemeToggle = document.getElementById('btnThemeToggle');
const headerDocCount = document.getElementById('headerDocCount');

// Modal Elements
const previewModal = document.getElementById('previewModal');
const modalDocTitle = document.getElementById('modalDocTitle');
const modalDocMeta = document.getElementById('modalDocMeta');
const pdfViewerFrame = document.getElementById('pdfViewerFrame');
const modalLoading = document.getElementById('modalLoading');
const btnModalClose = document.getElementById('btnModalClose');
const btnModalOpenFolder = document.getElementById('btnModalOpenFolder');
const btnModalDownload = document.getElementById('btnModalDownload');
const btnModalNewTab = document.getElementById('btnModalNewTab');
const toastContainer = document.getElementById('toastContainer');

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadDocuments();
    setupEventListeners();
});

// ==========================================================================
// Event Listeners Setup
// ==========================================================================
function setupEventListeners() {
    // Real-time Search Input
    searchInput.addEventListener('input', (e) => {
        state.searchTerm = e.target.value.trim();
        toggleClearButton();
        applyFiltersAndRender();
    });

    // Clear Search Button
    btnClearSearch.addEventListener('click', () => {
        clearSearch();
    });

    if (btnClearSearchEmpty) {
        btnClearSearchEmpty.addEventListener('click', () => {
            clearSearch();
        });
    }

    // Submit / Enter Key
    btnSearchSubmit.addEventListener('click', () => {
        scrollToResults();
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            scrollToResults();
        }
    });

    // Keyboard Shortcut Ctrl+K to focus search, Esc to clear / close modal
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        } else if (e.key === 'Escape') {
            if (!previewModal.classList.contains('hidden')) {
                closeModal();
            } else if (searchInput.value) {
                clearSearch();
            }
        }
    });

    // Filter Chips
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.activeFilterChip = chip.dataset.filter;
            applyFiltersAndRender();
        });
    });

    // Remove active filter badge
    btnRemoveFilter.addEventListener('click', () => {
        const allChip = document.querySelector('.chip[data-filter="all"]');
        if (allChip) allChip.click();
    });

    // Sort Dropdown
    sortSelect.addEventListener('change', (e) => {
        state.currentSort = e.target.value;
        applyFiltersAndRender();
    });

    // View Toggle
    btnViewCards.addEventListener('click', () => {
        setViewMode('cards');
    });

    btnViewList.addEventListener('click', () => {
        setViewMode('table');
    });

    // Refresh Documents Button
    btnRefresh.addEventListener('click', () => {
        btnRefresh.querySelector('i').classList.add('fa-spin');
        loadDocuments().then(() => {
            setTimeout(() => {
                btnRefresh.querySelector('i').classList.remove('fa-spin');
                showToast('Lista de ofícios atualizada com sucesso!', 'success');
            }, 400);
        });
    });

    // Theme Toggle
    btnThemeToggle.addEventListener('click', toggleTheme);

    // Modal Events
    btnModalClose.addEventListener('click', closeModal);
    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) {
            closeModal();
        }
    });

    pdfViewerFrame.addEventListener('load', () => {
        modalLoading.classList.add('hidden');
    });

    btnModalOpenFolder.addEventListener('click', () => {
        if (state.activeModalDoc) {
            openInFolder(state.activeModalDoc);
        }
    });

    btnModalDownload.addEventListener('click', () => {
        if (state.activeModalDoc) {
            downloadDocument(state.activeModalDoc);
        }
    });
}

// ==========================================================================
// Data Fetching & API
// ==========================================================================
async function loadDocuments() {
    loadingState.classList.remove('hidden');
    documentsCardsContainer.classList.add('hidden');
    documentsTableContainer.classList.add('hidden');
    emptyState.classList.add('hidden');

    try {
        const response = await fetch('/api/oficios');
        const data = await response.json();

        if (data.success && Array.isArray(data.documents)) {
            state.allDocuments = data.documents;
            headerDocCount.textContent = `${data.count} documentos`;
            applyFiltersAndRender();
        } else {
            showToast('Erro ao carregar lista de ofícios', 'error');
        }
    } catch (error) {
        console.error('Erro ao buscar documentos:', error);
        showToast('Não foi possível conectar ao servidor local', 'error');
    } finally {
        loadingState.classList.add('hidden');
    }
}

// Open file in Windows Explorer
async function openInFolder(doc) {
    showToast(`Localizando "${doc.name}" no Windows Explorer...`, 'info');
    try {
        const response = await fetch('/api/open-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ relative_path: doc.relative_path, full_path: doc.full_path })
        });
        const data = await response.json();
        if (data.success) {
            showToast(data.message || 'Arquivo aberto no Explorador!', 'success');
        } else {
            showToast(data.message || 'Erro ao abrir pasta.', 'error');
        }
    } catch (error) {
        console.error('Erro na requisição open-folder:', error);
        showToast('Falha ao comunicar com o Explorador do Windows', 'error');
    }
}

// Download file
function downloadDocument(doc) {
    showToast(`Iniciando download de "${doc.name}"...`, 'info');
    const downloadUrl = `/api/pdf/download/${encodeURIComponent(doc.relative_path)}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ==========================================================================
// Filtering & Sorting Logic
// ==========================================================================
function normalizeText(text) {
    if (!text) return '';
    return text.toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function applyFiltersAndRender() {
    let result = [...state.allDocuments];
    const searchNormalized = normalizeText(state.searchTerm);
    const searchTokens = searchNormalized.split(/\s+/).filter(t => t.length > 0);

    // 1. Text Search Filter (matches all tokens against filename or category)
    if (searchTokens.length > 0) {
        result = result.filter(doc => {
            const docNameNormalized = normalizeText(doc.name);
            const docCategoryNormalized = normalizeText(doc.category);
            return searchTokens.every(token => 
                docNameNormalized.includes(token) || 
                docCategoryNormalized.includes(token)
            );
        });
    }

    // 2. Chip Filter
    if (state.activeFilterChip && state.activeFilterChip !== 'all') {
        const filterKey = state.activeFilterChip;
        result = result.filter(doc => {
            const nameNorm = normalizeText(doc.name);
            const catNorm = normalizeText(doc.category);
            if (filterKey === '2024') return nameNorm.includes('2024') || doc.year === '2024';
            if (filterKey === '2023') return nameNorm.includes('2023') || doc.year === '2023';
            if (filterKey === 'videomonitoramento') return nameNorm.includes('videomonitoramento') || nameNorm.includes('camera') || nameNorm.includes('câmera');
            if (filterKey === 'garantia') return nameNorm.includes('garantia');
            if (filterKey === 'iluminacao') return nameNorm.includes('ilumina');
            if (filterKey === 'relatorio') return nameNorm.includes('relat') || catNorm.includes('relat');
            if (filterKey === 'anexo') return nameNorm.includes('anexo') || catNorm.includes('anexo');
            return true;
        });

        // Update active filter pill in toolbar
        activeFilterTag.classList.remove('hidden');
        activeFilterText.textContent = getFilterLabel(filterKey);
    } else {
        activeFilterTag.classList.add('hidden');
    }

    // 3. Sorting
    result.sort((a, b) => {
        switch (state.currentSort) {
            case 'name_asc':
                return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
            case 'name_desc':
                return b.name.localeCompare(a.name, 'pt-BR', { sensitivity: 'base' });
            case 'ctime_desc':
                return b.ctime - a.ctime;
            case 'ctime_asc':
                return a.ctime - b.ctime;
            case 'mtime_desc':
                return b.mtime - a.mtime;
            case 'mtime_asc':
                return a.mtime - b.mtime;
            case 'size_desc':
                return b.size_bytes - a.size_bytes;
            case 'size_asc':
                return a.size_bytes - b.size_bytes;
            default:
                return b.mtime - a.mtime;
        }
    });

    state.filteredDocuments = result;
    renderResults();
}

function getFilterLabel(filterKey) {
    const chip = document.querySelector(`.chip[data-filter="${filterKey}"]`);
    return chip ? chip.textContent.trim() : filterKey;
}

// ==========================================================================
// Rendering Results
// ==========================================================================
function renderResults() {
    const total = state.allDocuments.length;
    const count = state.filteredDocuments.length;

    // Counter label
    resultsCounter.innerHTML = `Exibindo <strong>${count}</strong> de <strong>${total}</strong> ofícios`;

    // Handle empty state
    if (count === 0) {
        documentsCardsContainer.classList.add('hidden');
        documentsTableContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    if (state.currentView === 'cards') {
        renderCardsView();
        documentsCardsContainer.classList.remove('hidden');
        documentsTableContainer.classList.add('hidden');
    } else {
        renderTableView();
        documentsTableContainer.classList.remove('hidden');
        documentsCardsContainer.classList.add('hidden');
    }
}

// Highlight matched search tokens in text
function highlightText(text, searchStr) {
    if (!searchStr || !searchStr.trim()) return escapeHtml(text);
    const tokens = searchStr.trim().split(/\s+/).filter(t => t.length > 0);
    if (!tokens.length) return escapeHtml(text);

    // Escape special regex characters in tokens
    const escapedTokens = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');

    return escapeHtml(text).replace(regex, '<span class="highlight-term">$1</span>');
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Render Cards View
function renderCardsView() {
    documentsCardsContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    state.filteredDocuments.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'doc-card';

        const fileIconClass = doc.is_pdf ? 'fa-solid fa-file-pdf' : 'fa-solid fa-file-lines';
        const highlightedTitle = highlightText(doc.name, state.searchTerm);

        card.innerHTML = `
            <div>
                <div class="doc-card-header">
                    <div class="doc-icon-wrapper">
                        <i class="${fileIconClass}"></i>
                    </div>
                    <div class="doc-card-title-group">
                        <div class="doc-badges">
                            ${doc.year ? `<span class="doc-badge year">${doc.year}</span>` : ''}
                            <span class="doc-badge category">${escapeHtml(doc.category)}</span>
                        </div>
                        <h4 class="doc-title" title="${escapeHtml(doc.name)}">${highlightedTitle}</h4>
                    </div>
                </div>

                <div class="doc-metadata-panel">
                    <div class="meta-item">
                        <span class="meta-label"><i class="fa-regular fa-clock"></i> Modificação</span>
                        <span class="meta-value">${doc.mtime_formatted}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label"><i class="fa-regular fa-calendar-plus"></i> Criação</span>
                        <span class="meta-value">${doc.ctime_formatted}</span>
                    </div>
                    <div class="meta-item full-width">
                        <span class="meta-label"><i class="fa-solid fa-hard-drive"></i> Tamanho do Arquivo</span>
                        <span class="meta-value">${doc.size_formatted}</span>
                    </div>
                </div>
            </div>

            <div class="doc-card-actions">
                <button class="btn-card-action btn-preview" title="Pré-visualizar documento">
                    <i class="fa-regular fa-eye"></i>
                    <span>Visualizar</span>
                </button>
                <button class="btn-card-action btn-download" title="Baixar arquivo">
                    <i class="fa-solid fa-download"></i>
                    <span>Baixar</span>
                </button>
                <button class="btn-card-action btn-folder" title="Abrir pasta no Windows Explorer">
                    <i class="fa-solid fa-folder-open"></i>
                    <span>Ver na Pasta</span>
                </button>
            </div>
        `;

        // Action bindings
        card.querySelector('.btn-preview').addEventListener('click', () => openPreviewModal(doc));
        card.querySelector('.doc-title').addEventListener('click', () => openPreviewModal(doc));
        card.querySelector('.btn-download').addEventListener('click', () => downloadDocument(doc));
        card.querySelector('.btn-folder').addEventListener('click', () => openInFolder(doc));

        fragment.appendChild(card);
    });

    documentsCardsContainer.appendChild(fragment);
}

// Render Table View
function renderTableView() {
    documentsTableBody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    state.filteredDocuments.forEach(doc => {
        const tr = document.createElement('tr');
        const fileIconClass = doc.is_pdf ? 'fa-solid fa-file-pdf' : 'fa-solid fa-file-lines';
        const highlightedTitle = highlightText(doc.name, state.searchTerm);

        tr.innerHTML = `
            <td>
                <div class="table-doc-title-cell">
                    <i class="${fileIconClass} table-doc-icon"></i>
                    <div>
                        <span class="table-doc-title" title="${escapeHtml(doc.name)}">${highlightedTitle}</span>
                        <div class="doc-badges" style="margin-top: 3px;">
                            ${doc.year ? `<span class="doc-badge year" style="font-size: 0.65rem;">${doc.year}</span>` : ''}
                            <span class="doc-badge category" style="font-size: 0.65rem;">${escapeHtml(doc.category)}</span>
                        </div>
                    </div>
                </div>
            </td>
            <td><strong>${doc.mtime_formatted}</strong></td>
            <td>${doc.ctime_formatted}</td>
            <td>${doc.size_formatted}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-table-action primary btn-table-preview" title="Visualizar documento">
                        <i class="fa-regular fa-eye"></i>
                    </button>
                    <button class="btn-table-action btn-table-download" title="Baixar arquivo">
                        <i class="fa-solid fa-download"></i>
                    </button>
                    <button class="btn-table-action btn-table-folder" title="Ver na pasta (Windows Explorer)">
                        <i class="fa-solid fa-folder-open"></i>
                    </button>
                </div>
            </td>
        `;

        tr.querySelector('.btn-table-preview').addEventListener('click', () => openPreviewModal(doc));
        tr.querySelector('.table-doc-title').addEventListener('click', () => openPreviewModal(doc));
        tr.querySelector('.btn-table-download').addEventListener('click', () => downloadDocument(doc));
        tr.querySelector('.btn-table-folder').addEventListener('click', () => openInFolder(doc));

        fragment.appendChild(tr);
    });

    documentsTableBody.appendChild(fragment);
}

// ==========================================================================
// Preview Modal Handling
// ==========================================================================
function openPreviewModal(doc) {
    state.activeModalDoc = doc;

    modalDocTitle.textContent = doc.name;
    modalDocTitle.title = doc.name;
    modalDocMeta.innerHTML = `
        <span><i class="fa-regular fa-clock"></i> Modificado: ${doc.mtime_formatted}</span>
        <span>&bull;</span>
        <span><i class="fa-regular fa-calendar-plus"></i> Criado: ${doc.ctime_formatted}</span>
        <span>&bull;</span>
        <span><i class="fa-solid fa-hard-drive"></i> ${doc.size_formatted}</span>
    `;

    const previewUrl = `/api/pdf/preview/${encodeURIComponent(doc.relative_path)}`;
    btnModalNewTab.href = previewUrl;

    modalLoading.classList.remove('hidden');
    pdfViewerFrame.src = previewUrl;

    previewModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    previewModal.classList.add('hidden');
    pdfViewerFrame.src = '';
    state.activeModalDoc = null;
    document.body.style.overflow = '';
}

// ==========================================================================
// UI Helpers & Utilities
// ==========================================================================
function clearSearch() {
    searchInput.value = '';
    state.searchTerm = '';
    toggleClearButton();
    applyFiltersAndRender();
    searchInput.focus();
}

function toggleClearButton() {
    if (searchInput.value.length > 0) {
        btnClearSearch.classList.remove('hidden');
    } else {
        btnClearSearch.classList.add('hidden');
    }
}

function scrollToResults() {
    const toolbar = document.querySelector('.results-toolbar');
    if (toolbar) {
        toolbar.scrollIntoView({ behavior: 'smooth' });
    }
}

function setViewMode(mode) {
    state.currentView = mode;
    if (mode === 'cards') {
        btnViewCards.classList.add('active');
        btnViewList.classList.remove('active');
    } else {
        btnViewList.classList.add('active');
        btnViewCards.classList.remove('active');
    }
    renderResults();
}

// Theme handling
function initTheme() {
    const savedTheme = localStorage.getItem('pmo_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('pmo_theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = btnThemeToggle.querySelector('i');
    if (theme === 'light') {
        icon.className = 'fa-solid fa-sun';
    } else {
        icon.className = 'fa-solid fa-moon';
    }
}

// Toast Notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconClass = 'fa-solid fa-circle-check';
    if (type === 'info') iconClass = 'fa-solid fa-circle-info';
    if (type === 'error') iconClass = 'fa-solid fa-triangle-exclamation';

    toast.innerHTML = `
        <div class="toast-icon"><i class="${iconClass}"></i></div>
        <div class="toast-message">${escapeHtml(message)}</div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
