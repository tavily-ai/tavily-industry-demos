# Industry demo delivery

Each demo has one Dockerfile and one image that serves its UI and API.
The `app` stage supports the existing `tavily-ai/github-actions/.github/workflows/service-deploy.yml` flow.
Each build uses the demo directory as its Docker context.

The public checks run on GitHub-hosted runners for pushes and pull requests.
They include ARM64 image builds and HTTP checks for the UI, JavaScript asset, and health endpoint.
The Python routing tests also cover browser routes, missing assets, and missing API routes.

After the checks pass on `main`, `deploy-demos.yml` requests a deployment in `tavily-ai/github-actions`.
The request contains the source commit SHA.
The internal `industry-demos-deploy.yml` entrypoint accepts only the current `main` commit from this repository.
It calls the existing shared `service-deploy.yml` once for each demo.

The public repository cannot directly call an internal reusable workflow under [GitHub's access rules](https://docs.github.com/en/enterprise-cloud@latest/actions/reference/workflows-and-actions/reusing-workflow-configurations#access-to-reusable-workflows).
The dispatch keeps AWS credentials and Helm write credentials in the internal repository.

Each deployment request builds all seven demos.
This keeps the latest request complete when several source pushes share the deployment queue.
The matrix processes demos one at a time to avoid simultaneous Helm commits.
A failed demo does not cancel the remaining demos.
Its Helm tag stays unchanged because the shared flow updates the tag only after a successful image push.

| Demo | Runtime port | Health endpoint |
| --- | --- | --- |
| `sales-meeting-prep` | 3000 | `/api/health` |
| `company-research-agent` | 8000 | `/health` |
| `market-researcher` | 8000 | `/health` |
| `vendor-supply-chain-risk` | 3000 | `/api/health` |
| `travel-hospitality-intelligence-agent` | 8000 | `/health` |
| `tavily-chat` | 3000 | `/api/health` |
| `fsi-kit` | 8000 | `/api/modules` |

The image path is `598432549459.dkr.ecr.us-east-1.amazonaws.com/industry-demos/<demo>:main-<short-sha>`.
The shared flow updates only `image.tag` in `helm-charts/industry-demos-chart/values-demo-<demo>.yaml`.
It preserves `enabled` and all other values.
Argo CD sync remains manual in production.

## Initial setup

1. Merge the shared-workflow PR in `tavily-ai/github-actions`.
2. Merge the chart PR in `tavily-ai/helm-charts`.
3. Merge the ApplicationSet PR in `tavily-ai/gitops`.
4. Create the seven `industry-demos/<demo>` ECR repositories in account `598432549459`, region `us-east-1`.
5. Grant the production account access to pull those images.
6. Create each runtime secret as described in the Helm chart README.
7. Configure `INDUSTRY_DEMOS_DISPATCH_TOKEN` in this repository.
8. Merge this source change into `staging`, then merge that branch into `main`.

The dispatch token needs repository-dispatch access to `tavily-ai/github-actions`.
A fine-grained token needs Contents write permission on that repository.
The internal repository needs the existing shared-flow secrets, including `AWS_ROLE_ARN`, `AWS_REGION`, and `PERSONAL_GITHUB_ACCESS_TOKEN`.
The shared flow retains its existing required AWS access-key secret inputs for caller compatibility.
Its industry-demo jobs use OIDC and skip CodeArtifact.

After the first successful image build, set `enabled: true` in each desired Helm override.
Then sync its Application in Argo CD.
The default hostname is `industry-<demo>.tavily.com`.

## Retry delivery

1. Select `main` in the `Request Industry Demo Deployment` workflow.
2. Run the workflow manually.
3. Open the deployment link in its job summary.

The public workflow confirms dispatch acceptance.
The linked internal workflow shows the image builds and Helm updates.
The development branch and pull requests never publish images or change Helm tags.

## Local image check

From the repository root:

```bash
docker build --platform linux/arm64 --target app -t industry-demo:local company-research-agent
docker run -d --name industry-demo -p 127.0.0.1:18080:8000 industry-demo:local
python3 scripts/smoke-image.py http://127.0.0.1:18080 /health
docker rm -f industry-demo
```

Python production builds use same-origin API URLs.
Local Vite development retains its localhost API default and accepts an explicit `VITE_API_URL`.
FSI stores SQLite history and audit logs in the container filesystem, so pod replacement clears them.
