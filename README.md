# Vocabuleo

Una web gratuita y sencilla para aprender vocabulario en inglés.

## La idea

Cada vez que te encuentras una palabra en inglés que no conoces, la apuntas en Vocabuleo con su traducción y, si quieres, la frase donde la viste. Después, cada día, la app te pregunta las palabras que te toca repasar.

## Cómo funciona

Vocabuleo usa el **sistema Leitner**, un método clásico para memorizar: las palabras que ya sabes se repasan cada vez menos, y las que fallas se repasan más a menudo.

En lugar de cajas, aquí cada palabra es un **planeta** que gira alrededor de un sol:

- Las palabras nuevas empiezan en la **órbita exterior (I)**.
- Si **la sabes**, se acerca una órbita al sol.
- Si **no la sabes**, vuelve a la órbita exterior.
- Cuanto más cerca del sol está, más tarda en volver a preguntártela:

| Órbita | Se repasa cada |
| ------ | -------------- |
| I      | 1 día          |
| II     | 2 días         |
| III    | 4 días         |
| IV     | 8 días         |
| V      | 16 días        |

## Practicar

1. Ves la palabra en inglés. Si la apuntaste con una frase, puedes pedirla como pista.
2. Piensas la traducción.
3. Mantienes pulsado el botón (o la barra espaciadora) para ver la respuesta.
4. Eres sincero: desliza la tarjeta a la derecha si la sabías y a la izquierda si no.

## Tus datos

Las palabras se guardan en tu navegador; no hay cuentas ni servidor. Para no perderlas, haz copias de seguridad desde **Bitácora → Exportar** de vez en cuando.

## Atajos de teclado

| Tecla              | Acción                  |
| ------------------ | ----------------------- |
| `N`                | Añadir palabra          |
| `Espacio` (mantener) | Revelar la traducción |
| `P`                | Ver la pista            |
| `←` / `→`          | No la sabía / La sabía  |

## Para desarrolladores

Hecho con React, TypeScript y Vite.

```bash
npm install     # instalar dependencias
npm run dev     # abrir en local (http://localhost:5173)
npm test        # ejecutar los tests
npm run build   # generar la versión para publicar (carpeta dist/)
```
