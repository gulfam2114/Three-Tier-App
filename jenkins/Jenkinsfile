pipeline {
    agent any

    environment {
        EMAIL = 'gulfamhameed313@gmail.com'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "Code checkout complete."
            }
        }

        stage('Get Current EC2 IP') {
            steps {
                script {
                    env.SERVER_IP = sh(
                        script: 'curl -s ifconfig.me',
                        returnStdout: true
                    ).trim()

                    echo "Current EC2 Public IP is: ${env.SERVER_IP}"
                }
            }
        }

        stage('Check Required Tools') {
            steps {
                sh 'git --version'
                sh 'docker --version'
                sh 'docker compose version'
                sh 'node -v || true'
                sh 'npm -v || true'
            }
        }

        stage('Install Backend Dependencies and Test') {
            steps {
                dir('app/backend') {
                    sh 'npm install'
                    sh 'npm run test'
                }
            }
        }

        stage('Security Scan Placeholder') {
            steps {
                echo "Security Scan Placeholder Started..."
                echo "Trivy filesystem scan can be added here: trivy fs ."
                echo "SonarQube scan can be added here later."
                echo "Security Scan Placeholder Completed."
            }
        }

        stage('Clean Old App Containers') {
            steps {
                dir('docker') {
                    echo "Stopping old application containers..."
                    sh 'docker compose down || true'
                }
            }
        }

        stage('Build and Deploy App') {
            steps {
                dir('docker') {
                    echo "Building and deploying three-tier application..."
                    sh 'docker compose up --build -d'
                }
            }
        }

        stage('Verify App Containers') {
            steps {
                echo "Checking running Docker containers..."
                sh 'docker ps'

                dir('docker') {
                    sh 'docker compose ps'
                }
            }
        }

        stage('Verify Monitoring Services') {
            steps {
                echo "Checking EC2 installed monitoring services..."
                sh 'systemctl is-active prometheus || true'
                sh 'systemctl is-active grafana-server || true'
                sh 'systemctl is-active node_exporter || true'
            }
        }
    }

    post {
        success {
            emailext(
                subject: "Deployment Successful - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: """
Your Jenkins CI/CD pipeline completed successfully.

Application URLs:

Frontend:
http://${env.SERVER_IP}/

Backend:
http://${env.SERVER_IP}:5000

Jenkins:
http://${env.SERVER_IP}:8080

Grafana:
http://${env.SERVER_IP}:3000

Prometheus:
http://${env.SERVER_IP}:9090

Build Logs:
${env.BUILD_URL}

Regards,
Jenkins CI/CD Pipeline
""",
                to: "${env.EMAIL}"
            )
        }

        failure {
            emailext(
                subject: "Deployment Failed - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: """
Your Jenkins CI/CD pipeline failed.

Check console logs:
${env.BUILD_URL}

Regards,
Jenkins CI/CD Pipeline
""",
                to: "${env.EMAIL}"
            )
        }
    }
}