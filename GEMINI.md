# Fromistargram

## Project Overview

This project, "fromistargram," is a full-stack web application designed to crawl, index, and display Instagram content. It operates as a monorepo containing several interconnected services:

-   **`frontend`**: A React-based Single Page Application (SPA) for browsing the indexed content. It is built with TypeScript, Vite, and styled with Tailwind CSS.
-   **`backend`**: A Node.js API server using Fastify and Prisma. It provides a REST API to query Instagram data stored in a PostgreSQL database and includes OpenAPI (Swagger) documentation.
-   **`crawler`**: A Python script that utilizes the `instaloader` library to crawl specified Instagram profiles, download media, and store metadata.
-   **`thumb`**: An `imgproxy` service for real-time image processing and optimization, serving thumbnails and resized images.

The entire application is orchestrated using Docker and Docker Compose, which simplifies setup and deployment.

## Building and Running

The project uses `pnpm` for managing Node.js dependencies in the `frontend` and `backend` workspaces.

### Running with Docker (Recommended)

The most straightforward way to run the entire stack is with Docker Compose.

1.  **Configuration**: Copy the `.env.sample` file to `.env` and fill in the required environment variables, such as Instagram credentials and database settings.
    ```bash
    cp .env.sample .env
    ```

2.  **Start Services**: Build and start all services in detached mode.
    ```bash
    docker compose up --build -d
    ```

### Local Development

You can also run the frontend and backend services locally for development.

-   **Install Dependencies**:
    ```bash
    pnpm install
    ```

-   **Run Frontend**:
    ```bash
    pnpm dev:frontend
    ```

-   **Run Backend**:
    ```bash
    pnpm dev:backend
    ```

### Build, Test, and Lint

The root `package.json` provides convenient scripts to manage the workspaces.

-   **Build All Workspaces**:
    ```bash
    pnpm build
    ```

-   **Run Tests**:
    ```bash
    pnpm test
    ```

-   **Lint Code**:
    ```bash
    pnpm lint
    ```

## Development Conventions

-   **Monorepo Structure**: The project is organized as a monorepo using pnpm workspaces, with clear separation between `frontend`, `backend`, and `crawler`.
-   **Technology Stack**:
    -   **Frontend**: React, TypeScript, Vite, Tailwind CSS
    -   **Backend**: Node.js, Fastify, Prisma, TypeScript
    -   **Database**: PostgreSQL
    -   **Crawler**: Python, `instaloader`
-   **API Documentation**: The backend API includes OpenAPI (Swagger) documentation, which is accessible at the `/docs` endpoint when the server is running.
-   **Database Management**: Database schema and migrations are managed using Prisma. The schema is defined in `backend/prisma/schema.prisma`.
-   **Testing**: The project uses Vitest for unit and integration testing in both the frontend and backend.
-   **Code Style**: The project enforces code quality and consistency through linting rules.
