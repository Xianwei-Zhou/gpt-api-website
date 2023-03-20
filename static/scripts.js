window.addEventListener("load", () => {
    // const sendMessageButton = document.querySelector("button[type='submit']");

    const messageForm = document.getElementById("messageForm");
    const messages = document.querySelector(".messages");
    const modelSelector = document.getElementById("modelSelector");
    addMessage("user", "我", "你是一个AI助手，帮我解决我的需求");
    addMessage("user", "（提问示例1）我", "你现在是 [角色]，请 [要做什么]，[描述]。下面我有以下几个问题 [1、2...]。例如：我希望你担任我的私人造型师。我会告诉你我的时尚偏好和体型，你会建议我穿的衣服。你应该只回复你推荐的服装，不要写解释。\n我的第一个要求是:我有一个正式的活动，我需要帮助选择服装。\n我的第二个要求是:我正在普吉岛度假，将去参加一个朋友的私人聚会，我需要帮助选择服装。");
    addMessage("user", "（提问示例2）我", "你可以解释[xx]吗，可以举几个例子吗？\n"+"提问方式不唯一，明确角色与需求即可")
    messageForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const messageInput = event.target.message;

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

        messageElement.innerHTML = `<strong>${sender}:</strong> ${content}`;
        messages.appendChild(messageElement);
        messages.scrollTop = messages.scrollHeight;

        // 渲染数学公式
        MathJax.typeset([messageElement]);
    }


    async function getAnswerFromServer(question, model) {
        try {
            const response = await fetch("/ask", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({question: question, model: model}),
            });
            if (response.ok) {
                const data = await response.json();
                return data["answer"];
            } else {
                throw new Error("Error: Unable to send message.");
            }
        } catch (error) {
            console.error("Error calling the server: ", error.message);
            return `抱歉，出现了一个问题：${error.message}`;
        }
    }


});