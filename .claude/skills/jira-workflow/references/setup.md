# Setup `jira-cli` — para compañeros que arrancan de 0

Esta skill usa el CLI [`jira`](https://github.com/ankitpokhrel/jira-cli) de ankitpokhrel para hablar con Atlassian Cloud. La auth es con **API token personal** (no SSO). Cada miembro del equipo se autentica con su cuenta — no compartir tokens.

## 1. Instalar el binario

### Windows (recomendado: Scoop)

> ⚠️ **Importante:** Scoop tiene **dos** paquetes con nombre parecido y son CLIs distintos:
> - `jira` en el bucket `main` → Netflix `go-jira` (NO sirve para esta skill).
> - `jira-cli` en el bucket `extras` → `ankitpokhrel/jira-cli` (este es el que necesitamos).
>
> Usá siempre `jira-cli` desde `extras`, NO `jira` desde `main`.

```powershell
scoop bucket add extras
scoop install jira-cli
```

Si no tenés Scoop:
```powershell
Invoke-RestMethod get.scoop.sh | Invoke-Expression
scoop bucket add extras
scoop install jira-cli
```

(El binario se llama `jira.exe` aunque el paquete se llame `jira-cli` — el comando que vas a usar es `jira`.)

### Windows (alternativa sin Scoop)

Descargá el zip desde https://github.com/ankitpokhrel/jira-cli/releases (buscá `*_windows_x86_64.zip`), extraé `jira.exe`, y poné la carpeta en `PATH`.

### macOS

```bash
brew tap ankitpokhrel/jira-cli
brew install jira-cli
```

### Linux

```bash
# Descargar el binario para tu arch desde:
# https://github.com/ankitpokhrel/jira-cli/releases
# Mover a /usr/local/bin/jira y chmod +x
```

Verificá con:
```
jira version
```

## 2. Obtener tu API token de Atlassian (sin SSO)

1. Andá a https://id.atlassian.com/manage-profile/security/api-tokens (entrá con tu cuenta de Atlassian).
2. Click en **"Create API token"** (NO uses "Create API token with scopes" salvo que el equipo te diga lo contrario).
3. Label: algo como `claude-code-laptop` o `jira-cli-{tu-nombre}`. Sirve para revocarlo después si te roban la máquina.
4. Copiá el token **ahora** — no se vuelve a mostrar. Guardalo en tu password manager.

> **Importante:** el token es equivalente a tu password para todo lo que toque la API. NO lo pegues en chat, NO lo commitees, NO lo compartas. Si lo expusiste, revocálo desde la misma página y generá uno nuevo.

## 3. Configurar `jira init`

Corré:
```
jira init
```

Te va a preguntar:

| Prompt | Qué poner |
|---|---|
| **Installation type** | `Cloud` |
| **Link to Jira server** | `https://<site>.atlassian.net` (tu URL completa de Jira; ej. `https://tup-tesis-lab.atlassian.net`) |
| **Login email** | El email con el que entrás a Jira (no el username) |
| **Default project** | La key del proyecto principal del equipo (ej. `LAB`, `TUP`). Si tienen varios, elegí el que más usen — se puede sobreescribir por comando con `-p`. |
| **Default board** | Si el proyecto tiene un solo board, dejá el sugerido. Si no, el del sprint activo. |

Después de eso te va a pedir el API token (no se muestra al escribir). Pegalo del password manager.

Esto guarda la config en:
- Windows: `%USERPROFILE%\AppData\Roaming\.config\.jira\.config.yml`
- macOS/Linux: `~/.config/.jira/.config.yml`

El archivo tiene el token en plano. Asegurate de que los permisos sean restrictivos (en Linux/macOS: `chmod 600`).

## 4. Verificar que funciona

```
jira me
```
Debería devolver tu email. Si dice `not authenticated` o `401`, el token está mal — repetí desde el paso 2.

```
jira issue list --plain --limit 3
```
Debería mostrarte los últimos 3 issues del proyecto default. Si dice "no issues" pero no falla, está OK (proyecto vacío).

## 5. Revocar tokens viejos

Si cambiás de laptop o sospechás que el token se filtró:

1. https://id.atlassian.com/manage-profile/security/api-tokens
2. Click en el ícono de tacho al lado del token viejo.
3. Generá uno nuevo y corré `jira init` de nuevo (o editá `.config.yml` directamente, campo `api_token`).

## 6. Troubleshooting

### `command not found: jira`
El binario no está en `PATH`. En Windows, reabrí la terminal después de instalar con Scoop. En manual install, agregá la carpeta a `PATH` desde "Editar variables de entorno del sistema".

### `Error: failed to authenticate`
El email o el token están mal. Recordá que es el **email**, no el username (`@tecnicatura.frc.utn.edu.ar`, no `412328-Rodriguez`).

### `403 Forbidden` al crear un issue
Tu cuenta no tiene permiso de crear issues en ese proyecto. Hablá con el PM/admin del proyecto.

### El comando se cuelga / pide input interactivo
Agregá `--no-input` para forzar modo no interactivo. Si el comando necesita un campo obligatorio y no lo das, va a fallar rápido con un mensaje claro en lugar de quedarse esperando.

### Quiero conectar SSO en vez de API token
**No soportado por el CLI**. Atlassian no expone OAuth para CLIs de terceros sin pasar por una app registrada. Si tu org bloquea API tokens, hablá con el admin de Atlassian para que los habilite — o usá el MCP server oficial de Atlassian (instrucciones aparte, no cubiertas por esta skill).
