

const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const converter = new markdownit(
    {
        html: true,
        linkify: true,
        typographer: true
    }
)
let isWaitingForResponse = false;
let lastQuestion = '';
let lastAnswer = '';
lastAttemp = true;
async function sendMessage() {
    if (isWaitingForResponse) return;

    const message = userInput.value.trim();
    if (!message) return;

    if (!lastAttemp)
    {
        removeMessage('error');
        // remove error message if exists
    }

    appendMessage('user', message);
    userInput.value = '';
    userInput.style.height = '25px';
    sendBtn.disabled = true;
    lastQuestion = message;

    isWaitingForResponse = true;
    const generatingMsgContainer = appendMessage('assistant', '', 'generating');

    // Animate the "generating" message
    const generatingText = generatingMsgContainer.querySelector('.message');
    new Typed(generatingText, {
        strings: ['We are generating a response for you^300.^300.^300.'],
        typeSpeed: 50,
        backSpeed: 0,
        loop: true,
        showCursor: false,
    });

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question: message }),
        });

        if (!response.ok) throw new Error('Server error');

        const data = await response.json();
        removeGeneratingMessage();
        const assistantMsgContainer = appendMessage('assistant', '', 'typing');
        typeAssistantMessage(assistantMsgContainer, data.answer);
        lastAnswer = data.answer;
        lastAttemp = true;
        setTimeout(() => {
            showFeedbackPanel(assistantMsgContainer);
        }, 1000);
    } catch (error) {
        console.error('Error:', error);
        removeMessage('generating');
        appendMessage('assistant', 'Oops, we encountered a problem. Please try again. <img src="./assets/sorry.gif" alt="Sorry" width="30" height="30">', 'error');
        sendBtn.disabled = false;
        lastAttemp = false;
    } finally {
        isWaitingForResponse = false;
        sendBtn.disabled = false;
    }
}

function appendMessage(sender, content, type = 'normal') {
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message-container', `${sender}-message-container`);
    if (type === 'error')
    {
        messageContainer.classList.add('error-message');
    } else if (type === 'generating') {
        messageContainer.classList.add('generating-message');
    }
    
    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    avatarDiv.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    if (type === 'generating') {
        messageContainer.style.color = 'rgb(120, 120, 120)'
        avatarDiv.innerHTML = '<img src="./assets/loadingholder.gif" alt="Sorry" width="30" height="30">';
    }
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    
    if (type !== 'generating' && type !== 'typing') {
        messageDiv.innerHTML = formatMessage(content);
    }
    
    messageContainer.appendChild(avatarDiv);
    messageContainer.appendChild(messageDiv);
    
    chatContainer.appendChild(messageContainer);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    return messageContainer;
}

function typeAssistantMessage(container, content) {
    const messageDiv = container.querySelector('.message');
    new Typed(messageDiv, {
        strings: [formatMessage(content)],
        typeSpeed: 20,
        showCursor: false,
        onComplete: (self) => {
            messageDiv.innerHTML = self.strings[0];
        }
    });
}

function removeMessage(type='error') {
    const Message = chatContainer.querySelector(`.${type}-message`);
    if (Message) {
        Message.closest('.message-container').remove();
    }
}


function formatMessage(content) {
    // Use marked library to parse markdown
    const formattedContent = converter.render(content);
    
    // Additional formatting for code blocks
    return formattedContent;
}

// Auto-resize textarea
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

function typeMessage(element, content) {
    let index = 0;
    content = formatMessage(content);
    function type() {
        if (index < content.length) {
            element.innerHTML += content.charAt(index);
            index++;
            setTimeout(type, typingSpeed);
        } else {
            addFeedbackBox();
        }
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    type();
}




function showFeedbackPanel() {
    const feedbackPanel = document.createElement('div');
    feedbackPanel.classList.add('feedback-panel');
    feedbackPanel.innerHTML = `
        <div class="feedback-stars">
            ${[1, 2, 3, 4, 5].map(star => `<span class="star" data-rating="${star}">★</span>`).join('')}
        </div>
    `;
    
    const lastAssistantMessage = chatContainer.querySelector('.assistant-message-container:last-child');
    lastAssistantMessage.appendChild(feedbackPanel);
    
    feedbackPanel.addEventListener('mouseleave', () => {
        feedbackPanel.querySelectorAll('.star').forEach(star => star.classList.remove('active', 'hover'));
    });
    
    feedbackPanel.querySelectorAll('.star').forEach(star => {
        star.addEventListener('mouseenter', () => {
            const rating = parseInt(star.dataset.rating);
            feedbackPanel.querySelectorAll('.star').forEach((s, index) => {
                s.classList.toggle('hover', index < rating);
            });
        });
        
        star.addEventListener('click', () => {
            const rating = parseInt(star.dataset.rating);
            sendFeedback(rating);
            feedbackPanel.innerHTML = '<div class="feedback-thank-you">Thank you for your feedback!</div>';
            setTimeout(() => {
                feedbackPanel.remove();
            }, 2000);
        });
    });
}

async function sendFeedback(rating) {
    try {
        await fetch('/api/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                rating,
                question: lastQuestion,
                answer: lastAnswer
            }),
        });
    } catch (error) {
        console.error('Error sending feedback:', error);
    }
}
function setSearchingIcon() {
    sendBtn.innerHTML = '<i class="fas fa-search searching-icon"></i>';
}

function setGeneratingIcon() {
    sendBtn.innerHTML = '<i class="fas fa-stop-circle generating-icon"></i>';
}

function setDefaultIcon() {
    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
}
async function sendFeedback(rating) {
    try {
        await fetch('/api/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: lastQuestion,
                answer: lastAnswer,
                rating: rating
            }),
        });
    } catch (error) {
        console.error('Error sending feedback:', error);
    }
}
function createStatusMessage(text) {
    const statusDiv = document.createElement('div');
    statusDiv.classList.add('message', 'assistant-message', 'status-message');
    statusDiv.textContent = text;
    chatContainer.appendChild(statusDiv);
    return statusDiv;
}

function animateStatusMessage(element) {
    let dots = 0;
    return setInterval(() => {
        dots = (dots + 1) % 4;
        element.textContent = "Searching" + ".".repeat(dots);
    }, 500);
}
// Auto-resize textarea
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

