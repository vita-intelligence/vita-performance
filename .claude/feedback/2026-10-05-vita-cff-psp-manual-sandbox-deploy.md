# vita-cff + psp: manual sandbox deploy (no CI auto-deploy)

**Captured:** 2026-10-05
**Scope:** `vita-cff`, `psp` (sandbox only)

## Rule

No CI auto-deploy is wired up for vita-cff or psp. All sandbox deploys must be done manually, in this exact sequence (run from the service directory):

1. `docker buildx build --platform linux/amd64 --push -t maksymcherhyk/<repo>:sbx .`
2. `az webapp config container set --name <sbx-webapp> --resource-group Vita_Sandbox --container-image-name maksymcherhyk/<repo>:sbx`
3. `az webapp restart --name <sbx-webapp> --resource-group Vita_Sandbox`
4. Poll for the container to come back up before verifying.

### Image / webapp mapping (sandbox only)

| Service     | Image                                | Webapp              | Resource group |
| ----------- | ------------------------------------ | ------------------- | -------------- |
| CFF backend | `maksymcherhyk/vita-cff-backend:sbx` | `sbx-cff-backend`   | `Vita_Sandbox` |
| PSP backend | `maksymcherhyk/vita-psp-backend:sbx` | `sbx-psp-backend`   | `Vita_Sandbox` |

**DO NOT TOUCH:**
- `maksymcherhyk/vita-npd-backend:latest` / webapp `vita-npd-backend` (RG `Vita_NPD`) — that is production CFF, a completely separate image repository.
- `:latest` tags anywhere — those go to prod.

## Why

User explicitly flagged on 2026-10-05 that no auto-deploy is triggered and that I must manually deploy to sandbox. They care about not accidentally touching production.

## How to apply

Before every code-change deployment in these projects, follow the four-step manual flow above. Never assume a push to `main` triggers a deploy — it does not. Verify Docker tags carefully (`:sbx` for sandbox, `:latest` for prod) before pushing.
