from base64 import b64decode
from binascii import Error as Base64Error
from io import BytesIO
from pathlib import Path

import joblib
import numpy as np
import tensorflow as tf
from flask import Flask, jsonify, render_template, request, send_from_directory
from PIL import Image, ImageOps, UnidentifiedImageError


BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "Modelo"
VIEW_DIR = BASE_DIR / "Vista"
CONTROLLER_DIR = BASE_DIR / "Controlador"

app = Flask(__name__, template_folder=str(VIEW_DIR), static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024
app.config["TEMPLATES_AUTO_RELOAD"] = True


def cargar_modelos():
    """Carga los modelos entrenados sin modificar sus parámetros."""
    knn = joblib.load(MODEL_DIR / "modelo_knn.joblib")
    svm = joblib.load(MODEL_DIR / "modelo_svm.joblib")
    cnn = tf.keras.models.load_model(
        MODEL_DIR / "modelo_cnn_entrenado.h5",
        compile=False,
    )
    return {"knn": knn, "svm": svm, "cnn": cnn}


modelos = cargar_modelos()


def preparar_imagen(imagen_base64):
    """Convierte el dibujo a escala de grises MNIST, normalizado entre 0 y 1."""
    prefijo = "data:image/png;base64,"
    if not isinstance(imagen_base64, str) or not imagen_base64.startswith(prefijo):
        raise ValueError("La imagen enviada no tiene un formato PNG válido.")

    try:
        contenido = b64decode(imagen_base64[len(prefijo) :], validate=True)
        imagen = Image.open(BytesIO(contenido)).convert("L")
    except (Base64Error, UnidentifiedImageError, OSError) as error:
        raise ValueError("No se pudo leer la imagen dibujada.") from error

    imagen = ImageOps.invert(imagen)
    imagen = imagen.resize((28, 28), Image.Resampling.LANCZOS)
    imagen_array = np.asarray(imagen, dtype=np.float32) / 255.0

    if float(imagen_array.max()) < 0.02:
        raise ValueError("Dibuja un número antes de predecir.")

    return imagen_array


@app.get("/")
def inicio():
    return render_template("index.html")


@app.get("/vista/estilo.css")
def estilo_css():
    return send_from_directory(VIEW_DIR, "estilo.css")


@app.get("/controlador/script.js")
def script_js():
    return send_from_directory(CONTROLLER_DIR, "script.js")


@app.post("/predecir")
def predecir():
    datos = request.get_json(silent=True)
    if not isinstance(datos, dict):
        return jsonify({"error": "La solicitud debe contener datos JSON."}), 400

    nombre_modelo = datos.get("modelo")
    if not isinstance(nombre_modelo, str) or nombre_modelo not in modelos:
        return jsonify({"error": "Selecciona un modelo válido."}), 400

    try:
        imagen = preparar_imagen(datos.get("imagen"))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    modelo = modelos[nombre_modelo]
    if nombre_modelo == "cnn":
        entrada = imagen.reshape(1, 28, 28, 1)
        probabilidades = modelo.predict(entrada, verbose=0)[0]
        digito = int(np.argmax(probabilidades))
        confianza = float(probabilidades[digito])
    else:
        entrada = imagen.reshape(1, 784)
        digito = int(modelo.predict(entrada)[0])
        confianza = None

        if nombre_modelo == "knn" and hasattr(modelo, "predict_proba"):
            probabilidades = modelo.predict_proba(entrada)[0]
            indice_clase = int(np.where(modelo.classes_ == digito)[0][0])
            confianza = float(probabilidades[indice_clase])

    respuesta = {"prediccion": digito, "modelo": nombre_modelo}
    if confianza is not None:
        respuesta["confianza"] = confianza
    return jsonify(respuesta)


if __name__ == "__main__":
    app.run()
