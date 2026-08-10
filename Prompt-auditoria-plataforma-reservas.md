# Prompt: Auditoría Integral — 

## Rol

Actúa simultáneamente como un equipo multidisciplinario senior compuesto por:

- **Arquitecto de software** — evaluando diseño del sistema, patrones, acoplamiento, escalabilidad y deuda técnica.
- **Ingeniero de datos** — evaluando modelado de datos, integridad, calidad, pipelines y consistencia entre servicios.
- **Experto en UX/UI** — evaluando flujos de usuario, accesibilidad, consistencia visual y fricción en la conversión.
- **Analista de seguridad web (AppSec)** — evaluando vulnerabilidades, superficie de ataque, manejo de datos sensibles y cumplimiento normativo.
- **Especialista de dominio en Pagos PSE**.

Antes de evaluar, investiga y aplica activamente buenas prácticas y estándares reconocidos de la industria

## Objetivo

Realizar un análisis exhaustivo y profundo de **todo el proyecto** (código, arquitectura, base de datos, interfaz y flujos de negocio) para identificar vulnerabilidades, puntos débiles, oportunidades de mejora en diseño, lógica de procesos, apariencia/experiencia visual, y cualquier otro aspecto relevante que fortalezca el producto.

## Alcance del análisis

Evalúa el proyecto en las siguientes áreas (agrega subcategorías si el proyecto lo amerita):

1. **Arquitectura de software**
   - Organización del código, capas, acoplamiento/cohesión, patrones de diseño.
   - Escalabilidad horizontal/vertical.
   - Gestión de errores, logging, observabilidad y manejo de fallos.
   - Deuda técnica y oportunidades de refactorización.

2. **Datos e integridad**
   - Modelado de datos (reservas, disponibilidad, tarifas, huéspedes, propiedades).
   - Consistencia transaccional (especialmente en reservas concurrentes y sincronización de calendarios).
   - Calidad, validación, normalización y respaldo de datos.
   - Pipelines de integración con fuentes externas (channel managers, OTAs, pasarelas de pago).

3. **Seguridad**
   - Vulnerabilidades comunes (inyección, XSS, CSRF, IDOR, exposición de datos sensibles).
   - Autenticación, autorización y gestión de sesiones.
   - Manejo de datos de pago (cumplimiento PCI-DSS) y datos personales (GDPR u otra normativa aplicable).
   - Seguridad de APIs, rate limiting, exposición de endpoints y manejo de secretos/credenciales.

4. **UX/UI**
   - Flujos críticos: búsqueda, disponibilidad, reserva, pago, cancelación.
   - Accesibilidad, responsividad y consistencia visual.
   - Fricción en el proceso de conversión y puntos de abandono.
   - Claridad de la información (precios, políticas, disponibilidad) para reducir errores del usuario.

5. **Lógica de negocio y procesos**
   - Reglas de disponibilidad, prevención de overbooking, políticas de cancelación/reembolso.
   - Tarificación dinámica, impuestos, comisiones y depósitos.
   - Notificaciones, recordatorios y comunicación con huéspedes/anfitriones.

6. **Rendimiento**
   - Tiempos de respuesta en búsquedas y disponibilidad en tiempo real.
   - Optimización de consultas, caching e índices.

## Metodología esperada

1. Revisa el proyecto completo (código fuente, esquema de base de datos, configuración e interfaz).
2. Identifica el stack tecnológico actual antes de proponer cambios.
3. Evalúa cada área del alcance definido arriba.
4. Cuando sea pertinente, **propón componentes, librerías, servicios o APIs concretas** (indicando por qué son adecuadas y qué problema resuelven), en lugar de recomendaciones genéricas.
5. Prioriza los hallazgos por nivel de criticidad.

## Formato de entrega

Entrega un **informe estructurado** organizado así:

### Por cada área evaluada (Arquitectura, Datos, Seguridad, UX/UI, Lógica de negocio, Rendimiento):

Para cada hallazgo, incluye:

| Campo | Descripción |
|---|---|
| **Criticidad** | Crítica / Alta / Media / Baja |
| **Hallazgo** | Descripción clara del problema o debilidad |
| **Ubicación/Evidencia** | Archivo, módulo o flujo donde se detecta |
| **Impacto** | Consecuencia si no se corrige |
| **Recomendación** | Solución propuesta, con librería/servicio/API sugerida si aplica |
| **Esfuerzo estimado** | Bajo / Medio / Alto |

### Al final, incluye:

- Un **resumen ejecutivo** con los 5-10 hallazgos más críticos del proyecto completo.
- Una **hoja de ruta sugerida** (quick wins vs. mejoras estructurales de mediano/largo plazo).

## Restricciones

- No propongas cambios que rompan funcionalidad existente sin advertirlo explícitamente.
- Sé específico y accionable: evita recomendaciones vagas tipo "mejorar la seguridad".
- Si detectas ambigüedad o falta de información para evaluar algo, indícalo en lugar de asumir.
