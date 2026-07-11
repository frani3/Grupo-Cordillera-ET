# Informe Retrospectivo Grupal — Grupo Cordillera
**DSY1106 · Desarrollo Fullstack III — Evaluación Transversal**  
Francisca Barrera · Ignacio Sorko · Patricio Zapata

---

## A. Diseño de la arquitectura de microservicios

### Respuesta a los requerimientos del cliente

El problema central que motivó el diseño era concreto: Grupo Cordillera opera 30 sucursales con datos heterogéneos —ventas presenciales (POS), ventas online, inventario, registros de empleados y eventos financieros— y necesitaba una plataforma unificada desde la cual ejecutivos y analistas pudieran tomar decisiones con información en tiempo real. Una arquitectura monolítica habría creado un único punto de fallo y dificultado la incorporación de nuevos dominios de datos a futuro; por eso decidimos desde el inicio una arquitectura de microservicios separada por dominio funcional.

El resultado fue 13 servicios Docker orquestados: un frontend SPA, un API Gateway nginx, un BFF, tres orquestadores (orq-datos, orq-indicadores, orq-reportes) y seis microservicios de dominio (MS1-POS, MS2-Online, MS3-Inventario, MS4-Empleados, MS5-Reportes, MS-AUTH). El flujo `Web → nginx → BFF → ORQs → MSs` fue una decisión deliberada para centralizar la validación de autenticación en el BFF y evitar que el frontend se comunicara directamente con múltiples servicios internos. En retrospectiva, este diseño cumplió el objetivo: la plataforma consolida los cinco dominios y los presenta en un dashboard unificado sin que el cliente sepa qué servicio responde cada dato.

### Justificación de herramientas y tecnologías

Elegimos **Spring Boot 3.x** para los microservicios backend porque el equipo tenía experiencia con el ecosistema Java/Spring, su modelo de auto-configuración reduce la fricción de arranque, y facilita la escritura de tests unitarios con JUnit 5 y Mockito. La alternativa más discutida fue Node.js para todos los servicios (para uniformidad de stack), pero la madurez del ecosistema Spring para APIs REST y la disponibilidad de JPA para persistencia durable pesaron más que la homogeneidad tecnológica.

**nginx** como API Gateway fue natural: maneja reescritura de rutas con bajo overhead y el truco de re-resolución DNS (`set $bff http://bff-service:8080`) resuelve la limitación de nginx de resolver nombres al arranque en redes Docker. Evaluamos Spring Cloud Gateway como alternativa, pero habría introducido un servicio Spring adicional con Netty reactor para algo que nginx resuelve con tres líneas de configuración.

Para la persistencia, la elección de **H2 en modo archivo** para MS3/MS4/MS5 permitió tener persistencia real entre reinicios del contenedor sin gestionar un servidor de base de datos separado. MS1-POS y MS2-Online mantienen datos en memoria mediante el patrón Singleton Holder, decisión suficiente para el volumen de la evaluación aunque implica pérdida de datos al reiniciar el contenedor.

### Evaluación de alineación con ética, sostenibilidad y responsabilidad

**Seguridad y autenticación.** Implementamos MS-AUTH como servicio independiente con validación de token Bearer en cada request que llega al BFF. Los tokens son UUIDs aleatorios almacenados en `ConcurrentHashMap`, lo que evita que el token revele información del usuario en su estructura —a diferencia de JWT, donde el payload es decodificable sin la clave privada. Existe, sin embargo, un mecanismo de fallback explícito: si MS-AUTH no responde, el BFF acepta cualquier token con formato Bearer válido para mantener la disponibilidad del sistema. Esta es una concesión consciente de seguridad en favor de resiliencia, documentada como limitación conocida en DEFENSA.md sección 5, y no apta para un entorno de producción real sin un circuit-breaker que al menos registre y alerte sobre los requests no validados.

**Privacidad.** El sistema almacena datos de transacciones de ventas y registros de empleados, pero el acceso está segmentado por roles (ADMIN y USER). Los usuarios con rol USER no acceden a las funciones de gestión de usuarios ni pueden modificar datos. El sistema no almacena información de contacto personal más allá del nombre y sucursal del empleado. Para una versión de producción, este modelo debería acompañarse de cifrado en reposo (H2 no cifra sus archivos por defecto) y un registro de auditoría de acceso a datos personales —limitaciones que reconocemos y que exceden el alcance de esta evaluación, pero que serían obligatorias bajo normativas como la Ley 19.628 de protección de datos personales en Chile.

