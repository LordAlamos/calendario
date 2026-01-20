// Dados globais
const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

let currentDate = new Date();
let currentDayData = { year: null, month: null, day: null };
let selectedFiles = [];
let savedContentData = {};
let contentToDelete = null;
let currentImageSrc = null;
let savingInProgress = false;
let contentCounter = 0;
let allMonthsData = {};
let isPageLoading = false;

// Controle de navegação e carregamento
let loadingQueue = new Set();
let loadedMonths = new Set();

// URL do backend
const API_URL = 'http://localhost:3000';

// Elementos do DOM
let fileInput, mediaPreview, loadingIndicator, progressFill;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    loadFromStorage();
    normalizeStoredData();
    generateDays();
    
    // Carregar eventos do backend também
    carregarEventosDoBackend();
    
    setTimeout(() => {
        isPageLoading = false;
    }, 1000);
});

function initializeElements() {
    fileInput = document.getElementById('file-input');
    mediaPreview = document.getElementById('media-preview');
    loadingIndicator = document.getElementById('loading');
    progressFill = document.getElementById('progress-fill');
    
    // Event listeners
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            selectedFiles = Array.from(e.target.files);
            updateMediaPreview();
        });
    }
}

// ==================== CONTROLE DE CARREGAMENTO ====================

function getMonthKey(year, month) {
    return `${year}-${month}`;
}

function isMonthLoaded(year, month) {
    return loadedMonths.has(getMonthKey(year, month));
}

function markMonthAsLoaded(year, month) {
    loadedMonths.add(getMonthKey(year, month));
}

function isMonthLoading(year, month) {
    return loadingQueue.has(getMonthKey(year, month));
}

function addToLoadingQueue(year, month) {
    loadingQueue.add(getMonthKey(year, month));
}

function removeFromLoadingQueue(year, month) {
    loadingQueue.delete(getMonthKey(year, month));
}

// ==================== INTEGRAÇÃO COM BACKEND ====================

async function carregarEventosDoBackend() {
    try {
        const response = await fetch(`${API_URL}/api/events`);
        if (response.ok) {
            const eventos = await response.json();
            console.log('Eventos carregados do backend:', eventos);
        }
    } catch (error) {
        console.log('Backend não disponível ou sem eventos:', error);
    }
}

async function carregarEventosDoBackendPorPeriodo(ano, mes) {
    try {
        console.log(`Carregando eventos do backend para ${mes}/${ano}...`);
        
        const response = await fetch(`${API_URL}/api/events`);
        if (response.ok) {
            const eventos = await response.json();
            console.log(`Encontrados ${eventos.length} eventos no backend para ${mes}/${ano}`);
            return eventos;
        }
    } catch (error) {
        console.log('Erro ao carregar eventos do backend:', error);
    }
    return [];
}

function converterEventoParaContentBox(evento) {
    const contentId = `backend_${evento.id}`;
    
    savedContentData[contentId] = {
        title: evento.title,
        statusText: 'Do Backend',
        statusColor: '#007acc',
        formato: 'Estático',
        legenda: evento.description || '',
        images: evento.imageUrl ? [`${API_URL}${evento.imageUrl}`] : [],
        createdAt: evento.createdAt,
        fromBackend: true
    };

    let contentHTML = `
        <div class="content-title">${evento.title || 'Evento do Backend'}</div>
        <div class="content-status" style="color:#007acc">Do Backend</div>
    `;

    if (evento.imageUrl) {
        contentHTML += '<div class="content-images">';
        contentHTML += `<img src="${API_URL}${evento.imageUrl}" class="content-image" loading="lazy">`;
        contentHTML += '</div>';
    }

    contentHTML += `<div class="content-caption">${evento.description || ''}</div>`;
    contentHTML += `<button class="view-button">Ver</button>`;
    contentHTML += `<button class="delete-button" aria-label="Remover post-it">✕</button>`;
    
    return {
        html: `<div class="content-box" data-content-id="${contentId}">${contentHTML}</div>`,
        id: contentId
    };
}

