// --- Configuration & Data ---
const tasksKey = 'nexus_tasks';

// Mock Data if empty
const defaultTasks = [
    { id: 1, text: 'Развернуть NEXUS на GitHub', priority: 'high', done: false },
    { id: 2, text: 'Оформить README.md', priority: 'medium', done: false },
    { id: 3, text: 'Выпить кофе', priority: 'low', done: true }
];

// --- DOM Elements ---
const todoList = document.getElementById('todo-list');
const doneList = document.getElementById('done-list');
const addBtn = document.getElementById('add-task-btn');
const greetingEl = document.getElementById('greeting');
const dateEl = document.getElementById('current-date');

// --- Functions ---

function init() {
    updateDateAndGreeting();
    renderTasks();
    setupEventListeners();
}

function getTasks() {
    const stored = localStorage.getItem(tasksKey);
    return stored ? JSON.parse(stored) : defaultTasks;
}

function saveTasks(tasks) {
    localStorage.setItem(tasksKey, JSON.stringify(tasks));
    renderTasks();
}

function updateDateAndGreeting() {
    const now = new Date();
    const hour = now.getHours();
    
    // Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('ru-RU', options);

    // Greeting
    let text = 'Доброй ночи, Создатель';
    if (hour >= 5 && hour < 12) text = 'Доброе утро, Создатель';
    else if (hour >= 12 && hour < 18) text = 'Добрый день, Создатель';
    else if (hour >= 18 && hour < 23) text = 'Добрый вечер, Создатель';
    
    greetingEl.textContent = text;
}

function renderTasks() {
    const tasks = getTasks();
    todoList.innerHTML = '';
    doneList.innerHTML = '';

    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-card ${task.priority}-priority ${task.done ? 'opacity-50' : ''}`;
        
        li.innerHTML = `
            <div class="flex items-center gap-3">
                <div onclick="toggleTask(${task.id})" class="w-5 h-5 rounded border border-gray-500 cursor-pointer flex items-center justify-center hover:border-indigo-400 ${task.done ? 'bg-indigo-500 border-indigo-500' : ''}">
                    ${task.done ? '<i class="fa-solid fa-check text-xs text-white"></i>' : ''}
                </div>
                <span class="${task.done ? 'line-through text-gray-500' : 'text-gray-200'}">${task.text}</span>
            </div>
            <button onclick="deleteTask(${task.id})" class="text-gray-600 hover:text-red-400 transition"><i class="fa-solid fa-trash"></i></button>
        `;

        if (task.done) {
            doneList.appendChild(li);
        } else {
            todoList.appendChild(li);
        }
    });
}

// --- Actions ---

window.toggleTask = (id) => {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.done = !task.done;
        saveTasks(tasks);
    }
};

window.deleteTask = (id) => {
    const tasks = getTasks().filter(t => t.id !== id);
    saveTasks(tasks);
};

function setupEventListeners() {
    addBtn.addEventListener('click', () => {
        const text = prompt("Введите новую задачу:");
        if (text) {
            const tasks = getTasks();
            tasks.push({
                id: Date.now(),
                text: text,
                priority: 'medium', // Default
                done: false
            });
            saveTasks(tasks);
        }
    });
    
    // Habit toggles (visual only for demo)
    document.querySelectorAll('.habit-circle').forEach(circle => {
        circle.addEventListener('click', function() {
            this.classList.toggle('done');
        });
    });
}

// Run
init();
