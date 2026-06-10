var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { marked } from './marked.esm.js';
const convElement = document.getElementById('conversation'); // Add !
const promptInput = document.getElementById('prompt-input'); // Add !
const spinner = document.getElementById('spinner'); // Add !
const sendButton = document.getElementById('sendButton'); // ADDED: Send button reference
const fileInput = document.getElementById('file-input');
const fileStatus = document.getElementById('file-status');
// Helper function to update the state of the send button
function updateSendButtonState() {
    const hasText = promptInput.value.trim().length > 0;
    const hasFile = fileInput.files && fileInput.files.length > 0;
    sendButton.disabled = !(hasText || hasFile);
}
// Show the selected file name
fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
        fileStatus.textContent = `📎 Attached: ${Array.from(fileInput.files).map(f => f.name).join(', ')}`;
        fileStatus.classList.remove('d-none');
    }
    else {
        fileStatus.textContent = '';
        fileStatus.classList.add('d-none');
    }
    updateSendButtonState();
});
// stream the response and render messages as each chunk is received
// data is sent as newline-delimited JSON
function onFetchResponse(response) {
    return __awaiter(this, void 0, void 0, function* () {
        let text = '';
        let decoder = new TextDecoder();
        if (response.ok) {
            const reader = response.body.getReader(); // Add !
            while (true) {
                const { done, value } = yield reader.read();
                if (done) {
                    break;
                }
                text += decoder.decode(value);
                yield addMessages(text);
                spinner.classList.remove('active');
            }
            yield addMessages(text);
            promptInput.disabled = false;
            promptInput.focus();
            updateSendButtonState(); // Enable button after response and input focus
        }
        else {
            const text = yield response.text();
            console.error(`Unexpected response: ${response.status}`, { response, text });
            throw new Error(`Unexpected response: ${response.status}`);
        }
    });
}
// take raw response text and render messages into the `#conversation` element
// Message timestamp is assumed to be a unique identifier of a message, and is used to deduplicate
// hence you can send data about the same message multiple times, and it will be updated
// instead of creating a new message elements
function addMessages(responseText) {
    return __awaiter(this, void 0, void 0, function* () {
        const lines = responseText.split('\n');
        const messages = lines
            .filter(line => line.trim().length > 0)
            .map(line => {
            try {
                return JSON.parse(line);
            }
            catch (e) {
                // Ignore partial JSON lines during streaming
                return null;
            }
        })
            .filter((msg) => msg !== null);
        for (const message of messages) {
            // we use the timestamp as a crude element id
            const { timestamp, role, content } = message;
            const id = `msg-${timestamp}`;
            let msgDiv = document.getElementById(id);
            if (!msgDiv) {
                msgDiv = document.createElement('div');
                msgDiv.id = id;
                msgDiv.title = `${role} at ${timestamp}`;
                msgDiv.classList.add('border-top', 'pt-2', role);
                convElement.appendChild(msgDiv);
            }
            msgDiv.innerHTML = yield marked.parse(content);
        }
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
}
function onError(error) {
    console.error(error);
    document.getElementById('error').classList.remove('d-none'); // Add !
    document.getElementById('spinner').classList.remove('active'); // Add !
    sendButton.disabled = false; // Ensure button is re-enabled on error
    promptInput.disabled = false;
    promptInput.focus();
}
function onSubmit(e) {
    return __awaiter(this, void 0, void 0, function* () {
        e.preventDefault();
        spinner.classList.add('active');
        sendButton.disabled = true; // Disable button immediately on submit
        const body = new FormData(e.target);
        promptInput.value = '';
        promptInput.disabled = true;
        fileInput.value = '';
        fileStatus.textContent = '';
        fileStatus.classList.add('d-none');
        const response = yield fetch('/chat/', { method: 'POST', body });
        yield onFetchResponse(response);
    });
}
// call onSubmit when the form is submitted (e.g. user clicks the send button or hits Enter)
document.querySelector('form').addEventListener('submit', (e) => onSubmit(e).catch(onError)); // Add !
// ADDED: Listen for input changes to update button state
promptInput.addEventListener('input', updateSendButtonState);
// load messages on page load
fetch('/chat/').then(onFetchResponse).catch(onError);
updateSendButtonState(); // Call on initial page load
//# sourceMappingURL=app.js.map