async function salvarEventoNoBackend(evento) {
    try {
        const response = await fetch(`${API_URL}/api/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(evento)
        });
        
        if (response.ok) {
            const eventoSalvo = await response.json();
            console.log('Evento salvo no backend:', eventoSalvo);
            return eventoSalvo;
        }
    } catch (error) {
        console.log('Erro ao salvar no backend (continuando localmente):', error);
    }
    return null;
}

async function uploadImagemNoBackend(file) {
    try {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch(`${API_URL}/api/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Imagem salva no backend:', result.image.url);
            return {
                url: `${API_URL}${result.image.url}`,
                id: result.image.id
            };
        } else {
            const error = await response.json();
            console.log('Erro no upload:', error);
        }
    } catch (error) {
        console.log('Erro no upload para backend:', error);
    }
    return null;
}

// Função principal para carregar eventos e manter dados existentes
async function carregarEventosEDesenharnoCalendario(year, month) {
    const monthKey = getMonthKey(year, month);
    
    // Se já está carregado, apenas atualiza a visualização
    if (isMonthLoaded(year, month)) {
        updateMonthDisplay(year, month);
        return;
    }
    
    // Se já está carregando, aguarda
    if (isMonthLoading(year, month)) {
        return;
    }
    
    // Marca como carregando
    addToLoadingQueue(year, month);
    
    try {
        // Primeiro atualiza a exibição dos dias (sem limpar dados)
        updateMonthDisplay(year, month);
        
        // Depois carrega eventos do backend
        const eventosBackend = await carregarEventosDoBackendPorPeriodo(year, month);
        if (eventosBackend && eventosBackend.length > 0) {
            // Filtrar eventos deste mês específico
            const eventosDesteMes = eventosBackend.filter(evento => {
                if (!evento.date) return false;
                const eventoDate = new Date(evento.date);
                return eventoDate.getFullYear() === year && 
                       eventoDate.getMonth() + 1 === month;
            });
            
            // Adicionar cada evento ao calendário
            eventosDesteMes.forEach(evento => {
                const eventoDate = new Date(evento.date);
                const day = eventoDate.getDate();
                const containerId = `content-${year}-${month}-${day}`;
                const container = document.getElementById(containerId);
                
                if (container) {
                    // Converter evento para content box
                    const contentItem = converterEventoParaContentBox(evento);
                    
                    // Adicionar ao sistema local
                    const dayKey = `${year}-${month}-${day}`;
                    if (!allMonthsData[dayKey]) {
                        allMonthsData[dayKey] = [];
                    }
                    
                    // Evitar duplicatas
                    const existe = allMonthsData[dayKey].some(item => item.id === contentItem.id);
                    if (!existe) {
                        allMonthsData[dayKey].push(contentItem);
                        
                        // Adicionar ao DOM imediatamente
                        addContentToDay(container, contentItem);
                    }
                }
            });
        }
        
        // Marca como carregado
        markMonthAsLoaded(year, month);
        
    } catch (error) {
        console.log('Erro ao carregar eventos do backend:', error);
    } finally {
        removeFromLoadingQueue(year, month);
    }
}

// Função para atualizar apenas a exibição do mês (sem limpar dados)
function updateMonthDisplay(year, month) {
    const container = document.getElementById("days-container");
    if (!container) return;

    // Limpa apenas a exibição, mantém os dados
    container.innerHTML = "";

    // Atualizar display do mês
    const monthDisplay = document.getElementById("current-month-year");
    if (monthDisplay) {
        monthDisplay.textContent = `${months[month - 1]} ${year}`;
    }

    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const weekdayIndex = new Date(year, month - 1, day).getDay();
        const weekday = weekdays[weekdayIndex];

        const dayCard = document.createElement("div");
        dayCard.className = "day-card";
        dayCard.id = `day-card-${year}-${month}-${day}`;
        dayCard.innerHTML = `
            <div class="day-header">
                <span>${day}</span>
                <span>${weekday}</span>
            </div>
            <div class="new-post" id="new-post-${year}-${month}-${day}">(new post)</div>
            <div class="content-container" id="content-${year}-${month}-${day}"></div>
        `;
        
        dayCard.addEventListener('click', function(e) {
            if (e.target.closest('.content-box') || 
                e.target.closest('.view-button') || 
                e.target.closest('.delete-button') ||
                e.target.tagName === 'IMG') return;
            openModal(day, year, month - 1);
        });
        
        container.appendChild(dayCard);
    }
    
    // Preencher com dados existentes
    setTimeout(() => fillMonthWithData(year, month), 50);
}

