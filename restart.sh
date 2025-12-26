#!/usr/bin/env bash
# Reinicia todo o ambiente do zero: para, remove containers/imagens/volumes do compose e sobe novamente.
# Uso: ./restart.sh


COMPOSE_FILE="docker-compose.yml"
HOST_IP="18.230.5.22"   # ajuste se necessário

echo "===== INICIANDO RESTART COMPLETO (ZERO) ====="

# 1) Parar e remover containers do compose (apenas do projeto)
if [ -f "${COMPOSE_FILE}" ]; then
  echo ">>> Parando e removendo containers/volumes/imagens do docker-compose (${COMPOSE_FILE})..."
  docker-compose -f "${COMPOSE_FILE}" down --rmi all -v --remove-orphans || {
    echo "Aviso: falha ao executar docker-compose down (continuando)..."
  }
else
  echo "Aviso: ${COMPOSE_FILE} não encontrado. Pulando docker-compose down."
fi

# 2) Parar e remover quaisquer outros containers (opcional — remove tudo)
echo ">>> Parando quaisquer containers em execução..."
docker ps -q | xargs -r docker stop || true

echo ">>> Removendo quaisquer containers existentes..."
docker ps -aq | xargs -r docker rm -f || true

# 3) (Opcional) Remover imagens antigas - ATENÇÃO: remove todas as imagens locais
echo ">>> Removendo imagens locais não utilizadas (opcional)..."
# Só remova imagens do projeto? Para segurança removemos imagens dangling e não usadas:
docker image prune -af || true

# 4) Remover volumes antigos (opcional)
echo ">>> Removendo volumes não usados..."
docker volume prune -f || true

# 5) Limpar redes orfãs
echo ">>> Removendo redes orfãs..."
docker network prune -f || true

# 6) Matar processos que possam bloquear portas usadas
echo ">>> Matando processos nas portas 8080, 8081 e 5173 (se houver)..."
sudo fuser -k 8080/tcp || true
sudo fuser -k 8081/tcp || true
sudo fuser -k 5173/tcp || true

# 7) Parar nginx local (se existir)
echo ">>> Parando Nginx local (se estiver rodando)..."
sudo systemctl stop nginx || true
sudo pkill nginx || true

# 8) Preparar pasta de certificados
echo ">>> Preparando pasta certs..."
mkdir -p certs
sudo chown -R "$USER":"$USER" certs || true
sudo chmod -R 700 certs || true

# 9) Gerar certificados autoassinados se não existirem
if [ ! -f certs/apontamento.crt ] || [ ! -f certs/apontamento.key ]; then
  echo ">>> Gerando certificado autoassinado para HTTPS do APONTAMENTO..."
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout certs/apontamento.key \
    -out certs/apontamento.crt \
    -subj "/C=BR/ST=SP/L=SaoPaulo/O=Crestos/OU=Dev/CN=${HOST_IP}"
else
  echo ">>> Certificados já existem. Pulando geração."
fi

# 10) Build e up (recria tudo do zero)
echo ">>> Build e subindo containers (docker-compose up -d --build)..."
docker-compose -f "${COMPOSE_FILE}" up -d --build --remove-orphans

echo "===== RESTART COMPLETO CONCLUIDO ====="
echo "APONTAMENTO: https://${HOST_IP} (backend 8080)"
echo "AVALIACAO: http://${HOST_IP}:5173 (frontend 5173 / backend 8081)"