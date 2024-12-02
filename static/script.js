
const textArea = document.getElementById("input-text");

const submitButton = document.getElementById("send-data");

const clearButton = document.getElementById("reset-chat");

// Where ollama response will be rendered on user request sent
const response_area = document.getElementById("ollama-response");

// Poriton of text area that says "Comment"
const textAreaLabel = document.getElementById("textarea-label");

const response_container = document.getElementById("ollama-response-container");

// Initialize socket
const socket = io();

socket.on('connect', function () {
    socket.on('ollama-response', function (msg) {

        response_area.innerHTML += "<b>Ollama:</b> "

        const responseContainer = document.createElement('div');
        const paragraphs = msg.split('\n');
        let inCodeBlock = false;
        let codeBlockContent = "";

        paragraphs.forEach(paragraph => {
            // Handle code blocks (triple backticks)
            if (paragraph.trim().startsWith('```')) {
                if (inCodeBlock) {
                    // End of the code block
                    const pre = document.createElement('pre');
                    const code = document.createElement('code');
                    code.textContent = codeBlockContent.trim();
                    pre.appendChild(code);
                    responseContainer.appendChild(pre);
                    inCodeBlock = false;
                    codeBlockContent = "";
                } else {
                    // Start of a code block
                    inCodeBlock = true;
                }
                return;
            }

            if (inCodeBlock) {
                codeBlockContent += paragraph + '\n';
                return;
            }

            // Handle lists
            if (paragraph.startsWith('* ') || paragraph.startsWith('- ')) {
                const ul = document.createElement('ul');
                paragraph.split('\n').forEach(listItem => {
                    if (listItem.trim().startsWith('* ') || listItem.trim().startsWith('- ')) {
                        const li = document.createElement('li');
                        li.textContent = listItem.replace(/^\* |^- /, '');
                        ul.appendChild(li);
                    }
                });
                responseContainer.appendChild(ul);
            }
            // Handle inline code (single backticks)
            else if (paragraph.includes('`')) {
                const p = document.createElement('p');
                const parts = paragraph.split(/(`.+?`)/); // Split by inline code blocks
                parts.forEach(part => {
                    if (part.startsWith('`') && part.endsWith('`')) {
                        const code = document.createElement('code');
                        code.textContent = part.slice(1, -1); // Remove backticks
                        p.appendChild(code);
                    } else {
                        const textNode = document.createTextNode(part);
                        p.appendChild(textNode);
                    }
                });
                responseContainer.appendChild(p);
            }
            // Handle regular paragraphs
            else {
                const p = document.createElement('p');
                p.textContent = paragraph;
                responseContainer.appendChild(p);
            }
        });

        response_area.appendChild(responseContainer);

        response_area.innerHTML += "<hr />";

        textAreaLabel.textContent = "Comment";
    });

});


if (textArea.value.length < 1) {
    submitButton.setAttribute("disabled", true);
}

textArea.addEventListener("input", function () {

    if (textArea.value.length > 0) {
        submitButton.removeAttribute("disabled");

        if (textArea.value.includes("<") || textArea.value.includes(">")) {
            submitButton.setAttribute("disabled", true);
        }

        socket.emit('input-data', { text: textArea.value });

        socket.on('anon-data', function (msg) {

            textArea.value = msg;
        });

    } else {
        submitButton.setAttribute("disabled", true);
    }
});

//Pocess user submitted data in form so page doesn't get refreshed.
// This still sends the POST data to the backend Flask server
document.getElementById("user-input").addEventListener("submit", function (e) {

    e.preventDefault();

    const formData = { text: textArea.value };

    response_container.classList.remove("hidden");

    if (textArea.value.length > 0){

        // Add user message to response_area so user knows what they asked
        response_area.innerHTML += `<b>User:</b> ${textArea.value}<br /><br />`;

        fetch("/", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        }).then(response => response.text())
            .then(data => {
                
            })
            .catch(error => {
                console.error("Error", error);
            });

        textArea.value = '';
        textAreaLabel.textContent = "Processing request...";
    }


});

clearButton.addEventListener("click", function(e) {
    socket.emit('clear-chat', {info: "cleared"});

    response_area.innerHTML = "<b>Chat history has been reset, a new conversation has started</b><hr />";
});

