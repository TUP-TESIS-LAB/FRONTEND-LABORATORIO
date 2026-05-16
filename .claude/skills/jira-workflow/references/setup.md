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

> ⚠️ **Importante:** Hay un detalle no obvio que valida este equipo end-to-end: `jira init` **NO guarda el token en el archivo de config**. Solo guarda server/login/project/board. El token se lee siempre de la env var `JIRA_API_TOKEN`. Por eso el paso 4 (persistir el token) es obligatorio — sin ese paso, `jira me` falla "silencioso" después de reiniciar la terminal.

Corré:
```
jira init
```

Te va a preguntar:

| Prompt | Qué poner |
|---|---|
| **Installation type** | `Cloud` |
| **Link to Jira server** | `https://exequielsantoro.atlassian.net` — URL del Jira del equipo (es la misma para todos los compañeros del TUP-TESIS-LAB) |
| **Login email** | El email con el que entrás a Jira (no el username) |
| **Auth type** | `basic` |
| **Default project** | La key del proyecto principal (al momento de escribir esto: `KAN`). Confirmá con tu PM si tu equipo agregó otros proyectos. Se puede sobreescribir por comando con `-p`. |
| **Default board** | Aceptá el sugerido (`<project> board`). Si tu proyecto tiene varios, elegí el del sprint activo. |

Después te va a pedir el API token vía prompt enmascarado. **No se muestra al tipear** (es seguro). Pegalo del password manager.

Esto guarda la config en:
- Windows: `%USERPROFILE%\.config\.jira\.config.yml`
- macOS/Linux: `~/.config/.jira/.config.yml`

**Atajo no-interactivo** — si querés saltearte los prompts (útil para automation o si te equivocás y necesitás re-correr `init`):

```powershell
jira init `
  --installation cloud `
  --server "https://exequielsantoro.atlassian.net" `
  --login "tu-email@example.com" `
  --project "KAN" `
  --auth-type basic
```
Solo te va a pedir el token (todo el resto va por flags). Y board, si no hay uno detectable.

## 4. Persistir el token (CRÍTICO — sin esto la skill no funciona)

`jira init` no escribe el token en ningún archivo del config; lo busca en la env var `JIRA_API_TOKEN` cada vez que corrés `jira`. Si solo lo seteás en la sesión actual, al cerrar la terminal se pierde.

### Windows — env var permanente en el user environment

```powershell
# Pega token con prompt oculto (no se muestra ni queda en historial)
$sec = Read-Host "Pegá el API token (input oculto)" -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
$tok = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

# Escribe el token al user environment del registro (HKCU\Environment)
[Environment]::SetEnvironmentVariable("JIRA_API_TOKEN", $tok, "User")
# Setealo también en la sesión actual (sin esto, hasta no reabrir PowerShell, jira no lo ve)
$env:JIRA_API_TOKEN = $tok

Remove-Variable sec, bstr, tok -ErrorAction SilentlyContinue
```

Esto deja el token en `HKCU\Environment\JIRA_API_TOKEN` — solo accesible para tu usuario de Windows, persistente entre sesiones. Para revocar después: `[Environment]::SetEnvironmentVariable("JIRA_API_TOKEN", $null, "User")`.

### macOS / Linux — agregalo al shell rc

Para bash:
```bash
echo 'export JIRA_API_TOKEN="<pegá_el_token_acá>"' >> ~/.bashrc
chmod 600 ~/.bashrc
source ~/.bashrc
```
Para zsh, mismo concepto pero con `~/.zshrc`. Para fish, `~/.config/fish/config.fish` y syntax `set -gx JIRA_API_TOKEN ...`.

Alternativa más limpia (cross-shell): usar [`.netrc`](https://everything.curl.dev/usingcurl/netrc). En ese caso jira-cli lee de `~/.netrc`:
```
machine exequielsantoro.atlassian.net
  login tu-email@example.com
  password <tu-api-token>
```
Y `chmod 600 ~/.netrc`.

## 5. Verificar que funciona

```
jira me
```
Debería devolver tu email. Si dice `not authenticated` o `401`, repetí desde el paso 2 (token mal pegado) o paso 4 (env var no persistió).

```
jira issue list --plain --paginate 3
```
Debería mostrarte los últimos 3 issues del proyecto default. Si dice "no issues" pero no falla, está OK (proyecto vacío).

> Nota: usá `--paginate N`, **no** `--limit N`. `--limit` no existe en jira-cli y tira `Error: unknown flag`.

## 6. Revocar tokens viejos

Si cambiás de laptop o sospechás que el token se filtró:

1. https://id.atlassian.com/manage-profile/security/api-tokens
2. Click en el ícono de tacho al lado del token viejo.
3. Generá uno nuevo, copialo, y volvé a correr el snippet del paso 4 con el nuevo (el `SetEnvironmentVariable` con scope `User` **sobrescribe** el valor anterior).

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
