const lienzo = document.getElementById("lienzo");
const contexto = lienzo.getContext("2d");
const botonLimpiar = document.getElementById("limpiar");
const botonPredecir = document.getElementById("predecir");
const botonesModelo = document.querySelectorAll("[data-modelo]");
const digitoResultado = document.getElementById("digito");
const estadoResultado = document.getElementById("estado");
const modeloResultado = document.getElementById("modelo-resultado");
const contenedorConfianza = document.getElementById("contenedor-confianza");
const confianzaResultado = document.getElementById("confianza-resultado");

let dibujando = false;
let modeloSeleccionado = "knn";
let punteroActivo = null;

function limpiarLienzo() {
    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, lienzo.width, lienzo.height);
    contexto.lineCap = "round";
    contexto.lineJoin = "round";
    contexto.lineWidth = 22;
    contexto.strokeStyle = "#000000";
}

function obtenerPunto(evento) {
    const limites = lienzo.getBoundingClientRect();
    return {
        x: ((evento.clientX - limites.left) / limites.width) * lienzo.width,
        y: ((evento.clientY - limites.top) / limites.height) * lienzo.height,
    };
}

lienzo.addEventListener("pointerdown", (evento) => {
    if (evento.pointerType === "mouse" && evento.button !== 0) {
        return;
    }

    evento.preventDefault();
    dibujando = true;
    punteroActivo = evento.pointerId;
    lienzo.setPointerCapture(evento.pointerId);

    const punto = obtenerPunto(evento);
    contexto.beginPath();
    contexto.moveTo(punto.x, punto.y);
    contexto.lineTo(punto.x, punto.y);
    contexto.stroke();
});

lienzo.addEventListener("pointermove", (evento) => {
    if (!dibujando || evento.pointerId !== punteroActivo) {
        return;
    }

    evento.preventDefault();
    const punto = obtenerPunto(evento);
    contexto.lineTo(punto.x, punto.y);
    contexto.stroke();
});

function terminarTrazo(evento) {
    if (evento.pointerId !== punteroActivo) {
        return;
    }

    dibujando = false;
    punteroActivo = null;
    contexto.closePath();
}

lienzo.addEventListener("pointerup", terminarTrazo);
lienzo.addEventListener("pointercancel", terminarTrazo);

botonLimpiar.addEventListener("click", () => {
    limpiarLienzo();
    digitoResultado.textContent = "—";
    estadoResultado.textContent = "Tu resultado aparecerá aquí.";
    estadoResultado.classList.remove("error");
    contenedorConfianza.hidden = true;
});

botonesModelo.forEach((boton) => {
    boton.addEventListener("click", () => {
        modeloSeleccionado = boton.dataset.modelo;
        botonesModelo.forEach((opcion) => {
            const seleccionado = opcion === boton;
            opcion.classList.toggle("seleccionado", seleccionado);
            opcion.setAttribute("aria-pressed", String(seleccionado));
        });
        modeloResultado.textContent = modeloSeleccionado.toUpperCase();
        contenedorConfianza.hidden = true;
    });
});

botonPredecir.addEventListener("click", async () => {
    botonPredecir.disabled = true;
    estadoResultado.textContent = "Analizando el dibujo…";
    estadoResultado.classList.remove("error");
    contenedorConfianza.hidden = true;

    try {
        const respuesta = await fetch("/predecir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                imagen: lienzo.toDataURL("image/png"),
                modelo: modeloSeleccionado,
            }),
        });
        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(datos.error || "No se pudo realizar la predicción.");
        }

        digitoResultado.textContent = datos.prediccion;
        modeloResultado.textContent = datos.modelo.toUpperCase();
        estadoResultado.textContent = "Predicción completada.";

        if (typeof datos.confianza === "number") {
            confianzaResultado.textContent = `${(datos.confianza * 100).toFixed(1)}%`;
            contenedorConfianza.hidden = false;
        }
    } catch (error) {
        digitoResultado.textContent = "—";
        estadoResultado.textContent = error.message || "No se pudo conectar con el servidor.";
        estadoResultado.classList.add("error");
    } finally {
        botonPredecir.disabled = false;
    }
});

limpiarLienzo();
