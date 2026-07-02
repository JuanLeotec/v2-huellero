# Sistema de Control de Asistencia v2.0 — LeoTecnicas

## Cómo publicarlo
1. Sube el contenido de esta carpeta a un repositorio de GitHub.
2. Activa GitHub Pages apuntando a la raíz (branch main / root).
3. Listo — no requiere build ni instalación de dependencias.

## Cómo actualizar los datos (cada lunes)
1. Reemplaza `BaseDatosPowerBI.xlsx` con el nuevo archivo exportado de Power BI.
2. Ejecuta: `python3 etl/build_data.py` (requiere `pandas` y `openpyxl`).
3. Esto regenera automáticamente:
   - `data/dashboard-data.js`
   - `data/data.js`
   - `data/sin_marca.js`
   - `data/calendar-data.js`
4. Sube los cambios — la app no necesita ningún otro paso.

## Estructura
Ver la carpeta `css/` y `js/` — arquitectura modular ES6 documentada en cada archivo.
