import time

import openai
from flask_cors import CORS
import os
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)

# 配置 Redis URL
app.config["RATELIMIT_STORAGE_URL"] = "redis://localhost:6379"

# 在服务器使用需要注释掉这段话
proxy = "http://127.0.0.1:18081"
os.environ["http_proxy"] = proxy
os.environ["https_proxy"] = proxy
# 配置API密钥
load_dotenv()
api_key = os.environ.get("OPENAI_API_KEY")
openai.api_key = api_key


# 配置请求限制
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["15 per minute"]  # 更改这里的限制，例如 "5 per minute" 表示每分钟 5 个请求
)


def get_answer(question, model, context='', previous_messages=''):
    if previous_messages == '':
        messages = [
            {"role": "system", "content": context},
            {"role": "user", "content": question}]
    else:
        messages = [{"role": "system", "content": context}]
        messages.extend(previous_messages)
        messages.append({"role": "user", "content": question})
    start_time = time.time()
    response = openai.ChatCompletion.create(
        model=model,
        messages=messages
    )
    end_time = time.time()
    print(f"API request duration: {end_time - start_time} seconds")

    answer = response['choices'][0]['message']['content']
    return answer


@app.route('/ask', methods=['POST'])
@limiter.limit("25 per minute")  # 请确保这里的限制与上面配置的限制一致
def ask():
    user_question = request.json['question']
    model = request.json['model']
    function = request.json.get('function', '')
    previous_messages = request.json.get('previous_messages', '')

    context = ''
    if function == "translator":
        context = "你现在是一个翻译器，你直接在中英文之间翻译接下来的文字，无需任何解释"
        previous_messages = ''
    elif function == "paraphrase":
        context = "你现在是一个改述器，你直接将接下来的文章通过更换词、短语或表达方式等方法和原文尽量不相同，但语义相同。"
        # previous_messages=''
    elif function == "chatbot":
        context = "你现在是我的朋友，请你以朋友的身份和我继续对话："
    elif function == "en_essay":
        context = "你现在是我的英语老师，我是一名天资不太高的学生，需要你给我详细的指导，如修改作文解释语法等。在遇到我不理解的地方希望你能循序渐进的指导我直至我弄懂。"


    assistant_answer = get_answer(user_question, model, context, previous_messages)
    return jsonify({"answer": assistant_answer})


@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)


@app.route('/chat', methods=['GET'])
def chat():
    return render_template('chat.html')


@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
