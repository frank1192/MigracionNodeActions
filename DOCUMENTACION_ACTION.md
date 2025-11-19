Documentación del Action reusable

1) Cómo llamar el flujo desde otros repositorios

Ejemplo mínimo de uso del Action desde otro repositorio (asumiendo que el `action.yaml` está en la raíz del repo `frank1192/MigracionNodeActions`):

```yaml
name: Usar Checklist Reusable
on: pull_request

jobs:
  run-checklist-action:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Ejecutar action reusable
        uses: frank1192/MigracionNodeActions@main
        # Si el action define 'inputs', se pasan aquí como 'with:'
        # with:
        #   ejemplo: valor
```

Nota: también se puede referenciar una versión con tag: `uses: frank1192/MigracionNodeActions@v1.0.0`.

2) Cómo actualizar el action (estándar de build)

Requisitos para build: usar Node.js 24.11.x en tu entorno de desarrollo (o una versión 24.11 >=), y `@vercel/ncc` para generar el bundle en `dist/`.

Comandos recomendados:

```sh
$ node --version    # confirmar versión 24.11.x
$ npm install -g @vercel/ncc
$ npm install
$ ncc build index.js -o dist
```

Ejemplo de `package.json` sugerido:

```json
{
  "name": "auto-merge-action",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "@actions/core": "^1.10.0",
    "@actions/github": "^6.0.0"
  }
}
```

El `ncc build` generará la carpeta `dist` con `index.js` listo para que `action.yaml` lo referencie.

Estructura final esperada en el release del action:

- `dist/index.js`
- `action.yaml`
- `package.json`

Si quieres, puedo crear un workflow de CI que ejecute el build con Node 24.11 en la acción de CI (por ejemplo usando `actions/setup-node@v4` si el runner lo soporta), y que haga `ncc build` automáticamente en cada push o al crear una release.
