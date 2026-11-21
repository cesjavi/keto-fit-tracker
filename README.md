# KetoFit

Aplicación en español para entrenamiento, planificación de comidas y seguimiento personal. Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL y Prisma. Sin Docker.

## Abrir en el celular

**https://keto-fit-tracker-two.vercel.app**

1. Abrí la dirección en Chrome.
2. Elegí **Crear cuenta**. Ingresá tu nombre, email y una contraseña de al menos 12 caracteres.
3. Completá la configuración del primer ingreso: medidas, experiencia, objetivo, casa/gimnasio, días, duración y preferencias alimentarias.
4. Podés generar tu primera semana de comidas al finalizar.
5. Para instalarla en Android: menú de Chrome → **Agregar a pantalla principal → Instalar**.

La interfaz incluye navegación inferior en celular, formularios en una columna y botones táctiles. La PWA requiere conexión para consultar y guardar registros; sin conexión muestra una pantalla informativa.

## Activar el administrador

La cuenta reservada es **cesjavi@gmail.com**. No tiene una contraseña nueva predefinida: la elegís al registrarte.

1. En **Crear cuenta**, usá ese email.
2. Elegí tu nueva contraseña (12–128 caracteres).
3. En **Código de administrador**, ingresá la clave privada de la primera versión, entregada en `Acceso-KetoFit.txt`.
4. Al registrarte se vinculan a tu cuenta los datos anteriores de esa base. La configuración inicial te permite confirmarlos o cambiarlos.

Ese código solo activa el registro reservado. Después ingresás con email y tu contraseña nueva. Las sesiones anteriores de la aplicación de clave única ya no dan acceso a los datos.

El panel **Administración** muestra cuentas registradas, fechas y roles; no muestra el historial de salud, alimentación ni entrenamiento de otros usuarios. Cada cuenta tiene sus registros separados. No hay verificación del email ni recuperación por correo todavía: no se simulan envíos.

## Arrancar en esta PC

```powershell
cd F:\Sistemas\keto-fit-tracker
.\iniciar.ps1
```

Abrí **http://localhost:3000**. Dejá la terminal abierta; `Ctrl+C` detiene la aplicación.

Si Windows bloquea el script:

```powershell
powershell -ExecutionPolicy Bypass -File F:\Sistemas\keto-fit-tracker\iniciar.ps1
```

Para detener también la base:

```powershell
.\detener-base.ps1
```

Se usa una instancia PostgreSQL exclusiva en `127.0.0.1:55432`, con datos en `.data\postgres`. Los scripts esperan PostgreSQL en `C:\Program Files\PostgreSQL\18\bin`. No usan las bases de otros sistemas.

Los usuarios y datos locales son independientes de Vercel. Una cuenta registrada en Vercel no aparece automáticamente en la base local. Podés trasladar registros desde **Ajustes y datos → Exportar JSON / Importar copia**. La importación reemplaza solo los datos de la cuenta actual y requiere confirmación.

## Comidas y entrenamiento

- En casa: propuestas sin máquinas, con peso corporal, apoyos estables y caminatas. La cantidad de series tiene en cuenta la experiencia y la semana de descarga.
- Gimnasio: rutinas con máquinas y pesos libres. Elegís tus días y tiempo disponible.
- El planificador genera siete días con desayuno, almuerzo, merienda y cena. Podés modificar cada receta y porción.
- Elegí alimentación variada o vegetariana, tiempo por receta y exclusiones (huevos, lácteos, frutos secos, pescado).
- La compra se calcula automáticamente sumando ingredientes de la semana elegida.
- Las recetas muestran macros estimados por porción, no mediciones médicas. Las exclusiones se basan en los ingredientes del catálogo; ante alergias hay que verificar etiquetas y trazas.
- Generar un menú no registra alimentos consumidos ni determina una meta de calorías. Las metas se configuran manualmente.
- No se inventan medidas ni historiales. No hay integración con Health Connect.

## Groq y Fireworks

En **Planificador → Una propuesta con inteligencia artificial**, elegí el proveedor y autorizá el envío antes de generar. El resultado es una vista previa: tenés que aplicarla para reemplazar esa semana.

Groq está configurado en producción con la clave provista por el propietario. Fireworks está integrado como alternativa, pero requiere configurar su clave y modelo para habilitarlo. No hay claves en el código ni en el navegador.

Solo se envían preferencias de alimentación, exclusiones, tiempo, porciones y catálogo de recetas. No se envían email, peso, cintura ni historial. El servidor valida las recetas devueltas antes de mostrarlas y rechaza respuestas incompatibles.

