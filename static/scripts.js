function handleFunctionType(functionType, previousMessages = false) {
    localStorage.setItem("functionType", functionType);
    localStorage.setItem("previousMessages", JSON.stringify(previousMessages));
    window.location.href = "/templates/chat.html";
}

function updateTextBoxes(functionType) {
    const textBox1 = document.getElementById("text-box-1");
    const textBox2 = document.getElementById("text-box-2");
    const textBox3 = document.getElementById("text-box-3");
    const textBox4 = document.getElementById("text-box-4");
    textBox4.innerHTML = "更多功能可在\"特色服务\"处体验<br>有任何问题欢迎联系我们...";
    switch (functionType) {
        case "translator":
            textBox1.innerHTML = "请直接输入中文或英文";
            textBox2.innerHTML = "chatgpt会自动翻译（中译英英译中均可）";
            textBox3.innerHTML = "该模式不支持上下文";
            break;
        case "paraphrase":
            textBox1.innerHTML = "不保证论文降重效果，需要专业查重软件验证";
            textBox2.innerHTML = "可以多次生成，每次生成结果都不同";
            textBox3.innerHTML = "支持上下文，可以通过连续对话不断指定修改段落格式等";
            break;
        case "chatbot":
            textBox1.innerHTML = "FunctionType2: 提示文本1";
            textBox2.innerHTML = "FunctionType2: 提示文本2";
            textBox3.innerHTML = "FunctionType2: 提示文本3";
            break;
        case "en_essay":
            textBox1.innerHTML = "和你对话的是你的私人英语老师";
            textBox2.innerHTML = "大胆地说出你的困惑，老师会为你一一解答";
            textBox3.innerHTML = "支持连续对话，在问答中更好地掌握语言";
            break;
        // 其他functionType的情况
        default:

            textBox1.innerHTML = "提问应简洁清晰。如你可以解释【xx】吗，可以举【几】个例子吗";
            textBox2.innerHTML = "可指明角色，如你现在是【角色】，【要做什么】。下面我【需求】";
            textBox3.innerHTML = "可连续对话，在追问中得到更详细的回答，最多支持约2000字上下文";
    }
}


document.addEventListener("DOMContentLoaded", function () {
    // 从localStorage获取functionType
    const functionType = localStorage.getItem("functionType");

    // 调用函数并传入functionType值
    if (functionType) {
        updateTextBoxes(functionType);
    }
});
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
            hideHintTextBoxes();

            addMessage("user", "我", messageInput.value);
            const gptReply = await getAnswerFromServer(messageInput.value);
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
        messageElement.innerHTML = `<strong>${sender}:</strong> <span class="message-content">${content}</span>`;

        messages.appendChild(messageElement);
        messages.scrollTop = messages.scrollHeight;

        // 渲染数学公式
        MathJax.startup.promise.then(() => {
            MathJax.typesetPromise([messageElement]);
        });

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


    async function getAnswerFromServer(question, model = 'gpt-3.5-turbo') {
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

    function hideHintTextBoxes() {
        const hintTextBoxes = document.querySelectorAll(".text-box-hint");
        for (const textBox of hintTextBoxes) {
            textBox.style.display = "none";
        }
    }


});