// Função para preencher mês com dados existentes
function fillMonthWithData(year, month) {
    for (let day = 1; day <= 31; day++) {
        const containerId = `content-${year}-${month}-${day}`;
        const container = document.getElementById(containerId);
        if (!container) continue;

        const dayKey = `${year}-${month}-${day}`;
        const dayData = allMonthsData[dayKey];

        if (dayData && dayData.length > 0) {
            const dayCard = container.closest('.day-card');
            if (dayCard) {
                const newPostElement = dayCard.querySelector('.new-post');
                if (newPostElement) {
                    newPostElement.remove();
                }
            }

            dayData.forEach(contentItem => {
                addContentToDay(container, contentItem);
            });
        } else {
            ensureNewPostElement(container, year, month, day);
        }
    }
}

function recarregarDadosDoMes(ano, mes) {
    // Remover do cache de meses carregados
    loadedMonths.delete(getMonthKey(ano, mes));
    
    // Recarregar dados do backend
    carregarEventosEDesenharnoCalendario(ano, mes);
}

function recarregarDadosAtuais() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    recarregarDadosDoMes(year, month);
}

// ==================== FUNÇÕES EXISTENTES ====================

function readImageAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function updateMediaPreview() {
    if (!mediaPreview) return;
    
    mediaPreview.innerHTML = '';
    selectedFiles.forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'preview-image';
                img.onclick = function() {
                    openImagePreview(e.target.result);
                };
                mediaPreview.appendChild(img);
            };
            reader.readAsDataURL(file);
        }
    });
}

function attachContentInteractions(contentElement, contentId) {
    if (!contentElement) return;

    if (contentElement.getAttribute('data-content-id') !== contentId) {
        contentElement.setAttribute('data-content-id', contentId);
    }

    if (contentElement.hasAttribute('onclick')) {
        contentElement.removeAttribute('onclick');
    }

    const elementsWithOnclick = contentElement.querySelectorAll('[onclick]');
    elementsWithOnclick.forEach(el => el.removeAttribute('onclick'));

    const viewButtons = contentElement.querySelectorAll('.view-button');
    viewButtons.forEach(btn => {
        btn.onclick = function(e) {
            e.stopPropagation();
            viewContentById(contentId);
        };
    });

    const deleteButtons = contentElement.querySelectorAll('.delete-button');
    deleteButtons.forEach(btn => {
        btn.onclick = function(e) {
            e.stopPropagation();
            const targetBox = btn.closest('.content-box') || contentElement;
            openConfirmDelete(targetBox);
        };
    });

    const images = contentElement.querySelectorAll('.content-image');
    images.forEach(img => {
        img.onclick = function(e) {
            e.stopPropagation();
            openImagePreview(img.src);
        };
    });
}

function ensureNewPostElement(container, year, month, day) {
    if (!container) return;
    const dayCard = container.closest('.day-card');
    if (!dayCard) return;

    const normalizedYear = Number(year);
    const normalizedMonth = Number(month);
    const normalizedDay = Number(day);

    const newPostId = `new-post-${normalizedYear}-${normalizedMonth}-${normalizedDay}`;
    let newPostElement = document.getElementById(newPostId);

    if (!newPostElement) {
        newPostElement = document.createElement('div');
        newPostElement.className = 'new-post';
        newPostElement.id = newPostId;
        newPostElement.textContent = '(new post)';
        dayCard.insertBefore(newPostElement, container);
    }
}