El modo **Automático** puede usar Groq y Fireworks configurados, en ese orden, ante límites temporales o fallos del proveedor. La autorización de la pantalla indica ambos destinos. No se usa un proveedor sin configurar ni se inventa una respuesta de IA. El generador sin IA sigue disponible.

Variables del servidor en Vercel:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | PostgreSQL Neon con SSL |
| `ACCESS_PASSWORD` | Código reservado para activar al administrador |
| `GROQ_API_KEY` | Clave secreta de Groq |
| `GROQ_MODEL` | ID del modelo habilitado en tu cuenta |
| `FIREWORKS_API_KEY` | Clave secreta de Fireworks, cuando quieras habilitarlo |
| `FIREWORKS_MODEL` | ID del modelo de Fireworks |
| `AI_ENABLED` | `true` para habilitar generación con IA |
| `AI_DAILY_LIMIT` | Opcional; 5 solicitudes diarias por cuenta de forma predeterminada, máximo 20 |
| `AI_GLOBAL_DAILY_LIMIT` | Opcional; 30 solicitudes diarias totales de forma predeterminada, máximo 500 |

Cada solicitud de IA puede consumir crédito del proveedor. Un intento fallido también cuenta para el límite de solicitudes de la app; este límite no sustituye los límites de gasto del proveedor. Las claves deben guardarse como secretos del entorno, sin prefijo `NEXT_PUBLIC_`. Cambiar variables requiere un nuevo despliegue.

