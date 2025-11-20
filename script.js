let items = [];
let connections = [];
let isConnectMode = false;
let selectedItem = null;
let dragItem = null;
let offsetX = 0;
let offsetY = 0;

// Загрузка данных при старте
window.onload = () => {
    loadFromStorage();
    render();
};

function toggleConnectMode() {
    isConnectMode = !isConnectMode;
    const btn = document.getElementById('connBtn');
    if (isConnectMode) {
        btn.classList.add('active');
        btn.innerText = "РЕЖИМ СВЯЗИ: ВКЛ (Выбери 2)";
        document.body.style.cursor = "crosshair";
    } else {
        btn.classList.remove('active');
        btn.innerText = "РЕЖИМ СВЯЗИ: ВЫКЛ";
        document.body.style.cursor = "default";
        if (selectedItem) deselectAll();
    }
}

function addNote() {
    const id = Date.now();
    const item = {
        id: id,
        type: 'note',
        x: 100 + Math.random() * 50,
        y: 100 + Math.random() * 50,
        content: 'Новая улика...',
        rotation: (Math.random() * 6) - 3 // Случайный наклон
    };
    items.push(item);
    render();
    saveToStorage();
}

function addPhoto() {
    const url = prompt("Введите URL картинки:", "https://via.placeholder.com/150");
    if (!url) return;
    
    const id = Date.now();
    const item = {
        id: id,
        type: 'photo',
        x: 150 + Math.random() * 50,
        y: 150 + Math.random() * 50,
        src: url,
        caption: 'Evidence',
        rotation: (Math.random() * 10) - 5
    };
    items.push(item);
    render();
    saveToStorage();
}

function deleteItem(id) {
    items = items.filter(i => i.id !== id);
    connections = connections.filter(c => c.from !== id && c.to !== id);
    render();
    saveToStorage();
}

function clearBoard() {
    if(confirm("Уничтожить все улики?")) {
        items = [];
        connections = [];
        render();
        localStorage.removeItem('detectiveBoardData');
    }
}

// Логика перетаскивания
document.addEventListener('mousedown', (e) => {
    if (e.target.closest('.item') && !isConnectMode && !e.target.matches('textarea, input, .delete-btn')) {
        dragItem = items.find(i => i.id == e.target.closest('.item').dataset.id);
        const el = document.querySelector(`[data-id='${dragItem.id}']`);
        offsetX = e.clientX - dragItem.x;
        offsetY = e.clientY - dragItem.y;
        
        // Поднимаем элемент наверх
        el.style.zIndex = 1000;
    }
});

document.addEventListener('mousemove', (e) => {
    if (dragItem) {
        dragItem.x = e.clientX - offsetX;
        dragItem.y = e.clientY - offsetY;
        
        const el = document.querySelector(`[data-id='${dragItem.id}']`);
        el.style.left = dragItem.x + 'px';
        el.style.top = dragItem.y + 'px';
        
        drawLines(); // Перерисовываем нити в реальном времени
    }
});

document.addEventListener('mouseup', () => {
    if (dragItem) {
        const el = document.querySelector(`[data-id='${dragItem.id}']`);
        el.style.zIndex = 10; // Возвращаем z-index
        dragItem = null;
        saveToStorage();
    }
});

function handleItemClick(id, element) {
    if (!isConnectMode) return;

    if (selectedItem === null) {
        selectedItem = id;
        element.classList.add('selected');
    } else {
        if (selectedItem !== id) {
            // Создаем связь
            connections.push({ from: selectedItem, to: id });
            saveToStorage();
            render(); // Перерисует всё и линии
        }
        deselectAll();
    }
}

function deselectAll() {
    selectedItem = null;
    document.querySelectorAll('.item').forEach(el => el.classList.remove('selected'));
}

// Отрисовка (Рендер)
function render() {
    const board = document.getElementById('board');
    // Не очищаем board полностью, чтобы не терять SVG, удаляем только .item
    document.querySelectorAll('.item').forEach(e => e.remove());

    items.forEach(item => {
        const el = document.createElement('div');
        el.classList.add('item');
        if(item.type === 'note') el.classList.add('note');
        else el.classList.add('photo');

        el.dataset.id = item.id;
        el.style.left = item.x + 'px';
        el.style.top = item.y + 'px';
        el.style.transform = `rotate(${item.rotation}deg)`;

        // Кнопка удаления
        const delBtn = document.createElement('button');
        delBtn.innerText = 'x';
        delBtn.className = 'delete-btn';
        delBtn.onclick = (e) => { e.stopPropagation(); deleteItem(item.id); };
        el.appendChild(delBtn);

        // Контент
        if (item.type === 'note') {
            const ta = document.createElement('textarea');
            ta.value = item.content;
            ta.oninput = (e) => { item.content = e.target.value; saveToStorage(); };
            el.appendChild(ta);
        } else {
            const img = document.createElement('img');
            img.src = item.src;
            const inp = document.createElement('input');
            inp.value = item.caption;
            inp.oninput = (e) => { item.caption = e.target.value; saveToStorage(); };
            el.appendChild(img);
            el.appendChild(inp);
        }

        el.onclick = () => handleItemClick(item.id, el);
        board.appendChild(el);
    });

    drawLines();
}

function drawLines() {
    const svg = document.getElementById('connections');
    svg.innerHTML = ''; // Очищаем старые линии

    connections.forEach(conn => {
        const fromItem = items.find(i => i.id === conn.from);
        const toItem = items.find(i => i.id === conn.to);

        if (fromItem && toItem) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            
            // Центр элементов (примерно, ширина 200/2=100)
            const x1 = fromItem.x + 100; 
            const y1 = fromItem.y + 50;
            const x2 = toItem.x + 100;
            const y2 = toItem.y + 50;

            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('stroke', '#d00');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-opacity', '0.8');
            // Эффект нитки (немного тени)
            line.setAttribute('filter', 'drop-shadow(0px 1px 1px rgba(0,0,0,0.5))');

            svg.appendChild(line);
        }
    });
}

// Local Storage
function saveToStorage() {
    const data = { items, connections };
    localStorage.setItem('detectiveBoardData', JSON.stringify(data));
}

function loadFromStorage() {
    const data = localStorage.getItem('detectiveBoardData');
    if (data) {
        const parsed = JSON.parse(data);
        items = parsed.items || [];
        connections = parsed.connections || [];
    }
}
