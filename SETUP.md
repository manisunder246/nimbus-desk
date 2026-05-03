# NimbusDesk — Setup Guide

End-to-end provisioning + deployment from a fresh clone. All AWS work runs from your laptop using the AWS CLI; the only thing that lives on EC2 is the Express + React app behind Nginx.

## Prerequisites

- **Node.js 20+** and `npm`
- **AWS CLI v2**, configured with credentials that can create Cognito pools, DynamoDB tables, S3 buckets, SNS topics, IAM roles, Lambda functions, API Gateways, and EC2 instances
- An **AWS account** in `ap-south-1` (Mumbai). To deploy in another region, edit `AWS_REGION` defaults at the top of `infrastructure/_common.sh`
- **bash**, **ssh**, **scp**, **zip**, **rsync** on your PATH (standard on macOS / Linux)

Verify:

    aws sts get-caller-identity
    node -v   # >= 20
    npm -v

## 1. Clone and prep env templates

    git clone <this-repo>.git nimbus-desk
    cd nimbus-desk
    cp .env.infrastructure.example .env.infrastructure
    cp backend/.env.example          backend/.env
    cp frontend/.env.example         frontend/.env

Open `.env.infrastructure` and replace any pre-filled placeholder you don't want (notably the seed user emails inside the infra scripts). Most values get overwritten by the scripts in step 2.

## 2. Provision AWS — run the scripts in order

Each script is idempotent and writes the IDs/ARNs it produces into `.env.infrastructure`:

    bash infrastructure/01-cognito.sh    # User pool, app client, groups, seed users
    bash infrastructure/02-dynamodb.sh   # Tickets + Users tables (PAY_PER_REQUEST)
    bash infrastructure/03-s3.sh         # Attachments bucket (SSE, CORS, blocked public)
    bash infrastructure/04-sns.sh        # Topic + email subscription (confirm via inbox)
    bash infrastructure/05-iam.sh        # EC2 + Lambda roles + instance profile
    bash infrastructure/06-lambda.sh     # Builds + deploys nimbusdesk-classifier
    bash infrastructure/07-apigateway.sh # REST API in front of the Lambda
    bash infrastructure/08-ec2.sh        # SG, key pair, t2.micro AL2023 instance

After step 4 (SNS) check the inbox you supplied and click the AWS confirmation link — until you do, no email notifications will be delivered.

## 3. Sync the backend env from the infrastructure manifest

    ( echo "PORT=3001" && cat .env.infrastructure ) > backend/.env

Repeat any time `.env.infrastructure` changes.

## 4. Deploy frontend + backend to EC2

    bash infrastructure/09-deploy.sh

This rebuilds the React frontend with the live EC2 DNS baked into `VITE_API_BASE_URL`, packages backend + dist into a tarball, ships it over SSH, installs Node 20 + nginx + pm2 on the instance, and starts everything. The script prints the public URL when it finishes:

    NIMBUSDESK LIVE — http://ec2-XX-XX-XX-XX.ap-south-1.compute.amazonaws.com

Visit that URL to see the marketing landing page. `/login` takes you to the app.

## 5. Run the test suite (optional but recommended)

    cd tests
    npm install
    ln -sf ../.env.infrastructure .env   # tests read everything from here
    npm test                              # runs against the deployed EC2

Results land in `tests/results/latest.md` and `tests/results/latest.json`.

## Troubleshooting

- **"Auth flow not enabled"** — the app client only accepts `USER_PASSWORD_AUTH` and `REFRESH_TOKEN_AUTH`. Use `aws cognito-idp initiate-auth`, not `admin-initiate-auth`.
- **`pm2: command not found` after deploy** — `09-deploy.sh` pins npm prefix to `/usr/local`. If you run it manually, do `sudo npm config set prefix /usr/local` first.
- **EC2 backend crash with `ERR_REQUIRE_ESM`** — Node 18 is too old for `jose` / `jwks-rsa`. The deploy script forces Node 20.
- **Tests fail with `NotAuthorizedException`** — make sure any password containing a `#` is single-quoted in `.env.infrastructure` (e.g. `COGNITO_ANALYST_PASSWORD='ChangeMe#2026!'`); dotenv treats `#` as a comment marker and silently truncates the value otherwise.

## Project layout

    backend/         Express API (DynamoDB / S3 / SNS / Cognito / Lambda)
    frontend/        React + Vite + Tailwind SPA (landing + app)
    lambda/          Classifier function (priority re-evaluation + SNS publish)
    infrastructure/  AWS CLI provisioning + deploy scripts
    tests/           Jest integration + unit suite (writes results/)