Referencias de las APIs: [Groq](https://console.groq.com/docs/api-reference) y [Fireworks](https://fireworksai.readme.io/reference/createchatcompletion).

## Desarrollo y publicación

Requisitos: Node.js 20.9 o superior (se usó Node 24), npm y PostgreSQL. La configuración local está en `.env`, excluido de Git.

```powershell
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Para compilar y arrancar:

```powershell
npm run build
npm start
```

Para actualizar Vercel:

```powershell
vercel deploy --prod --yes
```

El build de Vercel genera Prisma, aplica migraciones y compila Next.js. No ejecuta tests. El proyecto es `cesjavis-projects/keto-fit-tracker`, con PostgreSQL Neon `ketofit-db`.

No publiques `.env*`, `.data`, claves, copias personales, `node_modules` o `.vercel`. `.vercelignore` excluye los archivos locales sensibles del despliegue.

## Problemas frecuentes

- **Veo la pantalla de clave única:** recargá la URL publicada. La versión actual muestra **Iniciar sesión** y **Crear cuenta**. Si instalaste la PWA, cerrala y volvé a abrirla con conexión.
- **No puedo activar el administrador:** usá `cesjavi@gmail.com`, una contraseña nueva de 12 caracteres o más y la clave anterior como código de administrador.
- **PostgreSQL no disponible:** iniciá la base con `iniciar.ps1` y consultá `.data\postgres.log`.
- **Cambios en otra pestaña:** recargá antes de volver a guardar; se usa una revisión para evitar sobrescrituras silenciosas.
- **Puerto 3000 ocupado:** `npm start -- --port 3002`.
- **Fireworks sin configurar:** agregá clave y modelo en el entorno de Vercel y volvé a desplegar.
- **No aparecen fotos:** las fotografías ilustrativas de Unsplash necesitan conexión.

Para cerrar sesión usá **Ajustes y datos → Cerrar sesión**; se revoca la sesión en la base.


## Comprar en Coto, Carrefour y Día

En **Lista de compras**, elegí el supermercado y usá **Abrir** para ir a su tienda online. **Copiar ingrediente** copia el nombre para pegar en el buscador; **Copiar pendientes** copia cantidades e ingredientes que todavía no marcaste. También podés descargar la lista completa.

La selección de supermercado se recuerda en ese navegador. No se envía tu dirección ni tus datos de KetoFit al abrir la tienda. Ingresá tu dirección de entrega directamente en la web del súper para consultar cobertura y disponibilidad. Los botones abren las páginas oficiales; no crean carritos, no comparan precios ni realizan pagos. La compra se completa en cada supermercado.


## Historial consultable de ejercicios

En **Entrenamiento**, cada ejercicio tiene **Consultar historial**. La sección permite filtrar por ejercicio, nombre, fechas y semana del programa, ordenar por fecha o carga, abrir detalles y exportar la consulta como CSV. Al elegir un ejercicio se muestran el último registro y las cargas externas registradas, con un gráfico para ejercicios de fuerza. Se muestran 15 registros por página. Las mediciones existentes se conservan sin cambios; no se inventan resultados ni se reconstruyen entrenamientos no registrados.


## Supermercados por ciudad y sugerencias de Groq

En **Lista de compras → Configurar ciudad** guardás país, provincia o región, ciudad, supermercados y preferido en tu cuenta. Podés conservar hasta 20 ubicaciones, cambiar la activa y agregar tiendas propias mediante URLs HTTPS. Las configuraciones se incluyen en las copias JSON. Las cuentas existentes reciben una configuración vacía sin perder datos. No se solicita GPS ni dirección exacta.

**Sugerir para esta ciudad** usa Groq solo después de autorizar el envío de país, región y ciudad. No se envían datos de salud ni identidad. Las sugerencias se limitan al catálogo de cadenas con sitios conocidos; el catálogo precargado actual es de Argentina. Para otros países se agregan tiendas manualmente. Los enlaces no se generan con IA. Groq estima relevancia a partir de conocimiento general: no consulta mapas, sucursales, precios, stock ni cobertura de entrega. Las sugerencias deben agregarse y guardarse manualmente, y la cobertura se verifica en la tienda. Cada consulta comparte el límite diario de IA con el generador de comidas. No se genera un carrito ni se paga desde KetoFit.


## Índice UV con ubicación del celular

Abrí **Índice UV** desde el menú (en celular: **Más**) o el acceso del Dashboard. Tocá **Usar mi ubicación** y autorizá el permiso del navegador. Requiere HTTPS (Vercel) o localhost, y ubicación activada en el dispositivo. Usa una consulta puntual, no rastreo continuo. La ubicación puede provenir de GPS, Wi-Fi o red celular.

Las coordenadas se redondean a dos decimales antes de enviarlas al servidor y a Open-Meteo. No se guardan en el perfil ni en copias JSON y no se envían a Groq. Permanecen en memoria de esta pantalla; **Dejar de usar ubicación** borra la consulta de la pantalla. Al volver a entrar hay que consultar la ubicación nuevamente.

El servicio muestra la última estimación horaria de UV, su franja y la hora de consulta, el pronóstico de hoy y mañana, clasificación UV y franjas futuras con luz de menor radiación. Los valores proceden de modelos meteorológicos de Open-Meteo: no son un sensor del teléfono ni una medición local en tiempo real. Cada valor horario representa la media de la hora anterior según la documentación del proveedor. El pronóstico se consulta al obtener la ubicación y cada 15 minutos mientras la pantalla sigue visible; también puede actualizarse manualmente. Se marca la información de más de 30 minutos como desactualizada. Sin respuesta del proveedor no se muestran valores inventados.

El visor excluye las horas nocturnas al comparar franjas con luz. Los horarios de menor UV no garantizan seguridad para broncearse; no calcula minutos seguros ni dosis de vitamina D. Incluye la recomendación de protección desde UV 3 de la OMS y enlaces a las fuentes.

La API requiere sesión y limita 30 consultas por cuenta y hora. No consume el cupo de Groq. Por defecto usa la API pública de Open-Meteo, sujeta a sus condiciones de uso y disponibilidad. Si se contrata el servicio comercial, se puede configurar `OPEN_METEO_API_KEY` como secreto de Vercel para usar el endpoint customer. No hace falta agregar claves al navegador.

Fuentes: https://open-meteo.com/en/docs y https://www.who.int/news-room/fact-sheets/detail/ultraviolet-radiation.


## Vitamina D: investigación y modelo orientativo

Se revisó la documentación de D-Minder (https://dminder.info/science), que describe variables adicionales al UV y tiempo, sin reutilizar su código o afirmar equivalencia con su motor. En **Índice UV** se agregó una calculadora educativa con fórmula publicada (https://www.nature.com/articles/s41598-024-54188-5, ecuación 13), supuestos y limitaciones visibles. No se infiere producción personal real ni se pronostica corrección de deficiencia.

El modelo expresa UI teóricas como `21120 * (UVI * segundos / 40) * fracción de piel / MED`. Se limita aquí la extrapolación a escenarios de hasta ¼ de la MED nominal; no es un criterio de exposición segura. Los valores nominales MED se identifican como aproximaciones de referencia, no mediciones personales. No se recomienda una duración, una meta de UI ni dosis de suplementos. No reproduce el algoritmo de D-Minder ni incorpora ozono o calibración farmacocinética.

El registro de análisis permite ingresar exclusivamente resultados reales de 25(OH)D, con fecha, valor y unidad nmol/L o ng/mL. La conversión utilizada es 1 ng/mL = 2,5 nmol/L (NIH: https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/). No se diagnostican ni se generan valores sanguíneos. Los análisis se guardan por cuenta y se incluyen en exportación/importación JSON; las cuentas y copias anteriores reciben una lista vacía. Estos datos no se envían a servicios de IA ni al proveedor meteorológico.
