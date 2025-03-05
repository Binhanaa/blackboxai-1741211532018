document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTask');
    const tasksList = document.getElementById('tasksList');
    const errorMessage = document.getElementById('errorMessage');
    const emptyState = document.getElementById('emptyState');
    const taskCategory = document.getElementById('taskCategory');
    const taskPriority = document.getElementById('taskPriority');
    const taskTimer = document.getElementById('taskTimer');
    const taskDueDate = document.getElementById('taskDueDate');
    const filterBtns = {
        all: document.getElementById('filterAll'),
        active: document.getElementById('filterActive'),
        completed: document.getElementById('filterCompleted'),
        urgent: document.getElementById('filterUrgent')
    };
    const statsElements = {
        active: document.getElementById('activeTasks'),
        completed: document.getElementById('completedTasks'),
        urgent: document.getElementById('urgentTasks')
    };

    // Initialize tasks array and timers
    let tasks = [];
    let activeTimers = {};

    // Load tasks from localStorage
    const loadTasks = () => {
        try {
            const storedTasks = localStorage.getItem('tasks');
            if (storedTasks) {
                tasks = JSON.parse(storedTasks);
                renderTasks();
                updateStats();
            }
        } catch (error) {
            showError('حدث خطأ أثناء تحميل المهام');
            console.error('Error loading tasks:', error);
        }
    };

    // Save tasks to localStorage
    const saveTasks = () => {
        try {
            localStorage.setItem('tasks', JSON.stringify(tasks));
            updateStats();
        } catch (error) {
            showError('حدث خطأ أثناء حفظ المهام');
            console.error('Error saving tasks:', error);
        }
    };

    // Show error message
    const showError = (message) => {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        errorMessage.classList.add('error-shake');
        setTimeout(() => {
            errorMessage.classList.remove('error-shake');
            setTimeout(() => {
                errorMessage.classList.add('hidden');
            }, 3000);
        }, 500);
    };

    // Format time
    const formatTime = (minutes) => {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs > 0 ? hrs + ' ساعة ' : ''}${mins > 0 ? mins + ' دقيقة' : ''}`;
    };

    // Start timer for task
    const startTimer = (taskId) => {
        if (activeTimers[taskId]) {
            clearInterval(activeTimers[taskId].interval);
        }

        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;

        const task = tasks[taskIndex];
        if (!task.timeRemaining) {
            task.timeRemaining = task.timer * 60; // Convert to seconds
        }

        const timerElement = document.querySelector(`#timer-${taskId}`);
        if (!timerElement) return;

        activeTimers[taskId] = {
            interval: setInterval(() => {
                if (task.timeRemaining <= 0) {
                    clearInterval(activeTimers[taskId].interval);
                    timerElement.textContent = 'انتهى الوقت!';
                    timerElement.classList.remove('timer-active');
                    timerElement.classList.add('text-red-500');
                    // Show notification
                    if (Notification.permission === 'granted') {
                        new Notification('انتهى وقت المهمة!', {
                            body: `انتهى وقت المهمة: ${task.text}`
                        });
                    }
                    return;
                }

                task.timeRemaining--;
                const minutes = Math.floor(task.timeRemaining / 60);
                const seconds = task.timeRemaining % 60;
                timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }, 1000),
            element: timerElement
        };

        timerElement.classList.add('timer-active');
    };

    // Get category label
    const getCategoryLabel = (category) => {
        const labels = {
            general: 'عام',
            work: 'العمل',
            personal: 'شخصي',
            shopping: 'التسوق',
            study: 'الدراسة'
        };
        return labels[category] || 'عام';
    };

    // Create task element
    const createTaskElement = (task) => {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item bg-white p-4 rounded-lg flex items-center justify-between gap-4 shadow-sm priority-${task.priority}`;
        taskElement.draggable = true;
        taskElement.dataset.id = task.id;

        // Calculate if task is due soon (within 24 hours) or overdue
        let dueStatus = '';
        if (task.dueDate) {
            const due = new Date(task.dueDate);
            const now = new Date();
            const diff = due - now;
            const hoursLeft = diff / (1000 * 60 * 60);
            
            if (diff < 0) {
                dueStatus = 'overdue';
            } else if (hoursLeft <= 24) {
                dueStatus = 'due-soon';
            }
        }

        taskElement.innerHTML = `
            <div class="flex items-center gap-3 flex-1">
                <input type="checkbox" class="custom-checkbox"
                    ${task.completed ? 'checked' : ''}>
                <div class="flex flex-col gap-1 flex-1">
                    <div class="flex items-center gap-2">
                        <span class="category-badge category-${task.category}">${getCategoryLabel(task.category)}</span>
                        <span class="flex-1 text-gray-800 ${task.completed ? 'line-through text-gray-400' : ''}">${task.text}</span>
                    </div>
                    <div class="flex items-center gap-4 text-sm">
                        ${task.timer ? `
                            <span id="timer-${task.id}" class="text-gray-600">
                                ${formatTime(task.timer)}
                            </span>
                        ` : ''}
                        ${task.dueDate ? `
                            <span class="text-gray-600 ${dueStatus}">
                                <i class="fas fa-calendar-alt mr-1"></i>
                                ${new Date(task.dueDate).toLocaleDateString('ar-EG')}
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2">
                ${task.timer ? `
                    <button class="timer-control text-blue-500 hover:text-blue-600 transition-colors px-2">
                        <i class="fas fa-play"></i>
                    </button>
                ` : ''}
                <button class="delete-task text-red-500 hover:text-red-600 transition-colors">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;

        // Add event listeners
        taskElement.addEventListener('dragstart', handleDragStart);
        taskElement.addEventListener('dragend', handleDragEnd);
        taskElement.addEventListener('dragover', handleDragOver);
        taskElement.addEventListener('drop', handleDrop);

        const checkbox = taskElement.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => toggleTaskComplete(task.id));

        const deleteBtn = taskElement.querySelector('.delete-task');
        deleteBtn.addEventListener('click', () => deleteTask(task.id));

        const timerBtn = taskElement.querySelector('.timer-control');
        if (timerBtn) {
            timerBtn.addEventListener('click', () => startTimer(task.id));
        }

        return taskElement;
    };

    // Update statistics
    const updateStats = () => {
        const stats = {
            active: tasks.filter(t => !t.completed).length,
            completed: tasks.filter(t => t.completed).length,
            urgent: tasks.filter(t => t.priority === 'urgent' && !t.completed).length
        };

        statsElements.active.textContent = stats.active;
        statsElements.completed.textContent = stats.completed;
        statsElements.urgent.textContent = stats.urgent;
    };

    // Render tasks
    const renderTasks = (filter = 'all') => {
        tasksList.innerHTML = '';
        let filteredTasks = [...tasks];

        switch (filter) {
            case 'active':
                filteredTasks = tasks.filter(t => !t.completed);
                break;
            case 'completed':
                filteredTasks = tasks.filter(t => t.completed);
                break;
            case 'urgent':
                filteredTasks = tasks.filter(t => t.priority === 'urgent');
                break;
        }

        if (filteredTasks.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            filteredTasks.forEach(task => {
                tasksList.appendChild(createTaskElement(task));
            });
        }

        updateStats();
    };

    // Add new task
    const addTask = () => {
        const text = taskInput.value.trim();
        if (text === '') {
            showError('يرجى إدخال نص المهمة');
            return;
        }

        const newTask = {
            id: Date.now().toString(),
            text: text,
            completed: false,
            category: taskCategory.value,
            priority: taskPriority.value,
            timer: parseInt(taskTimer.value) || null,
            dueDate: taskDueDate.value || null,
            timeRemaining: null
        };

        tasks.push(newTask);
        saveTasks();
        renderTasks();
        
        // Reset form
        taskInput.value = '';
        taskTimer.value = '';
        taskDueDate.value = '';
        taskCategory.value = 'general';
        taskPriority.value = 'normal';
    };

    // Toggle task complete
    const toggleTaskComplete = (taskId) => {
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex].completed = !tasks[taskIndex].completed;
            
            // Add completion animation
            const taskElement = document.querySelector(`[data-id="${taskId}"]`);
            if (taskElement) {
                taskElement.classList.add('task-complete-animation');
                setTimeout(() => {
                    taskElement.classList.remove('task-complete-animation');
                }, 500);
            }

            saveTasks();
            renderTasks();
        }
    };

    // Delete task
    const deleteTask = (taskId) => {
        if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
            if (activeTimers[taskId]) {
                clearInterval(activeTimers[taskId].interval);
                delete activeTimers[taskId];
            }
            tasks = tasks.filter(t => t.id !== taskId);
            saveTasks();
            renderTasks();
        }
    };

    // Drag and drop handlers
    let draggedTask = null;

    const handleDragStart = (e) => {
        draggedTask = e.target;
        e.target.classList.add('dragging');
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove('dragging');
        const taskElements = document.querySelectorAll('.task-item');
        taskElements.forEach(item => item.classList.remove('drag-over'));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        if (e.target.classList.contains('task-item')) {
            e.target.classList.add('drag-over');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const dropTarget = e.target.closest('.task-item');
        if (dropTarget && draggedTask !== dropTarget) {
            const allTasks = [...tasksList.querySelectorAll('.task-item')];
            const draggedIndex = allTasks.indexOf(draggedTask);
            const droppedIndex = allTasks.indexOf(dropTarget);

            // Reorder tasks array
            const [movedTask] = tasks.splice(draggedIndex, 1);
            tasks.splice(droppedIndex, 0, movedTask);
            
            saveTasks();
            renderTasks();
        }
    };

    // Event listeners
    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    // Filter buttons
    Object.entries(filterBtns).forEach(([filter, btn]) => {
        btn.addEventListener('click', () => {
            // Update active state
            Object.values(filterBtns).forEach(b => {
                b.classList.remove('bg-blue-500', 'text-white');
                b.classList.add('bg-gray-200', 'text-gray-700');
            });
            btn.classList.remove('bg-gray-200', 'text-gray-700');
            btn.classList.add('bg-blue-500', 'text-white');
            
            renderTasks(filter);
        });
    });

    // Request notification permission
    if ('Notification' in window) {
        Notification.requestPermission();
    }

    // Initial load
    loadTasks();
});
