let items = [];
let connections = [];
let mode = 'move'; // 'move', 'link'
let selectedIds = []; // Для создания связей
let activeItem = null; // Тот, который тащим или редактируем
let isDragging = false;
let isRotating = false;

// Смещение мыши внутри элемента
let dragOffset = { x: 0, y: 0 };
// Начальный угол для вращения
let startAngle = 0;
let currentRotation = 0;

const board = document.getElementById('board');
const svg = document.getElementById('connections');
const editor = document.getElementById('textEditor');

// --- Инициализация ---

window.onload = () => {
    loadData();
    renderAll();
    
    // Глобальные слушатели для drag/drop и кликов
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // Скрываем редактор при клике в пустоту
    board.addEventListener('mousedown', (e) => {
        if (e.target === board || e.target.id === 'connections') {
            deselectAll();
        }
    });
};

// --- Создание элементов ---

function createNote() {
    const item = createBaseItem('note');
    item.content = '<div>Заголовок</div><div>Текст улики...</div>';
    items.push(item);
    renderItem(item);
    saveData();
}

function triggerPhotoUpload() {
    document.getElementById('photoInput').click();
}

function handlePhotoUpload(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const item = createBaseItem('photo');
            // Используем Base64. Внимание: это может забить localStorage, если картинки большие.
            // Для продакшена лучше загружать на сервер и хранить URL.
            item.content = `<img src="${e.target.result}"><div>Описание фото...</div>`;
            items.push(item);
            renderItem(item);
            saveData();
        }
        reader.readAsDataURL(input.files[0]);
    }
    input.value = ''; // сброс
}

function createBaseItem(type) {
    return {
        id: Date.now().toString(),
        type: type,
        x: window.innerWidth / 2 - 100 + (Math.random()*40),
        y: window.innerHeight / 2 - 100 + (Math.random()*40),
        rotation: (Math.random() * 4) - 2, // Легкая небрежность
        width: 220,
        zIndex: items.length + 1,
        content: ''
    };
}

// --- Рендеринг ---

function renderAll() {
    board.innerHTML = '';
    board.appendChild(svg); // Вернуть SVG на место
    board.appendChild(editor); // Вернуть редактор

    items.forEach(renderItem);
    drawConnections();
}

function renderItem(data) {
    const el = document.createElement('div');
    el.className = 'item';
    el.id = data.id;
    el.style.left = data.x + 'px';
    el.style.top = data.y + 'px';
    el.style.transform = `rotate(${data.rotation}deg)`;
    el.style.zIndex = data.zIndex;
    el.style.width = data.width + 'px';

    // Ручка вращения
    const rotHandle = document.createElement('div');
    rotHandle.className = 'rotate-handle';
    el.appendChild(rotHandle);

    // Контент
    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    contentDiv.contentEditable = true; // Включаем редактирование как в Word
    contentDiv.innerHTML = data.content;
    
    // Обновляем данные при вводе текста
    contentDiv.addEventListener('input', () => {
        data.content = contentDiv.innerHTML;
        saveData();
    });

    // Показ редактора при фокусе
    contentDiv.addEventListener('focus', () => showEditor(el));

    el.appendChild(contentDiv);
    
    // Удаление (скрытая кнопка, можно добавить в UI)
    // Для этого примера удаление через выделение + кнопка "Очистить" или Delete key можно добавить

    board.appendChild(el);
}

// --- Логика взаимодействия (Mouse Events) ---

function onMouseDown(e) {
    // 1. Вращение
    if (e.target.classList.contains('rotate-handle')) {
        isRotating = true;
        const el = e.target.closest('.item');
        activeItem = items.find(i => i.id === el.id);
        
        // Вычисляем центр элемента
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Стартовый угол мыши
        startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        currentRotation = activeItem.rotation * (Math.PI / 180);
        e.preventDefault();
        return;
    }

    // 2. Элемент (Drag или Link)
    const el = e.target.closest('.item');
    if (el && !e.target.classList.contains('content')) { // Если кликнули на рамку, а не в текст
        const id = el.id;
        
        if (mode === 'link') {
            handleLinkClick(id, el);
            return;
        }

        // Drag Mode
        isDragging = true;
        activeItem = items.find(i => i.id === id);
        
        // Поднимаем Z-index
        activeItem.zIndex = Date.now(); 
        el.style.zIndex = activeItem.zIndex;

        dragOffset.x = e.clientX - activeItem.x;
        dragOffset.y = e.clientY - activeItem.y;
        
        deselectAll();
        el.classList.add('selected');
        showEditor(el); // Показываем тулбар
    }
}

function onMouseMove(e) {
    if (isDragging && activeItem) {
        activeItem.x = e.clientX - dragOffset.x;
        activeItem.y = e.clientY - dragOffset.y;
        
        const el = document.getElementById(activeItem.id);
        el.style.left = activeItem.x + 'px';
        el.style.top = activeItem.y + 'px';
        
        // Перемещаем редактор за элементом
        updateEditorPosition(el);
        drawConnections();
    }

    if (isRotating && activeItem) {
        const el = document.getElementById(activeItem.id);
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const mouseAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const rotation = mouseAngle - startAngle + currentRotation;
        
        activeItem.rotation = rotation * (180 / Math.PI);
        el.style.transform = `rotate(${activeItem.rotation}deg)`;
        
        drawConnections();
    }
}

