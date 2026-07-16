# QA Config — Frontend Laboratorio

Config de QA manual para el panel interno (Angular 21). El backend vive en otro repo
(`Backend`); este archivo asume que se levanta **ese** stack y después el dev server de Angular.

## Stack

- Frontend: Angular 21 + NgRx + PrimeNG. Dev server con proxy.
- Backend: Java 21 / Spring Boot, en el repo `Backend` (ver su `.claude/qa-config.md`).
- DB: MySQL 8 (servicio de Windows, sin Docker).

## Local API Switch

**No hay.** Y es a propósito — no lo agregues.

Los services usan paths relativos (`/api/v1/...`) y el dev server proxea a `localhost:8080`
vía `proxy.conf.json`. No hay `client.js`, ni base URL hardcodeada, ni variable de entorno
que revertir al terminar el QA. Si ves un PR que introduce un switch de base URL, rechazalo.

```json
{ "/api":    { "target": "http://localhost:8080" },
  "/public": { "target": "http://localhost:8080" } }
```

## Levantar el stack

**1. MySQL + backend** (desde el worktree del `Backend` que tenga la feature bajo prueba):

```powershell
net start MySQL84

$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
```

Health check — esperar 200 antes de seguir:
```
GET http://localhost:8080/actuator/health
```

**2. Frontend:**

```bash
npm start          # ng serve con proxy.conf.json
```

## URLs

| | |
|---|---|
| Frontend | http://localhost:4200 |
| Backend | http://localhost:8080 |
| Login laboratorio | http://localhost:4200/login |
| Login SaaS Admin | http://localhost:4200/saas/login |

El panel del laboratorio y la consola de plataforma tienen **logins separados**. Un
`SAAS_ADMIN` entra por `/saas/login`; no hay impersonación de tenants.

## Cuentas de prueba

| Rol | Usuario | Password | Tenant |
|-----|---------|----------|--------|
| SAAS_ADMIN | `saas-admin@platform.test` | `password` | Plataforma |
| ADMINISTRADOR (tenant DEMO) | `admin@lab-full.test` | `password` | 2 |
| ADMINISTRADOR (seed local) | `admin@test.com` | `password` | 1 |

> Las credenciales son las del `.claude/qa-config.md` del repo `Backend` — esa es la fuente
> de verdad. Si no logran loguear, verificar ahí antes de tocar nada.

## Base de datos

- Host: `localhost:3306` · DB: `laboratorio` · Usuario/pass: `laboratorio` / `laboratorio`

```bash
mysql -u laboratorio -plaboratorio laboratorio -e "<QUERY>"
```

**Validar persistencia siempre contra la DB, no contra el status code.** Un 200 no prueba
que la fila se escribió con los valores correctos.

## Tests automáticos

```bash
npx vitest run                       # suite completa
npx vitest run src/app/features/x    # scopeado
```

> **Baseline con fallos conocidos.** `development` tiene ~14 tests en rojo, preexistentes:
> `componentRef.setInput()` no llega a los signal inputs (`input.required()`) bajo este setup
> de Vitest — falla con `NG0303` y la lectura posterior revienta con `NG0950`. Afecta a los
> component specs de `saas-admin` (`tenant-white-label-tab`, `tenant-modules-tab`,
> `tenant-detail`, `tenants-list`, `dashboard`, `tenant-wizard`) y a `subcajas` /
> `cuentas-destino`.
>
> **Antes de culpar a tu cambio, corré la baseline con `git stash -u` y compará los números.**
> Lo que importa es no sumar fallos nuevos.
