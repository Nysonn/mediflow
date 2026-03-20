dev:
	docker-compose up --build

down:
	docker-compose down

migrate-up:
	docker-compose --profile migrate run --rm migrate \
		sh -c 'case "$$DATABASE_URL" in *\?*) sep="&" ;; *) sep="?" ;; esac; goose -dir /app/migrations postgres "$$DATABASE_URL$${sep}default_query_exec_mode=simple_protocol" up'

migrate-down:
	docker-compose --profile migrate run --rm migrate \
		sh -c 'case "$$DATABASE_URL" in *\?*) sep="&" ;; *) sep="?" ;; esac; goose -dir /app/migrations postgres "$$DATABASE_URL$${sep}default_query_exec_mode=simple_protocol" down'

migrate-status:
	docker-compose --profile migrate run --rm migrate \
		sh -c 'case "$$DATABASE_URL" in *\?*) sep="&" ;; *) sep="?" ;; esac; goose -dir /app/migrations postgres "$$DATABASE_URL$${sep}default_query_exec_mode=simple_protocol" status'

logs:
	docker-compose logs -f

ps:
	docker-compose ps

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build
