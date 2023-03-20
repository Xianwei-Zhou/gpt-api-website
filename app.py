import openai
from flask_cors import CORS
import os
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
from steamship import Steamship

app = Flask(__name__)
CORS(app)

# 配置 Redis URL
# app.config["RATELIMIT_STORAGE_URL"] = "redis://localhost:6379"

proxy = "http://127.0.0.1:18081"
os.environ["http_proxy"] = proxy
os.environ["https_proxy"] = proxy

# 配置API密钥
load_dotenv()
api_key = os.environ.get("OPENAI_API_KEY")
openai.api_key = api_key

# gpt4.0
try:
    client = Steamship(workspace="my-unique-name")
    generator = client.use_plugin('gpt-4')

except:
    print('e')

# 配置请求限制
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["15 per minute"]  # 更改这里的限制，例如 "5 per minute" 表示每分钟 5 个请求
)


def get_answer(question, model):
    if model == "gpt-4":
        task = generator.generate(text=question)

        task.wait()
        print(task.output.blocks[0].text)
        return task.output.blocks[0].text
    else:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": question},
            ]
        )
        answer = response['choices'][0]['message']['content']
        return answer


# 定义一个函数，输入是用户提问，输出是模型生成的答案
# def get_answer(question):
#     response = openai.ChatCompletion.create(
#         model="gpt-3.5-turbo",
#         messages=[
#             {"role": "system", "content": "You are a helpful assistant."},
#             {"role": "user", "content": question},
#         ]
#     )
#     answer = response['choices'][0]['message']['content']
#     return answer


@app.route('/ask', methods=['POST'])
@limiter.limit("15 per minute")  # 请确保这里的限制与上面配置的限制一致
def ask():
    user_question = request.json['question']
    model = request.json['model']

    assistant_answer = get_answer(user_question, model)
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