function normalizeStoredData() {
    if (!allMonthsData || typeof allMonthsData !== 'object') return;

    let dataChanged = false;
    const dayKeys = Object.keys(allMonthsData);

    dayKeys.forEach(dayKey => {
        const entries = Array.isArray(allMonthsData[dayKey]) ? allMonthsData[dayKey] : [];
        const seenIds = new Set();
        const normalizedEntries = [];

        entries.forEach(item => {
            if (!item || !item.id) {
                dataChanged = true;
                return;
            }

            if (seenIds.has(item.id)) {
                dataChanged = true;
                return;
            }

            const template = document.createElement('template');
            template.innerHTML = (item.html || '').trim();

            let contentBox = template.content.querySelector('.content-box');
            if (!contentBox) {
                contentBox = template.content.firstElementChild;
            }

            if (!contentBox) {
                dataChanged = true;
                return;
            }

            let inner = contentBox.querySelector('.content-box');
            while (inner) {
                contentBox = inner;
                inner = contentBox.querySelector('.content-box');
                dataChanged = true;
            }

            if (!contentBox.classList.contains('content-box')) {
                contentBox.classList.add('content-box');
                dataChanged = true;
            }

            if (contentBox.getAttribute('data-content-id') !== item.id) {
                contentBox.setAttribute('data-content-id', item.id);
                dataChanged = true;
            }

            const redundantBoxes = contentBox.querySelectorAll('.content-box');
            if (redundantBoxes.length > 0) {
                redundantBoxes.forEach(node => node.remove());
                dataChanged = true;
            }

            if (contentBox.hasAttribute('onclick') || contentBox.querySelectorAll('[onclick]').length > 0) {
                contentBox.removeAttribute('onclick');
                contentBox.querySelectorAll('[onclick]').forEach(el => el.removeAttribute('onclick'));
                dataChanged = true;
            }

            normalizedEntries.push({
                id: item.id,
                html: contentBox.outerHTML
            });

            seenIds.add(item.id);
        });

        if (normalizedEntries.length > 0) {
            if (normalizedEntries.length !== entries.length) {
                dataChanged = true;
            }
            allMonthsData[dayKey] = normalizedEntries;
        } else {
            if (entries.length > 0) {
                dataChanged = true;
            }
            delete allMonthsData[dayKey];
        }
    });

    if (dataChanged) {
        saveToStorage();
    }
}

// Função modificada - não limpa os containers
function generateDays() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    // Apenas atualiza a exibição
    updateMonthDisplay(year, month);
}

function addContentToDay(container, contentItem) {
    if (!container || !contentItem || !contentItem.html) return;

    if (container.querySelector(`[data-content-id="${contentItem.id}"]`)) {
        return;
    }

    const template = document.createElement('template');
    template.innerHTML = contentItem.html.trim();

    let contentElement = template.content.querySelector('.content-box');
    if (!contentElement) {
        contentElement = template.content.firstElementChild;
    }

    if (!contentElement) return;

    let inner = contentElement.querySelector('.content-box');
    while (inner) {
        contentElement = inner;
        inner = contentElement.querySelector('.content-box');
    }

    const redundant = contentElement.querySelectorAll('.content-box');
    redundant.forEach(node => node.remove());

    attachContentInteractions(contentElement, contentItem.id);

    const dayCard = container.closest('.day-card');
    if (dayCard) {
        const newPostElement = dayCard.querySelector('.new-post');
        if (newPostElement) {
            newPostElement.remove();
        }
    }

    container.appendChild(contentElement);
}

// Funções de Navegação - modificada para não limpar dados
function changeMonth(delta) {
    // Salvar dados atuais antes de mudar
    saveCurrentMonthData();
    
    currentDate.setMonth(currentDate.getMonth() + delta);
    
    // Não limpa os containers - apenas atualiza a exibição
    generateDays();
}

// Resto das funções permanece igual...
function closeModal() {
    if (savingInProgress) return;
    const modal = document.getElementById("modal");
    if (modal) modal.style.display = "none";
}

function closeViewModal() {
    const modal = document.getElementById("view-modal");
    if (modal) modal.style.display = "none";
}

function closeConfirmModal() {
    const modal = document.getElementById("confirm-modal");
    if (modal) modal.style.display = "none";
    contentToDelete = null;
}

function openImagePreview(src) {
    const previewImg = document.getElementById("preview-image");
    const modal = document.getElementById("image-preview-modal");
    
    if (previewImg) previewImg.src = src;
    if (modal) modal.style.display = "flex";
    currentImageSrc = src;
}

function closeImagePreview() {
    const modal = document.getElementById("image-preview-modal");
    if (modal) modal.style.display = "none";
    currentImageSrc = null;
}