**Escalabilidad.** Agregar una sucursal 31 no requiere cambios en el código: basta con que el simulador envíe datos con un nuevo valor en el campo sucursal. Agregar un sexto microservicio de dominio implica crear el servicio Spring Boot, registrarlo en `docker-compose.yml`, agregar un tipo en el `ApiServiceFactory` y un método en el `DataFacade`; ningún servicio existente requiere modificación. Escalar horizontalmente el BFF o un orquestador es factible porque son servicios sin estado que no comparten memoria entre instancias —en Docker Compose se haría con `deploy.replicas`, y en Kubernetes sería transparente al resto del sistema.

---

## B. Decisiones en el desarrollo de componentes backend y frontend

### Estrategias de diseño e implementación

Para el backend, la decisión de dividir los microservicios en dos grupos de persistencia —Singleton en MS1/MS2 versus JPA/H2 en MS3/MS4/MS5— fue deliberada: los datos de ventas en tiempo real se escriben con alta frecuencia desde los simuladores y se leen en batch por los orquestadores, mientras que los datos de inventario, empleados y reportes tienen menor frecuencia de escritura y se benefician de la persistencia entre reinicios. Esta distinción hizo la arquitectura de persistencia heterogénea, con el costo real de que el equipo debe mantener dos modelos mentales distintos en el mismo sistema, pero con el beneficio de que cada servicio usa la herramienta más apropiada para su patrón de uso.

Para el frontend, decidimos usar **vanilla JS sin framework** (sin React, Vue ni similares). La razón principal fue evitar un pipeline de build que complicaría el Dockerfile multi-etapa: con vanilla JS, el contenedor solo necesita Express para servir archivos estáticos, y el stage `test` solo requiere Node para Jest. El patrón de módulos IIFE con `window.App` como namespace nos permitió organizar el código con separación de responsabilidades similar a un framework, sin dependencias externas más allá de Chart.js via CDN.

### Influencia en eficiencia y mantenibilidad

La ventaja más concreta de vanilla JS fue la velocidad de iteración: cualquier cambio en CSS o JS es visible en el contenedor reconstruyendo la imagen sin herramienta de bundling adicional. La desventaja también fue real: a medida que el número de módulos creció a siete (`App.Indicadores`, `App.Datos`, `App.Reportes`, `App.Usuarios`, `App.Facade`, `App.Auth`, `App.Router`), las dependencias entre módulos mediante el namespace global se volvieron difíciles de rastrear sin convenciones estrictas. En retrospectiva, documentar desde el inicio el orden de carga de scripts y las dependencias entre módulos habría evitado los errores de `undefined` en variables del namespace que aparecieron cuando el orden de los `<script>` en el HTML no era el esperado.

### Ajustes que se harían distinto

El BFF tiene hoy responsabilidades mixtas: actúa como Proxy para orq-datos, pero llama directamente a orq-ind, orq-rep y MS-AUTH desde el controlador sin ese intermediario. Si volviéramos a diseñarlo, aplicaríamos el patrón Proxy de forma consistente para todas las llamadas a orquestadores, centralizando la lógica de timeout, auditoría y manejo de errores en un único punto en lugar de dispersarla entre el Proxy y el controlador.

En el backend, el endpoint `POST /simulate-mq` de MS1-POS lleva en su nombre la huella del diseño original que contemplaba RabbitMQ como mecanismo de mensajería asíncrona. Ese diseño fue simplificado a un modelo pull directo, pero el nombre del endpoint quedó como deuda semántica que confunde a cualquiera que lea el código sin conocer la historia del proyecto. Renombrarlo en una próxima iteración sería un cambio menor pero significativo para la mantenibilidad.

---

## C. Aplicación de patrones de diseño

Implementamos seis patrones de diseño distribuidos a lo largo del sistema, cinco de ellos GoF. La siguiente evaluación no repite el detalle técnico ya documentado en ANALISIS.md —que puede consultarse como referencia— sino que analiza la efectividad real y las tensiones enfrentadas durante la implementación.

**Factory Method** (`ApiServiceFactory.js`, Node.js/frontend). Fue el patrón que más beneficio observable trajo durante la etapa de testing: la posibilidad de inyectar un `fetcher` alternativo en el constructor permitió escribir todos los tests de JS sin levantar ningún servidor HTTP real. Consideramos una aproximación más simple donde los servicios instanciaran `fetch` directamente, pero eso habría hecho los tests dependientes de la red o habría requerido mockear el global `window.fetch`, lo cual es menos predecible y más frágil. La elección de Factory fue la correcta.

