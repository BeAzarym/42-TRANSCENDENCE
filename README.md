# FT_TRANSCENDENCE - Real-Time Pong Platform

A 42 School final project creating a modern, web-based multiplayer Pong game with real-time gameplay, tournaments, and social features.

**Contributors:** [@BeAzarym](https://github.com/BeAzarym) & [@boyflo06](https://github.com/boyflo06)

## Overview

**ft_transcendence** is a full-stack web application that recreates the classic Pong game with modern features including real-time multiplayer gameplay, user authentication, tournaments, leaderboards, and social interactions. Built with a microservices architecture using Docker containers.

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Make

### Installation
```bash
git clone https://github.com/BeAzarym/42-TRANSCENDENCE.git
cd ft_transcendence
cp srcs/.env_exemple srcs/.env
# Edit .env with your secrets
make
```

### Access the Application
```
https://localhost:4433
```

## Architecture

Our application uses a **microservices architecture** with the following services:

| Service | Port | Description |
|---------|------|-------------|
| **nginx** | 4433 | Reverse proxy & SSL termination |
| **front** | - | Frontend application (Vite + TailwindCSS) |
| **auth** | - | Authentication & authorization service |
| **database** | - | Data persistence layer |
| **pong** | - | Real-time game server |
| **profile** | - | User profile management |
| **social** | - | Friend system & messaging |
| **leaderboard** | - | Rankings & statistics |

## Features

### Core Gameplay
- **Real-time multiplayer Pong** with WebSocket connections
- **Tournament system** with bracket management
- **Private Game system** - Create invite-only games with custom room codes for playing with specific friends
- **Matchmaking system** - Automated player pairing based on a queue system
### User Management
- **OAuth2 authentication** (Google integration)
- **User profiles** with avatar upload
- **Two-factor authentication** (2FA)
- **Game statistics** and match history

### Social Features
- **Friend system** with online status and invitation system

### Technical Features
- **Microservices architecture** for scalability
- **Real-time communication** via WebSockets
- **Responsive design** with TailwindCSS
- **TypeScript** for type safety
- **Docker containerization** for easy deployment

## Development

### Tech Stack

#### Frontend
- **Framework:** Fastify + Vite
- **Styling:** TailwindCSS 4.x
- **Language:** TypeScript
- **Build:** Vite with legacy browser support

#### Backend
- **Runtime:** Node.js
- **Framework:** Fastify
- **Language:** TypeScript
- **Database:** SQLite (with custom SDK)
- **Real-time:** WebSockets

#### Infrastructure
- **Containerization:** Docker & Docker Compose
- **Reverse Proxy:** Nginx with SSL
- **Development:** Hot reload with file watching

### Available Commands

```bash
make        # Build and start all services
make watch  # Start with file watching for development
make stop   # Stop all services
make clean  # Clean containers and images
make fclean # Complete cleanup (remove everything)
make kill   # Force kill all containers
```

### Development Mode
```bash
# Start with automatic rebuilding on file changes
make watch
```

### Environment Configuration
```bash
# Copy and edit environment variables
cp srcs/.env_exemple srcs/.env
```

Required environment variables:
- `FASTIFY_COOKIE_SECRET` - Session cookie encryption
- `JWT_SECRET` - JWT token signing
- `GOOGLE_AUTH_CLIENT` - Google OAuth client ID
- `GOOGLE_AUTH_SECRET` - Google OAuth client secret

## Project Structure

```
ft_transcendence/
├── srcs/
│   ├── docker-compose.yml          # Service orchestration
│   ├── .env_exemple               # Environment template
│   ├── requirements/              # Service definitions
│   │   ├── nginx/                # Reverse proxy
│   │   ├── front/                # Frontend service
│   │   ├── auth/                 # Authentication service
│   │   ├── database/             # Database service
│   │   ├── pong/                 # Game server
│   │   ├── profile/              # User profiles
│   │   ├── social/               # Social features
│   │   └── leaderboard/          # Rankings & stats
│   └── volumes/                  # Persistent data
│       └── database/             # Database files & uploads
├── Makefile                      # Build commands
└── clean_helper.sh              # Cleanup utilities
```

## Game Features

### Pong Mechanics
- **Classic Pong physics** with modern enhancements
- **Real-time sync** between players

### Tournament System
- **Single-elimination brackets**
- **Automated matchmaking**
- **Live tournament tracking**
- **Winner ceremonies**


## Security Features

- **HTTPS** with SSL certificates
- **JWT-based authentication**
- **Two-factor authentication** support


## Monitoring

- **Service dependency management**
- **Automatic restart policies**
- **Development file watching**

## Contributing

This project was developed as part of the 42 School curriculum by:
- **[@BeAzarym](https://github.com/BeAzarym)** 
- **[@boyflo06](https://github.com/boyflo06)**

## 42 School Project

This project represents the culmination of the 42 School common core, demonstrating proficiency in:
- **Web development** (frontend & backend)
- **Real-time applications** and WebSockets
- **Microservices architecture**
- **Containerization** and DevOps
- **User experience** design
- **Security** best practices

---
