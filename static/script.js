

// === Блок хранения цветов рамок по классам объектов ===
// === Блок хранения цветов рамок по классам объектов ===
var bounding_box_colors = {}; // словарь: имя класса -> цвет рамки

// === Блок хранения пользовательского порога достоверности ===
var user_confidence = 0.6; // начальный порог отображения объектов: 60%

// === Блок набора доступных цветов для новых классов ===
var color_choices = [
  "#C7FC00", "#FF00FF", "#8622FF", "#FE0056",
  "#00FFCE", "#FF8000", "#00B7EB", "#FFFF00",
  "#0E7AFE", "#FFABAB", "#0000FF", "#CCCCCC",
];

// === Блок инициализации canvas ===
var canvas_painted = false; // признак, что canvas уже был размещён поверх видео
var canvas = document.getElementById("video_canvas"); // получение canvas по id
var ctx = canvas.getContext("2d"); // 2D-контекст для рисования рамок и текста

// === Блок инициализации движка Roboflow ===
const inferEngine = new inferencejs.InferenceEngine(); // создание движка инференса
var modelWorkerId = null; // id воркера модели, будет получен после startWorker()

// === Блок покадрового распознавания ===
function detectFrame() {
  // если модель ещё не загружена, повторить попытку на следующем кадре
  if (!modelWorkerId) return requestAnimationFrame(detectFrame);

  // запуск инференса по текущему кадру видео
  inferEngine.infer(modelWorkerId, new inferencejs.CVImage(video)).then(function(predictions) {

    // === Блок первичной инициализации canvas ===
    if (!canvas_painted) {
      var video_start = document.getElementById("video1"); // получаем видеоэлемент

      canvas.top = video_start.top;
      canvas.left = video_start.left;
      canvas.style.top = video_start.top + "px";
      canvas.style.left = video_start.left + "px";
      canvas.style.position = "absolute"; // размещение canvas поверх видео
      video_start.style.display = "block"; // показываем видео после готовности
      canvas.style.display = "absolute";
      canvas_painted = true; // инициализация выполнена

      var loading = document.getElementById("loading");
      loading.style.display = "none"; // скрываем индикатор загрузки
    }

    // переход к следующему кадру
    requestAnimationFrame(detectFrame);

    // очистка холста перед новой отрисовкой
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // если видео существует, рисуем рамки
    if (video) {
      drawBoundingBoxes(predictions, ctx);
    }
  });
}

// === Блок отрисовки результатов распознавания ===
function drawBoundingBoxes(predictions, ctx) {
  for (var i = 0; i < predictions.length; i++) {
    var confidence = predictions[i].confidence; // достоверность текущего предсказания

    // пропуск объектов, которые ниже пользовательского порога
    if (confidence < user_confidence) {
      continue;
    }

    // === Блок выбора цвета рамки ===
    if (predictions[i].class in bounding_box_colors) {
      ctx.strokeStyle = bounding_box_colors[predictions[i].class]; // используем уже назначенный цвет
    } else {
      var color = color_choices[Math.floor(Math.random() * color_choices.length)];
      ctx.strokeStyle = color;
      color_choices.splice(color_choices.indexOf(color), 1); // удаляем цвет из списка доступных
      bounding_box_colors[predictions[i].class] = color; // закрепляем цвет за классом
    }

    // === Блок вычисления координат рамки ===
    var prediction = predictions[i];
    var x = prediction.bbox.x - prediction.bbox.width / 2;  // перевод координат центра в левый верхний угол
    var y = prediction.bbox.y - prediction.bbox.height / 2;
    var width = prediction.bbox.width;
    var height = prediction.bbox.height;

    // === Блок рисования прямоугольника и подписи ===
    ctx.rect(x, y, width, height);
    ctx.fillStyle = "rgba(0, 0, 0, 0)";
    ctx.fill();

    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = "4";
    ctx.strokeRect(x, y, width, height); // рисование ограничивающей рамки
    ctx.font = "25px Arial";
    ctx.fillText(
      prediction.class + " " + Math.round(confidence * 100) + "%",
      x,
      y - 10
    ); // вывод подписи класса и процента уверенности
  }
}

// === Блок запуска видеопотока и модели ===
function webcamInference() {
  var loading = document.getElementById("loading");
  loading.style.display = "block"; // показываем индикатор загрузки

  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "environment" } }) // запрос доступа к камере
    .then(function(stream) {
      video = document.createElement("video"); // создаём элемент video
      video.srcObject = stream; // привязываем к нему поток камеры
      video.id = "video1";

      video.style.display = "none"; // скрываем до полной готовности
      video.setAttribute("playsinline", "");

      document.getElementById("video_canvas").after(video); // вставляем видео после canvas

      video.onloadedmetadata = function() {
        video.play(); // запуск видеопотока после загрузки метаданных
      }

      // === Блок настройки размеров видео и canvas ===
      video.onplay = function() {
        height = video.videoHeight;
        width = video.videoWidth;

        video.width = width;
        video.height = height;
        video.style.width = 640 + "px";
        video.style.height = 480 + "px";

        canvas.style.width = 640 + "px";
        canvas.style.height = 480 + "px";
        canvas.width = width;
        canvas.height = height;

        document.getElementById("video_canvas").style.display = "block";
      };

      ctx.scale(1, 1); // масштабирование контекста canvas без изменения размеров

      // === Блок запуска модели Roboflow ===
      inferEngine.startWorker(
        MODEL_NAME,
        MODEL_VERSION,
        publishable_key,
        [{ scoreThreshold: CONFIDENCE_THRESHOLD }]
      ).then((id) => {
        modelWorkerId = id; // сохраняем id воркера модели
        detectFrame(); // запускаем покадровое распознавание
      });
    })
    .catch(function(err) {
      console.log(err); // вывод ошибки доступа к камере в консоль
    });
}

// === Блок изменения порога достоверности пользователем ===
function changeConfidence() {
  user_confidence = document.getElementById("confidence").value / 100; // перевод процентов в диапазон 0..1
}

// === Блок подписки на изменение ползунка ===
document.getElementById("confidence").addEventListener("input", changeConfidence);

// === Блок запуска всего приложения ===
webcamInference(); // запуск камеры, модели и цикла распознавания