**Proxy** (`ServiceProxy.java`, BFF). Funcionó bien para su propósito de auditoría: todos los requests a orq-datos pasan por él y quedan registrados con `requestId` y `timestamp`, lo que fue útil en depuración para confirmar si un problema estaba en nginx, en el BFF o más adentro. La reflexión honesta es que la cobertura fue parcial: solo orq-datos pasa por el Proxy, mientras que orq-ind, orq-rep y MS-AUTH se llaman directamente desde el controlador. Consideramos extender el Proxy a todas las rutas, pero el tiempo disponible llevó a priorizar la funcionalidad sobre la consistencia del patrón.

**Strategy** (`orq-datos`, tres implementaciones: Batch, Stream, Cache). Fue el patrón que más fricción generó en el desarrollo: mantener tres clases que implementan la misma interfaz significó que cualquier cambio en la firma del método base requería actualizar las tres en paralelo, con riesgo de inconsistencias. Consideramos Template Method como alternativa, pero Strategy era necesario porque el algoritmo se selecciona en tiempo de ejecución mediante un parámetro HTTP (`?strategy=batch|stream|cache`), algo que Template Method no puede hacer mediante polimorfismo dinámico. En retrospectiva, agregar un test de contrato que verifique que las tres estrategias retornan la misma estructura de datos habría reducido el riesgo de regresiones.

**Singleton Holder Pattern** (MS1-POS y MS2-Online). Resolvió el problema específico que lo motivó: sin él, cada request creaba una nueva instancia del repositorio en memoria y los datos no persistían entre llamadas dentro de la misma sesión. Su implementación con `CopyOnWriteArrayList` fue adecuada para concurrencia básica. La limitación —pérdida de datos al reiniciar el contenedor— fue una concesión consciente para el alcance de la evaluación y está documentada como tal.

**Facade** (`DataFacade.js`, browser y Node.js). Fue el patrón que más simplificó el código de los módulos de interfaz: `App.Indicadores`, `App.Datos` y los demás llaman a métodos de alto nivel (`facade.getVentas()`, `facade.getInventario()`) sin conocer puertos, rutas ni manejo de errores HTTP. Esto también facilitó los tests: hay una única interfaz pública con siete métodos, y cubrir esos siete métodos con mocks del fetcher fue más simple que testear siete llamadas directas con URLs diferentes.

**JPA Repository** (MS3/MS4/MS5). La migración de Singleton en memoria a JPA+H2 fue la decisión técnica más significativa de la segunda mitad del proyecto. Eliminó todo el código de gestión de listas y lo reemplazó con una interfaz que Spring Data genera automáticamente. El costo fue agregar la configuración de JPA y el datasource H2 por servicio; el beneficio fue persistencia real entre reinicios y la posibilidad de usar proyecciones y queries derivadas sin código adicional.

---

## D. Estrategia de branching y gestión de versiones

### Cómo se gestionó realmente el control de versiones

El historial del repositorio refleja dos etapas claramente distintas. En una evaluación anterior (Evaluación Parcial 2), el equipo trabajó con branches separados por componente: `feature/data-ms`, `feature/frontend`, `feature/frontend-bff` y `feature/orq-service`, todos presentes en el origen remoto como evidencia de esa estrategia. Esos branches permitieron que cada integrante trabajara en su componente de forma aislada antes de integrar al main.

Para esta Evaluación Transversal, el trabajo se concentró en una sola rama (`rama-et`) con commits secuenciales directamente sobre ella. No hubo feature branches en esta iteración: los cambios de frontend, microservicios y documentación convivieron en el mismo flujo de commits, sin aislamiento entre funcionalidades en desarrollo simultáneo.

### Reflexión crítica sobre las limitaciones

Trabajar sin branches de feature en esta evaluación tuvo consecuencias observables en el historial de commits: hay commits que mezclan cambios en CSS con cambios en JS o en configuración Docker, lo que hace difícil revertir un cambio puntual sin afectar otros. En momentos de trabajo paralelo entre los integrantes del equipo, fue necesario sincronizar manualmente el estado del código antes de hacer commit para evitar conflictos, lo que introdujo fricciones que una estrategia de branching habría reducido de forma natural.

El riesgo más concreto se materializó durante el rediseño visual del frontend: mientras se modificaba el sistema de diseño CSS, los módulos JS de los indicadores también se refinaban en paralelo. Sin una rama aislada para el rediseño visual, había riesgo real de que un commit mezclara un estado intermedio del CSS con un estado intermedio del JS, haciendo que el sistema no funcionara en ese punto del historial.

