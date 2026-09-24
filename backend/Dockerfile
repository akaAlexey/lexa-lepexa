FROM python:3.12-slim
WORKDIR /app

COPY pyproject.toml requirements.txt ./
COPY app ./app
COPY migrations ./migrations
COPY alembic.ini ./

RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir .

CMD ["python", "start.py"]