function onMouseUp() {
    if (isDragging || isRotating) {
        saveData();
    }
    isDragging = false;
    isRotating = false;
    activeItem = null;
}

// --- Связи (Нити) ---

function toggleLinkMode() {
    mode = mode === 'move' ? 'link' : 'move';
    const btn = document.getElementById('linkBtn');
    btn.classList.toggle('active');
    document.body.style.cursor = mode === 'link' ? 'crosshair' : 'default';
    selectedIds = [];
}

function handleLinkClick(id, el) {
    if (selectedIds.includes(id)) return; // Уже выбран
    
    selectedIds.push(id);
    el.classList.add('selected');

    if (selectedIds.length === 2) {
        // Спрашиваем тип связи (просто чередуем для примера: прямая/провисшая)
        // Можно сделать модалку, но для простоты: если Shift нажат - прямая, иначе провисшая
        const type = confirm("Сделать прямую натянутую нить? (ОК - прямая, Отмена - свободная)") ? 'straight' : 'curved';
        
        connections.push({
            from: selectedIds[0],
            to: selectedIds[1],
            type: type
        });
        
        saveData();
        drawConnections();
        
        // Сброс
        deselectAll();
        // toggleLinkMode(); // Можно оставить включенным, если хочется вязать дальше
    }
}

function drawConnections() {
    svg.innerHTML = '';
    
    connections.forEach(conn => {
        const item1 = items.find(i => i.id === conn.from);
        const item2 = items.find(i => i.id === conn.to);
        if (!item1 || !item2) return;

        // Вычисляем центры
        const c1 = getCenter(item1);
        const c2 = getCenter(item2);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        let d = '';
        if (conn.type === 'straight') {
            d = `M ${c1.x} ${c1.y} L ${c2.x} ${c2.y}`;
        } else {
            // Кривая Безье для провисания
            // Находим середину
            const midX = (c1.x + c2.x) / 2;
            const midY = (c1.y + c2.y) / 2;
            // Вычисляем расстояние
            const dist = Math.hypot(c2.x - c1.x, c2.y - c1.y);
            // Чем дальше точки, тем меньше провисает относительно дистанции, 
            // но визуально "провис" (drop) добавляется к Y
            const drop = 50 + (dist * 0.2); 
            
            d = `M ${c1.x} ${c1.y} Q ${midX} ${midY + drop} ${c2.x} ${c2.y}`;
        }

        path.setAttribute('d', d);
        path.setAttribute('stroke', getComputedStyle(document.documentElement).getPropertyValue('--line-color'));
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        if(document.body.classList.contains('noir-theme')) {
             path.setAttribute('filter', 'drop-shadow(2px 2px 2px rgba(0,0,0,0.7))');
        }

        svg.appendChild(path);
    });
}

function getCenter(item) {
    // Простая аппроксимация центра. 
    // Если нужна точность при вращении, тут нужна математика матриц, 
    // но для визуального стиля "доски" достаточно центра по координатам X/Y + половина ширины/высоты.
    // Т.к. мы позиционируем top/left, центр примерно там:
    // В идеале нужно брать getBoundingClientRect реального DOM элемента, но это дорого в цикле.
    // Используем модель:
    // Примечание: item.width у нас есть, height зависит от контента.
    // Возьмем DOM элемент для точности
    const el = document.getElementById(item.id);
    if(el) {
        const rect = el.getBoundingClientRect();
        // Координаты SVG относительны окна, getBoundingClientRect тоже. 
        // Но у нас скролла нет (overflow hidden), если будет скролл, нужно добавить scrollX/Y
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }
    return { x: item.x, y: item.y };
}

// --- Редактор текста ---

function showEditor(el) {
    const rect = el.getBoundingClientRect();
    editor.style.top = (rect.top - 50) + 'px';
    editor.style.left = rect.left + 'px';
    editor.classList.remove('hidden');
}

function updateEditorPosition(el) {
    if (!editor.classList.contains('hidden')) {
        showEditor(el);
    }
}

function formatText(command, value = null) {
    document.execCommand(command, false, value);
    // Обновляем модель данных активного элемента
    if (activeItem) {
         const el = document.getElementById(activeItem.id).querySelector('.content');
         activeItem.content = el.innerHTML;
         saveData();
    }
}

// --- Утилиты ---

function toggleTheme() {
    document.body.classList.toggle('noir-theme');
    drawConnections(); // Перерисовать цвета линий
}

function deselectAll() {
    document.querySelectorAll('.item').forEach(i => i.classList.remove('selected'));
    selectedIds = [];
    editor.classList.add('hidden');
}

function clearBoard() {
    if(confirm('Точно удалить всё?')) {
        items = [];
        connections = [];
        renderAll();
        saveData();
    }
}

function saveData() {
    localStorage.setItem('detectiveBoardPro', JSON.stringify({ items, connections }));
}

function loadData() {
    const data = localStorage.getItem('detectiveBoardPro');
    if (data) {
        const parsed = JSON.parse(data);
        items = parsed.items || [];
        connections = parsed.connections || [];
    }
}
