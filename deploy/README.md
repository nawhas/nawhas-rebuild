# Nawhas Deployment Infrastructure

Kubernetes + Helm + ArgoCD deployment for Nawhas.com.

## Directory Structure

```
deploy/
  helm/
    nawhas/
      Chart.yaml
      values.yaml               # base defaults
      values-staging.yaml       # staging overrides
      values-production.yaml    # production overrides
      secrets/
        staging.yaml.example    # template — copy, fill, then encrypt
        production.yaml.example
        staging.yaml.enc        # SOPS-encrypted (safe to commit)
        production.yaml.enc     # SOPS-encrypted (safe to commit)
      templates/
        deployment.yaml         # Deployment + init container (migrations)
        service.yaml
        ingress.yaml            # conditional per service (app/minio/mailhog)
        namespace.yaml
        pdb.yaml
        hpa.yaml
  argocd/
    staging.yaml                # ArgoCD Application for staging
    production.yaml             # ArgoCD Application for production
    applicationset.yaml         # ApplicationSet (multi-env)
```

## First-Time Cluster Setup

### 1. Install required cluster components

```bash
# cert-manager (TLS via Let's Encrypt)
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true

# Nginx Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### 2. Set up SOPS + age secrets

```bash
# Install tools
brew install sops age  # or apt/dnf equivalent

# Generate keypairs (run once per environment)
age-keygen -o staging.key    # output includes: # public key: age1...
age-keygen -o production.key

# Replace placeholder public keys in .sops.yaml with generated public keys.

# Store private keys as GitHub Actions secrets:
#   AGE_PRIVATE_KEY_STAGING   → contents of staging.key
#   AGE_PRIVATE_KEY_PRODUCTION → contents of production.key

# Create plaintext secrets (NEVER COMMIT these):
cp deploy/helm/nawhas/secrets/staging.yaml.example \
   deploy/helm/nawhas/secrets/staging.yaml
# Edit staging.yaml with real values, then encrypt:
sops --encrypt deploy/helm/nawhas/secrets/staging.yaml \
  > deploy/helm/nawhas/secrets/staging.yaml.enc
```

### 3. Register ArgoCD application

```bash
# Apply the ArgoCD application manifest
kubectl apply -f deploy/argocd/staging.yaml

# Or use the ApplicationSet for both environments:
kubectl apply -f deploy/argocd/applicationset.yaml
```

### 4. Configure GitHub Actions secrets

| Secret | Description |
|--------|-------------|
| `ARGOCD_SERVER` | ArgoCD server hostname (no https://) |
| `ARGOCD_USERNAME` | ArgoCD login username (default: `admin`) |
| `ARGOCD_PASSWORD` | ArgoCD login password |
| `AGE_PRIVATE_KEY_STAGING` | age private key for staging secrets |
| `AGE_PRIVATE_KEY_PRODUCTION` | age private key for production secrets |

## CI/CD Flow

1. PR opened → CI runs `quality`, `build`, `docker-build`, `e2e`
2. PR merged to `main` → `docker-push` builds and pushes `ghcr.io/nawhas/nawhas-web:<sha>` + `:latest`
3. `deploy-staging` sets the image tag in ArgoCD and syncs the staging application
4. ArgoCD runs the init container (DB migrations) then rolls out the new pods
5. Liveness + readiness probes on `/api/health` gate the rollout

## Subdomains (staging)

| Subdomain | Routes to |
|-----------|-----------|
| `staging.nawhas.cititech.tech` | Next.js web app |
| `s3.staging.nawhas.cititech.tech` | MinIO (S3-compatible storage) |
| `mail.staging.nawhas.cititech.tech` | MailHog (SMTP trap) |

## Migrations

Migrations run automatically via the `migrate` init container on every deploy.
The init container uses the same image as the app and runs `node packages/db/dist/migrate.js`.
**Never run migrations manually in production.**

## Secrets Rule

- All secrets live in SOPS-encrypted `*.yaml.enc` files only
- Plaintext `*.yaml` secrets are blocked by `.gitignore`
- `*.yaml.example` templates show the required shape — copy, fill, encrypt, commit the `.enc`
