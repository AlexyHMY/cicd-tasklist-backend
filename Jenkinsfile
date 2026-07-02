pipeline {
    agent any

    environment {
        DOCKERHUB_CRED = credentials('docker_hub')

        IMAGE_NAME = "${DOCKERHUB_CRED_USR}/eval-pipeline-backend"
        IMAGE_TAG  = "${BUILD_NUMBER}"
        IMAGE_REF  = "${IMAGE_NAME}:${IMAGE_TAG}"

        SONAR_PROJECT_KEY = "eval-pipeline-backend-auto"
    }

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    triggers {
        pollSCM('H/2 * * * *')
    }

    stages {

        stage('1. Install dependencies') {
            steps {
                bat 'npm ci'
            }
        }

        stage('2. Prisma generate') {
            steps {
                bat 'npm run prisma:generate'
            }
        }

        stage('3. Unit tests') {
            steps {
                bat 'npm run test:coverage'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'reports/junit.xml'
                }
            }
        }

        stage('4. End-to-end tests') {
            steps {
                bat 'npm run test:e2e -- --outputFile.junit=reports/junit-e2e.xml'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'reports/junit-e2e.xml'
                }
            }
        }

        stage('5. SonarQube analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    withCredentials([string(credentialsId: 'sonarqube', variable: 'SONAR_TOKEN')]) {
                        bat """
                            sonar-scanner ^
                            -Dsonar.projectKey=${SONAR_PROJECT_KEY} ^
                            -Dsonar.host.url=%SONAR_HOST_URL% ^
                            -Dsonar.token=%SONAR_TOKEN%
                        """
                    }
                }
            }
        }


        stage('6. Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: false
                }
            }
        }

        stage('7. Build Docker image') {
            steps {
                bat 'docker build -t %IMAGE_REF% -t %IMAGE_NAME%:latest .'
            }
        }

        stage('8. Trivy scan + reports') {
            steps {
                bat '''
                    if not exist reports mkdir reports
                    trivy image --no-progress --format table \
                        --output reports/trivy-report.txt %IMAGE_REF%
                    trivy image --no-progress --format json \
                        --output reports/trivy-report.json %IMAGE_REF%
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'reports/trivy-report.*', allowEmptyArchive: true
                }
            }
        }

        stage('9. Trivy security gate') {
            steps {
                bat '''
                    trivy image --no-progress --exit-code 1 \
                        --severity HIGH,CRITICAL %IMAGE_REF% \
                        --skip-version-check flag
                '''
            }
        }

        stage('10. Generate SBOM') {
            steps {
                bat '''
                    if not exist reports mkdir reports
                    trivy image --no-progress --format cyclonedx \
                        --output reports/sbom.cdx.json %IMAGE_REF%
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'reports/sbom.cdx.json', allowEmptyArchive: true
                }
            }
        }

        stage('11. Push Docker image') {
            steps {
                bat '''
                    echo "%DOCKERHUB_CRED_PSW%" | docker login -u "%DOCKERHUB_CRED_USR%" --password-stdin
                    docker push %IMAGE_REF%
                    docker push %IMAGE_NAME%:latest
                    docker logout
                '''
            }
        }
    }

    post {
        // 13. Nettoyage du workspace Jenkins en fin de pipeline
        always {
            deleteDir()
        }
    }
}
