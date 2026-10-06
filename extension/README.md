# sharedom — Chrome Extension (DOM Screenshot Inspector)

[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-Instalar-blue?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/sharedom-dom-screenshot-i/nnpbohgnnkkagbbfjeknpeokbppddjnm)
[![NPM Library](https://img.shields.io/badge/NPM_Library-sharedom-red?logo=npm&logoColor=white)](https://www.npmjs.com/package/sharedom)

Extensión profesional para Google Chrome basada en el motor de la librería **`sharedom`**. Permite inspeccionar interactivamente cualquier página web, resaltar contenedores del DOM en hover, y capturar elementos, registros de consola y peticiones de red con un solo clic para copiarlos al portapapeles o descargarlos en alta resolución.

> 🌐 **Instálala directamente desde la Chrome Web Store:**  
> [**Descargar ShareDOM para Chrome**](https://chromewebstore.google.com/detail/sharedom-dom-screenshot-i/nnpbohgnnkkagbbfjeknpeokbppddjnm)

---

## ✨ Características Principales

- 🎯 **Inspector de DOM en tiempo real**: Resaltado visual instantáneo al pasar el cursor sobre cualquier elemento o contenedor de la página.
- 🏷️ **Etiquetas informativas**: Muestra etiqueta HTML (`<div>`, `<section>`, `<button>`), clases CSS, ID y dimensiones exactas en píxeles (`W × H`).
- ⌨️ **Navegación con teclado**:
  - `↑ (Flecha Arriba)`: Selecciona el contenedor padre (`parentElement`).
  - `↓ (Flecha Abajo)`: Selecciona el primer elemento hijo.
  - `Esc`: Cancela o cierra el inspector inmediatamente.
  - `Alt + Shift + S` (o `Cmd + Shift + S` en macOS): Atajo global para activar el inspector en la pestaña activa.
- 🛡️ **Aislamiento con Shadow DOM**: La interfaz y overlays de la extensión no interfieren con el CSS de la página web ni son capturados en la imagen final.
- 📋 **Copiar al portapapeles**: Copia la imagen PNG directamente al portapapeles del sistema operativo (`navigator.clipboard.write`).
- 💾 **Descarga instantánea & ZIP Multipágina**: Descarga capturas optimizadas. Si la captura contiene múltiples páginas de red o consola, las empaqueta automáticamente en un archivo `.zip` comprimido con cero dependencias.
- ⏱️ **Captura desde la carga (opt-in por sitio)**: Interruptor en el popup que activa el tracker en `document_start` para ese origen concreto, para no perder los mensajes de consola emitidos durante la carga de la página.
- 🟢 **Indicador visual**: El icono de la extensión muestra un punto verde en la esquina mientras el sitio de la pestaña activa se observa desde la carga, con su leyenda explicativa en el popup (EN / ES).
- 📊 **Captura de Consola y Red**: Exporta los registros de la consola del navegador y tablas de peticiones HTTP (método, endpoint, status, duración) como imágenes compactas (12-15 filas por página), documentos PDF multipágina o archivos ZIP.
- 📄 **Exportación a PDF**: Descarga cualquier elemento o captura especializada directamente como documento PDF formateado.
- 🎨 **Controles en tiempo real**:
  - **Resolución**: `1x`, `2x (Retina HD)`, `3x (Ultra HD)`.
  - **Formato**: `PNG` (con canal alfa), `JPEG`, `WebP`.
  - **Fondo**: `Transparente`, `Blanco`, `Oscuro` o `Color personalizado`.
- 🎥 **Grabador de pantalla integrado en el popup**: Graba una pestaña, una ventana o la pantalla completa, con fps sin límite opcional, micrófono, presets de calidad, salida MP4 o WebM y marca de agua discreta. La grabación sigue corriendo con el popup cerrado y el buffer va a disco, no a memoria.
- 🆕 **Novedades al actualizar**: La primera vez que abres el popup tras una actualización aparece una tarjeta con los cambios de esa versión, en tu idioma, y solo esa vez.
- 🌐 **8 idiomas (EN / ES / ZH / JA / PT / DE / KO / RU)**: Selector con banderas en el popup, igual que la landing.
- ⚡ **Zero dependencias externas**: Motor de renderizado `sharedom` autónomo mediante SVG `foreignObject` y Canvas nativo.
- 🧩 **Librería NPM disponible**: Todas las funciones de captura de elementos, consola, red, PDF y ZIP también están disponibles programáticamente vía `npm i sharedom`.

---

## 🚀 Instalación en Google Chrome (Modo Desarrollador)

Sigue estos sencillos pasos para instalar la extensión localmente:

### Paso 1: Compilar la extensión

Desde la raíz del repositorio, ejecuta:

```bash
npm run build:extension
```

Esto compilará los módulos TypeScript y generará la carpeta lista para producción en `extension/dist/`.

### Paso 2: Cargar la extensión en Chrome

1. Abre Google Chrome y navega a:
   ```text
   chrome://extensions/
   ```
2. Activa el interruptor **"Modo de desarrollador"** (*Developer mode*) ubicado en la esquina superior derecha.
3. Haz clic en el botón **"Cargar descomprimida"** (*Load unpacked*) en la esquina superior izquierda.
4. Selecciona la carpeta `extension/dist` dentro de este proyecto:
   ```text
   /ruta/a/sharedom/extension/dist
   ```
5. ¡Listo! El icono de **sharedom** aparecerá en la barra de herramientas de extensiones de Chrome. Puedes fijarlo (*Pin*) para tener acceso rápido.

---

## 📖 Modo de Uso

1. **Abrir cualquier sitio web** (ej. GitHub, Wikipedia, tu propia app web).
2. **Activar el Inspector**:
   - Haz clic en el icono de **sharedom** en la barra de herramientas de Chrome y pulsa **"Inspect DOM Element"**.
   - O presiona el atajo de teclado: `Alt + Shift + S` (`Cmd + Shift + S` en macOS).
   - O haz clic derecho en la página y selecciona **"Inspect & Capture DOM Element"**.
3. **Seleccionar un contenedor**:
   - Pasa el mouse sobre el elemento que deseas capturar. Verás el recuadro de resaltado índigo y las dimensiones.
   - Si deseas capturar el contenedor exterior o padre, presiona la tecla `↑`.
4. **Hacer clic para capturar**:
   - Al hacer clic, se abrirá el panel flotante con la previsualización en vivo.
   - Ajusta la escala (1x, 2x, 3x) o el formato si lo deseas.
   - Haz clic en **"Copy Image"** para pegar directamente en Slack, Discord, Notion, Figma, etc.
   - Haz clic en **"Download"** para guardar el archivo en tu disco.

---

## 🎥 Grabador de Pantalla

Pulsa **"Grabar Pantalla"** en el popup y la ventana cambia a la vista del grabador, con su botón de volver. No se abre ninguna ventana aparte. Chrome pregunta qué compartir (pestaña, ventana o pantalla completa) con su propio diálogo; la extensión nunca graba sin esa autorización.

| Ajuste | Opciones |
| :--- | :--- |
| Fotogramas | 30 / 60 / 120 fps o **Sin límite**, que deja el ritmo a la fuente y a la potencia del equipo |
| Calidad | Estándar, Alta, Ultra — el bitrate se calcula con la resolución y los fps reales de la pista |
| Formato | **WebM** (VP9, por defecto) o **MP4** (H.264, el mejor perfil que soporte tu Chrome) |
| Micrófono | Opcional; se mezcla con el audio de la fuente en una sola pista |

> **Por qué WebM por defecto**: el muxer MP4 de Chrome no entrega datos mientras grabas — escribe el archivo entero al detener. Eso tiene dos consecuencias: el tamaño no se puede medir en vivo (se muestra `—` hasta el final) y el navegador retiene el vídeo en memoria hasta que paras, así que la grabación se detiene sola al llegar al límite seguro de 2 GB estimados. WebM entrega fragmentos continuamente: tamaño real en vivo y escritura a disco sobre la marcha. Elige MP4 cuando necesites compatibilidad directa con un editor; WebM para sesiones largas.

> **Micrófono**: Chrome no permite mostrar el diálogo de permiso de micrófono dentro de un popup de extensión — lo deniega en el acto, sin preguntar. Por eso, al activar la casilla se abre una pestaña propia (`microphone.html`) donde sí aparece el diálogo; el permiso queda concedido al origen de la extensión y el documento oculto que graba lo hereda. Si ya estaba concedido no se abre nada. Y si lo deniegas, la grabación sigue y el estado lo dice (*"Grabando · sin micrófono"*) en vez de ignorarlo en silencio.

Atajo: `Alt + Shift + R` (`⌥ + ⇧ + R` en macOS) inicia y detiene la grabación sin abrir el popup.

### La grabación sobrevive al popup

El popup se cierra en cuanto el selector de Chrome toma el foco, así que la grabación no vive ahí: corre en un **documento offscreen** gobernado por el service worker. Mientras graba:

- El icono de la barra muestra el badge rojo `REC`.
- Al volver a abrir el popup aparece directamente la vista del grabador, con el **tiempo transcurrido y el peso** actualizándose y el botón de detener.

### Marca de agua

Cada fotograma pasa por un compositor (`MediaStreamTrackProcessor` → canvas → `MediaStreamTrackGenerator`) que estampa un distintivo pequeño de ShareDOM en la esquina inferior derecha, con margen proporcional al tamaño del vídeo. Ocupa menos del 2% del cuadro y nunca toca el centro de la imagen. El compositor entrega un fotograma de salida por cada fotograma de entrada, así que no recorta la fluidez ni con "Sin límite".

### Memoria

Los fragmentos se escriben en el sistema de archivos privado del origen (OPFS) según llegan, no en memoria. Al detener, el archivo ya está en disco y se entrega a `chrome.downloads`, que lo guarda donde tengas configurado el navegador. Una grabación de una hora ocupa lo mismo en memoria que una de diez segundos.

---

## ⏱️ Captura desde la Carga de la Página (opt-in por sitio)

Por defecto la extensión usa `activeTab`: el tracker se inyecta en el momento en que abres el popup. Todo lo que la página imprimió en consola **antes** de ese instante ya no existe y no puede recuperarse.

- **Red**: siempre se reconstruye desde *Resource Timing*, aunque inyectes tarde. Las peticiones previas aparecen con su estado real (404, 500…) cuando el servidor es del mismo origen o envía `Timing-Allow-Origin`.
- **Consola**: solo existe desde que el tracker se instala.

Para capturar también la consola desde el primer byte, activa **"Capturar Desde la Carga"** en el popup:

1. Abre el sitio y pulsa el icono de sharedom.
2. Activa el interruptor. Chrome pedirá permiso de host **para ese origen únicamente** (`https://tu-sitio.com/*`).
3. Recarga la pestaña. A partir de ahí `page-tracker.js` se registra con `chrome.scripting.registerContentScripts()` en `world: 'MAIN'` y `runAt: 'document_start'`.

### 🟢 Cómo saber si un sitio se está observando

Cuando la pestaña activa pertenece a un origen con la captura temprana activada, el icono de la extensión en la barra de herramientas muestra un **punto verde** en la esquina inferior derecha, y su tooltip lo confirma (*"Observando este sitio desde la carga de la página"*). En el resto de sitios el icono es el normal.

El popup incluye la leyenda del color debajo del interruptor, traducida al idioma seleccionado, para que el significado del punto no dependa de recordarlo.

> El icono es específico de cada pestaña: Chrome lo reinicia en cada navegación, así que el service worker lo vuelve a aplicar en `tabs.onUpdated` y `tabs.onActivated`. Las variantes se generan en tiempo de build (`icon-watching-16/32/48/128.png`) con el mismo generador nativo de PNG que el icono principal, sin dependencias.

Desactivar el interruptor revoca el permiso y elimina el registro. Los permisos concedidos se pueden revisar y revocar también desde `chrome://extensions`; el service worker vuelve a sincronizar el registro cuando eso ocurre.

> La extensión no declara permisos de host en el manifiesto: `*://*/*` vive en `optional_host_permissions` y solo se concede sitio por sitio cuando tú lo pides.

### 🖼️ Imágenes de otros dominios

Un segundo interruptor en la misma tarjeta activa la lectura de imágenes bloqueadas por CORS. El navegador impide que la página lea esos píxeles, así que la extensión las descarga desde su propio contexto y las inyecta en la captura. Requiere el permiso amplio (`*://*/*`) porque la imagen puede venir de cualquier CDN, está desactivado por defecto y se revoca desde el mismo interruptor.

Sin él, una imagen bloqueada simplemente no aparece en la captura. Con él, la captura coincide con lo que pinta el navegador.

### ⌨️ El atajo de teclado

`Alt + Shift + S` (`⌥ + ⇧ + S` en macOS) activa el inspector en la pestaña activa. Si no responde, otro programa o extensión puede tener el atajo tomado: el botón **"Cambiar atajos"** del popup abre `chrome://extensions/shortcuts` para reasignarlo. Cuando la inyección falla, el icono muestra un badge rojo `!` con el motivo en el tooltip en lugar de no hacer nada en silencio.

---

## 🚨 Errores de Red en la Captura de Consola

Cuando una petición falla, Chrome imprime `GET https://api/... 404 (Not Found)` **desde el propio navegador**, no a través de `console.error`. Ningún script de página puede interceptar esas líneas.

La extensión las reconstruye desde la capa de red: cada respuesta con estado `>= 400`, cada petición que no conecta y cada recurso (`<img>`, `<script>`, `<link>`) que falla generan una entrada de nivel `error` en la tabla de consola, además de su fila correspondiente en la tabla de red.

---

## 🧪 Pruebas Automatizadas

```bash
npm test                      # Suite completa (librería, sharedom/testing y bundle de la extensión)
npx playwright test e2e/extension.spec.ts
```

`e2e/recorder.spec.ts` verifica el grabador completo sobre el build real: que la marca de agua queda en la esquina sin tocar el centro del cuadro, y que grabar desde el popup sigue funcionando con el popup cerrado, muestra tiempo y peso al reabrirlo, y entrega el archivo al detener.

`e2e/extension.spec.ts` compila la extensión y verifica sobre el artefacto real de `extension/dist`:

- que `page-tracker.js` inyectado en `document_start` registra consola, red y los errores 404 sintetizados;
- que inyectado **después** de la carga (el flujo del popup) sigue recuperando el historial de red;
- que el service worker arranca y que la captura temprana permanece desactivada mientras no se conceda el permiso;
- que, con el permiso concedido, el content script queda registrado en `document_start` / `world: MAIN`, captura la consola sin inyección manual y el icono de la pestaña pasa a la variante con punto verde.

> El diálogo nativo de permisos de Chrome no se puede aceptar desde una prueba automatizada, así que ese último test carga una copia del build con el host ya declarado. Todo lo posterior al diálogo se ejercita de verdad.

Para automatizar tus propias páginas con Playwright o Puppeteer sin instalar la extensión, usa `sharedom/testing` (ver [README principal](../README.md)).

---

## 🛠️ Estructura del Código

```text
extension/
├── manifest.json                  # Definición Manifest V3
├── icons/                         # Iconos en 16x16, 32x32, 48x48, 128x128
├── scripts/
│   ├── build.mjs                  # Script de empaquetado
│   └── generate-icons.mjs         # Generador nativo de iconos PNG
├── src/
│   ├── background/
│   │   └── service-worker.ts      # Service Worker de Chrome MV3
│   ├── background/
│   │   └── recording-controller.ts # Estado de grabación, documento offscreen y descarga
│   ├── permission/
│   │   ├── microphone.html        # Página donde Chrome sí muestra el diálogo del micrófono
│   │   └── microphone.ts          # Solicitud del permiso y su recuperación si se deniega
│   ├── offscreen/
│   │   ├── offscreen.html         # Documento oculto que sostiene la grabación
│   │   └── offscreen.ts           # getDisplayMedia, marca de agua, MediaRecorder y buffer OPFS
│   ├── content/
│   │   ├── content.ts             # Entry point del Content Script
│   │   ├── page-tracker.ts        # Tracker de consola y red en el mundo MAIN
│   │   ├── inspector.ts           # Interceptación de eventos y navegación DOM
│   │   ├── overlay.ts             # Shadow DOM host y recuadros de resaltado
│   │   ├── modal.ts               # Modal flotante con preview, copiado y descarga
│   │   └── styles.ts              # Estilos CSS encapsulados
│   ├── shared/
│   │   ├── i18n/                  # Traducciones en 8 idiomas (un archivo por idioma)
│   │   ├── recording.ts           # Contrato de grabación compartido
│   │   ├── watermark.ts           # Distintivo dibujado en cada fotograma
│   │   └── early-capture.ts       # Opt-in por sitio y registro dinámico del tracker
│   └── popup/
│       ├── popup.html             # UI del popup de la extensión
│       ├── popup.ts               # Lógica del popup y sincronización de ajustes
│       └── popup.css              # Estilos modernos para el popup
└── dist/                          # Build final instalable en Chrome
```

---

## 📄 Licencia

MIT © [Erickgiber](https://github.com/Erickgiber)
