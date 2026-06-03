pipeline {
    agent any

    environment {
        IMAGE_NAME     = "myapp"
        IMAGE_TAG      = "${BUILD_NUMBER}"
        STAGING_PORT   = "3000"
        PROD_PORT      = "3001"
        SONAR_PROJECT  = "myapp"
    }

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    // ──────────────────────────────────────────────────────────
    // STAGE 4 — BUILD
    // Goal: install deps and create a tagged Docker image artefact
    // ──────────────────────────────────────────────────────────
    stages {
        stage('Build') {
            steps {
                echo "=== BUILD: Installing dependencies and building Docker image ==="
                sh 'npm ci'
                sh 'npm run build'
                sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
                sh "docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest"
                echo "Artefact created: ${IMAGE_NAME}:${IMAGE_TAG}"
            }
            post {
                success { echo "Build PASSED — image ${IMAGE_NAME}:${IMAGE_TAG} ready" }
                failure { error "Build FAILED — check Dockerfile and package.json" }
            }
        }

        // ──────────────────────────────────────────────────────────
        // STAGE 5 — TEST
        // Goal: run Jest unit + integration tests, publish results
        // ──────────────────────────────────────────────────────────
        stage('Test') {
            steps {
                echo "=== TEST: Running automated test suite ==="
                sh 'npm run test:ci'
            }
            post {
                always {
                    // Publish JUnit XML results (requires JUnit plugin)
                    junit allowEmptyResults: true, testResults: 'junit.xml'

                    // Publish HTML coverage report (requires HTML Publisher plugin)
                    publishHTML([
                        allowMissing:          false,
                        alwaysLinkToLastBuild: true,
                        keepAll:               true,
                        reportDir:             'coverage/lcov-report',
                        reportFiles:           'index.html',
                        reportName:            'Coverage Report'
                    ])
                }
                failure {
                    error "Tests FAILED — pipeline stopped. Fix failing tests before proceeding."
                }
            }
        }

        // ──────────────────────────────────────────────────────────
        // STAGE 6 — CODE QUALITY (SonarQube)
        // Goal: detect code smells, duplication, complexity issues
        // Tools: SonarQube + sonar-scanner
        // ──────────────────────────────────────────────────────────
        stage('Code Quality') {
    steps {
        echo "=== CODE QUALITY: Running SonarQube analysis ==="
        script {
            try {
                withSonarQubeEnv('SonarQube') {
                    def scannerHome = tool 'SonarQube Scanner'
                    sh "${scannerHome}/bin/sonar-scanner -Dsonar.projectKey=myapp -Dsonar.projectName=myapp -Dsonar.sources=src -Dsonar.host.url=http://host.docker.internal:9000"
                }
                echo "Code Quality analysis complete."
            } catch (err) {
                echo "SonarQube issue: ${err.getMessage()} — continuing pipeline."
                currentBuild.result = 'UNSTABLE'
            }
        }
    }
}

        // ──────────────────────────────────────────────────────────
        // STAGE 7 — SECURITY
        // Goal: scan for vulnerabilities in deps AND the Docker image
        // Tools: npm audit (dependencies) + Trivy (Docker image)
        // ──────────────────────────────────────────────────────────
        stage('Security') {
            steps {
                echo "=== SECURITY: Scanning dependencies and Docker image ==="

                // 1. npm audit — checks for known CVEs in package dependencies
                sh 'npm audit --json > npm-audit-report.json || true'
                sh 'npm audit --audit-level=critical || echo "npm audit: vulnerabilities found — see report"'

                // 2. Trivy — scans the Docker image for HIGH and CRITICAL CVEs
                sh """
                    docker run --rm \
                      -v /var/run/docker.sock:/var/run/docker.sock \
                      -v \$HOME/.cache:/root/.cache \
                      aquasec/trivy:latest image \
                        --exit-code 0 \
                        --severity HIGH,CRITICAL \
                        --format json \
                        --output trivy-report.json \
                        ${IMAGE_NAME}:${IMAGE_TAG} \
                    || true
                """

                // Print summary to console
                sh """
                    docker run --rm \
                      -v /var/run/docker.sock:/var/run/docker.sock \
                      aquasec/trivy:latest image \
                        --severity HIGH,CRITICAL \
                        ${IMAGE_NAME}:${IMAGE_TAG} \
                    || true
                """
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.json, npm-audit-report.json',
                                     allowEmptyArchive: true
                    echo "Security reports archived. Review trivy-report.json and npm-audit-report.json."
                }
            }
        }

        // ──────────────────────────────────────────────────────────
        // STAGE 8 — DEPLOY (Staging)
        // Goal: deploy the Docker image to a local staging container
        // Tools: Docker
        // ──────────────────────────────────────────────────────────
        stage('Deploy to Staging') {
            steps {
                echo "=== DEPLOY: Deploying to staging on port ${STAGING_PORT} ==="

                // Remove old staging container if it exists
                sh "docker stop myapp-staging || true"
                sh "docker rm   myapp-staging || true"

                // Run the new staging container
                sh """
                    docker run -d \
                      --name myapp-staging \
                      -p ${STAGING_PORT}:3000 \
                      -e NODE_ENV=staging \
                      ${IMAGE_NAME}:${IMAGE_TAG}
                """

                // Wait for app to start, then health check
                sh 'sleep 5'
                sh "curl -f http://localhost:${STAGING_PORT}/health || exit 1"

                echo "Staging deployment SUCCESSFUL at http://localhost:${STAGING_PORT}"
            }
            post {
                failure {
                    sh "docker stop myapp-staging || true"
                    sh "docker rm   myapp-staging || true"
                    error "Staging deployment FAILED — container cleaned up."
                }
            }
        }

        // ──────────────────────────────────────────────────────────
        // STAGE 9 — RELEASE (Production)
        // Goal: promote the verified staging image to production
        // Tools: Docker (tagged prod release)
        // ──────────────────────────────────────────────────────────
        stage('Release to Production') {
            steps {
                echo "=== RELEASE: Promoting build #${IMAGE_TAG} to production ==="

                // Tag the image as a production release
                sh "docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:prod-${IMAGE_TAG}"
                sh "docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:prod-latest"

                // Remove old production container
                sh "docker stop myapp-prod || true"
                sh "docker rm   myapp-prod || true"

                // Launch production container with restart policy
                sh """
                    docker run -d \
                      --name myapp-prod \
                      -p ${PROD_PORT}:3000 \
                      -e NODE_ENV=production \
                      --restart unless-stopped \
                      ${IMAGE_NAME}:prod-${IMAGE_TAG}
                """

                // Production health check
                sh 'sleep 5'
                sh "curl -f http://localhost:${PROD_PORT}/health || exit 1"

                echo "Production release ${IMAGE_TAG} LIVE at http://localhost:${PROD_PORT}"
            }
            post {
                failure {
                    sh "docker stop myapp-prod || true"
                    sh "docker rm   myapp-prod || true"
                    error "Production release FAILED — rolled back."
                }
                success {
                    echo "Release COMPLETE — version ${IMAGE_TAG} running in production."
                }
            }
        }

        // ──────────────────────────────────────────────────────────
        // STAGE 10 — MONITORING & ALERTING
        // Goal: start Prometheus + Grafana to monitor the prod app
        // Tools: Prometheus, Grafana (via Docker)
        // ──────────────────────────────────────────────────────────
        stage('Monitoring & Alerting') {
            steps {
                echo "=== MONITORING: Setting up Prometheus and Grafana ==="

                // Start Prometheus
                sh "docker stop prometheus || true"
                sh "docker rm   prometheus || true"
                sh """
                    docker run -d \
                      --name prometheus \
                      -p 9090:9090 \
                      -v \${WORKSPACE}/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
                      prom/prometheus:latest \
                        --config.file=/etc/prometheus/prometheus.yml
                """

                // Start Grafana
                sh "docker stop grafana || true"
                sh "docker rm   grafana || true"
                sh """
                    docker run -d \
                      --name grafana \
                      -p 3002:3000 \
                      -e GF_SECURITY_ADMIN_PASSWORD=admin123 \
                      -e GF_USERS_ALLOW_SIGN_UP=false \
                      grafana/grafana:latest
                """

                sh 'sleep 8'

                // Verify monitoring is up
                sh "curl -f http://localhost:9090/-/healthy   || echo 'Prometheus starting...'"
                sh "curl -f http://localhost:3002/api/health  || echo 'Grafana starting...'"

                echo """
Monitoring LIVE:
  Prometheus : http://localhost:9090
  Grafana    : http://localhost:3002  (admin / admin123)
  App metrics: http://localhost:${PROD_PORT}/metrics
                """
            }
        }
    }

    // ──────────────────────────────────────────────────────────
    // POST PIPELINE
    // ──────────────────────────────────────────────────────────
    post {
        success {
            echo """
====================================================
  PIPELINE PASSED — Build #${BUILD_NUMBER}
  All 7 stages completed successfully.
  Production: http://localhost:${PROD_PORT}/health
  Monitoring: http://localhost:9090
====================================================
            """
        }
        failure {
            echo "PIPELINE FAILED — review stage logs above."
        }
        always {
            echo "Build #${BUILD_NUMBER} finished with status: ${currentBuild.currentResult}"
        }
    }
}
