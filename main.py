# === Блок подключения библиотек ===
from flask import Flask, render_template  # Flask - серверное приложение, render_template - возврат HTML-шаблона

# === Блок инициализации веб-приложения ===
app = Flask(__name__)  # создание экземпляра Flask-приложения

# === Блок маршрутизации главной страницы ===
@app.route('/')  # маршрут для корневого URL
def hello_world():
    return render_template("index.html")  # возврат HTML-шаблона из папки templates

# === Блок запуска приложения ===
app.run("0.0.0.0")  # запуск веб-сервера Flask на всех сетевых интерфейсах