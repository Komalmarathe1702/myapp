# MyApp — Node.js REST API

A simple but complete REST API built with Express.js, designed for the Deakin SIT223/SIT753 DevOps Pipeline HD task.

## Project Overview

This project implements a **User Management REST API** with:
- Full CRUD operations for users (`/api/users`)
- Health check endpoint (`/health`)
- Prometheus metrics endpoint (`/metrics`)
- Automated test suite with >90% coverage (Jest + Supertest)
- Docker containerisation
- Full CI/CD pipeline via Jenkins (7 stages)

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18 |
| Framework | Express.js |
| Testing | Jest + Supertest |
| Metrics | prom-client (Prometheus) |
| Containerisation | Docker |
| CI/CD | Jenkins |
| Code Quality | SonarQube |
| Security Scan | Trivy + npm audit |
| Monitoring | Prometheus + Grafana |

## Quick Start

```bash
# Install dependencies
npm install

# Run locally
npm start

# Run tests
npm test

# Build Docker image
docker build -t myapp:latest .

# Run with full monitoring stack
docker-compose up -d
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /health | Health check |
| GET | /metrics | Prometheus metrics |
| GET | /api/users | List all users |
| GET | /api/users/:id | Get user by ID |
| POST | /api/users | Create user |
| DELETE | /api/users/:id | Delete user |

## Jenkins Pipeline Stages

| # | Stage | Tool | Purpose |
|---|---|---|---|
| 4 | Build | Docker, npm | Build Docker image artefact |
| 5 | Test | Jest, Supertest | Run automated tests + coverage |
| 6 | Code Quality | SonarQube | Detect code smells, duplication |
| 7 | Security | Trivy, npm audit | Scan for CVEs and vulnerabilities |
| 8 | Deploy | Docker | Deploy to staging (port 3000) |
| 9 | Release | Docker | Promote to production (port 3001) |
| 10 | Monitoring | Prometheus, Grafana | Live metrics and alerting |

## Jenkins Setup

1. Install Jenkins (or run via Docker — see below)
2. Install plugins: Pipeline, SonarQube Scanner, HTML Publisher, JUnit, Docker Pipeline
3. Configure SonarQube server in Jenkins → Manage Jenkins → Configure System
4. Create a Pipeline job pointing to this repository
5. Run the pipeline

### Run Jenkins via Docker

```bash
docker run -d \
  --name jenkins \
  -p 8080:8080 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts
```

### Run SonarQube

```bash
docker run -d \
  --name sonarqube \
  -p 9000:9000 \
  sonarqube:lts-community
```
Visit http://localhost:9000 (admin/admin), create a project token, add it to Jenkins credentials.

## Monitoring URLs (after pipeline runs)

| Service | URL | Credentials |
|---|---|---|
| App (staging) | http://localhost:3000/health | — |
| App (production) | http://localhost:3001/health | — |
| Prometheus | http://localhost:9090 | — |
| Grafana | http://localhost:3002 | admin / admin123 |
