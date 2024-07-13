

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
let lastQuestion = '';
let lastAnswer = '';
let typingSpeed = 20; // milliseconds per character

async function fetchChatHistory() {
    try {
        const response = await fetch('/api/chat-history');
        const history = await response.json();
        history.forEach(message => {
            appendMessage('user', message.user);
            appendMessage('assistant', message.assistant);
        });
    } catch (error) {
        console.error('Error fetching chat history:', error);
    }
}

function appendMessage(sender, content) {
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message-container', `${sender}-message-container`);
    
    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    avatarDiv.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    messageDiv.innerHTML = formatMessage(content);
    
    messageContainer.appendChild(avatarDiv);
    messageContainer.appendChild(messageDiv);
    
    chatContainer.appendChild(messageContainer);
    chatContainer.scrollTop = chatContainer.scrollHeight;
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



function addFeedbackBox() {
    const feedbackContainer = document.createElement('div');
    feedbackContainer.classList.add('feedback-container');
    feedbackContainer.innerHTML = `
        <span class="star" data-rating="1">&#9733;</span>
        <span class="star" data-rating="2">&#9733;</span>
        <span class="star" data-rating="3">&#9733;</span>
        <span class="star" data-rating="4">&#9733;</span>
        <span class="star" data-rating="5">&#9733;</span>
    `;
    chatContainer.appendChild(feedbackContainer);

    const stars = feedbackContainer.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = star.dataset.rating;
            sendFeedback(rating);
            feedbackContainer.remove();
        });
    });
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

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    appendMessage('user', message);
    userInput.value = '';
    userInput.style.height = '25px';

    sendBtn.disabled = true;
    lastQuestion = message;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question: message }),
        });

        const reader = response.body.getReader();
        let assistantMessage = '';
        let statusMessage = null;
        let animationInterval = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const data = JSON.parse(chunk);

            if (data.status === 'searching') {
                if (!statusMessage) {
                    setSearchingIcon();
                    statusMessage = createStatusMessage("Searching");
                    animationInterval = animateStatusMessage(statusMessage);
                }
            } else if (data.status === 'generating') {
                if (statusMessage) {
                    clearInterval(animationInterval);
                    statusMessage.textContent = "Generating...";
                    setGeneratingIcon();
                }
            } else if (data.status === 'complete') {
                if (statusMessage) {
                    statusMessage.remove();
                    clearInterval(animationInterval);
                    setDefaultIcon();
                }
                appendMessage('assistant', data.answer);
                sendBtn.disabled = false;
                break;
            }

            if (data.answer) {
                assistantMessage += data.answer;
            }
        }
    } catch (error) {
        console.error('Error:', error);
        sendBtn.disabled = false;
    }
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