### Propuesta para una próxima iteración

En retrospectiva, aplicaríamos un **Git Flow simplificado** desde el primer día del proyecto:

- `main`: solo código verificado y listo para entregar. Nadie hace commits directos; solo recibe merges desde `develop`.
- `develop`: rama de integración donde se fusionan las features una vez que funcionan. Es el estado "listo para testear en conjunto".
- `feature/<nombre-corto>`: una rama por funcionalidad o componente (ej. `feature/diseño-sistema`, `feature/migrar-jpa`, `feature/tests-unitarios`). Vida corta: se abre, se trabaja, y se fusiona a `develop` en el transcurso de días, no semanas.

Esta estructura habría permitido, por ejemplo, que el rediseño visual viviera en su propio branch sin bloquear avances simultáneos en la capa de microservicios. Los pull requests —incluso en un equipo de tres— habrían servido como instancia de revisión entre integrantes antes de integrar cambios al estado compartido, reduciendo la probabilidad de que código sin terminar afectara el trabajo de los demás.

---

## E. Integración de componentes backend, frontend y base de datos

### El proceso real de integración

La integración del sistema se construyó de adentro hacia afuera: primero los microservicios con su persistencia, luego los orquestadores consumiendo los MSs, después el BFF coordinando los orquestadores, y finalmente el frontend conectándose al BFF a través del API Gateway nginx. Esta secuencia fue deliberada para que cada capa pudiera probarse de forma aislada antes de introducir la siguiente.

La conexión entre el frontend y el BFF pasó por una decisión de routing importante: nginx reescribe las rutas `/api/*` y las reenvía al BFF en el puerto 8080, ocultando completamente la topología interna al cliente. El frontend conoce solo `/api` —nunca sabe que hay un BFF, orquestadores ni microservicios detrás. Esto mejoró la cohesión del sistema, pero durante el desarrollo significó que probar el frontend antes de tener el BFF operativo requería un servidor mock adicional, lo que generó fricción en las etapas iniciales del proyecto.

### Impacto del patrón Proxy y del fallback de autenticación

El patrón Proxy en el BFF añadió una capa de trazabilidad que resultó práctica durante la depuración: cuando un request no llegaba al microservicio esperado, el log `[AUDIT]` del Proxy permitía confirmar si el BFF había recibido el request o si el problema estaba en nginx. Esta visibilidad fue concreta y ahorró tiempo en la identificación de errores de routing que de otra manera habrían requerido agregar logs temporales en múltiples lugares.

El fallback de autenticación —aceptar tokens con formato Bearer cuando MS-AUTH no responde— facilitó el desarrollo durante las etapas en que MS-AUTH todavía no estaba estable, permitiendo que el resto del sistema funcionara sin depender de él. La contrapartida es que en producción este comportamiento debe eliminarse o al menos registrarse con alertas explícitas, porque equivale a desactivar la validación de identidad ante fallos de infraestructura.

### Desafíos reales de integración

El desafío más concreto fue el manejo de fallos parciales. Cuando un microservicio no responde, el orquestador correspondiente puede devolver error, lo que sin manejo adecuado colapsaría toda la página del dashboard. Implementamos `Promise.allSettled` en el frontend para que los datos de los MSs que sí responden se muestren aunque otros fallen, en lugar de no mostrar nada. El resultado fue que el dashboard puede operar de forma degradada, lo cual es correcto; sin embargo, la experiencia de usuario cuando un widget queda vacío por fallo de un servicio es indistinguible de "no hay datos registrados", lo que puede confundir a un analista. Agregar un indicador visual diferenciado de "servicio no disponible" frente a "sin datos" sería una mejora concreta para la próxima iteración.

La pérdida de datos de MS1-POS y MS2-Online al reiniciar los contenedores generó una ambigüedad semántica: un orquestador que consulta datos tras un reinicio recibe un array vacío, y el frontend lo interpreta como "cero ventas" sin distinguirlo de una situación real de ausencia de ventas. Esta ambigüedad es una deuda técnica conocida que en producción requeriría persistencia real o al menos una indicación de timestamp del último dato confiable.

---

## F. Pruebas unitarias y aseguramiento de la calidad

### Cobertura real verificada

Contando directamente los archivos de test en el repositorio, el sistema cuenta con:

**JavaScript (Jest):** 3 archivos de test, **68 tests** en total:
- `ApiServiceFactory.test.js`: 29 tests (18 llamadas directas a `test()` más la expansión de dos bloques `test.each` — 10 tipos de servicio y 3 casos de endpoint).
- `DataService.test.js`: 19 tests.
- `DataDisplay.test.js`: 20 tests.

