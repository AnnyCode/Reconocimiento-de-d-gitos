# TecnoForms

Aplicacion web para dibujar digitos y comparar los modelos KNN, SVM y CNN entrenados con MNIST.

## Requisitos

- Python 3.10 o posterior
- Git LFS para descargar los archivos de modelos

## Instalacion

Clona el repositorio y descarga los modelos:

```powershell
git lfs install
git clone https://github.com/USUARIO/reconocimiento-de-digitos.git
cd reconocimiento-de-digitos
git lfs pull
```

Crea un entorno virtual e instala las dependencias:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Inicia Flask:

```powershell
python app.py
```

Abre http://127.0.0.1:5000 en el navegador.

## Modelos

La aplicacion carga KNN y SVM desde `Modelo/modelo_knn.joblib` y `Modelo/modelo_svm.joblib`, y la CNN desde `Modelo/modelo_cnn_entrenado.h5`. Los archivos binarios se almacenan con Git LFS.
