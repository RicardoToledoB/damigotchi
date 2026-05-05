# Damigotchi Pro

Juego educativo infantil en React para aprender jugando con una mascota digital.

## Características

- React + Vite.
- Sin backend por ahora.
- Progreso guardado en `localStorage`.
- Sistema de estrellas, niveles, tienda, vestidor y colección de cartas con recompensas frecuentes.
- Ropa por colores: gorros, poleras, lentes, corona y accesorios.
- Contenido educativo en español.
- Más cartas coleccionables y entrega de cartas cada 3 aciertos.
- Diseño responsive para celular/tablet.
- Estructura profesional separada por componentes, páginas, datos, hooks y utilidades.

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abrir:

```bash
http://localhost:5173
```

## Producción

```bash
npm run build
npm run preview
```

## Estructura

```txt
src/
  components/
  data/
  hooks/
  pages/
  utils/
  App.jsx
  main.jsx
  styles.css
```

## Actualización razas oficiales
Esta versión agrega la selección inicial de razas Damigotchi con historia:
Naturaleza, Fuego, Agua, Energía, Sueño, Estrella, Zorrito y Pantera.

También se incluye una carpeta opcional `../damigotchi-web-oficial` con una web narrativa simple para presentar el universo Damigotchi y simular registro de interesados en localStorage.
