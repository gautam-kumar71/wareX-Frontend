# wareX Frontend

This repository contains the Angular frontend and frontend deployment assets.

## What is included

- Angular application source
- Production Docker image build with Nginx
- `docker-compose.ec2.yml` for EC2 deployment
- GitHub Actions workflow at `.github/workflows/deploy.yml`

## Required GitHub secrets

- `FRONTEND_EC2_HOST`
- `FRONTEND_EC2_USER`
- `FRONTEND_EC2_SSH_KEY`
- `FRONTEND_EC2_ENV_FILE`
- `GHCR_TOKEN`

`GHCR_TOKEN` should be a GitHub personal access token with package read access for deployment on EC2.

`FRONTEND_EC2_ENV_FILE` must include:

- `PUBLIC_DOMAIN` set to your live hostname, for example `warex.example.com`
- `UPSTREAM_GATEWAY_URL=http://host.docker.internal:8080` so the frontend container can still proxy gateway routes expected by the current image
- `FRONTEND_GATEWAY_URL=` left blank to keep the browser on the same HTTPS origin
- `GOOGLE_CLIENT_ID` for Google Sign-In
- `FRONTEND_RAZORPAY_KEY_ID` so Razorpay checkout uses the right frontend key at runtime

## Required EC2 preparation

Install Docker and Docker Compose on the frontend EC2 host. The workflow deploys files to `/opt/warex-frontend`.

Open inbound ports `80` and `443` on the EC2 security group so Caddy can complete ACME challenges and serve HTTPS.

## First push

```powershell
git init -b main
git add .
git commit -m "Prepare frontend for GitHub Actions and EC2 deployment"
git remote add origin https://github.com/<your-user>/<your-frontend-repo>.git
git push -u origin main
```

## Branching strategy

- `main` is the production branch
- `dev` must be created from `main`
- every frontend feature branch must be created from `dev`

Recommended frontend branches:

- `feature/auth-ui`
- `feature/dashboard`
- `feature/payments`
- `feature/products`
- `feature/suppliers`
- `feature/warehouses`
- `feature/reports`
- `feature/admin-ui`

Merge flow:

1. create `dev` from `main`
2. create a frontend feature branch from `dev`
3. merge the feature branch into `dev`
4. merge `dev` into `main`

## Commit message format

Use this exact pattern:

```text
[Gautam] : added dashboard
```

The commit must start with `[Gautam] : added ` and then the feature name.
