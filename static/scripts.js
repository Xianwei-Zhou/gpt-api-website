function handleFunctionType(functionType, previousMessages = false) {
    localStorage.setItem("functionType", functionType);
    localStorage.setItem("previousMessages", JSON.stringify(previousMessages));
    window.location.href = '../templates/chat.html';
}

window.addEventListener("load", () => {
    const messageForm = document.getElementById("messageForm");
    const messages = document.querySelector(".messages");
    const modelSelector = document.getElementById("modelSelector");
    messageForm.addEventListener("submit", async function (event) {
        const messageInput = event.target.message;
        event.preventDefault();
        if (messageInput.value.trim()) {
            showToast();
        }

        if (messageInput.value.trim()) {
            addMessage("user", "我", messageInput.value);
            const gptReply = await getAnswerFromServer(messageInput.value, modelSelector.value);
            addMessage("server", "ChatGPT", gptReply);
            messageInput.value = "";
        }
    });


    function addMessage(senderType, sender, content) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message");
        messageElement.classList.add(senderType === "user" ? "user-message" : "server-message");

        // 处理换行符
        content = content.replace(/\r?\n/g, "<br>");

        // 处理代码块
        content = content.replace(/```(?:\w+\n)?([\s\S]*?)```/g, (_, code) => {
            return '<pre><code>' + code.trim().replace(/<br>/g, "\n") + '</code></pre>';
        });

        // 处理整行的数学公式
        content = content.replace(/^\$\$([\s\S]*?)\$\$/gm, (_, equation) => {
            return '<div class="math">' + equation.trim().replace(/<br>/g, "\n") + '</div>';
        });

        // 将消息内容包裹在一个具有 .message-content 类的 span 元素中
        // messageElement.innerHTML = `<strong>${sender}:</strong> ${content}`;
        messageElement.innerHTML = `<strong>${sender}:</strong> <span class="message-content">${content}</span>`;

        messages.appendChild(messageElement);
        messages.scrollTop = messages.scrollHeight;

        // 渲染数学公式
        MathJax.typeset([messageElement]);
    }

    function isChineseChar(char) {
        const code = char.charCodeAt(0);
        return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);
    }

    function countTokens(messages) {
        let numTokens = 0;
        messages.forEach(message => {
            numTokens += 4;
            Object.values(message).forEach(value => {
                for (let i = 0; i < value.length; i++) {
                    numTokens += isChineseChar(value[i]) ? 2 : 1;
                }
            });
            if (message.hasOwnProperty('name')) {
                numTokens -= 1;
            }
        });
        numTokens += 2;
        return numTokens;
    }


    function getPreviousMessages() {
        const shouldKeepPreviousMessages = JSON.parse(localStorage.getItem("previousMessages"));
        if (!shouldKeepPreviousMessages) {
            return [];
        }

        const messages = [];
        const messageElements = document.querySelectorAll('.messages > div');
        // console.log("Message elements: ", messageElements);

        let tokenCount = 0;

        for (let i = messageElements.length - 1; i >= 0; i--) {
            const element = messageElements[i];
            const role = element.classList.contains('user-message') ? 'user' : 'assistant';
            const contentElement = element.querySelector('.message-content');
            const content = contentElement ? contentElement.innerText.trim() : '';

            if (content) {
                const newMessage = {role, content};
                const newTokenCount = tokenCount + countTokens([newMessage]);
                if (newTokenCount <= 4000) {
                    messages.unshift(newMessage);
                    tokenCount = newTokenCount;
                } else {
                    break;
                }
            }
        }
        console.log("tokenCount: " + tokenCount)

        return messages;
    }


    async function getAnswerFromServer(question, model) {
        const pvMessages = JSON.parse(localStorage.getItem("previousMessages"));
        const functionType = localStorage.getItem("functionType");
        let pviousMessages = [];


        if (pvMessages) {
            pviousMessages = getPreviousMessages();
        }

        try {
            const response = await fetch("/ask", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    question: question,
                    model: model,
                    function: functionType,
                    previous_messages: pviousMessages,
                }),
            });
            if (response.ok) {
                const data = await response.json();
                return data["answer"];
            } else {
                throw new Error("抱歉，请稍后重试");
            }
        } catch (error) {
            console.error("Error calling the server: ", error.message);
            return `抱歉，出现了一个问题：${error.message},请稍后重试`;
        }
    }

    function showToast() {
        const toast = document.getElementById("toast");
        toast.style.display = "block";
        setTimeout(() => {
            toast.style.display = "none";
        }, 2000);
    }

});