.PHONY: help
.DEFAULT_GOAL := help

help:
	python3 -m src --help

install: ## Install requirements
	uv sync

lock: ## Lock project dependencies
	uv lock

update: ## Update project dependencies
	uv lock --upgrade
	uv sync

format: ## Run code formatters
	uv run ruff format src tests
	uv run ruff check  src tests --fix

lint: ## Run code linters
	uv run ruff format src tests --check
	uv run ruff check  src tests
	uv run mypy src tests

test:  ## Run tests with coverage
	uv run python -m pytest --cov

test-ci:
	uv run python -m pytest tests

build:
	docker build -t tower-of-babel-video . 

run:
	uv run python -m src
