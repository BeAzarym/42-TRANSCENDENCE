export type NotificationType = 'success' | 'error';

export function showNotification(message: string, type: NotificationType = 'success', duration: number = 3000) {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transition-all duration-300 translate-y-2 opacity-0 ${getTypeClasses(type)}`;
    
    notification.innerHTML = `
        <div class="p-4">
            <div class="flex justify-center items-center">
                <div class="flex-shrink-0">
                    ${getIcon(type)}
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium text-white">${message}</p>
                </div>
                <div class="ml-auto pl-3">
                    <button class="close-btn inline-flex text-white hover:text-gray-300 focus:outline-none">
                        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const closeBtn = notification.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => removeNotification(notification));
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.remove('translate-y-2', 'opacity-0');
    }, 10);
    
    setTimeout(() => {
        removeNotification(notification);
    }, duration);
}

function getTypeClasses(type: NotificationType): string {
    return type === 'success' ? 'bg-green-600' : 'bg-red-600';
}

function getIcon(type: NotificationType): string {
    if (type === 'success') {
        return `<svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>`;
    } else {
        return `<svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>`;
    }
}

function removeNotification(notification: HTMLElement) {
    notification.classList.add('translate-y-2', 'opacity-0');
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}
