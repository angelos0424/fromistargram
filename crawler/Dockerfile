# syntax=docker/dockerfile:1.7
FROM python:3.11-slim

ENV PIP_NO_CACHE_DIR=1
WORKDIR /app

COPY crawler/requirements.txt ./requirements.txt
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

COPY crawler ./

ENV PYTHONUNBUFFERED=1
ENTRYPOINT ["python", "main.py"]