Cobertura global medida por Jest: **86.71% de sentencias**, superando el umbral mínimo exigido de 60%.

**Java (JUnit 5 + Mockito):** 4 archivos de test, **28 tests** en total — 7 métodos `@Test` verificados en cada archivo (`AuthControllerTest`, `InventarioControllerTest`, `EmpleadoControllerTest`, `ReporteControllerTest`). Vale señalar que el documento `PRUEBAS_UNITARIAS.md` reporta 23 tests Java (5+6+6+6), pero la verificación directa sobre el código fuente muestra 7 tests por archivo: dos métodos de test adicionales por archivo no fueron incluidos en la documentación formal.

El total real verificado es **96 tests** (68 JS + 28 Java).

### Cómo las pruebas contribuyeron a la estabilidad

La decisión de integrar el stage `test` como **gate obligatorio en el Dockerfile** —previo al stage `production`— fue la contribución de infraestructura más importante al aseguramiento de calidad: si cualquier test falla, el build de Docker se detiene y no se genera la imagen de producción. Esto significa que cualquier versión en ejecución del contenedor tiene garantizado que los tests pasaron en esa misma versión del código.

Los tests de `DataFacade` resultaron especialmente útiles durante el desarrollo: varios cambios en los endpoints de los microservicios fueron detectados primero por los tests del Facade antes de que el problema llegara al frontend. Sin esos tests, el ciclo de detección habría sido levantar el sistema completo, enviar un request desde el navegador y observar el error en la consola —un ciclo significativamente más lento e impreciso en su diagnóstico.

### Dificultades y qué se haría distinto

La dificultad más recurrente en el lado JS fue el mockeo de llamadas HTTP. La solución adoptada —inyectar un `fetcher` alternativo mediante el constructor de `ApiServiceFactory`— funcionó, pero exigía que cada test construyera su propio `mockFetch` con el payload exacto esperado. En una próxima iteración usaríamos `msw` (Mock Service Worker), una librería que intercepta llamadas a nivel de service worker de red, haciendo los tests más representativos del comportamiento real y más fáciles de actualizar cuando cambian las URLs de los endpoints.

Para el backend Java, los tests actuales cubren únicamente los controllers, con repositorios mockeados con Mockito. No hay tests de integración que verifiquen que la persistencia H2 funciona correctamente de extremo a extremo: que un `POST` realmente persiste el objeto y que el `GET` posterior lo retorna. Agregar tests `@DataJpaTest` de Spring Boot —que levantan un contexto JPA mínimo con H2 en memoria por test— habría aumentado la confianza en el comportamiento de persistencia sin depender de levantar el contenedor completo.

---

## Conclusión general

Este proyecto representó un ejercicio real de toma de decisiones bajo restricciones de tiempo, de tecnología disponible y de alcance evaluativo. Mirándolo en retrospectiva, la mayoría de las decisiones arquitectónicas centrales —microservicios por dominio, nginx como gateway, JPA+H2 para persistencia durable, vanilla JS sin framework— fueron razonables dado el contexto y se mantuvieron estables a lo largo del desarrollo sin requerir revisiones estructurales.

Las lecciones más importantes no fueron técnicas sino de proceso. La ausencia de una estrategia de branching formal generó fricciones concretas en la coordinación del equipo. La documentación de tests se desactualizó respecto al código real —el informe de pruebas reportaba 23 tests Java pero el código tenía 28. Algunos patrones, como el Proxy, quedaron aplicados de forma parcial por restricciones de tiempo. Ninguno de estos problemas comprometió el funcionamiento del sistema, pero todos habrían tenido menor impacto con más disciplina de proceso desde el inicio.

Lo que el equipo valora más del resultado es la coherencia de la arquitectura: cada capa tiene un rol definido, el flujo de datos es trazable de extremo a extremo, y la plataforma efectivamente consolida los cinco dominios de datos de Grupo Cordillera en una interfaz única. Ese era el objetivo central y se cumplió.

Para una siguiente iteración, las prioridades serían: Git Flow simplificado desde el primer día, tests de integración de base de datos además de tests unitarios de controller, aplicación consistente del patrón Proxy para todas las rutas del BFF, e indicadores visuales en el frontend que distingan "dato ausente" de "servicio no disponible". Son mejoras de proceso y de completitud, no correcciones a la arquitectura —lo que indica que la base del sistema fue sólida.
