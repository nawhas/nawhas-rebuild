# ArgoCD Setup

## Staging secret management (helm-secrets + SOPS + age)

The staging Application uses `helm-secrets` to decrypt `secrets/staging.yaml.enc` at sync time.

### One-time setup (run from a machine with cluster access)

1. Store the age private key in the argocd namespace:
   ```bash
   kubectl create secret generic helm-secrets-age-key \
     -n argocd \
     --from-literal=key.txt='AGE-SECRET-KEY-1...' \
     --dry-run=client -o yaml | kubectl apply -f -
   ```

2. Apply the repo-server patch (installs helm-secrets + sops, mounts the key):
   ```bash
   kubectl patch deployment argocd-repo-server -n argocd \
     --patch-file deploy/argocd/repo-server-patch.yaml
   ```

3. Apply the CMP plugin config:
   ```bash
   kubectl apply -f deploy/argocd/helm-secrets-cmp.yaml
   ```

4. Restart repo-server to pick up changes:
   ```bash
   kubectl rollout restart deployment/argocd-repo-server -n argocd
   kubectl rollout status deployment/argocd-repo-server -n argocd
   ```

5. Apply the ArgoCD Application (or let ArgoCD auto-sync if already running):
   ```bash
   kubectl apply -f deploy/argocd/staging.yaml
   ```

### Rotating secrets

Re-encrypt the values file with updated secrets, commit, and push. ArgoCD will decrypt and apply on next sync — no manual cluster action required.
