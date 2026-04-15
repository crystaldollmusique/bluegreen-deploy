pipeline {
    agent any

    environment {
        COMPOSE_FILE    = 'docker-compose.yml'
        NGINX_CONTAINER = 'nginx_lb'
        BLUE_CONTAINER  = 'app_blue'
        GREEN_CONTAINER = 'app_green'
    }

    stages {

        stage('Checkout') {
            steps {
                echo '📥 Obteniendo código fuente...'
                checkout scm
            }
        }

        stage('Build Images') {
            steps {
                echo '🔨 Construyendo imágenes Docker...'
                sh 'docker compose -f ${COMPOSE_FILE} build --no-cache'
            }
        }

        stage('Deploy') {
            steps {
                echo '🚀 Levantando contenedores...'
                sh 'docker compose -f ${COMPOSE_FILE} up -d --remove-orphans'
            }
        }

        stage('Health Check') {
            steps {
                echo '🩺 Verificando salud de los contenedores...'
                sh '''
                    sleep 5
                    docker inspect --format="{{.State.Running}}" ${BLUE_CONTAINER}  | grep -q true || exit 1
                    docker inspect --format="{{.State.Running}}" ${GREEN_CONTAINER} | grep -q true || exit 1
                    echo "✅ Blue y Green están corriendo correctamente"
                '''
            }
        }

        stage('Auto Blue/Green Routing') {
            steps {
                echo '⚖️  Configurando ruteo automático Blue/Green...'
                sh 'node BackupCanary/bkp_canary.js'
            }
        }

        stage('Verify nginx') {
            steps {
                echo '🔍 Verificando nginx en puerto 8080...'
                sh '''
                    sleep 3
                    docker inspect --format="{{.State.Running}}" ${NGINX_CONTAINER} | grep -q true || exit 1
                    echo "✅ nginx está corriendo correctamente"
                '''
            }
        }
    }

    post {
        success {
            echo '✅ Pipeline completado — despliegue Blue/Green exitoso'
            sh 'docker ps --filter name=app_ --filter name=nginx_lb'
        }
        failure {
            echo '❌ Pipeline fallido — revisando logs...'
            sh '''
                docker logs ${BLUE_CONTAINER}  --tail=30 || true
                docker logs ${GREEN_CONTAINER} --tail=30 || true
                docker logs ${NGINX_CONTAINER} --tail=30 || true
            '''
        }
    }
}