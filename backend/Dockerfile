
FROM python:3.11-slim

WORKDIR /app

# Todas as dependências têm wheels pré-compiladas: não precisa de gcc nem libpq.
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Aplica as migrações (se houver DATABASE_URL) e sobe a API na porta fornecida pela plataforma.
CMD ["sh", "-c", "([ -z \"$DATABASE_URL\" ] || alembic upgrade head || echo 'Migração falhou, seguindo sem histórico'); exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips=*"]