function downloadImage(src, filename = 'imagem.jpg') {
    if (src.startsWith(API_URL)) {
        fetch(src)
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            })
            .catch(error => {
                console.error('Erro no download:', error);
                const link = document.createElement('a');
                link.href = src;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
    } else {
        const link = document.createElement('a');
        link.href = src;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function viewContent(contentData) {
    const titleElement = document.getElementById("view-title");
    const statusElement = document.getElementById("view-status");
    const formatElement = document.getElementById("view-format");
    const captionElement = document.getElementById("view-caption");
    const imagesContainer = document.getElementById("view-images");
    const viewModal = document.getElementById("view-modal");
    
    if (titleElement) titleElement.textContent = contentData.title || "Sem título";
    if (statusElement) {
        statusElement.textContent = contentData.statusText;
        statusElement.style.color = contentData.statusColor;
    }
    if (formatElement) formatElement.textContent = contentData.formato || "Estático";
    if (captionElement) captionElement.textContent = contentData.legenda || "Sem legenda";
    
    if (imagesContainer) {
        imagesContainer.innerHTML = "";
        
        if (contentData.images && contentData.images.length > 0) {
            contentData.images.forEach((imageUrl, index) => {
                const imgWrapper = document.createElement('div');
                imgWrapper.style.textAlign = 'center';
                
                const img = document.createElement('img');
                img.src = imageUrl;
                img.className = 'view-content-image-large';
                img.onclick = function() {
                    openImagePreview(imageUrl);
                };
                
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'image-actions';
                
                const openBtn = document.createElement('button');
                openBtn.className = 'image-action-btn';
                openBtn.textContent = 'Abrir';
                openBtn.onclick = function(e) {
                    e.stopPropagation();
                    openImagePreview(imageUrl);
                };
                
                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'image-action-btn download';
                downloadBtn.textContent = 'Baixar';
                downloadBtn.onclick = function(e) {
                    e.stopPropagation();
                    const timestamp = new Date().getTime();
                    const filename = `imagem_${timestamp}_${index + 1}.jpg`;
                    downloadImage(imageUrl, filename);
                };
                
                actionsDiv.appendChild(openBtn);
                actionsDiv.appendChild(downloadBtn);
                
                imgWrapper.appendChild(img);
                imgWrapper.appendChild(actionsDiv);
                imagesContainer.appendChild(imgWrapper);
            });
        } else {
            imagesContainer.innerHTML = "<p>Sem imagens</p>";
        }
    }
    
    if (viewModal) viewModal.style.display = "flex";
}

function openModal(day, year, month) {
    if (savingInProgress) return;
    
    currentDayData = { year, month, day };
    const modal = document.getElementById("modal");
    if (modal) {
        modal.style.display = "flex";
    }

    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateInput = document.getElementById("input-date");
    if (dateInput) {
        dateInput.value = formattedDate;
    }
    
    const tituloInput = document.getElementById("titulo");
    const formatoSelect = document.getElementById("formato");
    const statusSelect = document.getElementById("status");
    const legendaTextarea = document.getElementById("legenda");
    
    if (tituloInput) tituloInput.value = "";
    if (formatoSelect) formatoSelect.value = "Estático";
    if (statusSelect) statusSelect.value = "pendente";
    if (legendaTextarea) legendaTextarea.value = "";
    
    selectedFiles = [];
    if (mediaPreview) mediaPreview.innerHTML = "";
    if (fileInput) fileInput.value = "";
}

function saveChanges() {
    if (savingInProgress) return;
    
    savingInProgress = true;
    if (loadingIndicator) loadingIndicator.style.display = "block";
    if (progressFill) progressFill.style.width = "0%";
    
    const titulo = document.getElementById("titulo")?.value || "";
    const formato = document.getElementById("formato")?.value || "Estático";
    const status = document.getElementById("status")?.value || "pendente";
    const legenda = document.getElementById("legenda")?.value || "";
    
    const { year, month, day } = currentDayData;
    
    if (!year || month === undefined || !day) {
        alert("Erro: data inválida");
        savingInProgress = false;
        if (loadingIndicator) loadingIndicator.style.display = "none";
        return;
    }

    const contentContainerId = `content-${year}-${month+1}-${day}`;
    const contentContainer = document.getElementById(contentContainerId);
    
    if (!contentContainer) {
        alert("Erro: não foi possível encontrar o container do dia");
        savingInProgress = false;
        if (loadingIndicator) loadingIndicator.style.display = "none";
        return;
    }

    processImagesAndSave(titulo, formato, status, legenda, contentContainer);
}

async function processImagesAndSave(titulo, formato, status, legenda, contentContainer) {
    const imageUrlArray = [];
    
    if (selectedFiles.length > 0) {
        try {
            if (progressFill) progressFill.style.width = "20%";
            
            const filesToProcess = selectedFiles.slice(0, 50);
            for (let i = 0; i < filesToProcess.length; i++) {
                const file = filesToProcess[i];
                if (file.type.startsWith('image/')) {
                    const imagemBackend = await uploadImagemNoBackend(file);
                    if (imagemBackend) {
                        imageUrlArray.push(imagemBackend.url);
                    }
                    
                    if (progressFill) {
                        const progress = 20 + (i / filesToProcess.length) * 60;
                        progressFill.style.width = `${progress}%`;
                    }
                }
            }
            
            if (progressFill) progressFill.style.width = "80%";
            createAndSaveContent(titulo, formato, status, legenda, contentContainer, imageUrlArray);
            
        } catch (error) {
            console.error("Erro ao processar imagens:", error);
            savingInProgress = false;
            if (loadingIndicator) loadingIndicator.style.display = "none";
        }
    } else {
        createAndSaveContent(titulo, formato, status, legenda, contentContainer, []);
    }
}

function createAndSaveContent(titulo, formato, status, legenda, contentContainer, imageUrlArray) {
    try {
        const dayCard = contentContainer.parentElement;
        const newPostElement = dayCard.querySelector('[id^="new-post-"]');
        if (newPostElement) {
            newPostElement.remove();
        }

        const contentBox = document.createElement('div');
        contentBox.className = 'content-box';
        
        let statusColor = '';
        let statusText = '';
        switch(status) {
            case 'pendente':
                statusColor = 'orange';
                statusText = 'Pendente';
                break;
            case 'aprovado':
                statusColor = 'green';
                statusText = 'Aprovado';
                break;
            case 'ajustado':
                statusColor = 'purple';
                statusText = 'Ajustado';
                break;
            case 'ajustar':
                statusColor = 'red';
                statusText = 'Ajustar';
                break;
            default:
                statusColor = 'gray';
                statusText = status;
        }

        contentCounter++;
        const contentId = `content_${Date.now()}_${contentCounter}_${Math.random().toString(36).substr(2, 9)}`;
        contentBox.setAttribute('data-content-id', contentId);
        
        savedContentData[contentId] = {
            title: titulo,
            statusText: statusText,
            statusColor: statusColor,
            formato: formato,
            legenda: legenda,
            images: imageUrlArray,
            createdAt: new Date().toISOString()
        };

        let contentHTML = `
            <div class="content-title">${titulo || 'Sem título'}</div>
            <div class="content-status" style="color:${statusColor}">${statusText}</div>
        `;

        if (imageUrlArray.length > 0) {
            contentHTML += '<div class="content-images">';
            imageUrlArray.forEach(imageSrc => {
                contentHTML += `<img src="${imageSrc}" class="content-image" loading="lazy">`;
            });
            contentHTML += '</div>';
        }

        contentHTML += `<div class="content-caption">${legenda || ''}</div>`;
        contentHTML += `<button class="view-button">Ver</button>`;
        contentHTML += `<button class="delete-button" aria-label="Remover post-it">✕</button>`;
        
        contentBox.innerHTML = contentHTML;
        attachContentInteractions(contentBox, contentId);
        contentContainer.appendChild(contentBox);

        const dayKey = `${currentDayData.year}-${currentDayData.month+1}-${currentDayData.day}`;
        
        if (!allMonthsData[dayKey]) {
            allMonthsData[dayKey] = [];
        }

        allMonthsData[dayKey] = allMonthsData[dayKey].filter(item => item.id !== contentId);
        allMonthsData[dayKey].push({
            html: contentBox.outerHTML,
            id: contentId
        });

        const eventoBackend = {
            title: titulo || 'Evento sem título',
            date: new Date(currentDayData.year, currentDayData.month, currentDayData.day).toISOString(),
            description: legenda,
            imageUrl: imageUrlArray.length > 0 ? imageUrlArray[0] : null
        };
        
        salvarEventoNoBackend(eventoBackend);

        setTimeout(() => {
            saveToStorage();
            if (progressFill) progressFill.style.width = "100%";
            
            setTimeout(() => {
                const tituloInput = document.getElementById("titulo");
                const formatoSelect = document.getElementById("formato");
                const statusSelect = document.getElementById("status");
                const legendaTextarea = document.getElementById("legenda");
                
                if (tituloInput) tituloInput.value = "";
                if (formatoSelect) formatoSelect.value = "Estático";
                if (statusSelect) statusSelect.value = "pendente";
                if (legendaTextarea) legendaTextarea.value = "";
                
                selectedFiles = [];
                if (mediaPreview) mediaPreview.innerHTML = "";
                if (fileInput) fileInput.value = "";
                if (document.getElementById("modal")) document.getElementById("modal").style.display = "none";
                
                savingInProgress = false;
                if (loadingIndicator) loadingIndicator.style.display = "none";
            }, 300);
        }, 100);
        
    } catch (error) {
        console.error("Erro ao criar conteúdo:", error);
        alert("Erro ao salvar o conteúdo. Por favor, tente novamente.");
        savingInProgress = false;
        if (loadingIndicator) loadingIndicator.style.display = "none";
    }
}

function viewContentById(contentId) {
    const contentData = savedContentData[contentId];
    if (contentData) {
        viewContent(contentData);
    }
}

function openConfirmDelete(contentElement) {
    contentToDelete = contentElement;
    const modal = document.getElementById("confirm-modal");
    if (modal) modal.style.display = "flex";
}

function confirmDelete() {
    if (!contentToDelete) {
        closeConfirmModal();
        return;
    }

    try {
        const contentElement = contentToDelete;
        const container = contentElement.parentElement;
        const contentId = contentElement.getAttribute('data-content-id');

        contentElement.remove();
        
        if (contentId) {
            delete savedContentData[contentId];
        }

        if (container) {
            const match = container.id.match(/content-(\d+)-(\d+)-(\d+)/);
            if (match) {
                const yearNumber = Number(match[1]);
                const monthNumber = Number(match[2]);
                const dayNumber = Number(match[3]);
                const dayKey = `${yearNumber}-${monthNumber}-${dayNumber}`;

                if (allMonthsData[dayKey]) {
                    allMonthsData[dayKey] = allMonthsData[dayKey].filter(item => item.id !== contentId);
                    if (allMonthsData[dayKey].length === 0) {
                        delete allMonthsData[dayKey];
                        ensureNewPostElement(container, yearNumber, monthNumber, dayNumber);
                    }
                } else {
                    ensureNewPostElement(container, yearNumber, monthNumber, dayNumber);
                }

                if (container.querySelectorAll('.content-box').length === 0) {
                    ensureNewPostElement(container, yearNumber, monthNumber, dayNumber);
                }
            }
        }

        saveToStorage();
    } catch (error) {
        console.error("Erro ao excluir conteúdo:", error);
    } finally {
        closeConfirmModal();
    }
}

function saveCurrentMonthData() {
    const contentContainers = document.querySelectorAll('.content-container');
    contentContainers.forEach(container => {
        const containerId = container.id;
        const match = containerId.match(/content-(\d+)-(\d+)-(\d+)/);
        
        if (match) {
            const yearNumber = Number(match[1]);
            const monthNumber = Number(match[2]);
            const dayNumber = Number(match[3]);
            const dayKey = `${yearNumber}-${monthNumber}-${dayNumber}`;
            
            const directBoxes = Array.from(container.children).filter(child => 
                child.classList && child.classList.contains('content-box')
            );

            if (directBoxes.length > 0) {
                const contents = [];
                const seenIds = new Set();

                directBoxes.forEach(box => {
                    const contentId = box.getAttribute('data-content-id');
                    if (!contentId || seenIds.has(contentId)) {
                        return;
                    }
                    attachContentInteractions(box, contentId);
                    contents.push({
                        html: box.outerHTML,
                        id: contentId
                    });
                    seenIds.add(contentId);
                });

                if (contents.length > 0) {
                    allMonthsData[dayKey] = contents;
                } else {
                    delete allMonthsData[dayKey];
                    ensureNewPostElement(container, yearNumber, monthNumber, dayNumber);
                }
            } else {
                delete allMonthsData[dayKey];
                ensureNewPostElement(container, yearNumber, monthNumber, dayNumber);
            }
        }
    });
    
    saveToStorage();
}

function saveToStorage() {
    try {
        const dataToSave = {
            metadata: {
                contentCounter: contentCounter,
                currentMonth: currentDate.getMonth(),
                currentYear: currentDate.getFullYear(),
                lastSave: new Date().toISOString()
            },
            savedContentData: savedContentData,
            allMonthsData: allMonthsData
        };
        
        localStorage.setItem('calendar_app_data', JSON.stringify(dataToSave));
        
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.error("Limite de armazenamento excedido. Limpando dados antigos...");
            cleanupOldData();
            try {
                const minimalData = {
                    metadata: {
                        contentCounter: contentCounter,
                        currentMonth: currentDate.getMonth(),
                        currentYear: currentDate.getFullYear()
                    },
                    savedContentData: savedContentData,
                    allMonthsData: {}
                };
                localStorage.setItem('calendar_app_data', JSON.stringify(minimalData));
            } catch (retryError) {
                console.error("Erro crítico ao salvar:", retryError);
            }
        } else {
            console.error("Erro ao salvar no localStorage:", error);
        }
    }
}

function loadFromStorage() {
    try {
        const savedDataStr = localStorage.getItem('calendar_app_data');
        if (savedDataStr) {
            const savedData = JSON.parse(savedDataStr);
            
            if (savedData.metadata) {
                contentCounter = savedData.metadata.contentCounter || 0;
                
                if (savedData.metadata.currentMonth !== undefined && savedData.metadata.currentYear !== undefined) {
                    currentDate = new Date(savedData.metadata.currentYear, savedData.metadata.currentMonth, 1);
                }
            }
            
            savedContentData = savedData.savedContentData || {};
            allMonthsData = savedData.allMonthsData || {};
        }
    } catch (e) {
        console.log("Erro ao carregar dados do localStorage:", e);
    }
}

function cleanupOldData() {
    const keys = Object.keys(allMonthsData);
    if (keys.length > 20) {
        const sortedKeys = keys.sort();
        const keysToKeep = sortedKeys.slice(-15);
        const newData = {};
        keysToKeep.forEach(key => {
            newData[key] = allMonthsData[key];
        });
        allMonthsData = newData;
    }
    
    const contentKeys = Object.keys(savedContentData);
    if (contentKeys.length > 200) {
        const keysToKeep = contentKeys.slice(-150);
        const newData = {};
        keysToKeep.forEach(key => {
            newData[key] = savedContentData[key];
        });
        savedContentData = newData;
    }
    
    Object.keys(savedContentData).forEach(key => {
        if (savedContentData[key].images) {
            savedContentData[key].images = savedContentData[key].images.filter(img => 
                img.startsWith('http') || img.startsWith('data:image/')
            ).slice(0, 5);
            
            const temBase64 = savedContentData[key].images.some(img => 
                img.startsWith('data:image/')
            );
            if (temBase64) {
                savedContentData[key].images = savedContentData[key].images.filter(img => 
                    img.startsWith('http')
                );
            }
        }
    });
}

// Funções Globais
window.viewContentById = viewContentById;
window.openConfirmDelete = openConfirmDelete;
window.openImagePreview = openImagePreview;
window.closeImagePreview = closeImagePreview;
window.downloadImage = downloadImage;
window.changeMonth = changeMonth;
window.closeModal = closeModal;
window.saveChanges = saveChanges;
window.closeViewModal = closeViewModal;
window.closeConfirmModal = closeConfirmModal;
window.confirmDelete = confirmDelete;
window.recarregarDadosAtuais = recarregarDadosAtuais;