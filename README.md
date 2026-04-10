# 🔵🟢 Despliegue Blue/Green con Docker, Nginx y Jenkins

Simulación de un despliegue Blue/Green en entorno Cloud usando contenedores Docker, balanceo de carga con Nginx y automatización con Jenkins.

---

## 📁 Estructura del proyecto

```
bluegreen-deploy/
├── app/
│   ├── app.js          # Servidor Express (blue o green según variable de entorno)
│   ├── package.json
│   └── Dockerfile      # Imagen de la app
├── BackupCanary/
│   └── bkp_canary.js   # Script que detecta entorno activo y configura nginx
├── nginx/
│   └── nginx.conf      # Balanceador de carga con pesos blue/green
├── docker-compose.yml  # Orquestación de los 3 servicios
├── Dockerfile.jenkins  # Jenkins con Docker CLI y Node.js incluidos
├── Jenkinsfile         # Pipeline CI/CD automatizado
└── README.md
```

---

## 🧠 ¿Cómo funciona?

```
Usuario → localhost:8080
              ↓
           nginx (portero)
          /           \
   blue:3000        green:3000
  (weight=8)        (weight=2)
  versión 1.0       versión 2.0
```

- **Blue**: entorno estable (producción actual)
- **Green**: entorno nuevo (nueva versión a validar)
- **nginx**: distribuye el tráfico según pesos configurables
- **bkp_canary.js**: detecta automáticamente qué contenedor está activo y ajusta los pesos

---

## 🚀 Inicio rápido

### Prerrequisitos
- Docker Desktop instalado
- Node.js 18+
- Jenkins (opcional para pipeline)

### Levantar el entorno

```bash
# Clonar el repositorio
git clone https://github.com/TU_USUARIO/bluegreen-deploy.git
cd bluegreen-deploy

# Construir y levantar todo
docker compose up -d --build

# Verificar contenedores
docker ps

# Probar el balanceador
curl http://localhost:8080
```

### Probar el ruteo Blue/Green

Recarga varias veces — verás alternancia entre blue y green:

```bash
# En PowerShell (Windows)
for ($i=1; $i -le 10; $i++) { curl http://localhost:8080 }

# En bash (Linux/Mac)
for i in $(seq 1 10); do curl -s http://localhost:8080 | python3 -m json.tool; done
```

---

## ⚙️ Configuración de pesos (canary)

Edita `nginx/nginx.conf` para cambiar la distribución del tráfico:

```nginx
upstream app {
    server blue:3000  weight=8;   # 80% del tráfico
    server green:3000 weight=2;   # 20% del tráfico
}
```

O ejecuta el script automático:

```bash
node BackupCanary/bkp_canary.js
```

El script detecta qué contenedores están activos y configura los pesos automáticamente:

| Escenario | Resultado |
|---|---|
| Blue y Green activos | blue=80%, green=20% (modo canary) |
| Solo Blue activo | blue=100% |
| Solo Green activo | green=100% |

---

## 🔧 Jenkins Pipeline

El `Jenkinsfile` automatiza todo el proceso:

1. **Checkout** — descarga el código
2. **Build Images** — construye las imágenes Docker
3. **Deploy** — levanta los contenedores
4. **Health Check** — verifica que blue y green respondan
5. **Auto Blue/Green Routing** — ejecuta `bkp_canary.js`
6. **Verify nginx** — confirma que el puerto 8080 responde

### Configurar Jenkins con Docker

```bash
# Construir imagen Jenkins con Docker CLI incluido
docker build -f Dockerfile.jenkins -t jenkins-docker .

# Levantar Jenkins
docker run -d \
  -p 9090:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v jenkins_home:/var/jenkins_home \
  --name jenkins_lab \
  jenkins-docker
```

---

## 🩺 Endpoints disponibles

| Endpoint | Descripción |
|---|---|
| `GET /` | Respuesta con color, versión y host |
| `GET /health` | Estado de salud del contenedor |
| `GET /info` | Info detallada (uptime, memoria) |

---

## 📊 ¿Para qué sirve en la vida real?

- **Zero downtime deployments**: actualizas sin apagar nada
- **Canary releases**: pruebas la nueva versión con el 10-20% del tráfico real
- **Rollback instantáneo**: si algo falla, reviertes cambiando los pesos en segundos
- **Usado por**: Netflix, Amazon, Google, Spotify, etc.

---

## 📝 Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `APP_COLOR` | Identifica el entorno (blue/green) | `blue` |
| `APP_VERSION` | Versión de la app | `1.0.0` |
| `PORT` | Puerto interno del servidor | `3000` |
